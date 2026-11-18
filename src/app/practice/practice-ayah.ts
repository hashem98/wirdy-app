export type MemorizationMode = 'full' | 'verse-mask' | 'first-word-cue';
export type RevealKind = 'temporary' | 'permanent';

export interface AyahWords {
  cue: string;
  remainder: string;
}

export interface PracticeAyahSource {
  number: number;
  numberInSurah: number;
  text: string;
  audioUrl: string;
}

export interface PracticeAyahView extends PracticeAyahSource {
  cue: string;
  remainder: string;
  revealed: boolean;
  permanentlyRevealed: boolean;
  memorized: boolean;
  playing: boolean;
}

export function splitAyahWords(text: string): AyahWords {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word !== '');
  return {
    cue: words.slice(0, 2).join(' '),
    remainder: words.slice(2).join(' '),
  };
}

export function describeRange(fromAyah: number, toAyah: number, totalAyahs: number | null): string {
  if (totalAyahs === null) {
    return '';
  }
  if (!Number.isInteger(fromAyah) || !Number.isInteger(toAyah) || fromAyah < 1 || toAyah < 1) {
    return 'أدخل أرقام آيات صحيحة';
  }
  if (fromAyah > totalAyahs || toAyah > totalAyahs) {
    return 'رقم الآية خارج السورة';
  }
  if (fromAyah > toAyah) {
    return 'بداية النطاق يجب أن تسبق نهايته';
  }
  return '';
}

export function toggleRevealKind(
  current: Readonly<Record<number, RevealKind>>,
  ayahId: number,
  kind: RevealKind,
): Record<number, RevealKind> {
  const next = { ...current };
  if (next[ayahId] === kind) {
    delete next[ayahId];
  } else {
    next[ayahId] = kind;
  }
  return next;
}

export function buildPracticeAyahs(
  ayahs: readonly PracticeAyahSource[],
  fromAyah: number,
  toAyah: number,
  totalAyahs: number | null,
  mode: MemorizationMode,
  reveal: Readonly<Record<number, RevealKind>>,
  memorizedIds: readonly number[],
  playingAyahNumber: number | null,
): PracticeAyahView[] {
  if (describeRange(fromAyah, toAyah, totalAyahs) !== '') {
    return [];
  }
  return ayahs
    .filter((ayah) => ayah.numberInSurah >= fromAyah && ayah.numberInSurah <= toAyah)
    .map((ayah) => {
      const words = splitAyahWords(ayah.text);
      const kind = reveal[ayah.number];
      const revealed = mode === 'full' || kind === 'temporary' || kind === 'permanent';
      return {
        ...ayah,
        cue: words.cue,
        remainder: words.remainder,
        revealed,
        permanentlyRevealed: kind === 'permanent',
        memorized: memorizedIds.includes(ayah.number),
        playing: playingAyahNumber === ayah.number,
      };
    });
}
