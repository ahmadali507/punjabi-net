/**
 * Punjabi (Shahmukhi) renderings for the /pa pages, which carry no English and
 * no romanisation. Fixed vocabularies (styles, topics, dialects, sources,
 * dates) are mapped here; free text comes from the content files' *_pa fields.
 */
import type { Source } from '~/content.config';

const PA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export const paNum = (s: string | number) => String(s).replace(/\d/g, (d) => PA_DIGITS[+d]);

/** True when a string has Latin letters (used by the build check). */
export const hasLatin = (s: string) => /[A-Za-z]/.test(s);

/* ---------- Dates ---------- */

const ORDINAL: Record<number, string> = {
  11: 'گیارھویں', 12: 'بارھویں', 13: 'تیرھویں', 14: 'چودھویں', 15: 'پندرھویں', 16: 'سولھویں',
  17: 'سترھویں', 18: 'اٹھارھویں', 19: 'انیویں', 20: 'ویہویں', 21: 'اکیویں',
};
const PART: Record<string, string> = { early: 'دا مڈھ', mid: 'دا ادھ', late: 'دا اخیر' };

/** "c. 1680" -> "لگ بھگ ۱۶۸۰", "1757?" -> "۱۷۵۷؟", "early 17th century" -> "سترھویں صدی دا مڈھ". */
export function datePa(date: string | undefined): string {
  if (!date) return '';
  const c = date.match(/^(?:(early|mid|late) )?(\d{1,2})(?:st|nd|rd|th) century$/);
  if (c) {
    const n = Number(c[2]);
    return [`${ORDINAL[n] ?? paNum(n)} صدی`, c[1] && PART[c[1]]].filter(Boolean).join(' ');
  }
  const y = date.match(/^(c\. )?(\d{3,4})(\?)?$/);
  if (y) return `${y[1] ? 'لگ بھگ ' : ''}${paNum(y[2])}${y[3] ? '؟' : ''}`;
  return paNum(date);
}

export function lifespanPa(p: { born?: string; died?: string }): string {
  if (!p.born && !p.died) return '';
  return `${datePa(p.born)} – ${datePa(p.died)}`.trim();
}

/* ---------- Fixed vocabularies ---------- */

export const STYLE_PA: Record<string, string> = {
  Sufi: 'صوفی', Kafi: 'کافی', Qissa: 'قصہ', Bait: 'بیت', Shalok: 'شلوک', Dohra: 'دوہڑا',
  Modern: 'جدید', Epic: 'رزمیہ', Political: 'سیاسی',
};
export const ERA_PA: Record<string, string> = { classical: 'کلاسیکی', modern: 'جدید', contemporary: 'اجوکا' };

/** Wilson's section headings for the proverbs. */
export const TOPIC_PA: Record<string, string> = {
  Seasons: 'رُتاں', Rain: 'مینہ', 'Signs of the weather': 'موسم دیاں نشانیاں', 'Family life': 'ٹبر دی زندگی',
  Cattle: 'مال ڈنگر', Ploughing: 'ہل واہنا', Sowing: 'بیجائی', 'Other agricultural operations': 'واہی دے ہور کم',
  Crops: 'فصلاں', Soils: 'زمیناں', Character: 'سبھاء', 'Worldly Wisdom': 'دنیاداری دی سیانپ',
  'Worldly wisdom': 'دنیاداری دی سیانپ', 'Opium, bhang and charas': 'افیم، بھنگ تے چرس',
};

export const DIALECT_PA: Record<string, string> = { Majhi: 'ماجھی', Doabi: 'دوآبی', Malwai: 'ملوئی', Pothohari: 'پوٹھوہاری' };

/** The few verification notes, by their opening words. */
export function verificationPa(note: string): string {
  if (note.startsWith('Transcribed from Wikisource'))
    return 'متن وکی سورس توں لیا گیا اے، جتھے ایہنوں عوامی ملکیت (پرانی لکھت) آکھیا گیا اے۔ حالے کسے چھپی کتاب نال ملایا نہیں گیا۔';
  if (note.startsWith('Shahmukhi text from punjabi-kavita.com'))
    return 'شاہ مکھی متن پنجابی کویتا ویب سائٹ توں اے، جیہڑا بھائی ویر سنگھ دے گورمکھی متن دا لپیانتر اے۔ حالے کسے چھپی کتاب نال ملایا نہیں گیا۔';
  if (note.startsWith('Text needed from printed source')) return 'متن حالے چھپی کتاب توں چڑھایا جانا اے۔ سرناویں دے ہجے تے ایڈیشن دی وی پکی تصدیق ہونی اے۔';
  return 'تصدیق دا نوٹ صرف انگریزی صفحے تے اے۔';
}

/* ---------- Sources ---------- */

/** Shahmukhi names for the publications cited (the part before ":" for web sources). */
const PUBLICATION_PA: Record<string, string> = {
  Wikipedia: 'وکیپیڈیا', 'Wikisource (Punjabi)': 'وکی سورس (پنجابی)', Dawn: 'ڈان اخبار', 'Dawn (via APNA)': 'ڈان اخبار (اپنا راہیں)',
  'Daily Times': 'ڈیلی ٹائمز', 'Deccan Chronicle': 'دکن کرانیکل', 'The Tribune': 'دی ٹریبیون', Rekhta: 'ریختہ',
  'Sufinama (Rekhta)': 'صوفی نامہ (ریختہ)', 'Punjabi Kavita': 'پنجابی کویتا', 'The Encyclopaedia of Sikhism': 'سکھ مت دا انسائیکلوپیڈیا',
  'Academy of the Punjab in North America (APNA)': 'اکیڈمی آف دی پنجاب ان نارتھ امریکہ (اپنا)',
};

export interface SourcePa { text: string; url?: string }

/** A citation in Punjabi. Book titles that are English are named by what they are, not translated as titles. */
export function sourcePa(s: Source): SourcePa {
  const page = s.page !== undefined ? `، صفحہ ${paNum(String(s.page).replace(/^.*p\.\s*/, ''))}` : '';
  const year = s.year !== undefined ? paNum(s.year) : '';
  const b = s.book;
  let text: string;
  if (b.startsWith('Grammar and Dictionary of Western Panjabi')) {
    text = `جے۔ ولسن، «مغربی پنجابی دی گرامر تے لغت، شاہپور ضلعے دی بولی»${b.includes('Proverbs') ? '، اکھاناں والا حصہ' : ''} (پنجاب سرکار پریس، لاہور، ${year || '۱۸۹۹'})${page}`;
  } else if (b.startsWith('Wikisource (Punjabi)')) {
    const rest = b.replace(/^Wikisource \(Punjabi\)(, public-domain transcription)?:\s*/, '');
    text = `وکی سورس (پنجابی)، عوامی ملکیت والا متن${hasLatin(rest) ? '' : `: ${rest}`}`;
  } else if (b === 'Matak Hulare') {
    text = `بھائی ویر سنگھ، «مٹک ہلارے»${year ? ` (${year})` : ''}${page}`;
  } else if (b.startsWith('Printed edition to be chosen')) {
    text = 'چھپیا ایڈیشن حالے چنیا جانا اے';
  } else if (b.startsWith('Panjabi Sufi Poets')) {
    text = `لاجونتی رام کرشنا، «پنجابی صوفی شاعر، ۱۴۶۰–۱۹۰۰»${year ? ` (${year})` : ''}${page}`;
  } else {
    const pub = b.includes(':') ? b.slice(0, b.indexOf(':')) : b;
    text = PUBLICATION_PA[pub] ?? 'ماخذ (انگریزی وچ)';
  }
  return { text, url: s.url };
}

/* ---------- Portrait credits ---------- */

const CREDIT_PA: Record<string, string> = {
  'Unknown artist': 'نامعلوم مصور', 'Public domain': 'عوامی ملکیت', 'Wikimedia Commons': 'وکی میڈیا کامنز',
  'Amarjit Chandan': 'امرجیت چندن', Asifshiraz: 'آصف شیراز', Jaypee: 'جے پی', 'Musab Bin Noor': 'مصعب بن نور', Shahaed912: 'شاہد',
  CC0: 'کھلا لائسنس (سی سی زیرو)', 'CC BY 4.0': 'کھلا لائسنس (سی سی بی وائی ۴)', 'CC BY-SA 4.0': 'کھلا لائسنس (سی سی بی وائی ایس اے ۴)',
  'CC BY-SA 3.0': 'کھلا لائسنس (سی سی بی وائی ایس اے ۳)',
};
export const creditPa = (credit: string) => credit.split(' · ').map((p) => CREDIT_PA[p] ?? p).join(' · ');
