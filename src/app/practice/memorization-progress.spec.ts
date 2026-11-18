import { TestBed } from '@angular/core/testing';
import { MemorizationProgress } from './memorization-progress';

describe('MemorizationProgress', () => {
  let progress: MemorizationProgress;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    progress = TestBed.inject(MemorizationProgress);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should_store_a_memorized_ayah_id_for_its_surah', () => {
    progress.toggle(1, 5);

    expect(progress.isMemorized(1, 5)).toBe(true);
    expect(progress.summary(1, 7)).toEqual({ memorizedCount: 1, totalAyahs: 7, percent: 14 });
    expect(localStorage.getItem('quran.memorized-ayahs.v1')).toContain('"1":[5]');
  });

  it('should_clear_an_ayah_when_it_is_toggled_again', () => {
    progress.toggle(1, 5);
    progress.toggle(1, 5);

    expect(progress.memorizedIds(1)).toEqual([]);
    expect(progress.summary(1, 7).percent).toBe(0);
  });

  it('should_restore_mastery_when_a_new_instance_reads_local_storage', () => {
    progress.toggle(2, 8);
    progress.toggle(2, 3);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    const restored = TestBed.inject(MemorizationProgress);

    expect(restored.memorizedIds(2)).toEqual([3, 8]);
    expect(restored.summary(2, 286)).toEqual({ memorizedCount: 2, totalAyahs: 286, percent: 1 });
  });

  it('should_ignore_invalid_stored_progress', () => {
    localStorage.setItem('quran.memorized-ayahs.v1', '{');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    const restored = TestBed.inject(MemorizationProgress);

    expect(restored.memorizedIds(1)).toEqual([]);
    expect(localStorage.getItem('quran.memorized-ayahs.v1')).toBeNull();
  });
});
