export interface VerseTarget {
  number: number;
  numberOfAyahs: number;
}

const JUZ_STARTS: readonly { surah: number; ayah: number }[] = [
  { surah: 1, ayah: 1 },
  { surah: 2, ayah: 142 },
  { surah: 2, ayah: 253 },
  { surah: 3, ayah: 93 },
  { surah: 4, ayah: 24 },
  { surah: 4, ayah: 148 },
  { surah: 5, ayah: 82 },
  { surah: 6, ayah: 111 },
  { surah: 7, ayah: 88 },
  { surah: 8, ayah: 41 },
  { surah: 9, ayah: 93 },
  { surah: 11, ayah: 6 },
  { surah: 12, ayah: 53 },
  { surah: 15, ayah: 1 },
  { surah: 17, ayah: 1 },
  { surah: 18, ayah: 75 },
  { surah: 21, ayah: 1 },
  { surah: 23, ayah: 1 },
  { surah: 25, ayah: 21 },
  { surah: 27, ayah: 56 },
  { surah: 29, ayah: 46 },
  { surah: 33, ayah: 31 },
  { surah: 36, ayah: 28 },
  { surah: 39, ayah: 32 },
  { surah: 41, ayah: 47 },
  { surah: 46, ayah: 1 },
  { surah: 51, ayah: 31 },
  { surah: 58, ayah: 1 },
  { surah: 67, ayah: 1 },
  { surah: 78, ayah: 1 },
];

export const WEEKDAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export function selectedWeekdays(days: Record<WeekdayKey, boolean>): number[] {
  return WEEKDAY_KEYS.flatMap((key, index) => (days[key] ? [index] : []));
}

export function verseCountForTargets(
  surahs: readonly VerseTarget[],
  targetKind: 'surah' | 'juz',
  targetIds: readonly number[],
): number {
  if (targetKind === 'surah') {
    return surahs
      .filter((surah) => targetIds.includes(surah.number))
      .reduce((sum, surah) => sum + surah.numberOfAyahs, 0);
  }
  return targetIds.reduce((sum, juzId) => sum + juzVerseCount(surahs, juzId), 0);
}

export function juzVerseCount(surahs: readonly VerseTarget[], juzId: number): number {
  const start = JUZ_STARTS[juzId - 1];
  const next = JUZ_STARTS[juzId];
  if (!start) {
    return 0;
  }
  const startIndex = versesBefore(surahs, start.surah, start.ayah);
  const endIndex = next
    ? versesBefore(surahs, next.surah, next.ayah)
    : versesBefore(surahs, surahs.length + 1, 1);
  if (startIndex === null || endIndex === null || endIndex < startIndex) {
    return 0;
  }
  return endIndex - startIndex;
}

function versesBefore(
  surahs: readonly VerseTarget[],
  surahNumber: number,
  ayah: number,
): number | null {
  const ordered = [...surahs].sort((left, right) => left.number - right.number);
  let count = 0;
  for (const surah of ordered) {
    if (surah.number < surahNumber) {
      count += surah.numberOfAyahs;
      continue;
    }
    if (surah.number === surahNumber) {
      if (ayah < 1 || ayah > surah.numberOfAyahs + 1) {
        return null;
      }
      return count + ayah - 1;
    }
    return null;
  }
  if (surahNumber === ordered.length + 1 && ayah === 1) {
    return count;
  }
  return null;
}
