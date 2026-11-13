// Encode JPEG frames + WAV into an Instagram-ready MP4 (H.264 ~12 Mbps + AAC 160 kbps) with macOS AVFoundation — no ffmpeg.
//   swift packages/pipeline/render/encode.swift <framesDir> <voice.wav> <out.mp4> [fps]
import AVFoundation
import AppKit

let a = CommandLine.arguments
let framesDir = a[1], wavPath = a[2], outPath = a[3]
let fps = Int32(a.count > 4 ? Int(a[4])! : 30)
let fm = FileManager.default
let frames = try! fm.contentsOfDirectory(atPath: framesDir).filter { $0.hasSuffix(".jpg") }.sorted()
let W = 1080, H = 1920
let out = URL(fileURLWithPath: outPath); try? fm.removeItem(at: out)
let writer = try! AVAssetWriter(outputURL: out, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true

let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 12_000_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: 60]])
vIn.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: vIn, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
let aIn = AVAssetWriterInput(mediaType: .audio, outputSettings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 48000, AVNumberOfChannelsKey: 2, AVEncoderBitRateKey: 160_000])
aIn.expectsMediaDataInRealTime = false
writer.add(vIn); writer.add(aIn)

// audio reader: decode the WAV to 48 kHz stereo PCM for the AAC encoder
let aAsset = AVURLAsset(url: URL(fileURLWithPath: wavPath))
let reader = try! AVAssetReader(asset: aAsset)
let rOut = AVAssetReaderTrackOutput(track: aAsset.tracks(withMediaType: .audio)[0], outputSettings: [
  AVFormatIDKey: kAudioFormatLinearPCM, AVSampleRateKey: 48000, AVNumberOfChannelsKey: 2, AVLinearPCMBitDepthKey: 16,
  AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false, AVLinearPCMIsNonInterleaved: false])
reader.add(rOut); reader.startReading()

writer.startWriting(); writer.startSession(atSourceTime: .zero)
let videoEnd = CMTime(value: Int64(frames.count), timescale: fps)
let group = DispatchGroup()
group.enter()
aIn.requestMediaDataWhenReady(on: DispatchQueue(label: "audio")) {
  while aIn.isReadyForMoreMediaData {
    if let sb = rOut.copyNextSampleBuffer(), CMTimeCompare(CMSampleBufferGetPresentationTimeStamp(sb), videoEnd) < 0 { aIn.append(sb) }
    else { aIn.markAsFinished(); group.leave(); return }
  }
}
group.enter()
var i = 0
vIn.requestMediaDataWhenReady(on: DispatchQueue(label: "video")) {
  while vIn.isReadyForMoreMediaData {
    if i >= frames.count { vIn.markAsFinished(); group.leave(); return }
    autoreleasepool {
      let img = NSImage(contentsOfFile: framesDir + "/" + frames[i])!
      var rect = CGRect(x: 0, y: 0, width: W, height: H)
      let cg = img.cgImage(forProposedRect: &rect, context: nil, hints: nil)!
      var pb: CVPixelBuffer?
      CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
      CVPixelBufferLockBaseAddress(pb!, [])
      let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb!), width: W, height: H, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pb!),
                          space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
      ctx.draw(cg, in: CGRect(x: 0, y: 0, width: W, height: H))
      CVPixelBufferUnlockBaseAddress(pb!, [])
      adaptor.append(pb!, withPresentationTime: CMTime(value: Int64(i), timescale: fps))
    }
    i += 1
  }
}
group.wait()
let sem = DispatchSemaphore(value: 0)
writer.finishWriting { sem.signal() }; sem.wait()
guard writer.status == .completed else { fatalError("write failed: \(String(describing: writer.error))") }
print("✓ \(frames.count) frames + AAC → \(outPath)")
