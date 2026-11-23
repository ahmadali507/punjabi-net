/**
 * Illustrated scenes for lyric reels: small hand-drawn SVG landscapes in the punjabii.net palette (ink, gold,
 * paper), shown in a Mughal-arch window above the verse, one per verse (posts.json: "scenes": ["river", …]).
 * Moving parts carry a class that reel.mjs animates: .tw (twinkle), .drift (slow move right), .bob (float),
 * .spin (turn about its own centre), .sway (rock), .shim (water shimmer).
 */
const INK = '#23211d', GOLD = '#c9962a', DEEP = '#855c00';

export const ARCH = 'M0 520 V215 C0 128 150 78 262 46 C292 37 310 16 320 0 C330 16 348 37 378 46 C490 78 640 128 640 215 V520 Z';

const sky = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const glow = (id, c) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity=".9"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
let s = 7;
const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const stars = (n, h) => Array.from({ length: n }, () => `<circle class="tw" cx="${(r() * 640).toFixed(0)}" cy="${(30 + r() * h).toFixed(0)}" r="${(0.8 + r() * 1.8).toFixed(1)}" fill="#f6e7c1" style="--d:${(1.6 + r() * 2.4).toFixed(1)}s;--k:${(r() * 2).toFixed(1)}s"/>`).join('');
const bird = (x, y, k = 1) => `<path d="M${x} ${y} q${6 * k} ${-6 * k} ${12 * k} 0 q${6 * k} ${-6 * k} ${12 * k} 0" fill="none" stroke="${INK}" stroke-width="${2.2 * k}" stroke-linecap="round"/>`;
const reeds = (x0, n, y, c) => Array.from({ length: n }, (_, i) => { const x = x0 + i * 9 + r() * 6, h = 40 + r() * 50; return `<path class="sway" style="--k:${(r() * 2).toFixed(1)}s;transform-origin:${x}px ${y}px" d="M${x} ${y} q${(r() * 10 - 5).toFixed(0)} ${-h / 2} ${(r() * 14 - 7).toFixed(0)} ${-h}" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`; }).join('');

const SCENES = {
  // night: a shrine under a crescent moon, small lamps glowing at its door (dargah, urs, longing at night)
  night: (u) => `<defs>${sky(`k${u}`, [[0, '#1d2236'], [0.6, '#3e3550'], [1, '#8a6342']])}${glow(`g${u}`, GOLD)}</defs>
<rect width="640" height="520" fill="url(#k${u})"/>${stars(60, 300)}
<circle cx="470" cy="120" r="44" fill="#f3dfae"/><circle cx="490" cy="106" r="40" fill="#2c2a44"/>
<g fill="${INK}"><rect x="210" y="330" width="220" height="190"/><path d="M230 332 C230 250 320 220 320 200 C320 220 410 250 410 332 Z"/><rect x="316" y="176" width="8" height="30"/>
<rect x="168" y="250" width="26" height="270"/><path d="M164 252 q17 -40 34 0 Z"/><rect x="446" y="250" width="26" height="270"/><path d="M442 252 q17 -40 34 0 Z"/>
<rect x="0" y="470" width="640" height="50"/></g>
<path d="M298 520 V430 q22 -34 44 0 V520 Z" fill="#e7b864" opacity=".85"/>
${[250, 280, 360, 390].map((x, i) => `<circle class="tw" style="--d:${1.2 + i * 0.3}s" cx="${x}" cy="462" r="16" fill="url(#g${u})"/><circle cx="${x}" cy="462" r="3.2" fill="#ffe3a0"/>`).join('')}`,

  // river: the Chenab at dusk, a lone boat crossing, reeds on the bank (Sohni, the far shore)
  river: (u) => `<defs>${sky(`k${u}`, [[0, '#f4dcaa'], [0.55, '#e9b765'], [1, '#c98b3e']])}${glow(`g${u}`, '#fff1c8')}</defs>
<rect width="640" height="520" fill="url(#k${u})"/><circle cx="320" cy="300" r="140" fill="url(#g${u})" opacity=".7"/><circle cx="320" cy="300" r="56" fill="#f8e2a8"/>
<path d="M0 300 Q120 270 230 296 T460 288 T640 298 V330 H0 Z" fill="#9a6a3a" opacity=".55"/>
<rect y="318" width="640" height="202" fill="#7a5a3c"/>
${Array.from({ length: 9 }, (_, i) => `<path class="shim" style="--k:${(i * 0.37).toFixed(2)}s" d="M${40 + (i * 67) % 520} ${340 + i * 18} h${50 + (i % 3) * 30}" stroke="#f2cf87" stroke-width="3" stroke-linecap="round" opacity=".55"/>`).join('')}
<g class="drift" style="--x:120px"><g class="bob"><path d="M200 392 Q262 418 330 392 L318 404 Q262 424 212 404 Z" fill="${INK}"/><path d="M262 392 V346" stroke="${INK}" stroke-width="3"/><circle cx="282" cy="366" r="7" fill="${INK}"/><path d="M276 392 q2 -18 8 -20 q6 2 6 20 Z" fill="${INK}"/><path d="M292 372 L330 402" stroke="${INK}" stroke-width="2.4"/></g></g>
<path d="M0 520 V470 Q90 440 170 476 T320 520 Z" fill="${INK}"/>${reeds(10, 14, 478, INK)}
${bird(430, 150)}${bird(470, 175, 0.8)}${bird(400, 190, 0.7)}`,

  // desert: dunes and a camel caravan under a low sun (Sassi, the journey, the beloved gone ahead)
  desert: (u) => `<defs>${sky(`k${u}`, [[0, '#f7e6c0'], [1, '#efbf74']])}${glow(`g${u}`, '#fff3cf')}</defs>
<rect width="640" height="520" fill="url(#k${u})"/><circle cx="180" cy="230" r="120" fill="url(#g${u})"/><circle cx="180" cy="230" r="48" fill="#f9e1a2"/>
<path d="M0 330 Q160 270 320 320 T640 300 V520 H0 Z" fill="#dca75b"/><path d="M0 390 Q200 330 380 380 T640 360 V520 H0 Z" fill="#c48a3d"/>
<g class="drift" style="--x:70px" fill="${INK}">${[0, 70, 140].map((d) => `<path transform="translate(${330 + d} 300) scale(.9)" d="M0 40 q4 -14 12 -16 q6 -18 18 -8 q8 -14 20 -2 q6 2 8 -6 q4 -14 12 -10 l2 8 q-6 2 -6 10 l-4 22 h-4 l-2 -18 h-24 l-4 18 h-4 l-2 -18 q-8 2 -10 12 l-2 8 h-4 Z"/>`).join('')}</g>
<path d="M0 450 Q240 400 420 450 T640 440 V520 H0 Z" fill="#a36a2a"/>
<path d="M60 520 Q110 470 190 500" stroke="${DEEP}" stroke-width="2" fill="none" opacity=".5"/>`,

  // dervish: a whirling faqir in a burst of light (ecstasy, dhamal, losing the self)
  dervish: (u) => `<defs>${glow(`g${u}`, GOLD)}${sky(`k${u}`, [[0, '#2a2436'], [1, '#5a3f36']])}</defs>
<rect width="640" height="520" fill="url(#k${u})"/>
<g class="spin" style="--d:40s;transform-origin:320px 300px">${Array.from({ length: 24 }, (_, i) => `<path d="M320 300 L${320 + 520 * Math.cos((i * Math.PI) / 12)} ${300 + 520 * Math.sin((i * Math.PI) / 12)} L${320 + 520 * Math.cos(((i + 0.4) * Math.PI) / 12)} ${300 + 520 * Math.sin(((i + 0.4) * Math.PI) / 12)} Z" fill="${GOLD}" opacity=".12"/>`).join('')}</g>
<circle cx="320" cy="300" r="200" fill="url(#g${u})" opacity=".55"/>
<g class="sway" style="--d:3s;transform-origin:320px 470px" fill="${INK}">
<rect x="309" y="140" width="22" height="46" rx="8"/><circle cx="320" cy="200" r="16"/>
<path d="M300 216 L340 216 L346 300 L294 300 Z"/><path d="M302 228 Q250 200 226 160" stroke="${INK}" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M338 228 Q388 238 414 214" stroke="${INK}" stroke-width="11" stroke-linecap="round" fill="none"/>
<path d="M296 296 Q220 400 196 470 Q320 500 444 470 Q420 400 344 296 Z"/>
<path d="M200 466 Q320 492 440 466" stroke="${GOLD}" stroke-width="3" fill="none" opacity=".7"/></g>
<rect y="490" width="640" height="30" fill="${INK}"/>${stars(24, 140)}`,

  // village: a spinning wheel under the kikar tree at evening (Bulleh's charkha, the trinjan, the household)
  village: (u) => `<defs>${sky(`k${u}`, [[0, '#f2e0b8'], [1, '#e2ad62']])}</defs>
<rect width="640" height="520" fill="url(#k${u})"/>
<path d="M0 410 Q200 380 400 404 T640 396 V520 H0 Z" fill="#b98545"/>
<g fill="${INK}"><path d="M470 420 Q478 330 462 270 Q500 300 492 420 Z"/><path d="M462 300 Q430 260 400 262 M480 290 Q520 250 556 252" stroke="${INK}" stroke-width="7" fill="none"/>
<ellipse cx="400" cy="250" rx="70" ry="30"/><ellipse cx="480" cy="216" rx="88" ry="36"/><ellipse cx="560" cy="248" rx="64" ry="28"/><ellipse cx="500" cy="262" rx="60" ry="22"/></g>
<g transform="translate(220 380)"><g class="spin" style="--d:6s;transform-origin:0 0"><circle r="62" fill="none" stroke="${INK}" stroke-width="5"/>${Array.from({ length: 8 }, (_, i) => `<path d="M0 0 L${62 * Math.cos((i * Math.PI) / 4)} ${62 * Math.sin((i * Math.PI) / 4)}" stroke="${INK}" stroke-width="3"/>`).join('')}<circle r="8" fill="${INK}"/></g>
<path d="M-10 0 L-40 82 M10 0 L40 82 M-70 84 H170" stroke="${INK}" stroke-width="6"/><path d="M8 -20 L130 40" stroke="${DEEP}" stroke-width="1.6"/><rect x="120" y="34" width="34" height="14" rx="6" fill="${INK}"/></g>
<rect y="462" width="640" height="58" fill="#8d6332"/>${bird(120, 120)}${bird(160, 140, 0.8)}`,

  // cranes: a skein of koonjan crossing the dawn sky over far hills (separation, messages to the beloved)
  cranes: (u) => `<defs>${sky(`k${u}`, [[0, '#d9dfd6'], [0.6, '#f0d7a6'], [1, '#e3a65c']])}${glow(`g${u}`, '#fff4d2')}</defs>
<rect width="640" height="520" fill="url(#k${u})"/><circle cx="460" cy="360" r="130" fill="url(#g${u})"/><circle cx="460" cy="360" r="44" fill="#fae3a6"/>
<path d="M0 380 Q120 320 240 370 T480 350 T640 370 V520 H0 Z" fill="#9e8a7a" opacity=".6"/><path d="M0 430 Q160 380 330 430 T640 420 V520 H0 Z" fill="#6e5a48"/>
<g class="drift" style="--x:150px">${[[150, 150, 1.4], [120, 172, 1.2], [180, 172, 1.2], [92, 194, 1], [210, 194, 1], [64, 216, 0.9], [238, 216, 0.9]].map(([x, y, k]) => `<g class="bob" style="--k:${(x / 100).toFixed(1)}s">${bird(x, y, k)}</g>`).join('')}</g>
<path d="M0 520 V480 Q320 450 640 480 V520 Z" fill="${INK}"/>`,
  // lamp: one diya burning in a dark wall niche (the self that lives on, a vigil, life barely held)
  lamp: (u) => `<defs>${sky(`k${u}`, [[0, '#2a221c'], [1, '#120f0c']])}${glow(`g${u}`, '#f2b84b')}</defs>
<rect width="640" height="520" fill="url(#k${u})"/>
<path d="M200 470 V250 C200 180 270 150 320 120 C370 150 440 180 440 250 V470 Z" fill="#0b0908" stroke="${DEEP}" stroke-width="3" opacity=".95"/>
<circle class="tw" style="--d:1.4s" cx="320" cy="370" r="150" fill="url(#g${u})" opacity=".8"/>
<path d="M276 420 Q320 452 364 420 Q352 406 320 404 Q288 406 276 420 Z" fill="${DEEP}"/><path d="M356 412 L378 404" stroke="${DEEP}" stroke-width="5" stroke-linecap="round"/>
<g class="sway" style="--d:1.1s;transform-origin:320px 404px"><path d="M320 404 C302 386 310 360 320 340 C330 360 338 386 320 404 Z" fill="#ffd27a"/><path d="M320 400 C312 390 314 376 320 364 C326 376 328 390 320 400 Z" fill="#fff3cf"/></g>
<rect y="470" width="640" height="50" fill="#0b0908"/>${Array.from({ length: 10 }, (_, i) => `<circle class="tw" style="--d:${(2 + (i % 4) * 0.7).toFixed(1)}s;--k:${(i * 0.3).toFixed(1)}s" cx="${250 + (i * 37) % 140}" cy="${200 + (i * 53) % 150}" r="1.6" fill="#f6d692" opacity=".7"/>`).join('')}`,

  // snake: a snake in the grass at first light (dawn that stings, poison rising)
  snake: (u) => `<defs>${sky(`k${u}`, [[0, '#6f6a73'], [0.55, '#d79a5a'], [1, '#e8b26a']])}${glow(`g${u}`, '#ffd99a')}</defs>
<rect width="640" height="520" fill="url(#k${u})"/><circle cx="420" cy="330" r="150" fill="url(#g${u})" opacity=".8"/><path d="M360 330 A60 60 0 0 1 480 330 Z" fill="#f6cf86"/>
<path d="M0 330 Q160 314 320 326 T640 322 V520 H0 Z" fill="#4a3a2c"/>
<path d="M0 520 V410 Q120 380 250 404 T520 396 T640 410 V520 Z" fill="${INK}"/>
${reeds(20, 18, 420, INK)}${reeds(470, 16, 412, INK)}
<g transform="translate(-30 -95) scale(1.12)"><g class="sway" style="--d:4s;transform-origin:300px 470px"><path d="M150 470 C200 430 250 500 300 460 S380 400 400 430 S420 470 455 440" stroke="${INK}" stroke-width="16" fill="none" stroke-linecap="round"/>
<path d="M150 470 C200 430 250 500 300 460 S380 400 400 430 S420 470 455 440" stroke="${DEEP}" stroke-width="3" fill="none" stroke-dasharray="4 14" opacity=".8"/>
<ellipse cx="462" cy="434" rx="16" ry="10" fill="${INK}" transform="rotate(-30 462 434)"/><path d="M476 426 l14 -6 m-14 6 l12 4" stroke="#b33a2a" stroke-width="2"/></g></g>
${bird(140, 130, 0.8)}${bird(180, 150, 0.6)}`,

  // jungle: the city turned to jungle — dark trees grown over the skyline, eyes in the thicket (fear within)
  jungle: (u) => `<defs>${sky(`k${u}`, [[0, '#1b2420'], [0.7, '#3c4a3a'], [1, '#6b6040']])}${glow(`g${u}`, '#d9c27a')}</defs>
<rect width="640" height="520" fill="url(#k${u})"/><circle cx="160" cy="110" r="34" fill="#e6dcb5" opacity=".85"/>
<g fill="#2b2f29"><rect x="60" y="250" width="60" height="200"/><rect x="130" y="210" width="44" height="240"/><path d="M190 300 h90 v150 h-90 Z"/><path d="M200 300 q35 -60 70 0 Z"/><rect x="232" y="200" width="6" height="60"/>
<rect x="300" y="230" width="50" height="220"/><rect x="370" y="270" width="70" height="180"/><rect x="452" y="190" width="18" height="260"/><path d="M448 192 q13 -30 26 0 Z"/><rect x="490" y="240" width="80" height="210"/></g>
${Array.from({ length: 7 }, (_, i) => { const x = 20 + i * 100; return `<g class="sway" style="--d:${(4 + i * 0.4).toFixed(1)}s;--k:${(i * 0.5).toFixed(1)}s;transform-origin:${x}px 520px" fill="${INK}"><path d="M${x - 8} 520 Q${x - 4} 400 ${x} 300 Q${x + 4} 400 ${x + 10} 520 Z"/><ellipse cx="${x}" cy="${300 + (i % 3) * 20}" rx="${60 + (i % 2) * 20}" ry="${70 + (i % 3) * 10}"/><ellipse cx="${x + 30}" cy="${360 + (i % 2) * 20}" rx="50" ry="44"/></g>`; }).join('')}
${[[140, 430], [330, 400], [520, 440], [250, 470]].map(([x, y], i) => `<g class="tw" style="--d:${(2.6 + i * 0.5).toFixed(1)}s;--k:${i}s"><ellipse cx="${x}" cy="${y}" rx="5" ry="3" fill="#e9c75a"/><ellipse cx="${x + 16}" cy="${y}" rx="5" ry="3" fill="#e9c75a"/></g>`).join('')}
${Array.from({ length: 14 }, (_, i) => `<circle class="tw" style="--d:${(1.5 + (i % 5) * 0.5).toFixed(1)}s;--k:${(i * 0.21).toFixed(2)}s" cx="${(i * 47) % 620 + 10}" cy="${330 + (i * 29) % 160}" r="2.2" fill="#f3e08a"/>`).join('')}`,

  // sword: a blade hanging by a thread over a bowed, silenced figure (speech forbidden, a sword over the head)
  sword: (u) => `<defs>${sky(`k${u}`, [[0, '#2a1a18'], [1, '#6a3a26']])}${glow(`g${u}`, '#e0a24a')}</defs>
<rect width="640" height="520" fill="url(#k${u})"/><circle cx="320" cy="420" r="220" fill="url(#g${u})" opacity=".45"/>
<g class="sway" style="--d:5s;transform-origin:320px 0px"><path d="M320 0 V120" stroke="#d8c39a" stroke-width="1.4"/>
<path d="M320 120 v10 M298 136 h44" stroke="${GOLD}" stroke-width="7" stroke-linecap="round"/><rect x="314" y="122" width="12" height="18" fill="${DEEP}"/>
<path d="M312 140 H328 L326 286 L320 304 L314 286 Z" fill="#cfc6b4"/><path d="M320 142 V292" stroke="#8a8274" stroke-width="1.5"/></g>
<g fill="${INK}"><circle cx="320" cy="368" r="22"/><path d="M286 392 Q320 376 354 392 Q372 430 380 470 H260 Q268 430 286 392 Z"/><path d="M230 470 H410 Q420 488 400 496 H240 Q220 488 230 470 Z"/></g>
<rect y="490" width="640" height="30" fill="${INK}"/>`,

  // well: a Persian wheel (rehat) turning, its pots lifting water to a thirsty field (eyes turned like wells)
  well: (u) => `<defs>${sky(`k${u}`, [[0, '#e9e1c8'], [1, '#e7bf7c']])}${glow(`g${u}`, '#fff1c8')}</defs>
<rect width="640" height="520" fill="url(#k${u})"/><circle cx="500" cy="140" r="90" fill="url(#g${u})"/><circle cx="500" cy="140" r="34" fill="#f9e2a6"/>
<path d="M0 360 Q200 340 400 356 T640 350 V520 H0 Z" fill="#a98a54"/>
${Array.from({ length: 8 }, (_, i) => `<path d="M${330 + i * 40} 520 L${420 + i * 28} 370" stroke="#7c8a4a" stroke-width="5" opacity=".7"/>`).join('')}
<rect x="40" y="420" width="250" height="100" fill="#6d5236"/><ellipse cx="165" cy="420" rx="125" ry="22" fill="#3b2c1e"/>
<g transform="translate(165 330)"><g class="spin" style="--d:9s;transform-origin:0 0"><circle r="88" fill="none" stroke="${INK}" stroke-width="6"/><circle r="70" fill="none" stroke="${INK}" stroke-width="2"/>
${Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6, c = Math.cos(a), s2 = Math.sin(a); return `<path d="M0 0 L${(88 * c).toFixed(1)} ${(88 * s2).toFixed(1)}" stroke="${INK}" stroke-width="3"/><path transform="translate(${(96 * c).toFixed(1)} ${(96 * s2).toFixed(1)}) rotate(${(i * 30).toFixed(0)})" d="M-9 -7 h18 l-3 14 h-12 Z" fill="${DEEP}"/>`; }).join('')}
<circle r="12" fill="${INK}"/></g><path d="M-6 0 L-60 90 M6 0 L60 90" stroke="${INK}" stroke-width="8"/></g>
${Array.from({ length: 5 }, (_, i) => `<path class="shim" style="--k:${(i * 0.5).toFixed(1)}s" d="M${255 + i * 6} ${410 + i * 3} q30 4 60 -2" stroke="#9fc4d0" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('')}
<g fill="${INK}" transform="translate(410 330)"><path d="M0 40 q0 -30 30 -32 h50 q18 0 22 -16 q10 -8 16 2 l-4 10 q12 4 6 14 l-14 2 q-6 14 -14 18 v34 h-8 l-2 -30 h-44 l-4 30 h-8 v-34 q-14 -4 -16 -24 Z"/></g>
<rect y="490" width="640" height="30" fill="#5d4126"/>`,
  // namaz: a worshipper in sajda on a prayer mat before a mosque at dawn (the five prayers, the namazi)
  namaz: (u) => `<defs>${sky(`k${u}`, [[0, '#2f3550'], [0.5, '#a5779a'], [1, '#f0c27c']])}${glow(`g${u}`, '#ffe6b0')}</defs>
<rect width="640" height="520" fill="url(#k${u})"/>${stars(26, 120)}
<circle cx="320" cy="330" r="190" fill="url(#g${u})" opacity=".55"/>
<circle cx="520" cy="78" r="22" fill="#f6e5b8"/><circle cx="530" cy="70" r="20" fill="#3a3a58"/>
<g fill="#3a2c33"><path d="M210 330 Q210 230 320 214 Q430 230 430 330 Z"/><rect x="316" y="180" width="8" height="38"/><circle cx="320" cy="178" r="7"/>
<rect x="170" y="330" width="300" height="120"/><rect x="128" y="196" width="24" height="254"/><path d="M124 198 q16 -44 32 0 Z"/><rect x="488" y="196" width="24" height="254"/><path d="M484 198 q16 -44 32 0 Z"/>
<rect x="122" y="250" width="36" height="8"/><rect x="482" y="250" width="36" height="8"/></g>
<path d="M290 450 V392 q30 -44 60 0 V450 Z" fill="#f2c069" opacity=".9"/>
${[214, 254, 386, 426].map((x) => `<path d="M${x} 410 V378 q10 -16 20 0 V410 Z" fill="#f2c069" opacity=".55"/>`).join('')}
<rect y="446" width="640" height="74" fill="${INK}"/>
<path d="M200 494 L440 494 L452 476 L212 476 Z" fill="${DEEP}"/><path d="M214 480 H438" stroke="${GOLD}" stroke-width="2" stroke-dasharray="6 6"/>
<g fill="#0e0c0a" transform="translate(320 486) scale(1.35) translate(-320 -486)"><path d="M366 486 L344 486 Q332 470 336 446 Q340 432 352 430 Q330 424 304 444 Q290 456 286 470 L300 478 Q312 470 322 464 L330 486 Z"/>
<circle cx="279" cy="474" r="11"/><path d="M270 468 q9 -12 18 0 Z" fill="#efe4cc"/><path d="M300 470 L262 486" stroke="#0e0c0a" stroke-width="5" stroke-linecap="round"/><path d="M344 486 H376" stroke="#0e0c0a" stroke-width="5" stroke-linecap="round"/></g>`,

  // ghazi: a rider coming home from battle at sunset, sword raised, banner flying (the ghazi, the victor)
  ghazi: (u) => `<defs>${sky(`k${u}`, [[0, '#5a2f2a'], [0.55, '#c8643a'], [1, '#efb262']])}${glow(`g${u}`, '#ffd08a')}</defs>
<rect width="640" height="520" fill="url(#k${u})"/><circle cx="470" cy="300" r="170" fill="url(#g${u})" opacity=".7"/><circle cx="470" cy="300" r="60" fill="#f7cf87"/>
<g fill="#4a2a22" opacity=".85"><rect x="480" y="250" width="120" height="170"/><path d="M500 250 q40 -60 80 0 Z"/><rect x="452" y="230" width="28" height="190"/><rect x="600" y="230" width="28" height="190"/><path d="M520 420 V340 q20 -28 40 0 V420 Z" fill="#f2b866"/></g>
<path d="M0 400 Q200 370 400 396 T640 390 V520 H0 Z" fill="#7a4026"/>
${Array.from({ length: 7 }, (_, i) => `<circle class="tw" style="--d:${(2 + i * 0.3).toFixed(1)}s" cx="${60 + i * 26}" cy="${440 - (i % 3) * 10}" r="${10 + (i % 3) * 5}" fill="#c99868" opacity=".35"/>`).join('')}
<g class="drift" style="--x:90px"><g class="bob" fill="${INK}">
<path d="M120 420 q-10 -40 20 -58 q40 -16 100 -8 q22 -26 40 -30 l14 -8 q8 4 2 14 l-6 10 q10 18 0 30 q-14 -4 -22 4 q-6 30 -24 40 l8 46 h-10 l-14 -40 h-60 l-14 40 h-10 l6 -44 q-26 6 -40 -4 Z"/>
<path d="M126 380 q-30 10 -44 40" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/>
<path d="M186 352 q-6 -30 6 -44 q14 -10 26 0 q8 16 0 44 Z"/><circle cx="204" cy="294" r="12"/><path d="M190 286 q14 -18 28 0 Z" fill="${DEEP}"/>
<path d="M214 318 L262 266" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M258 270 L300 210" stroke="#e6dcc4" stroke-width="5" stroke-linecap="round"/>
<path d="M190 318 L160 220" stroke="${INK}" stroke-width="4"/><path class="sway" style="--d:1.6s;transform-origin:160px 222px" d="M160 222 q30 -6 46 6 q-20 10 -44 6 Z" fill="${GOLD}"/></g></g>
${bird(300, 120)}${bird(340, 140, 0.8)}`,

  // qazi: a judge on the high seat of justice, the scales above him, a petitioner bowed before him (the qazi)
  qazi: (u) => `<defs>${sky(`k${u}`, [[0, '#3a2a22'], [1, '#7a5233']])}${glow(`g${u}`, '#f3c675')}</defs>
<rect width="640" height="520" fill="url(#k${u})"/>
<path d="M140 520 V220 C140 140 260 100 320 70 C380 100 500 140 500 220 V520 Z" fill="#5b3b28" stroke="${GOLD}" stroke-width="3" opacity=".9"/>
<circle cx="320" cy="250" r="190" fill="url(#g${u})" opacity=".45"/>
<g transform="translate(320 130)"><g class="sway" style="--d:4.5s;transform-origin:0 0"><path d="M0 0 V24 M-70 24 H70" stroke="${GOLD}" stroke-width="4"/><path d="M-70 24 L-90 70 M-70 24 L-50 70 M70 24 L50 70 M70 24 L90 70" stroke="${GOLD}" stroke-width="1.6"/>
<path d="M-96 70 q26 20 52 0 Z" fill="${GOLD}"/><path d="M44 70 q26 20 52 0 Z" fill="${GOLD}"/></g><circle r="7" fill="${GOLD}"/></g>
<g fill="${INK}"><rect x="250" y="300" width="140" height="18" rx="4"/><rect x="262" y="318" width="14" height="150"/><rect x="364" y="318" width="14" height="150"/><path d="M256 234 V300 H384 V234 q-64 -26 -128 0 Z" fill="#2c1d16"/>
<path d="M286 300 q-2 -44 34 -52 q36 8 34 52 Z"/><circle cx="320" cy="232" r="17"/><path d="M300 226 q20 -30 40 0 q-20 -8 -40 0 Z" fill="#efe4cc"/><path d="M314 246 q6 18 12 0 Z" fill="#d8cdb6"/>
<rect x="340" y="282" width="34" height="22" fill="${DEEP}"/><path d="M357 282 V304" stroke="${GOLD}" stroke-width="1.5"/></g>
<rect y="468" width="640" height="52" fill="#24170f"/><path d="M180 468 H460" stroke="${GOLD}" stroke-width="2" opacity=".6"/>
<g fill="${INK}"><path d="M120 466 q4 -36 30 -40 q22 4 34 24 l10 16 Z"/><circle cx="196" cy="456" r="10"/></g>
<g fill="${INK}"><path d="M520 466 q-4 -36 -30 -40 q-22 4 -34 24 l-10 16 Z"/><circle cx="444" cy="456" r="10"/></g>`,

  // laila: Laila's curtained litter (mahmil) carried away on a camel by night, Majnu left behind reaching after it
  laila: (u) => `<defs>${sky(`k${u}`, [[0, '#141a30'], [0.6, '#3b3352'], [1, '#9a6a48']])}${glow(`g${u}`, '#f5dca0')}</defs>
<rect width="640" height="520" fill="url(#k${u})"/>${stars(70, 260)}
<circle cx="150" cy="110" r="40" fill="#f4e3b4"/><circle cx="150" cy="110" r="110" fill="url(#g${u})" opacity=".35"/>
<path d="M0 360 Q180 310 360 350 T640 330 V520 H0 Z" fill="#6a4a36"/><path d="M0 430 Q220 380 420 420 T640 410 V520 H0 Z" fill="#4a3226"/>
<g class="drift" style="--x:110px"><g fill="${INK}">
<path d="M420 352 L414 424 M442 356 L440 424 M500 356 L504 424 M522 350 L530 424" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
<ellipse cx="470" cy="334" rx="72" ry="30"/><ellipse cx="462" cy="310" rx="42" ry="26"/>
<path d="M530 330 Q566 312 560 262" stroke="${INK}" stroke-width="18" fill="none" stroke-linecap="round"/><ellipse cx="572" cy="256" rx="20" ry="10"/>
<path d="M400 330 q-14 10 -12 30" stroke="${INK}" stroke-width="5" fill="none"/>
<g transform="translate(408 262)"><g><path d="M10 26 q0 -52 44 -64 q44 12 44 64 Z" fill="#7a2f2a"/><path d="M54 -38 v-14" stroke="${GOLD}" stroke-width="3"/><circle cx="54" cy="-54" r="5" fill="${GOLD}"/>
<path d="M4 26 h100" stroke="${GOLD}" stroke-width="4"/><path d="M8 26 q-4 18 4 30 M100 26 q4 18 -4 30" stroke="#7a2f2a" stroke-width="6" fill="none"/><path d="M28 24 q0 -34 26 -46 q26 12 26 46" fill="none" stroke="${GOLD}" stroke-width="1.6"/>
<circle class="tw" style="--d:2s" cx="54" cy="6" r="18" fill="url(#g${u})"/></g></g></g></g>
<g fill="#0e0b0a"><path d="M120 444 q-6 -40 6 -62 q10 -14 22 -4 q10 22 4 66 Z"/><circle cx="140" cy="362" r="14"/>
<path d="M128 356 q-18 -10 -14 -28 M140 348 q-4 -20 8 -30 M150 354 q16 -14 30 -8 M130 366 q-20 4 -26 18" stroke="#0e0b0a" stroke-width="3" fill="none"/>
<path d="M150 392 Q210 360 250 330" stroke="#0e0b0a" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M100 444 H190" stroke="#0e0b0a" stroke-width="6"/></g>`,

  // majnu: Majnu in the wilderness, gaunt and alone, deer resting by him, a bird nesting in his hair
  majnu: (u) => `<defs>${sky(`k${u}`, [[0, '#f1dfb6'], [0.6, '#e6b46c'], [1, '#c58642']])}${glow(`g${u}`, '#fff2cc')}</defs>
<rect width="640" height="520" fill="url(#k${u})"/><circle cx="470" cy="210" r="140" fill="url(#g${u})"/><circle cx="470" cy="210" r="50" fill="#f8dea0"/>
<path d="M0 340 Q160 290 320 330 T640 310 V520 H0 Z" fill="#d39c56"/><path d="M0 410 Q200 360 400 400 T640 390 V520 H0 Z" fill="#b07a3a"/>
<g fill="${INK}"><path d="M90 420 q4 -60 14 -110 q8 -40 4 -70 q10 10 14 40 q6 -30 20 -44 q-6 30 -10 60 q-4 60 4 124 Z"/><path d="M104 300 q-30 -20 -44 -14 M118 262 q20 -24 40 -22" stroke="${INK}" stroke-width="4" fill="none"/></g>
<g fill="#16110d"><path d="M262 432 q-8 -48 8 -74 q14 -16 30 -2 q12 26 2 76 Z"/><circle cx="284" cy="342" r="17"/>
<path d="M266 336 q-16 -26 4 -40 q14 -14 30 -4 q20 6 12 34" fill="#16110d"/>
<path d="M270 384 q-24 10 -30 40 M300 384 q20 16 18 44" stroke="#16110d" stroke-width="6" fill="none" stroke-linecap="round"/>
<path d="M232 436 H340" stroke="#16110d" stroke-width="7"/></g>
<g class="bob"><path d="M286 296 q8 -10 18 -2 q-4 6 -2 10 l-8 -2 Z" fill="${DEEP}"/><circle cx="300" cy="294" r="2" fill="#f4e3b4"/></g>
<g fill="${INK}"><g transform="translate(380 404)"><path d="M0 26 q4 -20 30 -22 h40 q10 0 14 -12 l6 -14 q4 -6 8 0 l-2 14 q8 2 4 10 l-10 4 q-4 10 -10 14 v20 h-6 l-2 -18 h-36 l-4 18 h-6 v-20 q-14 -2 -16 -14 Z"/><path d="M98 -14 l6 -16 M98 -14 l-4 -18" stroke="${INK}" stroke-width="2.4"/></g>
<g transform="translate(170 420) scale(.8)"><path d="M0 26 q4 -20 30 -22 h40 q10 0 14 -12 l6 -14 q4 -6 8 0 l-2 14 q8 2 4 10 l-10 4 q-4 10 -10 14 v20 h-6 l-2 -18 h-36 l-4 18 h-6 v-20 q-14 -2 -16 -14 Z" transform="scale(-1 1) translate(-110 0)"/></g></g>
${bird(360, 120)}${bird(400, 140, 0.8)}`,
  // kaaba: the Kaaba under a night sky, pilgrims circling it in white (the Hajj, the haji)
  kaaba: (u) => `<defs>${sky(`k${u}`, [[0, '#121a2e'], [0.65, '#2f3552'], [1, '#6a5a50']])}${glow(`g${u}`, '#f6e2ae')}</defs>
<rect width="640" height="520" fill="url(#k${u})"/>${stars(50, 200)}
<circle cx="320" cy="300" r="230" fill="url(#g${u})" opacity=".35"/>
<path d="M0 520 V410 Q320 380 640 410 V520 Z" fill="#d8cfbd" opacity=".85"/>
<ellipse cx="320" cy="430" rx="250" ry="46" fill="none" stroke="#efe6d4" stroke-width="2" opacity=".5"/>
<g><path d="M232 236 L320 214 L408 236 L408 418 L320 440 L232 418 Z" fill="#0c0b0b"/><path d="M320 214 V440" stroke="#1c1a19" stroke-width="2"/>
<path d="M232 270 L320 250 L408 270 L408 288 L320 268 L232 288 Z" fill="${GOLD}"/><path d="M300 440 V372 q20 -12 40 0 V440" fill="${DEEP}" opacity=".9"/></g>
<g class="drift" style="--x:60px">${Array.from({ length: 26 }, (_, i) => { const a = (i / 26) * Math.PI * 2, x = 320 + 250 * Math.cos(a), y = 432 + 44 * Math.sin(a); return y > 420 || x < 225 || x > 415 ? `<g fill="#f3ece0"><circle cx="${x.toFixed(0)}" cy="${(y - 18).toFixed(0)}" r="4"/><path d="M${(x - 5).toFixed(0)} ${(y - 13).toFixed(0)} h10 l2 16 h-14 Z"/></g>` : ''; }).join('')}</g>`,

  // quran: an open Quran on a carved stand, white pages and black ink, lit by a lamp (the white page, the black letters)
  quran: (u) => `<defs>${sky(`k${u}`, [[0, '#2a201a'], [1, '#4a3424']])}${glow(`g${u}`, '#f2c46b')}</defs>
<rect width="640" height="520" fill="url(#k${u})"/>
<circle class="tw" style="--d:2.2s" cx="320" cy="300" r="240" fill="url(#g${u})" opacity=".55"/>
<path d="M200 470 L320 380 L440 470 M220 470 L320 400 L420 470" stroke="${DEEP}" stroke-width="10" fill="none" stroke-linejoin="round"/>
<path d="M150 360 Q235 330 318 352 L318 222 Q235 200 150 230 Z" fill="#fbf6ea"/><path d="M490 360 Q405 330 322 352 L322 222 Q405 200 490 230 Z" fill="#f6efe0"/>
<path d="M150 360 Q235 330 318 352 L318 364 Q235 342 150 372 Z M490 360 Q405 330 322 352 L322 364 Q405 342 490 372 Z" fill="${DEEP}"/>
${Array.from({ length: 7 }, (_, i) => `<path d="M${172} ${246 + i * 15} q${30} ${-6 - i} ${60} ${-2} t${60} ${-1}" stroke="#1a1512" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M${340} ${238 + i * 15} q${30} ${-3} ${60} ${2} t${60} ${2}" stroke="#1a1512" stroke-width="2.4" fill="none" stroke-linecap="round"/>`).join('')}
<path d="M170 236 Q235 216 300 232 M340 232 Q405 216 470 236" stroke="${GOLD}" stroke-width="3" fill="none"/>
<g transform="translate(520 300)"><path d="M-26 40 Q0 58 26 40 Q18 30 0 28 Q-18 30 -26 40 Z" fill="${DEEP}"/><g class="sway" style="--d:1.2s;transform-origin:0 28px"><path d="M0 28 C-12 14 -6 -2 0 -16 C6 -2 12 14 0 28 Z" fill="#ffd27a"/></g></g>
<rect y="470" width="640" height="50" fill="#1a120d"/>`,
};

export const SCENE_NAMES = Object.keys(SCENES);
export const scene = (name, u) => {
  if (!SCENES[name]) throw new Error(`unknown scene "${name}" (have: ${SCENE_NAMES.join(', ')})`);
  s = 7 + u * 101;
  return SCENES[name](u);
};
