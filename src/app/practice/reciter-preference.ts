import { DEFAULT_RECITER_EDITION, isFreeReciter } from '../core/quran.model';

const STORAGE_KEY = 'quran.reciter.v1';
const EDITION_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/;

export interface ReciterOption {
  identifier: string;
  name: string;
}

const FALLBACK_RECITERS: readonly ReciterOption[] = [
  { identifier: 'ar.abdulbasitmurattal', name: 'عبد الباسط عبد الصمد المرتل' },
  { identifier: 'ar.abdullahbasfar', name: 'عبد الله بصفر' },
  { identifier: 'ar.abdurrahmaansudais', name: 'عبدالرحمن السديس' },
  { identifier: 'ar.abdulsamad', name: 'عبدالباسط عبدالصمد' },
  { identifier: 'ar.shaatree', name: 'أبو بكر الشاطري' },
  { identifier: 'ar.ahmedajamy', name: 'أحمد بن علي العجمي' },
  { identifier: 'ar.alafasy', name: 'مشاري العفاسي' },
  { identifier: 'ar.hanirifai', name: 'هاني الرفاعي' },
  { identifier: 'ar.husary', name: 'محمود خليل الحصري' },
  { identifier: 'ar.husarymujawwad', name: 'محمود خليل الحصري (المجود)' },
  { identifier: 'ar.hudhaify', name: 'علي بن عبدالرحمن الحذيفي' },
  { identifier: 'ar.ibrahimakhbar', name: 'إبراهيم الأخضر' },
  { identifier: 'ar.mahermuaiqly', name: 'ماهر المعيقلي' },
  { identifier: 'ar.minshawi', name: 'محمد صديق المنشاوي' },
  { identifier: 'ar.minshawimujawwad', name: 'محمد صديق المنشاوي (المجود)' },
  { identifier: 'ar.muhammadayyoub', name: 'محمد أيوب' },
  { identifier: 'ar.muhammadjibreel', name: 'محمد جبريل' },
  { identifier: 'ar.saoodshuraym', name: 'سعود الشريم' },
  { identifier: 'ar.parhizgar', name: 'شهریار پرهیزگار' },
  { identifier: 'ar.aymanswoaid', name: 'أيمن سويد' },
];

export function readReciter(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && EDITION_PATTERN.test(stored) && isFreeReciter(stored)) {
    return stored;
  }
  return DEFAULT_RECITER_EDITION;
}

export function storeReciter(identifier: string): void {
  if (!EDITION_PATTERN.test(identifier) || !isFreeReciter(identifier)) {
    return;
  }
  localStorage.setItem(STORAGE_KEY, identifier);
}

export function fallbackReciters(): readonly ReciterOption[] {
  return FALLBACK_RECITERS;
}
