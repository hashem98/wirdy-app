import { MushafWord } from '../core/quran.model';
import { PageAyahView } from './practice-page';

const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const SURAHS_WITHOUT_SEPARATE_BISMILLAH = new Set([1, 9]);

export interface MushafSegment {
  ayahNumber: number;
  numberInSurah: number;
  text: string;
  words: readonly string[];
  showMarker: boolean;
  hidden: boolean;
  selected: boolean;
  playing: boolean;
  memorized: boolean;
}

export interface MushafLine {
  number: number;
  kind: 'surah' | 'bismillah' | 'ayahs';
  surahName: string;
  bismillah: string;
  segments: MushafSegment[];
}

export function buildMushafLines(
  words: readonly MushafWord[],
  ayahs: readonly PageAyahView[],
): MushafLine[] {
  const ayahByKey = new Map(
    ayahs.map((ayah) => [ayahKey(ayah.surahNumber, ayah.numberInSurah), ayah]),
  );
  const wordsByLine = groupWords(words);
  const lastLine = Math.max(0, ...wordsByLine.keys());
  const lines: MushafLine[] = [];
  const headedSurahs = new Set<number>();
  for (let lineNumber = 1; lineNumber <= lastLine; lineNumber += 1) {
    const lineWords = wordsByLine.get(lineNumber);
    if (!lineWords) {
      const header = surahHeader(lineNumber, wordsByLine, lastLine, ayahByKey, headedSurahs);
      lines.push(...header);
      lineNumber += Math.max(0, header.length - 1);
      continue;
    }
    lines.push(ayahLine(lineNumber, lineWords, ayahByKey));
  }
  return lines;
}

function groupWords(words: readonly MushafWord[]): Map<number, MushafWord[]> {
  const wordsByLine = new Map<number, MushafWord[]>();
  for (const word of words) {
    const lineWords = wordsByLine.get(word.lineNumber) ?? [];
    lineWords.push(word);
    wordsByLine.set(word.lineNumber, lineWords);
  }
  return wordsByLine;
}

function surahHeader(
  lineNumber: number,
  wordsByLine: ReadonlyMap<number, readonly MushafWord[]>,
  lastLine: number,
  ayahByKey: ReadonlyMap<string, PageAyahView>,
  headedSurahs: Set<number>,
): MushafLine[] {
  const upcoming = firstWordAfter(lineNumber, wordsByLine, lastLine);
  const ayah = upcoming
    ? ayahByKey.get(ayahKey(upcoming.surahNumber, upcoming.numberInSurah))
    : undefined;
  if (!upcoming || !ayah || ayah.numberInSurah !== 1 || headedSurahs.has(ayah.surahNumber)) {
    return [];
  }
  headedSurahs.add(ayah.surahNumber);
  const surahLine = headerLine(lineNumber, 'surah', ayah.surahName);
  const opensWithSeparateBismillah =
    !SURAHS_WITHOUT_SEPARATE_BISMILLAH.has(ayah.surahNumber) &&
    upcoming.lineNumber > lineNumber + 1;
  if (!opensWithSeparateBismillah) {
    return [surahLine];
  }
  return [surahLine, headerLine(lineNumber + 1, 'bismillah', ayah.surahName)];
}

function headerLine(
  lineNumber: number,
  kind: 'surah' | 'bismillah',
  surahName: string,
): MushafLine {
  return { number: lineNumber, kind, surahName, bismillah: BISMILLAH, segments: [] };
}

function firstWordAfter(
  lineNumber: number,
  wordsByLine: ReadonlyMap<number, readonly MushafWord[]>,
  lastLine: number,
): MushafWord | undefined {
  for (let next = lineNumber + 1; next <= lastLine; next += 1) {
    const word = wordsByLine.get(next)?.[0];
    if (word) {
      return word;
    }
  }
  return undefined;
}

function ayahLine(
  lineNumber: number,
  lineWords: readonly MushafWord[],
  ayahByKey: ReadonlyMap<string, PageAyahView>,
): MushafLine {
  const segments: MushafSegment[] = [];
  for (const word of lineWords) {
    appendWord(segments, word, ayahByKey.get(ayahKey(word.surahNumber, word.numberInSurah)));
  }
  return { number: lineNumber, kind: 'ayahs', surahName: '', bismillah: '', segments };
}

function appendWord(
  segments: MushafSegment[],
  word: MushafWord,
  ayah: PageAyahView | undefined,
): void {
  const current = segments.at(-1);
  const ayahNumber = ayah?.number ?? 0;
  if (word.isMarker) {
    if (current && current.ayahNumber === ayahNumber) {
      current.showMarker = true;
    }
    return;
  }
  if (current && current.ayahNumber === ayahNumber) {
    const words = [...current.words, word.text];
    current.words = words;
    current.text = words.join(' ');
    return;
  }
  segments.push({
    ayahNumber,
    numberInSurah: word.numberInSurah,
    text: word.text,
    words: [word.text],
    showMarker: false,
    hidden: ayah?.hidden ?? false,
    selected: ayah?.selected ?? false,
    playing: ayah?.playing ?? false,
    memorized: ayah?.memorized ?? false,
  });
}

function ayahKey(surahNumber: number, numberInSurah: number): string {
  return `${surahNumber}:${numberInSurah}`;
}
