import { buildPageAyahs, readStoredPage, storePage } from './practice-page';
import { PageAyah } from '../core/quran.model';

describe('practice page', () => {
  const ayahs: PageAyah[] = [
    {
      number: 8,
      numberInSurah: 1,
      surahNumber: 2,
      surahName: 'سورة البقرة',
      text: 'الم',
      audioUrl: 'a.mp3',
    },
    {
      number: 9,
      numberInSurah: 2,
      surahNumber: 2,
      surahName: 'سورة البقرة',
      text: 'ذَٰلِكَ الْكِتَابُ',
      audioUrl: 'b.mp3',
    },
    {
      number: 10,
      numberInSurah: 3,
      surahNumber: 2,
      surahName: 'سورة البقرة',
      text: 'الَّذِينَ يُؤْمِنُونَ',
      audioUrl: 'c.mp3',
    },
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should_hide_ayahs_from_the_selection_to_the_end_of_the_page', () => {
    const views = buildPageAyahs(ayahs, 9, 9, new Set(), null);

    expect(views.map((ayah) => ayah.hidden)).toEqual([false, true, true]);
    expect(views[0]?.startsSurah).toBe(true);
    expect(views[1]?.selected).toBe(true);
  });

  it('should_show_a_hidden_ayah_when_that_ayah_is_revealed', () => {
    const views = buildPageAyahs(ayahs, 8, null, new Set(), null, new Set([9]));

    expect(views.map((ayah) => ayah.hidden)).toEqual([true, false, true]);
  });

  it('should_restore_a_stored_page_when_it_is_inside_the_mushaf', () => {
    storePage(50);

    expect(readStoredPage()).toBe(50);
  });

  it('should_open_the_first_page_when_the_stored_page_is_invalid', () => {
    localStorage.setItem('quran.mushaf-page.v1', '900');

    expect(readStoredPage()).toBe(1);
  });
});
