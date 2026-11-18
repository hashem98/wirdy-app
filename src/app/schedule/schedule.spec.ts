import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NotificationService } from '../core/notification';
import { QuranDataService } from '../core/quran-data';
import { ScheduleComponent } from './schedule';
import { StudyScheduleStore } from './study-schedule-store';

describe('ScheduleComponent', () => {
  let fixture: ComponentFixture<ScheduleComponent>;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: QuranDataService,
          useValue: {
            getSurahs: () =>
              of([
                {
                  number: 1,
                  name: 'سورة الفاتحة',
                  englishName: 'Al-Faatiha',
                  englishNameTranslation: 'The Opening',
                  numberOfAyahs: 7,
                  revelationType: 'Meccan',
                },
              ]),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(ScheduleComponent);
    await fixture.whenStable();
  });

  afterEach(() => {
    TestBed.inject(NotificationService).stop();
    localStorage.clear();
  });

  it('should_show_both_tracks_when_no_schedule_is_stored', () => {
    const content = text(fixture);

    expect(content).toContain('لا توجد خطة نشطة');
    expect(content).toContain('حفظ جديد (New Memorization)');
    expect(content).toContain('مراجعة تراكمية (Spaced Revision)');
  });

  it('should_reduce_remaining_verses_when_todays_session_is_completed', async () => {
    TestBed.inject(StudyScheduleStore).create({
      title: 'خطة الفاتحة',
      track: 'spaced-revision',
      targetKind: 'surah',
      targetIds: [1],
      dailyAyahGoal: 3,
      daysOfWeek: [new Date().getDay()],
      reminderTime: '08:00',
      totalVerses: 7,
    });
    await fixture.whenStable();

    expect(text(fixture)).toContain('خطة الفاتحة');
    expect(text(fixture)).toContain('مراجعة تراكمية');
    expect(text(fixture)).toContain('الجلسات المكتملة: 0');
    expect(text(fixture)).toContain('الآيات المتبقية: 7');

    click(fixture, 'إتمام جلسة اليوم');
    await fixture.whenStable();

    expect(text(fixture)).toContain('الجلسات المكتملة: 1');
    expect(text(fixture)).toContain('الآيات المتبقية: 4');
    expect(text(fixture)).toContain('تم تسجيل جلسة اليوم');
  });
});

function text(fixture: ComponentFixture<ScheduleComponent>): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

function click(fixture: ComponentFixture<ScheduleComponent>, name: string): void {
  const button = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
    (item) => item.textContent?.includes(name),
  );
  button?.click();
}
