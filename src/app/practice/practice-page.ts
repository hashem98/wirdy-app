import { MUSHAF_PAGE_COUNT, PageAyah } from '../core/quran.model';

const PAGE_KEY = 'quran.mushaf-page.v1';

export interface PageAyahView extends PageAyah {
  startsSurah: boolean;
  hidden: boolean;
  selected: boolean;
  playing: boolean;
  memorized: boolean;
}

export function readStoredPage(): number {
  const stored = Number(localStorage.getItem(PAGE_KEY));
  if (Number.isInteger(stored) && stored >= 1 && stored <= MUSHAF_PAGE_COUNT) {
    return stored;
  }
  return 1;
}

export function storePage(pageNumber: number): void {
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > MUSHAF_PAGE_COUNT) {
    return;
  }
  localStorage.setItem(PAGE_KEY, String(pageNumber));
}

export function buildPageAyahs(
  ayahs: readonly PageAyah[],
  hiddenFrom: number | null,
  selectedAyahNumber: number | null,
  memorizedIds: ReadonlySet<number>,
  playingAyahNumber: number | null,
  revealedAyahs: ReadonlySet<number> = new Set(),
): PageAyahView[] {
  return ayahs.map((ayah) => ({
    ...ayah,
    startsSurah: ayah.numberInSurah === 1,
    hidden: hiddenFrom !== null && ayah.number >= hiddenFrom && !revealedAyahs.has(ayah.number),
    selected: ayah.number === selectedAyahNumber,
    playing: playingAyahNumber === ayah.number,
    memorized: memorizedIds.has(ayah.number),
  }));
}
