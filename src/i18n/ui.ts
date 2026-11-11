/**
 * Interface strings. English for "/", Punjabi for "/pa".
 * Punjabi strings are stored once per script (sm/gm/ro), the same as content.
 * They are never converted at runtime.
 *
 * Status: drafted, NEEDS NATIVE-SPEAKER REVIEW before launch.
 * Roman spelling follows the site convention (macrons for long vowels,
 * underdots for retroflexes, ṅ for nasalisation).
 */
export type ScriptText = { sm: string; gm: string; ro: string };

export const ui = {
  'site.tagline': {
    en: 'An archive of Punjabi poetry, poets, proverbs and words',
    pa: {
      sm: 'پنجابی شاعری، شاعراں، اکھاناں تے لفظاں دی سانبھ',
      gm: 'ਪੰਜਾਬੀ ਸ਼ਾਇਰੀ, ਸ਼ਾਇਰਾਂ, ਅਖਾਣਾਂ ਤੇ ਲਫ਼ਜ਼ਾਂ ਦੀ ਸਾਂਭ',
      ro: 'Panjābī shāirī, shāirāṅ, akhāṇāṅ te lafzāṅ dī sāmbh',
    },
  },
  'skip': {
    en: 'Skip to content',
    pa: { sm: 'سدھا لکھت ول جاؤ', gm: 'ਸਿੱਧਾ ਲਿਖਤ ਵੱਲ ਜਾਓ', ro: 'Siddhā likhat vall jāo' },
  },
  'nav.label': {
    en: 'Main',
    pa: { sm: 'مکھ', gm: 'ਮੁੱਖ', ro: 'Mukkh' },
  },
  'nav.menu': {
    en: 'Menu',
    pa: { sm: 'مینو', gm: 'ਮੀਨੂ', ro: 'Mīnū' },
  },
  'nav.home': {
    en: 'Home',
    pa: { sm: 'مکھ صفحہ', gm: 'ਮੁੱਖ ਸਫ਼ਾ', ro: 'Mukkh safhā' },
  },
  'nav.poets': {
    en: 'Poets',
    pa: { sm: 'شاعر', gm: 'ਸ਼ਾਇਰ', ro: 'Shāir' },
  },
  'nav.poems': {
    en: 'Poems',
    pa: { sm: 'کلام', gm: 'ਕਲਾਮ', ro: 'Kalām' },
  },
  'nav.dictionary': {
    en: 'Dictionary',
    pa: { sm: 'لغت', gm: 'ਸ਼ਬਦਕੋਸ਼', ro: 'Lughat' },
  },
  'nav.proverbs': {
    en: 'Proverbs',
    pa: { sm: 'اکھان', gm: 'ਅਖਾਣ', ro: 'Akhāṇ' },
  },
  'nav.forms': {
    en: 'Forms',
    pa: { sm: 'صنفاں', gm: 'ਕਾਵਿ-ਰੂਪ', ro: 'Sinfāṅ' },
  },
  'nav.about': {
    en: 'About',
    pa: { sm: 'ساڈے بارے', gm: 'ਸਾਡੇ ਬਾਰੇ', ro: 'Sāḍe bāre' },
  },
  'nav.contribute': {
    en: 'Contribute',
    pa: { sm: 'حصہ پاؤ', gm: 'ਹਿੱਸਾ ਪਾਓ', ro: 'Hissā pāo' },
  },
  'search.label': {
    en: 'Search',
    pa: { sm: 'لبھو', gm: 'ਲੱਭੋ', ro: 'Labbho' },
  },
  'search.placeholder': {
    en: 'Search poets, poems, words…',
    pa: { sm: 'شاعر، کلام، لفظ لبھو…', gm: 'ਸ਼ਾਇਰ, ਕਲਾਮ, ਲਫ਼ਜ਼ ਲੱਭੋ…', ro: 'Shāir, kalām, lafz labbho…' },
  },
  'script.label': {
    en: 'Script',
    pa: { sm: 'لپی', gm: 'ਲਿਪੀ', ro: 'Lipī' },
  },
  'lang.label': {
    en: 'Language',
    pa: { sm: 'بولی', gm: 'ਬੋਲੀ', ro: 'Bolī' },
  },
  'footer.noncommercial': {
    en: 'Non-commercial. No ads, no tracking. Texts are public domain unless noted.',
    pa: {
      sm: 'غیر تجارتی۔ نہ اشتہار، نہ ٹریکنگ۔ لکھتاں پبلک ڈومین وچ نیں، جے وکھرا نہ لکھیا ہووے۔',
      gm: 'ਗ਼ੈਰ-ਤਜਾਰਤੀ। ਨਾ ਇਸ਼ਤਿਹਾਰ, ਨਾ ਟਰੈਕਿੰਗ। ਲਿਖਤਾਂ ਪਬਲਿਕ ਡੋਮੇਨ ਵਿੱਚ ਨੇ, ਜੇ ਵੱਖਰਾ ਨਾ ਲਿਖਿਆ ਹੋਵੇ।',
      ro: 'Ġair-tijāratī. Nā ishtihār, nā ṭraikiṅg. Likhtāṅ pablik ḍomen vicc ne, je vakkhrā nā likhiā hove.',
    },
  },
  'footer.instagram': {
    en: 'Instagram',
    pa: { sm: 'انسٹاگرام', gm: 'ਇੰਸਟਾਗ੍ਰਾਮ', ro: 'Instāgrām' },
  },
  'footer.source': {
    en: 'Every text records its printed source. Corrections are welcome.',
    pa: {
      sm: 'ہر لکھت نال اوہدی چھپی کتاب دا حوالہ اے۔ درستی جی آیاں نوں۔',
      gm: 'ਹਰ ਲਿਖਤ ਨਾਲ ਉਹਦੀ ਛਪੀ ਕਿਤਾਬ ਦਾ ਹਵਾਲਾ ਏ। ਦਰੁਸਤੀ ਜੀ ਆਇਆਂ ਨੂੰ।',
      ro: 'Har likhat nāl ohdī chapī kitāb dā havālā e. Darustī jī āiāṅ nūṅ.',
    },
  },
  'notfound.title': {
    en: 'Page not found',
    pa: { sm: 'صفحہ نہیں لبھیا', gm: 'ਸਫ਼ਾ ਨਹੀਂ ਲੱਭਿਆ', ro: 'Safhā nahīṅ labbhiā' },
  },
  'notfound.body': {
    en: 'This page does not exist, or has moved.',
    pa: {
      sm: 'ایہہ صفحہ موجود نہیں، یا کتے ہور چلا گیا اے۔',
      gm: 'ਇਹ ਸਫ਼ਾ ਮੌਜੂਦ ਨਹੀਂ, ਜਾਂ ਕਿਤੇ ਹੋਰ ਚਲਾ ਗਿਆ ਏ।',
      ro: 'Ih safhā maujūd nahīṅ, jāṅ kite hor calā giā e.',
    },
  },
  'home.thesis': {
    en: 'Punjabi poetry, kept in the words and scripts it was written in.',
    pa: {
      sm: 'پنجابی شاعری، اوہناں ای لفظاں تے لپیاں وچ جنہاں وچ لکھی گئی۔',
      gm: 'ਪੰਜਾਬੀ ਸ਼ਾਇਰੀ, ਉਹਨਾਂ ਹੀ ਲਫ਼ਜ਼ਾਂ ਤੇ ਲਿਪੀਆਂ ਵਿੱਚ ਜਿਨ੍ਹਾਂ ਵਿੱਚ ਲਿਖੀ ਗਈ।',
      ro: 'Panjābī shāirī, ohnāṅ ī lafzāṅ te lipīāṅ vicc jinhāṅ vicc likhī gaī.',
    },
  },
  'home.intro': {
    en: 'A non-commercial archive of Punjabi poetry, poets, proverbs and vocabulary, from Baba Farid to Bhai Vir Singh. Every text names its printed source, and every page reads in Shahmukhi, Gurmukhi or Roman script.',
    pa: {
      sm: 'پنجابی شاعری، شاعراں، اکھاناں تے لفظاں دا غیر تجارتی ذخیرہ، بابا فرید توں بھائی ویر سنگھ تیکر۔ ہر لکھت نال اوہدی چھپی کتاب دا ناں اے، تے ہر صفحہ شاہ مکھی، گُرمکھی یا رومن وچ پڑھیا جا سکدا اے۔',
      gm: 'ਪੰਜਾਬੀ ਸ਼ਾਇਰੀ, ਸ਼ਾਇਰਾਂ, ਅਖਾਣਾਂ ਤੇ ਲਫ਼ਜ਼ਾਂ ਦਾ ਗ਼ੈਰ-ਤਜਾਰਤੀ ਜ਼ਖ਼ੀਰਾ, ਬਾਬਾ ਫ਼ਰੀਦ ਤੋਂ ਭਾਈ ਵੀਰ ਸਿੰਘ ਤੀਕਰ। ਹਰ ਲਿਖਤ ਨਾਲ ਉਹਦੀ ਛਪੀ ਕਿਤਾਬ ਦਾ ਨਾਂ ਏ, ਤੇ ਹਰ ਸਫ਼ਾ ਸ਼ਾਹਮੁਖੀ, ਗੁਰਮੁਖੀ ਜਾਂ ਰੋਮਨ ਵਿੱਚ ਪੜ੍ਹਿਆ ਜਾ ਸਕਦਾ ਏ।',
      ro: 'Panjābī shāirī, shāirāṅ, akhāṇāṅ te lafzāṅ dā ġair-tijāratī zaxīrā, Bābā Farīd toṅ Bhāī Vīr Siṅgh tīkar. Har likhat nāl ohdī chapī kitāb dā nāṅ e, te har safhā Shāhmukhī, Gurmukhī jāṅ Roman vicc paṛhiā jā sakdā e.',
    },
  },
  'home.explore': {
    en: 'Explore poems',
    pa: { sm: 'کلام پڑھو', gm: 'ਕਲਾਮ ਪੜ੍ਹੋ', ro: 'Kalām paṛho' },
  },
  'home.meet': {
    en: 'Meet the poets',
    pa: { sm: 'شاعراں نوں ملو', gm: 'ਸ਼ਾਇਰਾਂ ਨੂੰ ਮਿਲੋ', ro: 'Shāirāṅ nūṅ milo' },
  },
} as const satisfies Record<string, { en: string; pa: ScriptText }>;

export type UIKey = keyof typeof ui;

/** Names of the scripts, written in their own script so readers can find theirs. */
export const SCRIPT_NAMES = {
  sm: { self: 'شاہ مکھی', en: 'Shahmukhi' },
  gm: { self: 'ਗੁਰਮੁਖੀ', en: 'Gurmukhi' },
  ro: { self: 'Roman', en: 'Roman' },
} as const;
