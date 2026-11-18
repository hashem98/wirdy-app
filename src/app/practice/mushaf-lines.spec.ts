import { MushafWord } from '../core/quran.model';
import { buildMushafLines } from './mushaf-lines';
import { PageAyahView } from './practice-page';

describe('mushaf lines', () => {
  it('should_keep_the_opening_on_its_own_line_when_a_surah_starts_with_disconnected_letters', () => {
    const lines = buildMushafLines(
      [word(2, 1, 3, 'الٓمٓ'), marker(2, 1, 3), word(2, 2, 3, 'ذَٰلِكَ'), word(2, 2, 4, 'ٱلْكِتَابُ')],
      [ayah(8, 2, 1, 'سورة البقرة'), ayah(9, 2, 2, 'سورة البقرة')],
    );

    expect(lines.map((line) => line.kind)).toEqual(['surah', 'bismillah', 'ayahs', 'ayahs']);
    expect(lines[0]?.surahName).toBe('سورة البقرة');
    expect(lines[1]?.bismillah).toBe('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ');
    expect(lines[2]?.segments.map((segment) => segment.text)).toEqual(['الٓمٓ', 'ذَٰلِكَ']);
    expect(lines[2]?.segments[0]?.text.includes('بِسْمِ')).toBe(false);
    expect(lines[2]?.segments[0]?.showMarker).toBe(true);
  });

  it('should_share_one_line_between_the_end_of_an_ayah_and_the_next', () => {
    const lines = buildMushafLines(
      [word(2, 6, 2, 'يُؤْمِنُونَ'), marker(2, 6, 2), word(2, 7, 2, 'خَتَمَ')],
      [ayah(13, 2, 6, 'سورة البقرة'), ayah(14, 2, 7, 'سورة البقرة')],
    );

    expect(lines).toHaveLength(1);
    expect(lines[0]?.segments.map((segment) => segment.numberInSurah)).toEqual([6, 7]);
    expect(lines[0]?.segments[0]?.showMarker).toBe(true);
    expect(lines[0]?.segments[1]?.showMarker).toBe(false);
  });

  it('should_leave_the_opening_inside_the_first_verse_when_the_surah_is_the_opening', () => {
    const lines = buildMushafLines(
      [word(1, 1, 2, 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'), marker(1, 1, 2)],
      [ayah(1, 1, 1, 'سورة الفاتحة')],
    );

    expect(lines.map((line) => line.kind)).toEqual(['surah', 'ayahs']);
    expect(lines[1]?.segments[0]?.text).toBe('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ');
  });

  it('should_omit_the_opening_when_the_surah_is_repentance', () => {
    const lines = buildMushafLines(
      [word(9, 1, 2, 'بَرَآءَةٌ'), marker(9, 1, 2)],
      [ayah(1236, 9, 1, 'سورة التوبة')],
    );

    expect(lines.map((line) => line.kind)).toEqual(['surah', 'ayahs']);
    expect(lines[1]?.segments[0]?.text).toBe('بَرَآءَةٌ');
  });
});

function word(
  surahNumber: number,
  numberInSurah: number,
  lineNumber: number,
  text: string,
): MushafWord {
  return { surahNumber, numberInSurah, lineNumber, text, isMarker: false };
}

function marker(surahNumber: number, numberInSurah: number, lineNumber: number): MushafWord {
  return { surahNumber, numberInSurah, lineNumber, text: '١', isMarker: true };
}

function ayah(
  number: number,
  surahNumber: number,
  numberInSurah: number,
  surahName: string,
): PageAyahView {
  return {
    number,
    numberInSurah,
    surahNumber,
    surahName,
    text: '',
    audioUrl: 'a.mp3',
    startsSurah: numberInSurah === 1,
    hidden: false,
    selected: false,
    playing: false,
    memorized: false,
  };
}
