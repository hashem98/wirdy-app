import { Service, effect, inject, signal } from '@angular/core';
import { DailyReminder, NotificationService } from '../core/notification';

const STORAGE_KEY = 'quran.study-schedules.v1';
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type StudyTrack = 'new-memorization' | 'spaced-revision';
export type TargetKind = 'surah' | 'juz';
export type SessionState = 'ready' | 'completed' | 'not-today';

export interface StudySchedule {
  id: string;
  title: string;
  track: StudyTrack;
  targetKind: TargetKind;
  targetIds: number[];
  dailyAyahGoal: number;
  daysOfWeek: number[];
  reminderTime: string;
  totalVerses: number;
  completedSessionDates: string[];
}

export interface ScheduleInput {
  title: string;
  track: StudyTrack;
  targetKind: TargetKind;
  targetIds: number[];
  dailyAyahGoal: number;
  daysOfWeek: number[];
  reminderTime: string;
  totalVerses: number;
}

export interface ScheduleProgress {
  completedSessions: number;
  completedVerses: number;
  remainingVerses: number;
  totalVerses: number;
  percent: number;
  sessionState: SessionState;
}

@Service()
export class StudyScheduleStore {
  private readonly notifications = inject(NotificationService);
  private readonly storedSchedules = readStoredSchedules();
  private readonly schedulesState = signal<StudySchedule[]>(this.storedSchedules.schedules);
  private readonly activeIdState = signal(this.storedSchedules.activeId);
  private readonly syncReminders = effect(() => {
    this.notifications.watch(this.schedulesState().map(toReminder));
  });

  readonly schedules = this.schedulesState.asReadonly();
  readonly activeId = this.activeIdState.asReadonly();

  activeSchedule(): StudySchedule | null {
    return this.schedulesState().find((schedule) => schedule.id === this.activeIdState()) ?? null;
  }

  progress(now = new Date()): ScheduleProgress | null {
    const schedule = this.activeSchedule();
    if (!schedule) {
      return null;
    }
    const completedSessions = schedule.completedSessionDates.length;
    const completedVerses = Math.min(
      schedule.totalVerses,
      completedSessions * schedule.dailyAyahGoal,
    );
    return {
      completedSessions,
      completedVerses,
      remainingVerses: schedule.totalVerses - completedVerses,
      totalVerses: schedule.totalVerses,
      percent: percent(completedVerses, schedule.totalVerses),
      sessionState: sessionState(schedule, now),
    };
  }

  create(input: ScheduleInput): StudySchedule {
    const schedule: StudySchedule = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      track: input.track,
      targetKind: input.targetKind,
      targetIds: [...input.targetIds],
      dailyAyahGoal: input.dailyAyahGoal,
      daysOfWeek: [...input.daysOfWeek].sort((left, right) => left - right),
      reminderTime: input.reminderTime,
      totalVerses: input.totalVerses,
      completedSessionDates: [],
    };
    this.schedulesState.update((current) => [...current, schedule]);
    this.activeIdState.set(schedule.id);
    this.persist();
    return schedule;
  }

  activate(scheduleId: string): void {
    if (!this.schedulesState().some((schedule) => schedule.id === scheduleId)) {
      return;
    }
    this.activeIdState.set(scheduleId);
    this.persist();
  }

  completeToday(now = new Date()): boolean {
    const schedule = this.activeSchedule();
    if (!schedule || sessionState(schedule, now) !== 'ready') {
      return false;
    }
    const completedOn = formatDate(now);
    this.schedulesState.update((current) =>
      current.map((item) =>
        item.id === schedule.id
          ? { ...item, completedSessionDates: [...item.completedSessionDates, completedOn] }
          : item,
      ),
    );
    this.persist();
    return true;
  }

  private persist(): void {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeId: this.activeIdState(),
        schedules: this.schedulesState(),
      }),
    );
  }
}

export function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function percent(completed: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.round((completed / total) * 100);
}

function sessionState(schedule: StudySchedule, now: Date): SessionState {
  if (!schedule.daysOfWeek.includes(now.getDay())) {
    return 'not-today';
  }
  if (schedule.completedSessionDates.includes(formatDate(now))) {
    return 'completed';
  }
  return 'ready';
}

function readStoredSchedules(): { activeId: string; schedules: StudySchedule[] } {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return { activeId: '', schedules: [] };
  }
  try {
    return parseStoredSchedules(JSON.parse(raw) as unknown);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return { activeId: '', schedules: [] };
  }
}

function parseStoredSchedules(value: unknown): { activeId: string; schedules: StudySchedule[] } {
  if (!isRecord(value) || !Array.isArray(value['schedules'])) {
    throw new Error('Study schedules were invalid');
  }
  const schedules = value['schedules'].filter(isStudySchedule);
  const activeId = typeof value['activeId'] === 'string' ? value['activeId'] : '';
  const resolvedId = schedules.some((schedule) => schedule.id === activeId)
    ? activeId
    : (schedules[0]?.id ?? '');
  return { activeId: resolvedId, schedules };
}

function isStudySchedule(value: unknown): value is StudySchedule {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isText(value['id']) &&
    isText(value['title']) &&
    (value['track'] === 'new-memorization' || value['track'] === 'spaced-revision') &&
    (value['targetKind'] === 'surah' || value['targetKind'] === 'juz') &&
    isIdList(value['targetIds']) &&
    isPositiveInteger(value['dailyAyahGoal']) &&
    isWeekdayList(value['daysOfWeek']) &&
    typeof value['reminderTime'] === 'string' &&
    TIME_PATTERN.test(value['reminderTime']) &&
    isPositiveInteger(value['totalVerses']) &&
    isDateList(value['completedSessionDates'])
  );
}

function isWeekdayList(value: unknown): value is number[] {
  return (
    Array.isArray(value) && value.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  );
}

function isIdList(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((id) => isPositiveInteger(id));
}

function isDateList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((date) => typeof date === 'string' && DATE_PATTERN.test(date))
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toReminder(schedule: StudySchedule): DailyReminder {
  const track = schedule.track === 'new-memorization' ? 'حفظ جديد' : 'مراجعة تراكمية';
  return {
    id: schedule.id,
    title: schedule.title,
    body: `${track}: ${schedule.title}`,
    time: schedule.reminderTime,
    daysOfWeek: schedule.daysOfWeek,
  };
}
