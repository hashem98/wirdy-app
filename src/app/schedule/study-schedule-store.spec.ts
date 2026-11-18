import { TestBed } from '@angular/core/testing';
import { NotificationService } from '../core/notification';
import { formatDate, ScheduleInput, StudyScheduleStore } from './study-schedule-store';

describe('StudyScheduleStore', () => {
  let store: StudyScheduleStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(StudyScheduleStore);
  });

  afterEach(() => {
    TestBed.inject(NotificationService).stop();
    localStorage.clear();
  });

  it('should_reduce_remaining_verses_when_a_scheduled_day_is_completed', () => {
    const wednesday = new Date(2026, 10, 18);
    store.create(plan());

    expect(store.progress(wednesday)).toMatchObject({
      completedSessions: 0,
      remainingVerses: 10,
      sessionState: 'ready',
    });
    expect(store.completeToday(wednesday)).toBe(true);
    expect(store.progress(wednesday)).toMatchObject({
      completedSessions: 1,
      completedVerses: 4,
      remainingVerses: 6,
      sessionState: 'completed',
    });
    expect(store.completeToday(wednesday)).toBe(false);
  });

  it('should_keep_the_session_open_when_the_weekday_is_not_selected', () => {
    store.create(plan());

    expect(store.completeToday(new Date(2026, 10, 17))).toBe(false);
    expect(store.progress(new Date(2026, 10, 17))?.sessionState).toBe('not-today');
    expect(store.progress(new Date(2026, 10, 17))?.remainingVerses).toBe(10);
  });

  it('should_switch_the_active_plan_when_another_schedule_is_activated', () => {
    const first = store.create(plan('الأولى'));
    const second = store.create(plan('الثانية'));

    expect(store.activeSchedule()?.id).toBe(second.id);
    store.activate(first.id);
    expect(store.activeSchedule()?.title).toBe('الأولى');
  });

  it('should_restore_schedules_when_the_store_is_created_again', () => {
    store.create(plan());
    TestBed.inject(NotificationService).stop();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    const restored = TestBed.inject(StudyScheduleStore);

    expect(restored.schedules()).toHaveLength(1);
    expect(restored.activeSchedule()?.title).toBe('خطة الفاتحة');
    expect(formatDate(new Date(2026, 10, 18))).toBe('2026-11-18');
  });

  it('should_remove_invalid_json_when_storage_cannot_be_read', () => {
    localStorage.setItem('quran.study-schedules.v1', '{');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    const restored = TestBed.inject(StudyScheduleStore);

    expect(restored.schedules()).toEqual([]);
    expect(localStorage.getItem('quran.study-schedules.v1')).toBeNull();
  });
});

function plan(title = 'خطة الفاتحة'): ScheduleInput {
  return {
    title,
    track: 'new-memorization',
    targetKind: 'surah',
    targetIds: [1],
    dailyAyahGoal: 4,
    daysOfWeek: [3],
    reminderTime: '08:00',
    totalVerses: 10,
  };
}
