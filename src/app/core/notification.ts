import { DestroyRef, Service, inject, signal } from '@angular/core';

const CHECK_INTERVAL_MS = 30_000;

export interface DailyReminder {
  id: string;
  title: string;
  body: string;
  time: string;
  daysOfWeek: number[];
}

interface LocalNotificationRequest {
  id: number;
  title: string;
  body: string;
  schedule: {
    on: { hour: number; minute: number; weekday: number };
    repeats: boolean;
    allowWhileIdle: boolean;
  };
}

interface LocalNotificationsPlugin {
  requestPermissions(): Promise<{ display: string }>;
  schedule(options: { notifications: LocalNotificationRequest[] }): Promise<void>;
  cancel(options: { notifications: { id: number }[] }): Promise<void>;
}

interface CapacitorBridge {
  isNativePlatform(): boolean;
  Plugins?: { LocalNotifications?: LocalNotificationsPlugin };
}

export type NotificationPermissionState = NotificationPermission | 'unsupported';

@Service()
export class NotificationService {
  private readonly reminders = signal<DailyReminder[]>([]);
  private readonly sentKeys = signal<string[]>([]);
  private readonly permissionState = signal<NotificationPermissionState>(readPermission());
  private readonly schedulerActive = signal(false);
  private readonly onDestroy = inject(DestroyRef).onDestroy(() => this.stop());
  private timerId = 0;

  readonly permission = this.permissionState.asReadonly();
  readonly isSchedulerActive = this.schedulerActive.asReadonly();

  watch(reminders: readonly DailyReminder[]): void {
    this.reminders.set([...reminders]);
    if (this.isNativePlatform()) {
      void this.scheduleNativeReminders(this.reminders());
      return;
    }
    this.ensureWebScheduler();
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    if (this.isNativePlatform()) {
      await this.scheduleNativeReminders(this.reminders());
      return this.permissionState();
    }
    if (typeof Notification === 'undefined') {
      this.permissionState.set('unsupported');
      return 'unsupported';
    }
    const permission = await Notification.requestPermission();
    this.permissionState.set(permission);
    this.ensureWebScheduler();
    return permission;
  }

  checkDueReminders(now = new Date()): void {
    if (globalThis.Notification?.permission !== 'granted') {
      return;
    }
    const time = formatTime(now);
    const weekday = now.getDay();
    const dateKey = formatDate(now);
    for (const reminder of this.reminders()) {
      this.notifyIfDue(reminder, time, weekday, dateKey);
    }
  }

  stop(): void {
    if (this.timerId !== 0) {
      globalThis.clearInterval(this.timerId);
      this.timerId = 0;
    }
    this.schedulerActive.set(false);
  }

  private notifyIfDue(
    reminder: DailyReminder,
    time: string,
    weekday: number,
    dateKey: string,
  ): void {
    if (reminder.time !== time || !reminder.daysOfWeek.includes(weekday)) {
      return;
    }
    const key = `${reminder.id}:${dateKey}:${reminder.time}`;
    if (this.sentKeys().includes(key)) {
      return;
    }
    this.sentKeys.update((keys) => [...keys, key]);
    new Notification(reminder.title, { body: reminder.body, lang: 'ar', dir: 'rtl' });
  }

  private ensureWebScheduler(): void {
    if (this.timerId !== 0) {
      this.schedulerActive.set(true);
      return;
    }
    this.schedulerActive.set(true);
    this.checkDueReminders();
    this.timerId = globalThis.setInterval(() => this.checkDueReminders(), CHECK_INTERVAL_MS);
  }

  private async scheduleNativeReminders(reminders: readonly DailyReminder[]): Promise<void> {
    const plugin = readBridge()?.Plugins?.LocalNotifications;
    if (!plugin) {
      this.permissionState.set('unsupported');
      return;
    }
    try {
      const permission = await plugin.requestPermissions();
      if (permission.display !== 'granted') {
        this.permissionState.set('denied');
        return;
      }
      this.permissionState.set('granted');
      await plugin.cancel({ notifications: cancelIds(reminders) });
      const notifications = reminders.flatMap((reminder) => nativeRequests(reminder));
      if (notifications.length > 0) {
        await plugin.schedule({ notifications });
      }
      this.schedulerActive.set(true);
    } catch {
      this.permissionState.set('unsupported');
    }
  }

  private isNativePlatform(): boolean {
    return readBridge()?.isNativePlatform() ?? false;
  }
}

function nativeRequests(reminder: DailyReminder): LocalNotificationRequest[] {
  const [hour, minute] = reminder.time.split(':').map((part) => Number(part));
  return reminder.daysOfWeek.map((weekday) => ({
    id: notificationId(reminder.id, weekday),
    title: reminder.title,
    body: reminder.body,
    schedule: {
      on: { hour, minute, weekday: weekday + 1 },
      repeats: true,
      allowWhileIdle: true,
    },
  }));
}

function cancelIds(reminders: readonly DailyReminder[]): { id: number }[] {
  return reminders.flatMap((reminder) =>
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ id: notificationId(reminder.id, weekday) })),
  );
}

function notificationId(scheduleId: string, weekday: number): number {
  let hash = weekday + 1;
  for (const char of scheduleId) {
    hash = (hash * 33 + char.charCodeAt(0)) % 1_000_000_000;
  }
  return hash === 0 ? 1 : hash;
}

function readBridge(): CapacitorBridge | null {
  const bridge = (globalThis as { Capacitor?: CapacitorBridge }).Capacitor;
  return bridge ?? null;
}

function readPermission(): NotificationPermissionState {
  if (typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission;
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
