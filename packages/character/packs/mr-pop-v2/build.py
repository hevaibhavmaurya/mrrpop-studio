import os
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'svg')
INK='#0F1222'; SKIN='#B9794C'; SKIN_SH='#9E643E'; BEARD='#24160F'; NAVY='#1E2340'; LAPEL='#2A3157'; VIOLET='#6C5CE7'; HOOD='#5443D6'; LIME='#C6F432'
FACE='M190 232 C190 160 240 128 300 128 C360 128 410 160 410 232 L410 318 C410 372 396 408 370 432 C350 450 326 458 300 458 C274 458 250 450 230 432 C204 408 190 372 190 318 Z'
def S(d,fill='none',w=6,extra=''): return f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round" {extra}/>'
def head(eyes,brows,mouth,extra_front='',lens_fill='',hand=''):
  return f'''<g id="head">
<g id="face-base" stroke="{INK}" stroke-width="6" stroke-linejoin="round">
 <path d="M196 276 C168 266 160 298 168 324 C176 348 190 354 202 346 Z" fill="{SKIN}"/>
 <path d="M404 276 C432 266 440 298 432 324 C424 348 410 354 398 346 Z" fill="{SKIN}"/>
 <path d="{FACE}" fill="{SKIN}"/>
</g>
<clipPath id="fc"><path d="{FACE}"/></clipPath>
<g id="beard" clip-path="url(#fc)">
 <path d="M382 150 C420 220 418 360 372 470 L440 470 L440 150 Z" fill="{SKIN_SH}"/>
 <path d="M180 318 C196 372 232 408 262 416 C280 421 320 421 338 416 C368 408 404 372 420 318 L420 480 L180 480 Z" fill="{BEARD}"/>
 <path d="M180 318 C196 372 232 408 262 416 C280 421 320 421 338 416 C368 408 404 372 420 318" fill="none" stroke="#3A2618" stroke-width="10" opacity=".7"/>
</g>
<path d="{FACE}" fill="none" stroke="{INK}" stroke-width="6"/>
<path d="M190 296 C182 306 184 320 190 326" fill="none" stroke="{SKIN_SH}" stroke-width="4" stroke-linecap="round"/>
<path d="M424 298 C440 294 448 308 442 320 L436 348" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>
<ellipse cx="432" cy="302" rx="12" ry="10" fill="#fff" stroke="{INK}" stroke-width="4"/>
<ellipse cx="228" cy="340" rx="20" ry="9" fill="#E07A64" opacity=".4"/>
<ellipse cx="372" cy="340" rx="20" ry="9" fill="#E07A64" opacity=".4"/>
<path d="M300 312 C292 330 290 342 300 346 C306 348 312 346 314 342" fill="none" stroke="#6E4128" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
<g id="mouth">{mouth}</g>
<path id="moustache" d="M262 366 C282 354 318 354 338 366 C322 362 310 364 300 368 C290 364 278 362 262 366 Z" fill="{BEARD}" stroke="{BEARD}" stroke-width="3" stroke-linejoin="round"/>
<g id="eyes">{lens_fill}
{eyes}</g>
<g id="glasses" fill="none" stroke="{INK}" stroke-width="9">
 <circle cx="250" cy="284" r="40"/><circle cx="350" cy="284" r="40"/>
 <path d="M290 280 Q300 272 310 280"/><path d="M210 278 L194 274"/><path d="M390 278 L406 274"/>
</g>
<path d="M226 264 Q234 254 246 252" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9"/>
<path d="M326 264 Q334 254 346 252" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9"/>
<g id="brows">{brows}</g>
<g id="hair"><path d="M186 258 C170 196 182 138 228 110 C266 86 318 82 354 94 C392 68 448 82 456 122 C430 110 406 116 396 130 C420 148 424 184 414 236 C404 208 392 192 376 184 C350 202 300 200 268 186 C244 196 216 216 202 244 Z" fill="#16141C" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>
<path d="M232 134 C268 110 322 104 360 116" fill="none" stroke="{VIOLET}" stroke-width="8" stroke-linecap="round"/>
<path d="M372 98 C396 88 420 90 436 100" fill="none" stroke="{VIOLET}" stroke-width="6" stroke-linecap="round"/>
<path d="M250 166 C280 154 320 154 348 164" fill="none" stroke="#3A3650" stroke-width="5" stroke-linecap="round"/></g>
<g id="extras">{extra_front}</g>
{hand}</g>'''
# ---------- expression parts ----------
def dots(dx=0,dy=0,r=11): return f'<circle cx="{252+dx}" cy="{286+dy}" r="{r}" fill="{INK}"/><circle cx="{352+dx}" cy="{286+dy}" r="{r}" fill="{INK}"/><circle cx="{256+dx}" cy="{281+dy}" r="4" fill="#fff"/><circle cx="{356+dx}" cy="{281+dy}" r="4" fill="#fff"/>'
def brow(l,r): return f'<path d="{l}" fill="none" stroke="{INK}" stroke-width="14" stroke-linecap="round"/><path d="{r}" fill="none" stroke="{INK}" stroke-width="14" stroke-linecap="round"/>'
B_UP=brow('M214 230 Q250 214 282 228','M318 228 Q350 214 386 230')
B_HIGH=brow('M216 214 Q250 196 282 210','M318 210 Q350 196 384 214')
B_FLAT=brow('M214 238 L282 238','M318 238 L386 238')
B_SAD=brow('M216 226 Q250 232 282 244','M318 244 Q350 232 384 226')
B_ANG=brow('M216 226 Q250 236 282 248','M318 248 Q350 236 384 226')
B_CONF=brow('M214 218 Q250 202 282 216','M318 240 Q350 234 386 242')
GRIN=f'<path d="M250 376 Q300 388 350 376 Q344 430 300 434 Q256 430 250 376 Z" fill="#5A1A16" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/><path d="M258 380 Q300 390 342 380 L338 396 Q300 404 262 396 Z" fill="#fff"/><path d="M276 420 Q300 408 324 420 Q300 432 276 420 Z" fill="#F07A86"/>'
SMILE=f'<path d="M262 384 Q300 410 338 384" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>'
EXPR={
 'grin':(dots(),B_UP,GRIN,'',''),
 'smile':(dots(),B_UP,SMILE,'',''),
 'money-eyes':(f'<text x="250" y="301" font-family="Inter,Arial" font-weight="900" font-size="46" text-anchor="middle" fill="#14A848" stroke="{INK}" stroke-width="2">$</text><text x="350" y="301" font-family="Inter,Arial" font-weight="900" font-size="46" text-anchor="middle" fill="#14A848" stroke="{INK}" stroke-width="2">$</text>',B_HIGH,GRIN.replace('Q344 430 300 434 Q256 430','Q344 440 300 444 Q256 440'),'',f'<circle cx="250" cy="284" r="36" fill="{LIME}" opacity=".6"/><circle cx="350" cy="284" r="36" fill="{LIME}" opacity=".6"/>'),
 'shocked':(f'<circle cx="250" cy="286" r="15" fill="#fff" stroke="{INK}" stroke-width="4"/><circle cx="350" cy="286" r="15" fill="#fff" stroke="{INK}" stroke-width="4"/><circle cx="250" cy="286" r="6" fill="{INK}"/><circle cx="350" cy="286" r="6" fill="{INK}"/>',B_HIGH,f'<ellipse cx="300" cy="404" rx="26" ry="32" fill="#5A1A16" stroke="{INK}" stroke-width="5"/><path d="M284 424 Q300 416 316 424 Q300 434 284 424 Z" fill="#F07A86"/>','',''),
 'wink':(f'<circle cx="252" cy="286" r="11" fill="{INK}"/><circle cx="256" cy="281" r="4" fill="#fff"/><path d="M332 288 Q350 274 368 288" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>',brow('M214 224 Q250 208 282 222','M320 240 Q350 232 384 238'),f'<path d="M264 392 Q314 402 350 372" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><path d="M344 368 Q356 372 354 384" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round"/>','',''),
 'thinking':(dots(6,-10),brow('M214 236 Q250 228 282 234','M318 220 Q350 204 386 222'),f'<path d="M272 394 Q290 386 306 394 Q318 398 330 390" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>','',''),
 'confused':(dots(),B_CONF,f'<path d="M266 396 Q280 386 294 396 Q308 406 322 396 Q330 390 336 394" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>',f'<text x="470" y="200" font-family="Inter,Arial" font-weight="900" font-size="84" fill="{VIOLET}" stroke="{INK}" stroke-width="4">?</text>',''),
 'laughing':(f'<path d="M228 292 Q250 270 272 292" fill="none" stroke="{INK}" stroke-width="8" stroke-linecap="round"/><path d="M328 292 Q350 270 372 292" fill="none" stroke="{INK}" stroke-width="8" stroke-linecap="round"/>',B_HIGH,GRIN.replace('Q344 430 300 434 Q256 430','Q346 446 300 450 Q254 446'),f'<path d="M196 306 C186 322 186 336 196 340 C206 336 206 322 196 306 Z" fill="#7CC8FF" stroke="{INK}" stroke-width="4"/><path d="M404 306 C394 322 394 336 404 340 C414 336 414 322 404 306 Z" fill="#7CC8FF" stroke="{INK}" stroke-width="4"/>',''),
 'serious':(dots(),B_FLAT,f'<path d="M270 392 L330 392" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>','',''),
 'crying':(dots(0,4,10),B_SAD,f'<path d="M266 402 Q282 384 300 396 Q318 384 334 402" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>',f'<path d="M236 312 L230 380 Q238 392 246 380 Z" fill="#7CC8FF" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/><path d="M364 312 L358 380 Q366 392 374 380 Z" fill="#7CC8FF" stroke="{INK}" stroke-width="4" stroke-linejoin="round"/>',''),
 'skeptical':(f'<path d="M232 286 L272 286" stroke="{INK}" stroke-width="8" stroke-linecap="round"/><circle cx="254" cy="292" r="9" fill="{INK}"/><circle cx="352" cy="288" r="11" fill="{INK}"/><circle cx="356" cy="283" r="4" fill="#fff"/>',brow('M214 240 Q250 236 282 240','M318 220 Q350 200 386 214'),f'<path d="M276 396 Q306 398 336 386" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>','',''),
 'star-struck':('<path d="M250 260 L257 276 L274 277 L261 288 L265 305 L250 296 L235 305 L239 288 L226 277 L243 276 Z" fill="#FFD43B" stroke="#0F1222" stroke-width="4" stroke-linejoin="round"/><path d="M350 260 L357 276 L374 277 L361 288 L365 305 L350 296 L335 305 L339 288 L326 277 L343 276 Z" fill="#FFD43B" stroke="#0F1222" stroke-width="4" stroke-linejoin="round"/>',B_HIGH,GRIN,'',''),
 'cool':('',brow('M214 232 L282 236','M318 236 L386 232'),f'<path d="M270 388 Q306 396 334 380" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>','',f'<circle cx="250" cy="284" r="38" fill="{INK}"/><circle cx="350" cy="284" r="38" fill="{INK}"/><path d="M228 272 L248 252" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".8"/><path d="M328 272 L348 252" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".8"/>'),
 'nervous':(dots(0,0,9),B_SAD,f'<rect x="262" y="380" width="76" height="30" rx="10" fill="#fff" stroke="{INK}" stroke-width="5"/><path d="M281 380 L281 410 M300 380 L300 410 M319 380 L319 410" stroke="{INK}" stroke-width="3"/>',f'<path d="M420 200 C406 226 404 244 420 250 C436 244 434 226 420 200 Z" fill="#7CC8FF" stroke="{INK}" stroke-width="4"/>',''),
 'angry':(dots(0,4,10),B_ANG,f'<path d="M270 404 Q300 386 330 404" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>',f'<path d="M440 160 l14 -14 m-6 22 l20 -4 m-28 -26 l4 -20" stroke="#FF4D4D" stroke-width="7" stroke-linecap="round"/>',''),
}
BADGE=True
def badge(cx,cy,r,fs):
  return f'<g id="badge"><circle cx="{cx}" cy="{cy}" r="{r}" fill="{LIME}" stroke="{INK}" stroke-width="5"/><text x="{cx}" y="{cy+fs*0.35:.0f}" font-family="Inter,Arial" font-weight="900" font-size="{fs}" text-anchor="middle" fill="{INK}">$</text></g>' if BADGE else ''

EXPR['laughing-hard']=(f'<path d="M226 296 L248 280 L272 296" fill="none" stroke="{INK}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M328 296 L352 280 L374 296" fill="none" stroke="{INK}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>',B_HIGH,GRIN.replace('Q344 430 300 434 Q256 430','Q350 454 300 458 Q250 454'),f'<path d="M190 300 C172 330 176 352 192 356 C206 350 204 324 190 300 Z" fill="#7CC8FF" stroke="{INK}" stroke-width="4"/><path d="M410 300 C428 330 424 352 408 356 C394 350 396 324 410 300 Z" fill="#7CC8FF" stroke="{INK}" stroke-width="4"/><text x="460" y="190" font-family="Inter,Arial" font-weight="900" font-size="54" fill="{VIOLET}" stroke="{INK}" stroke-width="3" transform="rotate(12 460 190)">HA</text>','')
EXPR['confident']=(f'<path d="M232 290 Q252 280 272 290" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><circle cx="252" cy="292" r="9" fill="{INK}"/><circle cx="352" cy="290" r="10" fill="{INK}"/><circle cx="355" cy="286" r="3.5" fill="#fff"/><path d="M332 288 Q352 278 372 288" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>',brow('M214 236 Q250 226 282 236','M318 226 Q350 210 386 224'),f'<path d="M262 384 Q300 404 346 374" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/><path d="M290 392 Q318 396 340 380 L338 388 Q316 402 292 398 Z" fill="#fff" stroke="{INK}" stroke-width="3"/>','','')
EXPR['curious']=(f'<circle cx="250" cy="286" r="13" fill="{INK}"/><circle cx="350" cy="286" r="13" fill="{INK}"/><circle cx="255" cy="280" r="5" fill="#fff"/><circle cx="355" cy="280" r="5" fill="#fff"/>',brow('M214 214 Q250 198 282 212','M318 228 Q350 220 386 230'),f'<ellipse cx="306" cy="398" rx="12" ry="14" fill="#5A1A16" stroke="{INK}" stroke-width="5"/>',f'<g transform="translate(450,150)"><circle cx="0" cy="0" r="30" fill="#fff" stroke="{INK}" stroke-width="7"/><path d="M20 22 L46 50" stroke="{INK}" stroke-width="10" stroke-linecap="round"/><circle cx="-8" cy="-8" r="7" fill="#EFEDFF"/></g>','')
EXPR['facepalm']=(f'<path d="M332 292 Q350 300 368 292" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>',B_SAD,f'<path d="M280 398 Q306 388 334 400" fill="none" stroke="{INK}" stroke-width="7" stroke-linecap="round"/>','','')
FACEPALM_HAND=f'<path d="M150 720 C170 600 210 420 252 330" fill="none" stroke="{INK}" stroke-width="70" stroke-linecap="round"/><path d="M150 720 C170 600 210 420 252 330" fill="none" stroke="{NAVY}" stroke-width="58" stroke-linecap="round"/><path d="M212 336 C200 290 214 236 252 220 C292 206 316 236 314 276 C312 306 298 330 272 342 Z" fill="{SKIN}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/><path d="M236 232 L240 300 M262 224 L264 300 M288 230 L286 296" stroke="{SKIN_SH}" stroke-width="4" stroke-linecap="round"/>'

def bust(name,hand=''):
  e,b,m,x,l=EXPR[name]
  return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 720">
<g id="body" stroke="{INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
 <path d="M196 520 C190 470 230 440 300 440 C370 440 410 470 404 520 Z" fill="{HOOD}"/>
 <path d="M60 720 C66 610 130 560 220 530 L380 530 C470 560 534 610 540 720 Z" fill="{NAVY}"/>
 <path d="M228 530 L372 530 L344 720 L256 720 Z" fill="{VIOLET}"/>
 <path d="M262 420 L262 540 Q300 566 338 540 L338 420 Z" fill="{SKIN}"/>
 <path d="M232 528 Q300 600 368 528 Q352 560 300 572 Q248 560 232 528 Z" fill="#7B6CF0"/>
 <path d="M220 530 L262 720 L226 720 L168 600 L204 584 L176 560 Z" fill="{LAPEL}"/>
 <path d="M380 530 L338 720 L374 720 L432 600 L396 584 L424 560 Z" fill="{LAPEL}"/>
</g>
<path d="M282 572 L278 650" stroke="{LIME}" stroke-width="7" stroke-linecap="round"/><path d="M318 572 L322 650" stroke="{LIME}" stroke-width="7" stroke-linecap="round"/>
<rect x="271" y="648" width="14" height="22" rx="5" fill="#fff" stroke="{INK}" stroke-width="4"/><rect x="315" y="648" width="14" height="22" rx="5" fill="#fff" stroke="{INK}" stroke-width="4"/>
{badge(404,616,20,26)}
<path d="M262 444 Q300 490 338 444 L338 486 Q300 510 262 486 Z" fill="{SKIN_SH}"/>
{head(e,b,m,x,l,hand)}
</svg>'''
# ---------- full body ----------
def arm(d,hand_xy,hand='fist'):
  hx,hy=hand_xy
  h=f'<circle cx="{hx}" cy="{hy}" r="30" fill="{SKIN}" stroke="{INK}" stroke-width="6"/>'
  if hand=='point': h=f'<rect x="{hx-9}" y="{hy-74}" width="18" height="56" rx="9" fill="{SKIN}" stroke="{INK}" stroke-width="6"/>'+h
  if hand=='thumb': h=f'<rect x="{hx-10}" y="{hy-66}" width="20" height="50" rx="10" fill="{SKIN}" stroke="{INK}" stroke-width="6"/>'+f'<rect x="{hx-30}" y="{hy-26}" width="60" height="52" rx="18" fill="{SKIN}" stroke="{INK}" stroke-width="6"/><path d="M{hx-26} {hy-6} L{hx+20} {hy-6} M{hx-26} {hy+10} L{hx+20} {hy+10}" stroke="{SKIN_SH}" stroke-width="4" stroke-linecap="round"/>'
  if hand=='palm': h=f'<ellipse cx="{hx}" cy="{hy}" rx="34" ry="24" fill="{SKIN}" stroke="{INK}" stroke-width="6"/><path d="M{hx-22} {hy-14} L{hx-26} {hy-34} M{hx-6} {hy-20} L{hx-6} {hy-42} M{hx+10} {hy-20} L{hx+12} {hy-40} M{hx+24} {hy-12} L{hx+30} {hy-30}" stroke="{INK}" stroke-width="16" stroke-linecap="round"/><path d="M{hx-22} {hy-14} L{hx-26} {hy-34} M{hx-6} {hy-20} L{hx-6} {hy-42} M{hx+10} {hy-20} L{hx+12} {hy-40} M{hx+24} {hy-12} L{hx+30} {hy-30}" stroke="{SKIN}" stroke-width="8" stroke-linecap="round"/>'
  return f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="66" stroke-linecap="round"/><path d="{d}" fill="none" stroke="{NAVY}" stroke-width="54" stroke-linecap="round"/>{h}'
POSES={
 'idle':('grin',[('M186 600 C160 660 156 760 166 850',(166,880),'fist'),('M414 600 C440 660 444 760 434 850',(434,880),'fist')]),
 'pointing':('grin',[('M186 600 C160 660 156 760 166 850',(166,880),'fist'),('M414 600 C470 560 500 480 508 420',(510,410),'point')]),
 'celebrating':('laughing',[('M186 600 C130 560 106 480 100 410',(98,390),'fist'),('M414 600 C470 560 494 480 500 410',(502,390),'fist')]),
 'thumbs-up':('grin',[('M186 600 C160 660 156 760 166 850',(166,880),'fist'),('M414 600 C470 640 500 620 512 560',(514,540),'thumb')]),
 'explaining':('smile',[('M186 600 C160 660 156 760 166 850',(166,880),'fist'),('M414 600 C450 680 470 720 500 740',(512,736),'palm')]),
 'shrug':('wink',[('M186 600 C140 680 120 730 96 730',(84,722),'palm'),('M414 600 C460 680 480 730 504 730',(516,722),'palm')]),
}
def full(pose):
  ex,arms=POSES[pose]; e,b,m,x,l=EXPR[ex]
  back=''.join(arm(*a) for a in arms if pose in('celebrating','pointing','thumbs-up') and a[1][1]<600)
  front=''.join(arm(*a) for a in arms if not(pose in('celebrating','pointing') and a[1][1]<500))
  return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 1380">
<g stroke="{INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
 <path d="M190 900 L410 900 L404 1300 L316 1300 L300 1010 L284 1300 L196 1300 Z" fill="#2E3A5C"/>
 <path d="M188 1294 L292 1294 C304 1296 306 1330 298 1344 L174 1344 C162 1338 166 1306 188 1294 Z" fill="#fff"/>
 <path d="M308 1294 L412 1294 C434 1306 438 1338 426 1344 L302 1344 C294 1330 296 1296 308 1294 Z" fill="#fff"/>
</g>
<path d="M178 1334 L296 1334" stroke="{LIME}" stroke-width="8"/><path d="M304 1334 L422 1334" stroke="{LIME}" stroke-width="8"/>
{back}
<g stroke="{INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
 <path d="M214 566 C210 512 250 486 300 486 C350 486 390 512 386 566 Z" fill="{HOOD}"/>
 <path d="M168 574 C150 640 154 760 174 920 L426 920 C446 760 450 640 432 574 C400 548 360 540 300 540 C240 540 200 548 168 574 Z" fill="{NAVY}"/>
 <path d="M250 546 L350 546 L330 920 L270 920 Z" fill="{VIOLET}"/>
 <path d="M262 420 L262 552 Q300 578 338 552 L338 420 Z" fill="{SKIN}"/>
 <path d="M248 544 Q300 604 352 544 Q340 572 300 582 Q260 572 248 544 Z" fill="#7B6CF0"/>
 <path d="M250 546 L284 780 L260 780 L212 650 L236 636 L212 604 Z" fill="{LAPEL}"/>
 <path d="M350 546 L316 780 L340 780 L388 650 L364 636 L388 604 Z" fill="{LAPEL}"/>
</g>
<path d="M284 590 L282 680" stroke="{LIME}" stroke-width="7" stroke-linecap="round"/><path d="M316 590 L318 680" stroke="{LIME}" stroke-width="7" stroke-linecap="round"/>
<rect x="275" y="678" width="14" height="22" rx="5" fill="#fff" stroke="{INK}" stroke-width="4"/><rect x="311" y="678" width="14" height="22" rx="5" fill="#fff" stroke="{INK}" stroke-width="4"/>
{badge(372,680,18,24)}
<path d="M262 444 Q300 490 338 444 L338 486 Q300 510 262 486 Z" fill="{SKIN_SH}"/>
{front}
{head(e,b,m,x,l)}
</svg>'''
import sys
order=['grin','smile','money-eyes','shocked','wink','thinking','confused','laughing','laughing-hard','serious','crying','skeptical','star-struck','cool','nervous','angry','confident','curious','facepalm']
def write_all(base,badge=True):
  global BADGE; BADGE=badge
  os.makedirs(base+'/expressions',exist_ok=True); os.makedirs(base+'/poses',exist_ok=True)
  for n in order: open(f'{base}/expressions/{n}.svg','w').write(bust(n, FACEPALM_HAND if n=='facepalm' else ''))
  for p in POSES: open(f'{base}/poses/{p}.svg','w').write(full(p))
root=sys.argv[1] if len(sys.argv)>1 else OUT
write_all(root+'/svg',True); write_all(root+'/svg-no-badge',False)
print(len(order),'expressions',len(POSES),'poses')
