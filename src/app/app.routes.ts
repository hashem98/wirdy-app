import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'practice' },
  {
    path: 'practice',
    loadComponent: () => import('./practice/practice').then((module) => module.PracticeComponent),
    title: 'وِردي — التسميع',
  },
  {
    path: 'schedule',
    loadComponent: () => import('./schedule/schedule').then((module) => module.ScheduleComponent),
    title: 'وِردي — خطة الدراسة',
  },
];
