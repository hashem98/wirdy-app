import { fallbackReciters, readReciter, storeReciter } from './reciter-preference';

describe('reciter preference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should_use_alafasy_when_no_reader_is_stored', () => {
    expect(readReciter()).toBe('ar.alafasy');
  });

  it('should_restore_the_reader_when_a_valid_choice_is_stored', () => {
    storeReciter('ar.husary');

    expect(readReciter()).toBe('ar.husary');
  });

  it('should_ignore_an_invalid_reader_when_storage_is_corrupt', () => {
    localStorage.setItem('quran.reciter.v1', '../secret');

    expect(readReciter()).toBe('ar.alafasy');
  });

  it('should_ignore_a_reader_when_the_audio_is_not_free', () => {
    storeReciter('ar.yasseraldossari');
    expect(localStorage.getItem('quran.reciter.v1')).toBeNull();

    localStorage.setItem('quran.reciter.v1', 'ar.yasseraldossari');
    expect(readReciter()).toBe('ar.alafasy');
  });

  it('should_offer_only_free_readers_when_the_edition_list_is_unavailable', () => {
    expect(fallbackReciters().map((reciter) => reciter.identifier)).toEqual([
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
    ]);
  });
});
