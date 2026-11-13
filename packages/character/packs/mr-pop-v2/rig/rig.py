import re,sys
src=open(sys.argv[1]).read(); src=src[:src.index('import sys\norder=')]
exec(src)
# ---- variant parts (all centred on the same head coords) ----
EYES={
 'open':dots(),
 'closed':f'<path d="M230 290 Q252 298 274 290" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><path d="M330 290 Q352 298 374 290" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>',
 'happy':f'<path d="M228 292 Q250 270 272 292" fill="none" stroke="{INK}" stroke-width="8" stroke-linecap="round"/><path d="M328 292 Q350 270 372 292" fill="none" stroke="{INK}" stroke-width="8" stroke-linecap="round"/>',
 'money':EXPR['money-eyes'][4]+EXPR['money-eyes'][0],
 'shock':EXPR['shocked'][0],
 'star':EXPR['star-struck'][0],
 'up':dots(6,-10),
}
BROWS={'up':B_UP,'high':B_HIGH,'flat':B_FLAT,'think':brow('M214 236 Q250 228 282 234','M318 220 Q350 204 386 222')}
M=INK; DK='#5A1A16'
MOUTHS={
 'X':f'<path d="M272 392 Q300 402 328 392" fill="none" stroke="{M}" stroke-width="7" stroke-linecap="round"/>',
 'A':f'<path d="M270 394 L330 394" fill="none" stroke="{M}" stroke-width="8" stroke-linecap="round"/>',
 'B':f'<path d="M266 384 Q300 392 334 384 Q330 410 300 412 Q270 410 266 384 Z" fill="{DK}" stroke="{M}" stroke-width="5" stroke-linejoin="round"/><path d="M272 388 Q300 395 328 388 L326 396 Q300 401 274 396 Z" fill="#fff"/>',
 'C':f'<path d="M264 382 Q300 390 336 382 Q332 424 300 426 Q268 424 264 382 Z" fill="{DK}" stroke="{M}" stroke-width="5" stroke-linejoin="round"/><path d="M270 386 Q300 393 330 386 L328 396 Q300 402 272 396 Z" fill="#fff"/><path d="M282 416 Q300 406 318 416 Q300 424 282 416 Z" fill="#F07A86"/>',
 'D':f'<path d="M258 378 Q300 388 342 378 Q338 440 300 444 Q262 440 258 378 Z" fill="{DK}" stroke="{M}" stroke-width="5" stroke-linejoin="round"/><path d="M266 382 Q300 391 334 382 L331 394 Q300 401 269 394 Z" fill="#fff"/><path d="M278 430 Q300 414 322 430 Q300 442 278 430 Z" fill="#F07A86"/>',
 'E':f'<ellipse cx="300" cy="402" rx="20" ry="20" fill="{DK}" stroke="{M}" stroke-width="5"/><path d="M288 412 Q300 406 312 412 Q300 418 288 412 Z" fill="#F07A86"/>',
 'F':f'<ellipse cx="300" cy="400" rx="11" ry="13" fill="{DK}" stroke="{M}" stroke-width="5"/>',
 'G':f'<path d="M270 388 L330 388 L328 404 L272 404 Z" fill="#fff" stroke="{M}" stroke-width="5" stroke-linejoin="round"/><path d="M276 404 Q300 414 324 404" fill="none" stroke="{M}" stroke-width="5" stroke-linecap="round"/>',
 'H':f'<path d="M264 382 Q300 390 336 382 Q332 422 300 424 Q268 422 264 382 Z" fill="{DK}" stroke="{M}" stroke-width="5" stroke-linejoin="round"/><path d="M282 396 Q300 384 318 396 Q300 404 282 396 Z" fill="#F07A86"/>',
 'smile':SMILE,
 'grin':GRIN,
 'o':EXPR['shocked'][2],
}
def grp(prefix,d,default):
  return ''.join(f'<g id="{prefix}-{k}" style="display:{"inline" if k==default else "none"}">{v}</g>' for k,v in d.items())
# head with variant groups: pass placeholders then swap
h=head('@@EYES@@','@@BROWS@@','@@MOUTH@@','','')
h=h.replace('@@EYES@@',grp('eyes',EYES,'open')).replace('@@BROWS@@',grp('brows',BROWS,'up')).replace('@@MOUTH@@',grp('mouth',MOUTHS,'smile'))
h=h.replace('<g id="head">','<g id="head" style="transform-box:view-box;transform-origin:300px 470px">',1)
ARMS={'idle':POSES['idle'][1],'point':POSES['pointing'][1],'celebrate':POSES['celebrating'][1],'shrug':POSES['shrug'][1],'thumb':POSES['thumbs-up'][1],'explain':POSES['explaining'][1]}
back=''; front=''
for k,arms in ARMS.items():
  b=''.join(arm(*a) for a in arms if a[1][1]<600 and k in('point','celebrate','thumb'))
  f=''.join(arm(*a) for a in arms if not(a[1][1]<600 and k in('point','celebrate','thumb')))
  back+=f'<g id="armsb-{k}" style="display:{"inline" if k=="idle" else "none"}">{b}</g>'
  front+=f'<g id="armsf-{k}" style="display:{"inline" if k=="idle" else "none"}">{f}</g>'
svg=full('idle')
# strip existing arms & head from full('idle') and rebuild
idle_front=''.join(arm(*a) for a in POSES['idle'][1])
svg=svg.replace(idle_front,'@@FRONT@@',1)
hstart=svg.index('<g id="head">'); hend=svg.rindex('</svg>')
svg=svg[:hstart]+h+'\n'+svg[hend:]
svg=svg.replace('@@FRONT@@',front)
# back arms go before torso group (after legs/shoes)
mark='<g stroke="#0F1222" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">\n <path d="M214 566'
svg=svg.replace(mark,back+'\n'+mark,1)
svg=svg.replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 1380">','<svg id="rig" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 1380" style="overflow:visible">')
open(sys.argv[2],'w').write(svg)
print('rig ok', len(svg))
