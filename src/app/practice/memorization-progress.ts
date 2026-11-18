import { Service, signal } from '@angular/core';

const STORAGE_KEY = 'quran.memorized-ayahs.v1';

export interface MasterySummary {
  memorizedCount: number;
  totalAyahs: number;
  percent: number;
}

interface StoredProgress {
  surahs: Record<string, number[]>;
}

@Service()
export class MemorizationProgress {
  private readonly entries = signal<StoredProgress>(this.read());

  memorizedIds(surahNumber: number): readonly number[] {
    return this.entries().surahs[String(surahNumber)] ?? [];
  }

  isMemorized(surahNumber: number, ayahId: number): boolean {
    return this.memorizedIds(surahNumber).includes(ayahId);
  }

  summary(surahNumber: number, totalAyahs: number): MasterySummary {
    const memorizedCount = this.memorizedIds(surahNumber).length;
    const percent = totalAyahs === 0 ? 0 : Math.round((memorizedCount / totalAyahs) * 100);
    return { memorizedCount, totalAyahs, percent };
  }

  toggle(surahNumber: number, ayahId: number): void {
    const key = String(surahNumber);
    const currentIds = this.memorizedIds(surahNumber);
    const nextIds = currentIds.includes(ayahId)
      ? currentIds.filter((id) => id !== ayahId)
      : [...currentIds, ayahId].sort((left, right) => left - right);
    const next = {
      surahs: { ...this.entries().surahs, [key]: [...nextIds] },
    };
    this.entries.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  private read(): StoredProgress {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return { surahs: {} };
    }
    try {
      return parseStoredProgress(JSON.parse(raw) as unknown);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return { surahs: {} };
    }
  }
}

function parseStoredProgress(value: unknown): StoredProgress {
  if (!isRecord(value) || !isRecord(value['surahs'])) {
    throw new Error('Memorization progress was invalid');
  }
  const surahs: Record<string, number[]> = {};
  for (const [key, ids] of Object.entries(value['surahs'])) {
    if (!/^\d+$/.test(key) || !Array.isArray(ids)) {
      continue;
    }
    surahs[key] = [
      ...new Set(ids.filter((id): id is number => Number.isInteger(id) && id > 0)),
    ].sort((left, right) => left - right);
  }
  return { surahs };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
