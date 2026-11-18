import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification';

class FakeNotification {
  static permission: NotificationPermission = 'default';
  static instances: FakeNotification[] = [];
  static requestPermission = vi.fn(async (): Promise<NotificationPermission> => {
    FakeNotification.permission = 'granted';
    return 'granted';
  });

  constructor(
    readonly title: string,
    readonly options?: NotificationOptions,
  ) {
    FakeNotification.instances.push(this);
  }
}

interface ScheduledNotification {
  id: number;
  schedule: {
    on: { hour: number; minute: number; weekday: number };
    repeats: boolean;
    allowWhileIdle: boolean;
  };
}

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    FakeNotification.permission = 'default';
    FakeNotification.instances = [];
    FakeNotification.requestPermission.mockClear();
    vi.stubGlobal('Notification', FakeNotification);
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    service.stop();
    vi.unstubAllGlobals();
  });

  it('should_show_one_browser_notification_when_the_reminder_minute_matches', () => {
    service.watch([
      {
        id: 'plan-1',
        title: 'خطة الفاتحة',
        body: 'حفظ جديد: خطة الفاتحة',
        time: '08:05',
        daysOfWeek: [3],
      },
    ]);
    FakeNotification.permission = 'granted';

    service.checkDueReminders(new Date(2026, 10, 18, 8, 5, 10));
    service.checkDueReminders(new Date(2026, 10, 18, 8, 5, 40));

    expect(FakeNotification.instances).toHaveLength(1);
    expect(FakeNotification.instances[0]).toMatchObject({
      title: 'خطة الفاتحة',
      options: { body: 'حفظ جديد: خطة الفاتحة', lang: 'ar', dir: 'rtl' },
    });
    expect(service.isSchedulerActive()).toBe(true);
  });

  it('should_grant_browser_notifications_when_the_user_allows_them', async () => {
    await service.requestPermission();

    expect(service.permission()).toBe('granted');
    expect(service.isSchedulerActive()).toBe(true);
  });

  it('should_schedule_repeating_native_alerts_when_capacitor_is_available', async () => {
    const scheduled: ScheduledNotification[][] = [];
    vi.stubGlobal('Capacitor', {
      isNativePlatform: () => true,
      Plugins: {
        LocalNotifications: {
          requestPermissions: async () => ({ display: 'granted' }),
          cancel: async () => undefined,
          schedule: async (options: { notifications: ScheduledNotification[] }) => {
            scheduled.push(options.notifications);
          },
        },
      },
    });

    service.watch([
      {
        id: 'plan-1',
        title: 'مراجعة',
        body: 'مراجعة تراكمية: مراجعة',
        time: '08:00',
        daysOfWeek: [1, 3],
      },
    ]);
    for (let step = 0; step < 5; step += 1) {
      await Promise.resolve();
    }

    expect(scheduled[0]?.map((item) => item.schedule)).toEqual([
      { on: { hour: 8, minute: 0, weekday: 2 }, repeats: true, allowWhileIdle: true },
      { on: { hour: 8, minute: 0, weekday: 4 }, repeats: true, allowWhileIdle: true },
    ]);
    expect(service.permission()).toBe('granted');
  });

  it('should_mark_notifications_unsupported_when_the_native_plugin_is_missing', async () => {
    vi.stubGlobal('Capacitor', { isNativePlatform: () => true, Plugins: {} });

    await service.requestPermission();

    expect(service.permission()).toBe('unsupported');
  });
});
