import {
  describeRange,
  splitAyahWords,
  buildPracticeAyahs,
  toggleRevealKind,
} from './practice-ayah';

describe('practice ayah helpers', () => {
  it('should_keep_the_first_two_words_when_splitting_an_ayah', () => {
    expect(splitAyahWords('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ')).toEqual({
      cue: 'بِسْمِ اللَّهِ',
      remainder: 'الرَّحْمَٰنِ الرَّحِيمِ',
    });
  });

  it('should_leave_the_remainder_empty_when_the_ayah_has_two_words', () => {
    expect(splitAyahWords('قُلْ أَعُوذُ')).toEqual({ cue: 'قُلْ أَعُوذُ', remainder: '' });
  });

  it('should_describe_a_range_that_starts_after_it_ends', () => {
    expect(describeRange(4, 2, 7)).toBe('بداية النطاق يجب أن تسبق نهايته');
  });

  it('should_hide_masked_words_until_the_ayah_is_revealed', () => {
    const ayahs = [{ number: 10, numberInSurah: 1, text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ', audioUrl: 'a.mp3' }];

    const hidden = buildPracticeAyahs(ayahs, 1, 1, 7, 'first-word-cue', {}, [], null);
    expect(hidden[0]).toEqual(
      expect.objectContaining({
        cue: 'بِسْمِ اللَّهِ',
        remainder: 'الرَّحْمَٰنِ',
        revealed: false,
        memorized: false,
      }),
    );

    const revealed = buildPracticeAyahs(
      ayahs,
      1,
      1,
      7,
      'verse-mask',
      toggleRevealKind({}, 10, 'temporary'),
      [10],
      10,
    );
    expect(revealed[0]).toEqual(
      expect.objectContaining({ revealed: true, memorized: true, playing: true }),
    );
  });

  it('should_return_no_ayahs_when_the_range_is_outside_the_surah', () => {
    expect(buildPracticeAyahs([], 1, 8, 7, 'full', {}, [], null)).toEqual([]);
  });
});
