/**
 * Word → lexicon lookup keys for Shahmukhi poem text. Pure functions, no dependencies,
 * shared by the site (meaning dialog) and scripts/lexicon/coverage.mjs.
 *
 * `fold` is the matching key: the site's `normalise` (strip punctuation and vowel marks)
 * plus unification of the letter variants found across our sources (Arabic vs Persian
 * yeh/kaf/heh, Wiktionary's ݨ, honorific signs…). Index lexicon headwords by `fold(hw)`
 * and look words up by each of `candidates(word)` in order; the first hit wins.
 */

const PUNCT = /[\s.,;:!?،؛؟۔"'“”‘’()[\]{}«»\-–—…٭؎]+/g;
/** Vowel marks (as in content.ts), Quranic marks, honorific/takhallus signs, tatweel, zero-width chars. */
const MARKS = /[ً-ٰٟۖ-ۭؐ-ؚـ​-‏]/g;

const LETTERS: Record<string, string> = {
  'ي': 'ی', 'ى': 'ی', 'ې': 'ی',
  'ك': 'ک',
  'ه': 'ہ', 'ۀ': 'ہ', 'ۃ': 'ہ', 'ة': 'ہ',
  'ݨ': 'ن', 'ڻ': 'ن',
  'أ': 'ا', 'إ': 'ا', 'ٱ': 'ا',
  'ۓ': 'ئے',
  'ﺅ': 'ؤ',
};
const LETTER_RE = new RegExp(`[${Object.keys(LETTERS).join('')}]`, 'g');

export function fold(word: string): string {
  return word
    .normalize('NFC')
    .replace(/ا?ﷲ/g, 'اللہ')
    .replace(PUNCT, '')
    .replace(MARKS, '')
    .replace(LETTER_RE, (c) => LETTERS[c]);
}

/**
 * Ending rules, tried in this order (more specific endings first). `to` lists what replaces
 * the ending, in order of preference; 'نا' gives the infinitive, which is how Platts and
 * Wiktionary list verbs. Bare verb stems and guesses shorter than three letters are not
 * produced: they collide with unrelated words (والی → وال "hair", جیوں → جی "life").
 */
interface Rule { end: string; to: string[] }
const RULES: Rule[] = [
  // Western Punjabi present (کریندا، ڈیندی) and present participles (کردا، جاندی، ہوندیاں)
  ...['یندیاں', 'یندا', 'یندی', 'یندے', 'ندیاں', 'ندا', 'ندی', 'ندے', 'دیاں', 'دا', 'دی', 'دے'].map((end) => ({ end, to: ['نا'] })),
  // future: کریگا، کرینگے; Western Punjabi ہوسی، کریساں، ہوسن
  ...['ینگے', 'یگا', 'یگی', 'ےگا', 'ےگی', 'نگے', 'یساں', 'ساں', 'سی', 'سن'].map((end) => ({ end, to: ['نا'] })),
  // conjunctive participle written solid: کرکے
  { end: 'کے', to: ['نا'] },
  // perfective: آئی، آئے، گئیاں؛ آکھیا، ہویا، رہیا
  { end: 'ئیاں', to: ['ئی', 'نا'] }, { end: 'ئیں', to: ['نا'] }, { end: 'ئی', to: ['نا'] }, { end: 'ئے', to: ['نا'] },
  { end: 'یاں', to: ['یا', 'ی', 'ا', 'نا'] },
  { end: 'یوں', to: ['ی', 'ا'] },
  { end: 'یا', to: ['نا', 'ا'] },
  // plural / oblique of nouns: گلاں، ہزاراں، کولوں; subjunctive کراں، جاواں
  { end: 'واں', to: ['', 'ا', 'نا'] },
  { end: 'اں', to: ['', 'نا', 'ا'] },
  { end: 'وں', to: ['', 'ا'] },
  { end: 'ں', to: [''] },
  { end: 'یں', to: ['نا', 'ی'] },
  // oblique infinitive کرنے, gerund کرن
  { end: 'نے', to: ['نا'] }, { end: 'ن', to: ['نا'] },
  // subjunctive کرے; oblique/plural masculine منڈے، دانے; feminine چنگی; imperative کرو
  { end: 'ے', to: ['نا', 'ا', 'ہ'] },
  { end: 'ی', to: ['ا', 'نا'] },
  { end: 'و', to: ['نا'] },
];

const MIN_STEM = 2;
const MIN_GUESS = 3;

/** Final ا and ہ alternate between Punjabi and Urdu spellings (واعدا / وعدہ). Not for perfectives in یا. */
function spellings(w: string): string[] {
  const out = [w];
  if (w.length > 2 && w.endsWith('ا') && !/(یا|ندا|دا)$/.test(w)) out.push(w.slice(0, -1) + 'ہ');
  if (w.length > 2 && w.endsWith('ہ')) out.push(w.slice(0, -1) + 'ا');
  return out;
}

/**
 * Lookup keys for a word in a poem: the folded word itself first, then spelling variants,
 * then conservative base-form guesses (plural/oblique/feminine → masculine direct singular,
 * participles/perfectives/futures → infinitive). All keys are folded.
 */
export function candidates(word: string): string[] {
  const w = fold(word);
  if (!w) return [];
  const out: string[] = [];
  const add = (s: string) => { if (s.length >= MIN_STEM && !out.includes(s)) out.push(s); };
  spellings(w).forEach(add);
  // a final hamza-yeh is usually a clipped ئی / ئے (ہوئ, جائ)
  const forms = w.endsWith('ئ') ? [w, w + 'ی', w + 'ے'] : [w];
  forms.slice(1).forEach(add);
  for (const f of forms) {
    for (const r of RULES) {
      if (!f.endsWith(r.end)) continue;
      const stem = f.slice(0, -r.end.length);
      if (stem.length < MIN_STEM) continue;
      for (const t of r.to) if (stem.length + t.length >= MIN_GUESS) add(stem + t);
    }
  }
  return out;
}
