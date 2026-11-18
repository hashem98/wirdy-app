import { Component, computed, inject, resource, signal } from '@angular/core';
import {
  FormField,
  form,
  max,
  min,
  pattern,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../core/notification';
import { QuranDataService } from '../core/quran-data';
import { selectedWeekdays, verseCountForTargets, WeekdayKey } from './schedule-targets';
import { ScheduleInput, StudyScheduleStore, StudyTrack, TargetKind } from './study-schedule-store';

interface ScheduleDraft {
  title: string;
  track: StudyTrack;
  targetKind: TargetKind;
  surahIds: string[];
  juzIds: string[];
  dailyAyahGoal: number;
  days: Record<WeekdayKey, boolean>;
  reminderTime: string;
}

@Component({
  selector: 'app-schedule',
  imports: [FormField],
  templateUrl: './schedule.html',
  styleUrl: './schedule.scss',
})
export class ScheduleComponent {
  private readonly quranData = inject(QuranDataService);
  private readonly store = inject(StudyScheduleStore);
  protected readonly notifications = inject(NotificationService);
  protected readonly juzNumbers = Array.from({ length: 30 }, (_, index) => index + 1);
  protected readonly draft = signal(emptyDraft());
  protected readonly surahList = resource({
    loader: () => firstValueFrom(this.quranData.getSurahs()),
  });
  protected readonly scheduleForm = form(this.draft, (path) => {
    required(path.title, { message: 'أدخل عنوان الخطة' });
    min(path.dailyAyahGoal, 1, { message: 'الهدف اليومي يبدأ من آية واحدة' });
    max(path.dailyAyahGoal, 286, { message: 'الهدف اليومي كبير جداً' });
    pattern(path.reminderTime, /^([01]\d|2[0-3]):[0-5]\d$/, { message: 'صيغة الوقت HH:mm' });
    validate(path.days, ({ value }) =>
      selectedWeekdays(value()).length > 0
        ? undefined
        : { kind: 'days', message: 'اختر يوماً واحداً على الأقل' },
    );
    validate(path.surahIds, ({ value, valueOf }) =>
      targetError(valueOf(path.targetKind), 'surah', value()),
    );
    validate(path.juzIds, ({ value, valueOf }) =>
      targetError(valueOf(path.targetKind), 'juz', value()),
    );
  });

  protected readonly surahOptions = computed(() =>
    this.surahList.hasValue() ? this.surahList.value() : [],
  );
  protected readonly juzReady = computed(() => this.surahOptions().length === 114);
  protected readonly activeView = computed(() => this.buildActiveView());
  protected readonly plans = computed(() =>
    this.store.schedules().map((schedule) => ({
      id: schedule.id,
      title: schedule.title,
      trackLabel: trackLabel(schedule.track),
      isActive: schedule.id === this.store.activeId(),
    })),
  );

  protected selectSurahs(event: Event): void {
    this.draft.update((current) => ({ ...current, surahIds: selectedValues(event) }));
    this.scheduleForm.surahIds().markAsTouched();
  }

  protected selectJuz(event: Event): void {
    this.draft.update((current) => ({ ...current, juzIds: selectedValues(event) }));
    this.scheduleForm.juzIds().markAsTouched();
  }

  protected savePlan(): void {
    void submit(this.scheduleForm, async () => {
      const input = this.toInput();
      if (!input) {
        return;
      }
      this.store.create(input);
      this.scheduleForm().reset(emptyDraft());
    });
  }

  protected completeToday(): void {
    this.store.completeToday();
  }

  protected activate(scheduleId: string): void {
    this.store.activate(scheduleId);
  }

  protected enableNotifications(): void {
    void this.notifications.requestPermission();
  }

  private buildActiveView() {
    const schedule = this.store.activeSchedule();
    const progress = this.store.progress();
    if (!schedule || !progress) {
      return null;
    }
    return { ...progress, title: schedule.title, trackLabel: trackLabel(schedule.track) };
  }

  private toInput(): ScheduleInput | null {
    const draft = this.draft();
    const targetIds = (draft.targetKind === 'surah' ? draft.surahIds : draft.juzIds).map(Number);
    const totalVerses = verseCountForTargets(this.surahOptions(), draft.targetKind, targetIds);
    if (totalVerses < 1) {
      return null;
    }
    return {
      title: draft.title,
      track: draft.track,
      targetKind: draft.targetKind,
      targetIds,
      dailyAyahGoal: draft.dailyAyahGoal,
      daysOfWeek: selectedWeekdays(draft.days),
      reminderTime: draft.reminderTime,
      totalVerses,
    };
  }
}

function selectedValues(event: Event): string[] {
  const select = event.target;
  if (!(select instanceof HTMLSelectElement)) {
    return [];
  }
  return [...select.selectedOptions].map((option) => option.value);
}

function emptyDraft(): ScheduleDraft {
  return {
    title: '',
    track: 'new-memorization',
    targetKind: 'surah',
    surahIds: [],
    juzIds: [],
    dailyAyahGoal: 5,
    days: {
      sunday: false,
      monday: true,
      tuesday: false,
      wednesday: true,
      thursday: false,
      friday: false,
      saturday: false,
    },
    reminderTime: '08:00',
  };
}

function trackLabel(track: StudyTrack): string {
  return track === 'new-memorization' ? 'حفظ جديد' : 'مراجعة تراكمية';
}

function targetError(
  targetKind: TargetKind,
  expected: TargetKind,
  ids: readonly string[],
): { kind: string; message: string } | undefined {
  if (targetKind !== expected || ids.length > 0) {
    return undefined;
  }
  return {
    kind: 'required',
    message: expected === 'surah' ? 'اختر سورة واحدة على الأقل' : 'اختر جزءاً واحداً على الأقل',
  };
}
