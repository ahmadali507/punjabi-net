/**
 * Full-screen (1080×1920) illustrated scenes for long-form reels (longreel.mjs). Hand-drawn SVG in layers:
 * each <g class="px" data-d="…"> is a depth layer the renderer drifts for parallax (0 = sky, 1 = foreground).
 * Moving parts carry classes the renderer animates:
 *   .tw twinkle · .fl lamp flicker · .mote float up · .petal fall · .sway rock · .bob float · .drift slide
 *   .rays slow turn · .orbit move along its offset-path · .twirl skirt folds sliding
 * The text sits over the lower part (y > ~1150), so focal content stays between y 150 and 1150.
 */
const INK = '#14110e', GOLD = '#d8a640', DEEP = '#8a5d10';
const W = 1080, H = 1920;

let s = 7;
const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const f = (n) => n.toFixed(1);
const lin = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;
const rad = (id, c, a = 0.9) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${a}"/><stop offset=".45" stop-color="${c}" stop-opacity="${a * 0.35}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
const px = (d, body) => `<g class="px" data-d="${d}">${body}</g>`;
const stars = (n, y0, y1, c = '#fbeccb') => Array.from({ length: n }, () => `<circle class="tw" cx="${f(r() * W)}" cy="${f(y0 + r() * (y1 - y0))}" r="${f(0.8 + r() * r() * 3.2)}" fill="${c}" style="--d:${f(1.6 + r() * 3)}s;--k:${f(r() * 3)}s"/>`).join('');
const motes = (n, x0, x1, y0, y1, c, rmax = 3.5, cls = 'mote') => Array.from({ length: n }, () => `<circle class="${cls}" cx="${f(x0 + r() * (x1 - x0))}" cy="${f(y0 + r() * (y1 - y0))}" r="${f(1 + r() * rmax)}" fill="${c}" opacity="${f(0.25 + r() * 0.6)}" style="--d:${f(6 + r() * 8)}s;--k:${f(r() * 10)}s;--dx:${f(r() * 80 - 40)}px;--dy:${f(-(120 + r() * 220))}px"/>`).join('');
const petals = (n, c) => Array.from({ length: n }, () => `<ellipse class="petal" cx="${f(r() * W)}" cy="${f(-60 - r() * 400)}" rx="${f(5 + r() * 5)}" ry="${f(3 + r() * 3)}" fill="${c}" opacity="${f(0.6 + r() * 0.4)}" style="--d:${f(7 + r() * 6)}s;--k:${f(r() * 12)}s;--dx:${f(r() * 160 - 80)}px;--dy:${f(1300 + r() * 300)}px"/>`).join('');
const rays = (cx, cy, n, c, op, len = 1600, w = 0.09) => `<g class="rays" style="transform-origin:${cx}px ${cy}px" opacity="${op}">${Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, b = a + w; return `<path d="M${cx} ${cy} L${f(cx + len * Math.cos(a))} ${f(cy + len * Math.sin(a))} L${f(cx + len * Math.cos(b))} ${f(cy + len * Math.sin(b))} Z" fill="${c}"/>`; }).join('')}</g>`;
const beam = (x, y, w1, w2, len, ang, c, op) => `<path d="M${x - w1 / 2} ${y} L${x + w1 / 2} ${y} L${f(x + w2 / 2 + len * Math.sin(ang))} ${f(y + len)} L${f(x - w2 / 2 + len * Math.sin(ang))} ${f(y + len)} Z" fill="${c}" opacity="${op}"/>`;
// a rolling ridge line from x=0 to W at base y, filled down to the bottom
const ridge = (y, amp, c, seed, step = 60, op = 1) => {
  s = seed;
  let d = `M0 ${H} L0 ${y}`;
  for (let x = 0; x <= W + step; x += step) d += ` Q${x - step / 2} ${f(y - amp * (r() - 0.3))} ${x} ${f(y - amp * 0.5 * (r() - 0.2))}`;
  return `<path d="${d} L${W} ${H} Z" fill="${c}" opacity="${op}"/>`;
};
const bird = (x, y, k = 1, c = INK) => `<path d="M${x} ${y} q${8 * k} ${-8 * k} ${16 * k} 0 q${8 * k} ${-8 * k} ${16 * k} 0" fill="none" stroke="${c}" stroke-width="${f(2.6 * k)}" stroke-linecap="round"/>`;
const flock = (x, y, n, k = 1, c = INK) => `<g class="drift" style="--x:140px">${Array.from({ length: n }, (_, i) => `<g class="bob" style="--k:${f(i * 0.4)}s">${bird(f(x + (i % 4) * 46 * k + r() * 30), f(y + Math.floor(i / 4) * 30 * k + r() * 26), (0.6 + r() * 0.6) * k, c)}</g>`).join('')}</g>`;
const diya = (x, y, k = 1, u = '') => `<g transform="translate(${x} ${y}) scale(${k})"><circle class="fl" r="46" cy="-18" fill="url(#lampglow${u})" style="--d:${f(0.9 + r() * 0.8)}s;--k:${f(r())}s"/><path d="M-20 0 Q0 16 20 0 Q14 -8 0 -9 Q-14 -8 -20 0 Z" fill="${DEEP}"/><g class="sway" style="--d:${f(0.8 + r() * 0.6)}s;transform-origin:0 -8px"><path d="M0 -8 C-7 -16 -4 -27 0 -36 C4 -27 7 -16 0 -8 Z" fill="#ffd27a"/><path d="M0 -10 C-3 -15 -2 -22 0 -27 C2 -22 3 -15 0 -10 Z" fill="#fff4d0"/></g></g>`;
// people: simple elegant silhouettes; x,y = feet centre, k = scale
const person = (x, y, k = 1, c = INK, pose = 'stand') => {
  const P = {
    stand: 'M-14 0 L-12 -70 Q-22 -118 -14 -150 Q0 -162 14 -150 Q22 -118 12 -70 L14 0 Z',
    point: 'M-14 0 L-12 -70 Q-22 -118 -14 -150 Q0 -162 14 -150 Q22 -118 12 -70 L14 0 Z M10 -140 L66 -160 L68 -152 L14 -128 Z',
    laugh: 'M-14 0 L-12 -70 Q-24 -118 -18 -148 Q-2 -160 12 -150 Q20 -118 12 -70 L14 0 Z M-12 -140 L-44 -110 L-38 -104 L-6 -128 Z',
  }[pose];
  return `<g transform="translate(${x} ${y}) scale(${k})" fill="${c}"><path d="${P}"/><circle cy="-172" r="17"/><path d="M-18 -176 Q0 -200 18 -176 Q0 -184 -18 -176 Z"/></g>`;
};

const SCENES = {
  // Kasur at first light: Bulleh Shah's shrine on the river bank, sun rising behind its dome
  kasur: (u) => `<defs>${lin(`s${u}`, [[0, '#141a30'], [0.35, '#40345a'], [0.62, '#b0687a'], [0.8, '#eaa56a'], [1, '#f6d7a0']])}${rad(`g${u}`, '#ffe2a8')}${lin(`w${u}`, [[0, '#d99a6a'], [1, '#3a2a36']])}</defs>
${px(0, `<rect width="${W}" height="${H}" fill="url(#s${u})"/>${stars(70, 40, 520)}<circle cx="540" cy="900" r="520" fill="url(#g${u})"/>${rays(540, 900, 36, '#ffe7b4', 0.035, 1600, 0.05)}<circle cx="540" cy="900" r="96" fill="#fff0c8"/>`)}
${px(0.15, `${ridge(930, 70, '#7a5470', 11, 90, 0.8)}`)}
${px(0.35, `<g fill="#2a1c26"><rect x="300" y="800" width="480" height="180"/><rect x="330" y="760" width="420" height="44"/>
<path d="M400 762 Q400 600 540 560 Q680 600 680 762 Z"/><rect x="535" y="500" width="10" height="64"/><circle cx="540" cy="496" r="11"/><path d="M528 496 Q540 470 552 496" fill="none" stroke="#2a1c26" stroke-width="4"/>
<path d="M318 762 Q318 700 362 684 Q406 700 406 762 Z"/><path d="M674 762 Q674 700 718 684 Q762 700 762 762 Z"/>
<rect x="232" y="560" width="30" height="420"/><path d="M226 562 Q247 500 268 562 Z"/><rect x="224" y="640" width="46" height="10"/><rect x="818" y="560" width="30" height="420"/><path d="M812 562 Q833 500 854 562 Z"/><rect x="810" y="640" width="46" height="10"/></g>
<path d="M505 980 V860 Q540 822 575 860 V980 Z" fill="#f2bf68" opacity=".95"/>${[370, 440, 640, 710].map((x) => `<path d="M${x - 14} 940 V890 Q${x} 870 ${x + 14} 890 V940 Z" fill="#f2bf68" opacity=".6"/>`).join('')}`)}
${px(0.5, `<rect y="975" width="${W}" height="260" fill="url(#w${u})"/>${Array.from({ length: 16 }, (_, i) => `<path class="shim" style="--k:${f(i * 0.3)}s" d="M${f(380 + r() * 320)} ${f(1000 + i * 13)} h${f(40 + r() * 90)}" stroke="#ffe0a8" stroke-width="3" stroke-linecap="round" opacity=".5"/>`).join('')}`)}
${px(0.8, `<g transform="translate(90 1240) scale(1 1)"><path d="M0 0 Q6 -120 -8 -240 Q-20 -300 -60 -340 M-6 -220 Q40 -280 110 -300 M-12 -270 Q-80 -300 -140 -290" stroke="${INK}" stroke-width="16" fill="none" stroke-linecap="round"/><g fill="${INK}"><ellipse cx="-70" cy="-350" rx="110" ry="34"/><ellipse cx="90" cy="-312" rx="120" ry="30"/><ellipse cx="-150" cy="-300" rx="80" ry="24"/><ellipse cx="10" cy="-380" rx="90" ry="26"/></g></g><g transform="translate(990 1240) scale(-1 1)"><path d="M0 0 Q6 -120 -8 -240 Q-20 -300 -60 -340 M-6 -220 Q40 -280 110 -300 M-12 -270 Q-80 -300 -140 -290" stroke="${INK}" stroke-width="16" fill="none" stroke-linecap="round"/><g fill="${INK}"><ellipse cx="-70" cy="-350" rx="110" ry="34"/><ellipse cx="90" cy="-312" rx="120" ry="30"/><ellipse cx="-150" cy="-300" rx="80" ry="24"/><ellipse cx="10" cy="-380" rx="90" ry="26"/></g></g><path d="M0 1240 V1200 Q540 1180 1080 1200 V1240 Z" fill="${INK}"/>`)}
${flock(620, 560, 9, 1.1)}${motes(40, 100, 980, 700, 1150, '#ffe0a0', 3)}`,

  // the qazi's court: a high hall, light falling through lattice windows on the judge, his books and his scales
  qazi: (u) => `<defs>${lin(`s${u}`, [[0, '#1d140f'], [0.6, '#3e2a1e'], [1, '#5a3c26']])}${rad(`g${u}`, '#f6c870')}${rad(`lampglow${u}`, '#ffcf70')}</defs>
${px(0, `<rect width="${W}" height="${H}" fill="url(#s${u})"/>`)}
${px(0.15, `<g fill="#2a1d15">${[90, 400, 710].map((x) => `<path d="M${x} 1200 V420 Q${x} 250 ${x + 140} 200 Q${x + 280} 250 ${x + 280} 420 V1200 Z" fill="#4a3322"/><path d="M${x + 30} 1200 V440 Q${x + 30} 290 ${x + 140} 248 Q${x + 250} 290 ${x + 250} 440 V1200 Z" fill="#2a1d15"/>`).join('')}</g>
${[230, 850].map((x) => `<g opacity=".9"><rect x="${x - 50}" y="330" width="100" height="160" rx="50" fill="#e9c27a" opacity=".55"/>${Array.from({ length: 5 }, (_, i) => `<path d="M${x - 50} ${350 + i * 30} h100 M${x - 40 + i * 20} 330 v160" stroke="#2a1d15" stroke-width="5"/>`).join('')}</g>`).join('')}
${beam(230, 400, 90, 360, 900, 0.35, '#f6d08a', 0.13)}${beam(850, 400, 90, 360, 900, -0.35, '#f6d08a', 0.13)}`)}
${px(0.3, `${[300, 780].map((x, i) => `<g class="sway" style="--d:${5 + i}s;transform-origin:${x}px 0px"><path d="M${x} 0 V250" stroke="#8a6a3a" stroke-width="2"/>${diya(x, 300, 1.3, u)}</g>`).join('')}`)}
${px(0.45, `<circle cx="540" cy="760" r="420" fill="url(#g${u})" opacity=".35"/>
<g transform="translate(540 470)"><g class="sway" style="--d:6s;transform-origin:0 0"><path d="M0 0 V40 M-120 40 H120" stroke="${GOLD}" stroke-width="6"/><path d="M-120 40 L-150 120 M-120 40 L-90 120 M120 40 L90 120 M120 40 L150 120" stroke="${GOLD}" stroke-width="2.4"/><path d="M-160 120 Q-120 150 -80 120 Z M80 120 Q120 150 160 120 Z" fill="${GOLD}"/></g><circle r="10" fill="${GOLD}"/></g>
<g fill="${INK}"><rect x="330" y="880" width="420" height="40" rx="6"/><rect x="350" y="920" width="380" height="240" fill="#1d140f"/><path d="M350 1160 H730" stroke="${GOLD}" stroke-width="3" opacity=".6"/>
<path d="M440 880 Q430 760 540 740 Q650 760 640 880 Z"/><circle cx="540" cy="700" r="40"/><path d="M494 690 Q540 620 586 690 Q540 672 494 690 Z" fill="#efe3c8"/><path d="M520 724 Q540 780 560 724 Z" fill="#d9ccb0"/>
<path d="M600 840 l70 -40 l40 34 l-70 40 Z" fill="#6a2f22"/><path d="M604 840 l66 -38 M640 820 l36 30" stroke="${GOLD}" stroke-width="2"/></g>
${[[200, 1000], [860, 1000]].map(([x, y]) => `<g fill="#2a1d15">${Array.from({ length: 6 }, (_, i) => `<rect x="${x - 70 + (i % 2) * 6}" y="${y - i * 26}" width="140" height="22" rx="3" fill="${['#5a2a1e', '#3a3a5a', '#6a4a1e', '#2a4a3a', '#5a2a1e', '#4a3a2a'][i]}"/><path d="M${x - 64} ${y - i * 26 + 11} h128" stroke="${GOLD}" stroke-width="1.4" opacity=".6"/>`).join('')}</g>`).join('')}`)}
${px(0.8, `<g fill="${INK}"><path d="M120 1230 Q130 1150 200 1130 Q260 1140 290 1190 L310 1230 Z"/><circle cx="300" cy="1160" r="24"/><path d="M960 1230 Q950 1150 880 1130 Q820 1140 790 1190 L770 1230 Z"/><circle cx="780" cy="1160" r="24"/></g>`)}
${motes(60, 150, 950, 380, 1150, '#ffe2a0', 2.6)}`,

  // the Kaaba by night: the arcades lit around it, pilgrims in white circling
  kaaba: (u) => `<defs>${lin(`s${u}`, [[0, '#070b18'], [0.55, '#1a2340'], [1, '#3a3a58']])}${rad(`g${u}`, '#f8e6b8')}${lin(`fl${u}`, [[0, '#6a6676'], [1, '#c8c2b4']])}</defs>
${px(0, `<rect width="${W}" height="${H}" fill="url(#s${u})"/>${stars(90, 30, 600)}<circle cx="540" cy="760" r="620" fill="url(#g${u})" opacity=".35"/>`)}
${px(0.2, `<g fill="#1c1a24">${Array.from({ length: 13 }, (_, i) => `<path d="M${-20 + i * 86} 860 V760 Q${23 + i * 86} 720 ${66 + i * 86} 760 V860 Z" fill="#2a2834"/><path d="M${2 + i * 86} 860 V772 Q${23 + i * 86} 748 ${44 + i * 86} 772 V860 Z" fill="#f6d796" opacity=".55"/>`).join('')}
${[120, 960].map((x) => `<rect x="${x - 16}" y="380" width="32" height="480" fill="#2a2834"/><path d="M${x - 22} 382 Q${x} 300 ${x + 22} 382 Z" fill="#2a2834"/>${[470, 600, 730].map((y) => `<rect x="${x - 26}" y="${y}" width="52" height="10" fill="#2a2834"/><circle class="tw" cx="${x}" cy="${y - 10}" r="4" fill="#ffe7a8" style="--d:2.4s"/>`).join('')}`).join('')}</g>`)}
${px(0.4, `<ellipse cx="540" cy="1000" rx="620" ry="170" fill="url(#fl${u})" opacity=".45"/>
${Array.from({ length: 60 }, (_, i) => { const rx = 330 + (i % 4) * 55, ry = 72 + (i % 4) * 16; return `<g class="orbit" style="offset-path:path('M${540 + rx} 990 A${rx} ${ry} 0 1 1 ${540 - rx} 990 A${rx} ${ry} 0 1 1 ${540 + rx} 990');offset-rotate:0deg;--o:${f((i * 37) % 100)}%;--d:${f(40 + (i % 4) * 12)}s"><path d="M-5 -2 h10 l3 22 h-16 Z M0 -12 a6 6 0 1 0 0.1 0 Z" fill="#fbf8f0" transform="translate(0 -18)"/></g>`; }).join('')}
<g><path d="M370 640 L560 600 L720 636 L720 960 L560 1000 L370 958 Z" fill="#080707"/><path d="M560 600 V1000" stroke="#1e1b19" stroke-width="3"/><path d="M370 700 L560 664 L720 696 L720 724 L560 692 L370 728 Z" fill="${GOLD}"/>${Array.from({ length: 10 }, (_, i) => `<path d="M${380 + i * 18} ${f(704 - i * 3.6)} q6 8 12 0" stroke="#7a5212" stroke-width="2" fill="none"/>`).join('')}<path d="M610 1000 V880 Q635 864 660 880 V990" fill="#a0782a"/></g>`)}
${motes(40, 200, 880, 600, 1150, '#fff3d0', 2.2)}`,

  // the ghazi: a rider rearing on a ridge at sunset, sword raised, banner flying, dust and embers in the air
  ghazi: (u) => `<defs>${lin(`s${u}`, [[0, '#2a1218'], [0.4, '#7a2a22'], [0.7, '#d0602e'], [1, '#f2a65a']])}${rad(`g${u}`, '#ffcf80')}${rad(`d${u}`, '#c88a5a', 0.6)}</defs>
${px(0, `<rect width="${W}" height="${H}" fill="url(#s${u})"/><circle cx="640" cy="820" r="560" fill="url(#g${u})"/><circle cx="640" cy="820" r="150" fill="#ffd98a"/>${rays(640, 820, 30, '#ffd59a', 0.035, 1600, 0.05)}`)}
${px(0.15, `${ridge(900, 80, '#5a2428', 21, 100, 0.9)}<g fill="#4a1c20">${Array.from({ length: 22 }, (_, i) => `<path d="M${60 + i * 46} ${880 + (i % 3) * 6} v-${60 + (i % 4) * 14}" stroke="#4a1c20" stroke-width="4"/><path d="M${60 + i * 46} ${820 + (i % 3) * 6 - (i % 4) * 14} l18 8 l-18 8 Z"/>`).join('')}</g>
<g fill="#3a1418"><rect x="820" y="700" width="200" height="200"/>${Array.from({ length: 6 }, (_, i) => `<rect x="${820 + i * 36}" y="680" width="22" height="24"/>`).join('')}<rect x="780" y="660" width="60" height="240"/><rect x="1000" y="640" width="60" height="260"/></g>`)}
${px(0.4, `${ridge(1040, 60, '#2a0e10', 33, 120)}${Array.from({ length: 6 }, (_, i) => `<circle class="drift" style="--x:${120 + i * 20}px" cx="${f(150 + i * 90)}" cy="${f(1010 - (i % 3) * 30)}" r="${f(70 + r() * 60)}" fill="url(#d${u})" opacity=".55"/>`).join('')}`)}
${px(0.6, `<g fill="${INK}" transform="translate(520 1030)">
<path d="M-150 0 L-128 -80 Q-150 -150 -120 -190 Q-60 -220 20 -210 Q60 -260 110 -300 L140 -330 Q170 -330 166 -300 L150 -276 Q174 -250 160 -220 Q130 -226 116 -210 Q100 -150 70 -120 L84 0 H66 L40 -100 H-60 L-90 0 H-108 L-100 -110 Q-120 -100 -134 -80 L-130 0 Z"/>
<path d="M-136 -170 Q-200 -150 -230 -90 Q-210 -120 -180 -130" stroke="${INK}" stroke-width="12" fill="none" stroke-linecap="round"/>
<path d="M-40 -205 Q-50 -270 -24 -300 Q0 -316 22 -298 Q40 -268 24 -210 Z"/><circle cx="-2" cy="-330" r="22"/><path d="M-28 -338 Q-2 -380 24 -338 Z" fill="${DEEP}"/><path d="M-2 -356 L-2 -384" stroke="${GOLD}" stroke-width="3"/>
<path d="M18 -290 L90 -380" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M86 -376 L168 -500" stroke="#efe6d2" stroke-width="8" stroke-linecap="round"/><path d="M76 -392 l26 16" stroke="${GOLD}" stroke-width="6"/>
<path d="M-30 -286 L-90 -480" stroke="${INK}" stroke-width="6"/><path class="sway" style="--d:1.4s;transform-origin:-90px -476px" d="M-90 -476 Q-30 -500 10 -470 Q-40 -440 -86 -446 Z" fill="${GOLD}"/></g>`)}
${px(0.9, `${ridge(1200, 40, INK, 41, 140)}`)}${motes(60, 0, W, 700, 1200, '#ffb070', 3, 'mote')}`,

  // ecstasy: Bulleh whirling before his murshid's door, musicians on either side, petals falling in the lamplight
  dervish: (u) => `<defs>${lin(`s${u}`, [[0, '#120e1c'], [0.6, '#2e2236'], [1, '#4a3030']])}${rad(`g${u}`, '#f4c770')}${rad(`lampglow${u}`, '#ffcf70')}${lin(`sk${u}`, [[0, '#f2e4c4'], [1, '#c9a46a']], 1, 0)}</defs>
${px(0, `<rect width="${W}" height="${H}" fill="url(#s${u})"/>${stars(40, 30, 380)}`)}
${px(0.15, `<path d="M180 1200 V520 Q180 300 540 220 Q900 300 900 520 V1200 Z" fill="#3a2a2e"/><path d="M240 1200 V540 Q240 350 540 285 Q840 350 840 540 V1200 Z" fill="#1c1418"/>${rays(540, 700, 36, GOLD, 0.04, 1600, 0.05)}<circle cx="540" cy="760" r="430" fill="url(#g${u})" opacity=".45"/>`)}
${px(0.3, `${[300, 780].map((x) => diya(x, 1090, 1.4, u)).join('')}${[350, 730].map((x, i) => `<g class="sway" style="--d:${4 + i}s;transform-origin:${x}px 280px"><path d="M${x} 280 V380" stroke="#8a6a3a" stroke-width="2"/>${diya(x, 420, 1.1, u)}</g>`).join('')}`)}
${px(0.5, `<g transform="translate(540 1120)"><g class="sway" style="--d:3.2s;transform-origin:0 0">
<path d="M-180 0 Q-120 -260 -26 -320 L26 -320 Q120 -260 180 0 Q0 40 -180 0 Z" fill="url(#sk${u})"/>
<clipPath id="cl${u}"><path d="M-180 0 Q-120 -260 -26 -320 L26 -320 Q120 -260 180 0 Q0 40 -180 0 Z"/></clipPath>
<g clip-path="url(#cl${u})"><g class="twirl">${Array.from({ length: 18 }, (_, i) => `<path d="M${-360 + i * 40} 20 Q${-340 + i * 40} -150 ${-300 + i * 40} -330" stroke="#a07a40" stroke-width="3" fill="none" opacity=".6"/>`).join('')}</g></g>
<path d="M-180 0 Q0 40 180 0" stroke="${GOLD}" stroke-width="5" fill="none"/>
<path d="M-30 -320 Q-40 -420 0 -440 Q40 -420 30 -320 Z" fill="#e6d4ae"/><circle cy="-470" r="28" fill="#e6d4ae"/><path d="M-30 -480 Q0 -540 30 -480 Q0 -470 -30 -480 Z" fill="#f4ead2"/><rect x="-14" y="-560" width="28" height="70" rx="12" fill="#a07a40"/>
<path d="M-24 -410 Q-120 -470 -150 -560" stroke="#e6d4ae" stroke-width="18" stroke-linecap="round" fill="none"/><path d="M24 -410 Q110 -420 160 -480" stroke="#e6d4ae" stroke-width="18" stroke-linecap="round" fill="none"/></g></g>`)}
${px(0.75, `<g fill="${INK}"><path d="M60 1240 Q60 1140 130 1110 Q190 1120 210 1170 L230 1240 Z"/><circle cx="150" cy="1070" r="28"/><ellipse cx="230" cy="1180" rx="44" ry="36" fill="#2a1a16"/><path d="M190 1180 h80" stroke="${GOLD}" stroke-width="2"/>
<path d="M1020 1240 Q1020 1140 950 1110 Q890 1120 870 1170 L850 1240 Z"/><circle cx="930" cy="1070" r="28"/><rect x="770" y="1150" width="110" height="60" rx="6" fill="#2a1a16"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${778 + i * 12}" y="1158" width="8" height="18" fill="#efe3c8" opacity=".8"/>`).join('')}</g>`)}
${petals(50, '#e0566a')}${petals(30, '#f2b84a')}`,

  // "my Beloved has come home": a village door thrown open, lamps on the wall, garlands, a figure in the light
  home: (u) => `<defs>${lin(`s${u}`, [[0, '#0e1426'], [0.6, '#262a48'], [1, '#4a3a48']])}${rad(`g${u}`, '#ffd48a')}${rad(`lampglow${u}`, '#ffcf70')}${rad(`m${u}`, '#f8ecc8', 0.7)}</defs>
${px(0, `<rect width="${W}" height="${H}" fill="url(#s${u})"/>${stars(110, 30, 640)}<circle cx="820" cy="260" r="200" fill="url(#m${u})"/><circle cx="820" cy="260" r="70" fill="#f8ecc8"/>`)}
${px(0.2, `<g fill="#0c0a10"><path d="M60 1000 Q70 820 50 640" stroke="#0c0a10" stroke-width="24" fill="none"/><ellipse cx="60" cy="600" rx="130" ry="90"/><ellipse cx="0" cy="660" rx="90" ry="60"/><ellipse cx="120" cy="530" rx="80" ry="60"/></g><g fill="#0c0a10"><path d="M1040 1000 Q1030 840 1050 700" stroke="#0c0a10" stroke-width="22" fill="none"/><ellipse cx="1050" cy="650" rx="110" ry="80"/><ellipse cx="990" cy="600" rx="70" ry="50"/></g>`)}
${px(0.4, `<rect x="140" y="560" width="800" height="640" fill="#7a5638"/><rect x="140" y="560" width="800" height="640" fill="#2a1a14" opacity=".55"/><path d="M120 560 H960 L940 530 H140 Z" fill="#4a2e1e"/>
<path d="M420 1200 V760 Q540 680 660 760 V1200 Z" fill="#ffd690"/><circle cx="540" cy="980" r="380" fill="url(#g${u})" opacity=".8"/>
<path d="M420 1200 V760 Q440 744 460 736 V1200 Z" fill="#5a3a22"/><path d="M660 1200 V760 Q640 744 620 736 V1200 Z" fill="#5a3a22"/>
${Array.from({ length: 13 }, (_, i) => { const t = i / 12, x = 400 + t * 280, y = 760 - Math.sin(t * Math.PI) * 70 + 20; return `<circle cx="${f(x)}" cy="${f(y)}" r="16" fill="${i % 2 ? '#f08a1c' : '#f6c02a'}"/>`; }).join('')}
${[400, 680].map((x) => Array.from({ length: 6 }, (_, i) => `<circle cx="${x}" cy="${790 + i * 30}" r="12" fill="${i % 2 ? '#f08a1c' : '#f6c02a'}"/>`).join('')).join('')}
<g fill="#3a2414"><path d="M510 1200 L516 1040 Q500 980 512 940 Q540 920 568 940 Q580 980 564 1040 L570 1200 Z"/><circle cx="540" cy="908" r="24"/><path d="M512 900 Q540 860 568 900 Q580 960 572 1000 L508 1000 Q500 960 512 900 Z" opacity=".85"/></g>
${[200, 280, 800, 880].map((x) => diya(x, 760, 1.1, u)).join('')}<rect x="140" y="760" width="800" height="10" fill="#3a2414"/>`)}
${px(0.8, `<path d="M0 1240 V1180 Q540 1150 1080 1180 V1240 Z" fill="${INK}"/>${[60, 120, 960, 1020].map((x) => diya(x, 1190, 1, u)).join('')}`)}
${motes(36, 300, 800, 700, 1180, '#ffe0a0', 2.4)}`,

  // the lovers mock Majnu: a knot of people on the left pointing and laughing at a lone figure on the dune
  lovers: (u) => `<defs>${lin(`s${u}`, [[0, '#251c36'], [0.5, '#7a3e58'], [0.8, '#d2765a'], [1, '#f0b276']])}${rad(`g${u}`, '#ffd8a0')}</defs>
${px(0, `<rect width="${W}" height="${H}" fill="url(#s${u})"/>${stars(40, 30, 380)}<circle cx="300" cy="860" r="480" fill="url(#g${u})"/><circle cx="300" cy="860" r="110" fill="#ffe2a8"/>`)}
${px(0.2, `${ridge(900, 90, '#8a4a50', 51, 120, 0.85)}`)}
${px(0.4, `${ridge(1010, 70, '#5a2c34', 61, 140)}`)}
${px(0.6, `<path d="M0 1240 V1090 Q260 1040 520 1080 Q760 1120 1080 1030 V1240 Z" fill="#2a1418"/>
${person(150, 1100, 1.3, INK, 'point')}${person(260, 1090, 1.2, INK, 'laugh')}${person(350, 1100, 1.25, INK, 'point')}${person(90, 1110, 1.1, INK, 'stand')}
<g fill="${INK}" transform="translate(850 1062)"><path d="M-40 0 Q-50 -90 -20 -140 Q0 -160 20 -140 Q40 -90 40 0 Z"/><circle cy="-166" r="22"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${-14 + i * 4} -180 q${(i - 4) * 6} -30 ${(i - 4) * 12} -40" stroke="${INK}" stroke-width="3" fill="none"/>`).join('')}<path d="M-60 2 H70" stroke="${INK}" stroke-width="8"/></g>`)}
${flock(540, 520, 6, 1)}${motes(30, 0, W, 800, 1200, '#ffd0a0', 2)}`,

  // Laila's caravan crossing the dunes under a huge moon, her litter lit from inside, Majnu reaching after it
  laila: (u) => `<defs>${lin(`s${u}`, [[0, '#060918'], [0.6, '#1c2244'], [1, '#4a3a50']])}${rad(`m${u}`, '#f8ecc8', 0.8)}${rad(`lampglow${u}`, '#ffcf70')}</defs>
${px(0, `<rect width="${W}" height="${H}" fill="url(#s${u})"/>${stars(150, 20, 900)}<circle cx="560" cy="720" r="460" fill="url(#m${u})"/><circle cx="560" cy="720" r="250" fill="#f6e8c4"/><circle cx="500" cy="680" r="40" fill="#e8d8b0" opacity=".5"/><circle cx="640" cy="800" r="26" fill="#e8d8b0" opacity=".5"/>`)}
${px(0.3, `<path d="M0 1240 V900 Q300 830 560 880 Q820 930 1080 860 V1240 Z" fill="#1a1424"/>
<g class="drift" style="--x:-160px">${[[300, 900, 0.9], [560, 886, 1.15], [820, 900, 0.9]].map(([x, y, k], i) => `<g transform="translate(${x} ${y}) scale(${k})" fill="#0a0810"><path d="M-80 -60 L-86 0 M-50 -60 L-48 0 M40 -60 L44 0 M70 -62 L78 0" stroke="#0a0810" stroke-width="10" stroke-linecap="round"/><ellipse cx="0" cy="-86" rx="100" ry="40"/><ellipse cx="-8" cy="-118" rx="56" ry="36"/><path d="M84 -96 Q130 -120 124 -190" stroke="#0a0810" stroke-width="22" fill="none" stroke-linecap="round"/><ellipse cx="138" cy="-196" rx="26" ry="13"/><path d="M-98 -90 q-20 16 -16 44" stroke="#0a0810" stroke-width="6" fill="none"/>
${i === 1 ? `<g transform="translate(-8 -150)"><path d="M-76 0 Q-76 -120 0 -150 Q76 -120 76 0 Z" fill="#7a2a28"/><path d="M-76 0 H76" stroke="${GOLD}" stroke-width="6"/><path d="M-50 -2 Q-50 -90 0 -112 Q50 -90 50 -2" fill="none" stroke="${GOLD}" stroke-width="2.5"/><path d="M0 -150 V-176" stroke="${GOLD}" stroke-width="4"/><circle cy="-180" r="8" fill="${GOLD}"/><path d="M-74 0 q-8 40 4 60 M74 0 q8 40 -4 60" stroke="#7a2a28" stroke-width="10" fill="none"/><circle class="fl" cy="-50" r="70" fill="url(#lampglow${u})" style="--d:1.6s"/></g>` : `<path d="M-50 -150 h80 v20 h-80 Z" fill="#2a1a20"/>`}</g>`).join('')}</g>`)}
${px(0.7, `<path d="M0 1240 V1080 Q300 1040 600 1090 Q860 1130 1080 1080 V1240 Z" fill="#0a0810"/>
<g fill="#000" transform="translate(150 1090)"><path d="M-26 0 Q-34 -90 -8 -130 Q10 -146 26 -128 Q40 -80 28 0 Z"/><circle cx="6" cy="-150" r="20"/><path d="M20 -110 Q90 -150 150 -200" stroke="#000" stroke-width="12" stroke-linecap="round" fill="none"/>${Array.from({ length: 7 }, (_, i) => `<path d="M${-4 + i * 4} -164 q${(i - 3) * 8} -26 ${(i - 3) * 14} -30" stroke="#000" stroke-width="3" fill="none"/>`).join('')}</g>`)}
${motes(20, 0, W, 900, 1200, '#f6e8c4', 1.6)}`,

  // Majnu in the wilderness: gaunt under a bare tree in moonlight, deer resting beside him, a bird nesting in his hair
  majnu: (u) => `<defs>${lin(`s${u}`, [[0, '#0a1020'], [0.6, '#22304a'], [1, '#4a5060']])}${rad(`m${u}`, '#eef0dc', 0.75)}${rad(`ff${u}`, '#e8f08a', 0.9)}</defs>
${px(0, `<rect width="${W}" height="${H}" fill="url(#s${u})"/>${stars(120, 20, 800)}<circle cx="760" cy="520" r="380" fill="url(#m${u})"/><circle cx="760" cy="520" r="120" fill="#f2f0dc"/>`)}
${px(0.2, `${ridge(920, 100, '#2a3448', 71, 120)}`)}
${px(0.4, `${ridge(1020, 60, '#1a2030', 81, 140)}<g fill="#0a0c12"><path d="M250 1100 Q270 860 240 640" stroke="#0a0c12" stroke-width="34" fill="none" stroke-linecap="round"/><path d="M246 760 Q160 700 100 700 M250 690 Q330 600 420 590 M242 650 Q220 560 160 520 M330 610 Q370 560 370 500 M140 700 Q100 660 60 668" stroke="#0a0c12" stroke-width="12" fill="none" stroke-linecap="round"/></g>`)}
${px(0.6, `<path d="M0 1240 V1120 Q540 1080 1080 1120 V1240 Z" fill="#06080c"/>
<g fill="#06080c" transform="translate(480 1110)"><path d="M-60 0 Q-70 -120 -30 -180 Q0 -204 30 -180 Q66 -120 56 0 Z"/><circle cy="-214" r="30"/>${Array.from({ length: 12 }, (_, i) => `<path d="M${-22 + i * 4} -236 q${(i - 6) * 7} -30 ${(i - 6) * 12} -44" stroke="#06080c" stroke-width="4" fill="none"/>`).join('')}
<path d="M-50 -100 Q-90 -40 -70 0 M50 -100 Q100 -60 110 -20" stroke="#06080c" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M-90 2 H130" stroke="#06080c" stroke-width="10"/>
<g class="bob"><path d="M-6 -262 q14 -14 28 -2 q-6 8 -2 14 l-12 -2 Z" fill="#2a2a22"/></g></g>
${[[700, 1110, 1], [300, 1120, -0.8]].map(([x, y, k]) => `<g transform="translate(${x} ${y}) scale(${k} ${Math.abs(k)})" fill="#06080c"><path d="M0 -10 q6 -34 50 -36 h70 q18 0 24 -20 l10 -24 q6 -10 14 0 l-4 24 q14 4 6 18 l-16 6 q-6 18 -18 24 v36 h-10 l-4 -32 h-62 l-6 32 h-10 v-36 q-24 -4 -26 -24 Z"/><path d="M166 -82 l10 -30 M166 -82 l-6 -32" stroke="#06080c" stroke-width="4"/></g>`).join('')}`)}
${Array.from({ length: 26 }, () => `<circle class="mote" cx="${f(r() * W)}" cy="${f(800 + r() * 400)}" r="${f(3 + r() * 3)}" fill="url(#ff${u})" style="--d:${f(5 + r() * 6)}s;--k:${f(r() * 8)}s;--dx:${f(r() * 120 - 60)}px;--dy:${f(-(60 + r() * 120))}px"/>`).join('')}`,

  // the Quran open on its stand: white pages, black ink, an illuminated border, lamplight and floating dust
  quran: (u) => `<defs>${lin(`s${u}`, [[0, '#120c08'], [0.6, '#2a1c12'], [1, '#3a2616']])}${rad(`g${u}`, '#f6c870')}${rad(`lampglow${u}`, '#ffcf70')}${lin(`pg${u}`, [[0, '#fffbf0'], [1, '#efe4cc']])}</defs>
${px(0, `<rect width="${W}" height="${H}" fill="url(#s${u})"/><g opacity=".12" stroke="${GOLD}" fill="none" stroke-width="2">${Array.from({ length: 7 }, (_, i) => Array.from({ length: 6 }, (_, j) => `<path d="M${90 + j * 180} ${120 + i * 170} l40 -40 l40 40 l-40 40 Z M${90 + j * 180} ${120 + i * 170} h80 M${130 + j * 180} ${80 + i * 170} v80"/>`).join('')).join('')}</g>`)}
${px(0.2, `<circle cx="540" cy="760" r="560" fill="url(#g${u})" opacity=".6"/>${rays(540, 300, 30, '#ffe2a0', 0.035, 1600, 0.05)}`)}
${px(0.5, `<path d="M330 1200 L540 1020 L750 1200 M370 1200 L540 1056 L710 1200" stroke="#6a4214" stroke-width="22" fill="none" stroke-linejoin="round"/><path d="M330 1200 L540 1020 L750 1200" stroke="${GOLD}" stroke-width="3" fill="none" opacity=".5"/>
<path d="M150 1010 Q340 950 536 990 L536 640 Q340 600 150 660 Z" fill="url(#pg${u})"/><path d="M930 1010 Q740 950 544 990 L544 640 Q740 600 930 660 Z" fill="url(#pg${u})"/>
<path d="M150 1010 Q340 950 536 990 L536 1012 Q340 972 150 1032 Z M930 1010 Q740 950 544 990 L544 1012 Q740 972 930 1032 Z" fill="${DEEP}"/>
<path d="M180 680 Q340 630 512 666 L512 966 Q340 930 180 984 Z M900 680 Q740 630 568 666 L568 966 Q740 930 900 984 Z" fill="none" stroke="${GOLD}" stroke-width="5"/>
<path d="M196 694 Q340 648 498 680 L498 952 Q340 918 196 968 Z M884 694 Q740 648 582 680 L582 952 Q740 918 884 968 Z" fill="none" stroke="#3a6a5a" stroke-width="2"/>
${Array.from({ length: 11 }, (_, i) => { const y = 720 + i * 22; s = 300 + i; return `<path d="M${220} ${y + 6} ${Array.from({ length: 9 }, (_, j) => `q${f(10 + r() * 8)} ${f(-6 - r() * 10)} ${f(26)} ${f(-1)}`).join(' ')}" stroke="#16110c" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M${600} ${y - 2} ${Array.from({ length: 9 }, () => `q${f(10 + r() * 8)} ${f(-6 - r() * 10)} ${f(26)} ${f(1)}`).join(' ')}" stroke="#16110c" stroke-width="3.2" fill="none" stroke-linecap="round"/>`; }).join('')}
<circle cx="356" cy="700" r="12" fill="${GOLD}"/><circle cx="724" cy="700" r="12" fill="${GOLD}"/>`)}
${px(0.75, `${diya(900, 1160, 1.8, u)}${diya(170, 1170, 1.3, u)}`)}
${motes(80, 150, 950, 500, 1150, '#ffe8b0', 2)}`,

  // where the heart is caught: Majnu kneeling before veiled Laila on a dune under a vast moon
  heart: (u) => `<defs>${lin(`s${u}`, [[0, '#0a0a1c'], [0.5, '#2a2244'], [0.85, '#6a4a5a'], [1, '#9a6a5a']])}${rad(`m${u}`, '#fbeed0', 0.85)}${rad(`h${u}`, '#ffb0a0', 0.6)}</defs>
${px(0, `<rect width="${W}" height="${H}" fill="url(#s${u})"/>${stars(160, 20, 760)}<circle cx="540" cy="720" r="520" fill="url(#m${u})"/><circle cx="540" cy="720" r="300" fill="#f8ecd0"/>`)}
${px(0.25, `${ridge(1000, 70, '#3a2a40', 91, 140)}`)}
${px(0.5, `<path d="M0 1240 V1060 Q280 980 540 1000 Q800 1020 1080 1070 V1240 Z" fill="#0c0a12"/>
<circle class="fl" cx="540" cy="880" r="150" fill="url(#h${u})" style="--d:3s"/>
<g fill="#0c0a12" transform="translate(640 1004)"><path d="M-46 0 Q-56 -110 -40 -200 Q-30 -260 0 -284 Q34 -260 44 -200 Q60 -110 52 0 Z"/><path d="M-30 -250 Q0 -330 30 -250 Q60 -170 70 -60 Q40 -100 30 -200 Z"/><path d="M0 -284 Q-40 -300 -30 -330 Q0 -360 30 -330 Q40 -300 0 -284 Z"/>
<path d="M-40 -170 Q-80 -160 -100 -140" stroke="#0c0a12" stroke-width="12" stroke-linecap="round" fill="none"/></g>
<g fill="#0c0a12" transform="translate(440 1010)"><path d="M-60 0 Q-70 -50 -40 -86 Q-20 -130 10 -136 Q36 -120 30 -80 Q24 -40 40 0 Z"/><circle cx="14" cy="-160" r="22"/>${Array.from({ length: 8 }, (_, i) => `<path d="M${2 + i * 4} -176 q${(i - 4) * 6} -24 ${(i - 4) * 10} -30" stroke="#0c0a12" stroke-width="3" fill="none"/>`).join('')}
<path d="M20 -110 Q70 -130 96 -150 M10 -96 Q60 -100 92 -120" stroke="#0c0a12" stroke-width="10" stroke-linecap="round" fill="none"/></g>`)}
${px(0.8, `<path d="M0 1240 V1150 Q540 1120 1080 1150 V1240 Z" fill="#040308"/>`)}
${motes(30, 300, 780, 760, 1060, '#ffd8c8', 2.2)}${flock(200, 420, 5, 0.9, '#2a2440')}`,
};

export const SCENE_NAMES = Object.keys(SCENES);
export const scene = (name, u) => {
  if (!SCENES[name]) throw new Error(`unknown scene "${name}" (have: ${SCENE_NAMES.join(', ')})`);
  s = 7 + u * 101;
  return SCENES[name](u);
};
export const SIZE = { W, H };
