/**
 * punjabi-kavita.com Shahmukhi pages read by more-poets.mjs.
 *   page: cached page name (.cache/more-poets/pk/<page>.html); poet, form, book: as in punjabi-kavita.mjs
 *   mode: sections (one poem per <h3>, default) | pnum (one poem per bare number line, pages without <h3>)
 *   all: the page is this poet's only source, so no matching against Wikisource
 *   work: the page's poems form a work, numbered in page order
 */
const tr = (book) => `Shahmukhi text from punjabi-kavita.com, a transliteration of the Gurmukhi original (${book}). Not yet checked against a printed edition.`;
const GGS = 'Bani of Guru Nanak in the Guru Granth Sahib. Shahmukhi text from punjabi-kavita.com, a transliteration of its Gurmukhi text. Not yet checked against a printed edition.';
const work = (id, title, title_en, kind, form, extra = {}) => ({ id, title, title_en, kind, form, ...extra });

export const PK_PAGES = [
  // Poets also on Wikisource: only poems Wikisource lacks are added.
  { page: 'PoetrySachalSarmastShahmukhi', poet: 'sachal-sarmast', form: 'kafi', book: 'Kafian Sachal Sarmast' },
  { page: 'KafianKhwajaGhulamFaridShahmukhi', poet: 'khwaja-ghulam-farid', form: 'kafi', book: 'Kafian Khwaja Ghulam Farid' },
  { page: 'KafianKhwajaGhulamFaridShahmukhiA', poet: 'khwaja-ghulam-farid', form: 'kafi', book: 'Kafian Khwaja Ghulam Farid' },
  { page: 'DohreKhwajaGhulamFaridShahmukhi1', poet: 'khwaja-ghulam-farid', form: 'dohra', book: 'Dohre Khwaja Ghulam Farid (part 2)', mode: 'pnum',
    work: work('dohre-khwaja-ghulam-farid-2', 'دوہڑے خواجہ غلام فرید (بھاگ-2)', 'Dohre, part 2', 'collection', 'dohra', { order: 3 }) },
  { page: 'KafianShahSharafShahmukhi', poet: 'shah-sharaf', form: 'kafi', book: 'Kafian Shah Sharaf' },
  { page: 'KafianSainMaulaShahShahmukhi', poet: 'sain-maula-shah', form: 'kafi', book: 'Kafian Sain Maula Shah' },
  { page: 'KafianSantWaliRamShahmukhi', poet: 'sant-wali-ram', form: 'kafi', book: 'Kafian Sant Wali Ram' },
  { page: 'KafianSayyedShahMuradShahmukhi', poet: 'shah-murad', form: 'kafi', book: 'Kafian Sayyed Shah Murad' },
  { page: 'CompleteKafianMiranShahJalandhariShahmukhi', poet: 'miran-shah-jalandhari', form: 'kafi', book: 'Kafian Miran Shah Jalandhari' },
  { page: 'PoetryMiranShahJalandhariShahmukhi', poet: 'miran-shah-jalandhari', form: 'nazm', book: 'Poetry of Miran Shah Jalandhari' },
  { page: 'MiscPoetryAliHaiderShahmukhi', poet: 'ali-haider-multani', form: 'nazm', book: 'Misc poetry of Ali Haider Multani' },
  { page: 'DariyaeMaarfatFardFaqirShahmukhi', poet: 'fard-faqir', form: 'nazm', book: 'Dariya-e-Maarfat' },
  { page: 'PoetryBabuFirozDinSharafShahmukhi', poet: 'firoz-din-sharaf', form: 'nazm', book: 'Poetry of Babu Firoz Din Sharaf' },
  { page: 'MiscPoetryMaulviGhulamRasoolQillaMihanSinghShahmukhi', poet: 'ghulam-rasool-qila-mihan-singh', form: 'nazm', book: 'Misc poetry of Maulvi Ghulam Rasool' },
  { page: 'SiharfianMuhammadBootaGujratiShahmukhi', poet: 'muhammad-boota-gujrati', form: 'siharfi', book: 'Siharfian Muhammad Boota Gujrati' },
  { page: 'HidayatullahShahmukhi', poet: 'mian-hidayatullah', form: 'baran-maah', book: 'Barah Maha Hidayatullah' },
  { page: 'BaranmahSassiShahmukhi', poet: 'karim-bakhsh', form: 'baran-maah', book: 'Baranmah Sassi' },
  { page: 'SainLabhuShahShahmukhi', poet: 'sain-labhu-shah', form: 'dohra', book: 'Punjabi poetry of Sain Labhu Shah' },
  { page: 'BabaWajeedShahmukhi', poet: 'baba-wajid', form: 'shalok', book: 'Salok Baba Wajeed', skip: /^بابا وجید$/ }, // first section is the site's biography

  // Poets found only on punjabi-kavita.
  { page: 'MuqbalShahmukhi', poet: 'muqbil', form: 'qissa', book: 'Heer Muqbal', all: true,
    work: work('heer-muqbil', 'ہیر مقبل', 'Heer', 'qissa', 'qissa') },
  { page: 'VaarNadirShahShahmukhi', poet: 'najabat', form: 'var', book: 'Vaar Nadir Shah', all: true,
    work: work('var-nadir-shah-najabat', 'نادرشاہ دی وار', 'Var Nadir Shah', 'book', 'var') },
  { page: 'PirMuhammadShahmukhi', poet: 'pir-muhammad', form: 'var', book: 'Chatthian di Vaar', all: true,
    work: work('chatthian-di-var', 'چٹھیاں دی وار', 'Chatthian di Var', 'book', 'var') },
  { page: 'BabeNanakDevDiVaarShahmukhi', poet: 'bhai-gurdas', form: 'var', book: 'Vaaran Bhai Gurdas: Babe Nanak Dev di Vaar', all: true,
    work: work('var-babe-nanak-dev-di-bhai-gurdas', 'بابے نانک دیو دی وار', 'Var 1: Babe Nanak Dev di Var', 'book', 'var', { order: 1 }) },
  { page: 'BhagtanDiVaarShahmukhi', poet: 'bhai-gurdas', form: 'var', book: 'Vaaran Bhai Gurdas: Bhagtan di Vaar', all: true,
    work: work('var-bhagtan-di-bhai-gurdas', 'بھگتاں دی وار', 'Bhagtan di Var', 'book', 'var', { order: 2 }) },
  { page: 'PirMuridanDiVaarShahmukhi', poet: 'bhai-gurdas', form: 'var', book: 'Vaaran Bhai Gurdas: Pir Muridan di Vaar', all: true,
    work: work('var-pir-muridan-di-bhai-gurdas', 'پیر مریداں دی وار', 'Pir Muridan di Var', 'book', 'var', { order: 3 }) },
  { page: 'NindakAkirtghanGursaangDiVaarShahmukhi', poet: 'bhai-gurdas', form: 'var', book: 'Vaaran Bhai Gurdas: Nindak, Akirtghan, Gursaang di Vaar', all: true,
    work: work('var-nindak-akirtghan-bhai-gurdas', 'نندک، اکرتگھن، گرسانگ دی وار', 'Nindak, Akirtghan, Gursaang di Var', 'book', 'var', { order: 4 }) },
  { page: 'MeenianDiVaarShahmukhi', poet: 'bhai-gurdas', form: 'var', book: 'Vaaran Bhai Gurdas: Meenian di Vaar', all: true,
    work: work('var-meenian-di-bhai-gurdas', 'میݨیاں دی وار', 'Meenian di Var', 'book', 'var', { order: 5 }) },
  { page: 'JapuGuruNanakDevJiShahmukhi', poet: 'guru-nanak', form: 'nazm', book: 'Japu (Guru Granth Sahib)', all: true, note: GGS, title: 'جپُ' },
  { page: 'ShabadGuruNanakDevShahmukhi', poet: 'guru-nanak', form: 'nazm', book: 'Shabads of Guru Nanak (Guru Granth Sahib)', all: true, note: GGS },
  { page: 'SalokGuruNanakDevShahmukhi', poet: 'guru-nanak', form: 'shalok', book: 'Saloks of Guru Nanak (Guru Granth Sahib)', all: true, note: GGS,
    work: work('salok-guru-nanak', 'سلوک گرو نانک دیو جی', 'Saloks', 'collection', 'shalok') },
  { page: 'KafianGuruNanakDevShahmukhi', poet: 'guru-nanak', form: 'kafi', book: 'Kafian of Guru Nanak (Guru Granth Sahib)', all: true, note: GGS },
  { page: 'ChhantGuruNanakDevShahmukhi', poet: 'guru-nanak', form: 'nazm', book: 'Chhants of Guru Nanak (Guru Granth Sahib)', all: true, note: GGS },
  { page: 'PaurianGuruNanakDevShahmukhi', poet: 'guru-nanak', form: 'var', book: 'Pauris of Guru Nanak (Guru Granth Sahib)', all: true, note: GGS },
  { page: 'BarahMahaGuruNanakDevJiShahmukhi', poet: 'guru-nanak', form: 'baran-maah', book: 'Barah Maha Tukhari (Guru Granth Sahib)', all: true, note: GGS, title: 'بارہ ماہا' },
  { page: 'KishanSinghArifShahmukhi', poet: 'kishan-singh-arif', form: 'kafi', book: 'Baranmah and Kafian of Kishan Singh Arif', all: true },
  { page: 'KaramAliShahShahmukhi', poet: 'karam-ali-shah', form: 'kafi', book: 'Kafian Karam Ali Shah', all: true },
  { page: 'SainMuradShahmukhi', poet: 'sain-murad', form: 'nazm', book: 'Punjabi poetry of Sain Murad', all: true },
  { page: 'ChandanwariChatrikShahmukhi', poet: 'dhani-ram-chatrik', form: 'nazm', book: 'Chandanwari', plainBook: true, all: true, note: tr('Chandanwari'),
    work: work('chandanwari-chatrik', 'چندن واڑی', 'Chandanwari', 'collection', 'nazm', { order: 1 }) },
  { page: 'KesarKiariChatrikShahmukhi', poet: 'dhani-ram-chatrik', form: 'nazm', book: 'Kesar Kiari', plainBook: true, all: true, note: tr('Kesar Kiari'),
    work: work('kesar-kiari-chatrik', 'کیسر کیاری', 'Kesar Kiari', 'collection', 'nazm', { order: 2 }) },
  { page: 'NawanJahanChatrikShahmukhi', poet: 'dhani-ram-chatrik', form: 'nazm', book: 'Nawan Jahan', plainBook: true, all: true, note: tr('Nawan Jahan'),
    work: work('nawan-jahan-chatrik', 'نواں جہان', 'Nawan Jahan', 'collection', 'nazm', { order: 3 }) },
  { page: 'SufikhanaChatrikShahmukhi', poet: 'dhani-ram-chatrik', form: 'nazm', book: 'Sufikhana', plainBook: true, all: true, note: tr('Sufikhana'),
    work: work('sufikhana-chatrik', 'صوفی خانہ', 'Sufikhana', 'collection', 'nazm', { order: 4 }) },
  { page: 'MiscPoetryChatrikShahmukhi', poet: 'dhani-ram-chatrik', form: 'nazm', book: 'Misc poetry of Dhani Ram Chatrik', all: true, note: tr('various') },
  { page: 'KhulheMaidanPuranSinghShahmukhi', poet: 'puran-singh', form: 'nazm', book: 'Khulhe Maidan', plainBook: true, all: true, note: tr('Khulhe Maidan'),
    work: work('khulhe-maidan-puran-singh', 'کھلھے میدان', 'Khulhe Maidan', 'collection', 'nazm', { order: 1 }) },
  { page: 'KhulheGhundPuranSinghShahmukhi', poet: 'puran-singh', form: 'nazm', book: 'Khulhe Ghund', plainBook: true, all: true, note: tr('Khulhe Ghund'),
    work: work('khulhe-ghund-puran-singh', 'کھلھے گھنڈ', 'Khulhe Ghund', 'collection', 'nazm', { order: 2 }) },
  { page: 'KhulheAsmaniRangPuranSinghShahmukhi', poet: 'puran-singh', form: 'nazm', book: 'Khulhe Asmani Rang', plainBook: true, all: true, note: tr('Khulhe Asmani Rang'),
    work: work('khulhe-asmani-rang-puran-singh', 'کھلھے اسمانی رنگ', 'Khulhe Asmani Rang', 'collection', 'nazm', { order: 3 }) },
];
