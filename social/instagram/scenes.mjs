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
};

export const SCENE_NAMES = Object.keys(SCENES);
export const scene = (name, u) => {
  if (!SCENES[name]) throw new Error(`unknown scene "${name}" (have: ${SCENE_NAMES.join(', ')})`);
  s = 7 + u * 101;
  return SCENES[name](u);
};
