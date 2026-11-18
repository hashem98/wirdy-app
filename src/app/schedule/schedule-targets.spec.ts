import { juzVerseCount, selectedWeekdays, verseCountForTargets } from './schedule-targets';

describe('schedule targets', () => {
  const surahs = [
    { number: 1, numberOfAyahs: 7 },
    { number: 2, numberOfAyahs: 286 },
  ];

  it('should_sum_selected_surah_verse_counts_when_the_target_is_a_surah', () => {
    expect(verseCountForTargets(surahs, 'surah', [1, 2])).toBe(293);
  });

  it('should_count_juz_verses_when_the_boundary_is_inside_the_next_surah', () => {
    expect(juzVerseCount(surahs, 1)).toBe(148);
    expect(verseCountForTargets(surahs, 'juz', [1])).toBe(148);
  });

  it('should_return_selected_weekday_indexes_when_days_are_checked', () => {
    expect(
      selectedWeekdays({
        sunday: false,
        monday: true,
        tuesday: false,
        wednesday: true,
        thursday: false,
        friday: false,
        saturday: false,
      }),
    ).toEqual([1, 3]);
  });
});
