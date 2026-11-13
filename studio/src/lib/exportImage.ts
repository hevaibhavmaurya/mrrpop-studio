import type { LoadedTheme } from '@mrrpop/theme';

/** Theme fonts as base64 @font-face rules, so text in an exported SVG/PNG renders with the real brand fonts. */
async function fontFaceCss(theme: LoadedTheme): Promise<string> {
  const rules: string[] = [];
  for (const f of [theme.fonts.sans, theme.fonts.accent]) {
    for (const file of f.files) {
      const url = theme.fontUrl(file.src);
      if (!url) continue;
      const buf = await (await fetch(url)).arrayBuffer();
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      rules.push(`@font-face{font-family:"${f.family}";src:url(data:font/ttf;base64,${btoa(bin)});font-weight:${file.weight};font-style:${file.style}}`);
    }
  }
  return rules.join('');
}

/** Wrap an SVG (string) into a square canvas-sized SVG: optional background, content centred with padding. */
export function squareSvg(inner: string, opts: { size: number; bg?: string; pad?: number }): string {
  const { size, bg, pad = 0 } = opts;
  const content = inner
    .replace(/<svg\b([^>]*)>/, (_m, attrs: string) => {
      const clean = attrs.replace(/\s(width|height|x|y|style|class)="[^"]*"/g, '');
      return `<svg${clean} x="${pad}" y="${pad}" width="${size - pad * 2}" height="${size - pad * 2}" preserveAspectRatio="xMidYMid meet">`;
    });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}${content}</svg>`;
}

export async function withFonts(svg: string, theme: LoadedTheme): Promise<string> {
  if (!/<text\b/.test(svg)) return svg;
  const css = await fontFaceCss(theme);
  return svg.replace(/(<svg\b[^>]*>)/, `$1<style>${css}</style>`);
}

/** Rasterise an SVG string to a PNG blob at its own width/height. */
export async function svgToPng(svg: string): Promise<Blob> {
  const w = Number(svg.match(/\swidth="(\d+)"/)?.[1] ?? 1080);
  const h = Number(svg.match(/\sheight="(\d+)"/)?.[1] ?? 1080);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    await new Promise((r) => setTimeout(r, 60)); // let embedded fonts settle
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d')!.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('PNG export failed'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
