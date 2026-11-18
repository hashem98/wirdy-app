export const QURAN_API_BASE_URL = 'https://api.alquran.cloud/v1';
export const QURAN_LAYOUT_BASE_URL = 'https://api.quran.com/api/v4';
export const UTHMANI_EDITION = 'quran-uthmani';
export const DEFAULT_RECITER_EDITION = 'ar.alafasy';
export const AUDIO_CDN_BASE_URL = 'https://cdn.islamic.network/quran/audio/128';
export const SURAH_COUNT = 114;
export const MUSHAF_PAGE_COUNT = 604;

export const RECITER_EDITIONS = [
  'ar.abdulbasitmurattal',
  'ar.abdullahbasfar',
  'ar.abdurrahmaansudais',
  'ar.abdulsamad',
  'ar.shaatree',
  'ar.ahmedajamy',
  'ar.alafasy',
  'ar.hanirifai',
  'ar.husary',
  'ar.husarymujawwad',
  'ar.hudhaify',
  'ar.ibrahimakhbar',
  'ar.mahermuaiqly',
  'ar.minshawi',
  'ar.minshawimujawwad',
  'ar.muhammadayyoub',
  'ar.muhammadjibreel',
  'ar.saoodshuraym',
  'ar.parhizgar',
  'ar.aymanswoaid',
] as const;

export type ReciterEdition = (typeof RECITER_EDITIONS)[number];

export function isFreeReciter(identifier: string): identifier is ReciterEdition {
  return (RECITER_EDITIONS as readonly string[]).includes(identifier);
}
export type RevelationType = 'Meccan' | 'Medinan';

export interface SurahSummary {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: RevelationType;
}

export interface AyahContent {
  number: number;
  numberInSurah: number;
  text: string;
  audioUrl: string;
}

export interface SurahWithAudio extends SurahSummary {
  reciterEdition: string;
  ayahs: AyahContent[];
}

export interface PageAyah {
  number: number;
  numberInSurah: number;
  surahNumber: number;
  surahName: string;
  text: string;
  audioUrl: string;
}

export interface MushafWord {
  surahNumber: number;
  numberInSurah: number;
  lineNumber: number;
  text: string;
  isMarker: boolean;
}

export interface MushafPage {
  number: number;
  reciterEdition: string;
  ayahs: PageAyah[];
  words: MushafWord[];
}

export interface AudioEdition {
  identifier: string;
  language: string;
  name: string;
  englishName: string;
  format: 'audio';
}

export interface TafseerEdition {
  identifier: string;
  name: string;
}

export interface AyahTafseer {
  ayahNumber: number;
  text: string;
  editionName: string;
}

export const TAFSEER_EDITIONS: readonly TafseerEdition[] = [
  { identifier: 'ar.muyassar', name: 'التفسير الميسر' },
  { identifier: 'ar.jalalayn', name: 'تفسير الجلالين' },
  { identifier: 'ar.qurtubi', name: 'تفسير القرطبي' },
];

export const DEFAULT_TAFSEER_EDITION = 'ar.muyassar';

export const SURAH_START_PAGES: readonly number[] = [
  1, 2, 50, 77, 106, 128, 151, 177, 187, 208, 221, 235, 249, 255, 262, 267, 282, 293, 305, 312,
  322, 332, 342, 350, 359, 367, 377, 385, 396, 404, 411, 415, 418, 428, 434, 440, 446, 453, 458,
  467, 477, 483, 489, 496, 499, 502, 507, 511, 515, 518, 520, 523, 526, 528, 531, 534, 537, 542,
  545, 549, 551, 553, 554, 556, 558, 560, 562, 564, 566, 568, 570, 572, 574, 575, 577, 578, 580,
  582, 583, 585, 586, 587, 587, 589, 590, 591, 591, 592, 593, 594, 595, 595, 596, 596, 597, 597,
  598, 598, 599, 599, 600, 600, 601, 601, 601, 602, 602, 602, 603, 603, 603, 604, 604, 604,
];

export function getSurahStartPage(surahNumber: number): number {
  if (surahNumber < 1 || surahNumber > SURAH_COUNT) {
    return 1;
  }
  return SURAH_START_PAGES[surahNumber - 1] ?? 1;
}

export const DEFAULT_SURAH_NAMES: readonly string[] = [
  'الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال', 'التوبة', 'يونس',
  'هود', 'يوسف', 'الرعد', 'إبراهيم', 'الحجر', 'النحل', 'الإسراء', 'الكهف', 'مريم', 'طه',
  'الأنبياء', 'الحج', 'المؤمنون', 'النور', 'الفرقان', 'الشعراء', 'النمل', 'القصص', 'العنكبوت', 'الروم',
  'لقمان', 'السجدة', 'الأحزاب', 'سبأ', 'فاطر', 'يس', 'الصافات', 'ص', 'الزمر', 'غافر',
  'فصلت', 'الشورى', 'الزخرف', 'الدخان', 'الجاثية', 'الأحقاف', 'محمد', 'الفتح', 'الحجرات', 'ق',
  'الذاريات', 'الطور', 'النجم', 'القمر', 'الرحمن', 'الواقعة', 'الحديد', 'المجادلة', 'الحشر', 'الممتحنة',
  'الصف', 'الجمعة', 'المنافقون', 'التغابن', 'الطلاق', 'التحريم', 'الملك', 'القلم', 'الحاقة', 'المعارج',
  'نوح', 'الجن', 'المزمل', 'المدثر', 'القيامة', 'الإنسان', 'المرسلات', 'النبأ', 'النازعات', 'عبس',
  'التكوير', 'الانفطار', 'المطففين', 'الانشقاق', 'البروج', 'الطارق', 'الأعلى', 'الغاشية', 'الفجر', 'البلد',
  'الشمس', 'الليل', 'الضحى', 'الشرح', 'التين', 'العلق', 'القدر', 'البينة', 'الزلزلة', 'العاديات',
  'القارعة', 'التكاثر', 'العصر', 'الهمزة', 'الفيل', 'قريش', 'الماعون', 'الكوثر', 'الكافرون', 'النصر',
  'المسد', 'الإخلاص', 'الفلق', 'الناس',
];


