import { Component, computed, effect, inject, resource, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { AudioPlayerService, AyahRepeat } from '../core/audio-player';
import { QuranDataService } from '../core/quran-data';
import {
  DEFAULT_SURAH_NAMES,
  DEFAULT_TAFSEER_EDITION,
  getSurahStartPage,
  isFreeReciter,
  MUSHAF_PAGE_COUNT,
  SURAH_COUNT,
  TAFSEER_EDITIONS,
} from '../core/quran.model';
import { MemorizationProgress } from './memorization-progress';
import { buildMushafLines } from './mushaf-lines';
import { buildPageAyahs, PageAyahView, readStoredPage, storePage } from './practice-page';
import { fallbackReciters, readReciter, ReciterOption, storeReciter } from './reciter-preference';

@Component({
  selector: 'app-practice',
  imports: [FormField],
  templateUrl: './practice.html',
  styleUrl: './practice.scss',
})
export class PracticeComponent {
  private readonly quranData = inject(QuranDataService);
  private readonly progress = inject(MemorizationProgress);
  protected readonly player = inject(AudioPlayerService);

  protected readonly pageCount = MUSHAF_PAGE_COUNT;
  protected readonly repeats: readonly { id: AyahRepeat; label: string }[] = [
    { id: 1, label: '1×' },
    { id: 3, label: '3×' },
    { id: 5, label: '5×' },
    { id: 'infinite', label: '∞' },
  ];

  protected readonly reader = signal({ edition: readReciter() });
  protected readonly readerForm = form(this.reader);
  protected readonly reciter = computed(() => this.reader().edition);
  private readonly rememberReciter = effect(() => {
    const edition = this.reader().edition;
    if (!isFreeReciter(edition) || edition === readReciter()) {
      return;
    }
    this.player.stop();
    storeReciter(edition);
  });
  protected readonly pageNumber = signal(readStoredPage());
  protected readonly selectedAyahNumber = signal<number | null>(null);
  protected readonly selectedLineNumber = signal<number | null>(null);
  protected readonly hiddenFrom = signal<number | null>(null);
  protected readonly revealedAyahs = signal<ReadonlySet<number>>(new Set());
  protected readonly canResume = computed(
    () => !this.player.isPlaying() && this.player.currentIndex() >= 0,
  );
  protected readonly reciterList = resource({
    loader: () => firstValueFrom(this.quranData.getArabicAudioEditions()),
  });
  protected readonly surahList = resource({
    loader: () => firstValueFrom(this.quranData.getSurahs()),
  });
  protected readonly mushaf = resource({
    params: () => `${this.pageNumber()}|${this.reciter()}`,
    loader: ({ params }) => {
      const separator = params.indexOf('|');
      return firstValueFrom(
        this.quranData.getPageWithAudio(
          Number(params.slice(0, separator)),
          params.slice(separator + 1),
        ),
      );
    },
  });

  protected readonly activeTafseerAyah = signal<PageAyahView | null>(null);
  protected readonly selectedTafseerEdition = signal<string>(DEFAULT_TAFSEER_EDITION);
  protected readonly tafseerEditions = TAFSEER_EDITIONS;
  protected readonly isCopied = signal(false);

  protected readonly tafseerResource = resource({
    params: () => {
      const ayah = this.activeTafseerAyah();
      if (!ayah) {
        return null;
      }
      return `${ayah.number}|${this.selectedTafseerEdition()}`;
    },
    loader: ({ params }) => {
      if (!params) {
        return Promise.resolve(null);
      }
      const separator = params.indexOf('|');
      const ayahNumber = Number(params.slice(0, separator));
      const edition = params.slice(separator + 1);
      return firstValueFrom(this.quranData.getAyahTafseer(ayahNumber, edition));
    },
  });

  protected readonly reciterOptions = computed(() => this.buildReciterOptions());
  protected readonly surahOptions = computed(() => this.buildSurahOptions());
  protected readonly currentSurahNumber = computed(() => {
    const page = this.currentPage();
    return page?.ayahs[0]?.surahNumber ?? 1;
  });
  protected readonly currentPage = computed(() => {
    if (!this.mushaf.hasValue()) {
      return null;
    }
    const page = this.mushaf.value();
    if (page.number !== this.pageNumber() || page.reciterEdition !== this.reciter()) {
      return null;
    }
    return page;
  });
  protected readonly pageAyahs = computed(() => {
    const page = this.currentPage();
    if (!page) {
      return [];
    }
    const playing = this.player.isPlaying() ? (this.player.currentAyah()?.number ?? null) : null;
    return buildPageAyahs(
      page.ayahs,
      this.hiddenFrom(),
      this.selectedAyahNumber(),
      memorizedOnPage(page.ayahs, (surahNumber) => this.progress.memorizedIds(surahNumber)),
      playing,
      this.revealedAyahs(),
    );
  });
  protected readonly mushafLines = computed(() => {
    const page = this.currentPage();
    if (!page) {
      return [];
    }
    return buildMushafLines(page.words, this.pageAyahs());
  });
  protected readonly selectedAyah = computed(
    () => this.pageAyahs().find((ayah) => ayah.selected) ?? null,
  );
  protected readonly pageSurahName = computed(() => {
    const page = this.currentPage();
    return page?.ayahs[0]?.surahName ?? '';
  });
  protected readonly pageJuzName = computed(() => {
    const page = this.currentPage();
    if (!page) {
      return '';
    }
    const juz = Math.min(30, Math.max(1, Math.ceil((page.number - 1) / 20) || 1));
    return `الجزء ${this.toArabicDigits(juz)}`;
  });

  protected chooseRepeat(repeat: AyahRepeat): void {
    this.player.setRepeat(repeat);
  }

  protected pauseReading(): void {
    this.player.pause();
  }

  protected resumeReading(): void {
    this.player.resume();
  }

  protected previousPage(): void {
    this.openPage(this.pageNumber() - 1);
  }

  protected nextPage(): void {
    this.openPage(this.pageNumber() + 1);
  }

  protected chooseSurah(event: Event): void {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    const surahNumber = Number(select.value);
    if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > SURAH_COUNT) {
      return;
    }
    const page = getSurahStartPage(surahNumber);
    this.openPage(page);
  }

  protected goToPage(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    const page = Number(input.value);
    if (!Number.isInteger(page) || page < 1 || page > this.pageCount) {
      input.value = String(this.pageNumber());
      return;
    }
    this.openPage(page);
  }

  protected selectAyah(ayahNumber: number, lineNumber?: number): void {
    const ayah = this.pageAyahs().find((item) => item.number === ayahNumber);
    if (ayah?.hidden) {
      this.revealedAyahs.update((current) => new Set(current).add(ayahNumber));
    }
    this.selectedAyahNumber.set(ayahNumber);
    if (lineNumber !== undefined) {
      this.selectedLineNumber.set(lineNumber);
    }
  }

  protected closeAyahMenu(event?: Event): void {
    event?.stopPropagation();
    this.selectedAyahNumber.set(null);
    this.selectedLineNumber.set(null);
  }

  protected isTargetSegment(ayahNumber: number, lineNumber: number): boolean {
    if (this.selectedAyahNumber() !== ayahNumber) {
      return false;
    }
    const target = this.selectedLineNumber();
    return target === null || target === lineNumber;
  }

  protected toArabicDigits(num: number | string): string {
    const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/\d/g, (d) => digits[Number(d)]);
  }

  protected chooseAyahAction(event: Event): void {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }
    const action = select.value;
    select.value = '';
    if (action === 'read') {
      this.readSelectedAyah();
      return;
    }
    if (action === 'read-to-end') {
      this.readToEnd();
      return;
    }
    if (action === 'hide') {
      this.hideToEnd();
      return;
    }
    if (action === 'memorized') {
      this.toggleMemorized();
      return;
    }
    if (action === 'tafseer') {
      this.showTafseer();
    }
  }

  protected showTafseer(ayah?: PageAyahView | null): void {
    const target = ayah ?? this.selectedAyah();
    if (!target) {
      return;
    }
    this.closeAyahMenu();
    this.activeTafseerAyah.set(target);
  }

  protected closeTafseer(): void {
    this.activeTafseerAyah.set(null);
    this.isCopied.set(false);
  }

  protected changeTafseerEdition(event: Event): void {
    const select = event.target;
    if (select instanceof HTMLSelectElement) {
      this.selectedTafseerEdition.set(select.value);
    }
  }

  protected async copyTafseer(ayahText: string, tafseerText: string): Promise<void> {
    const ayah = this.activeTafseerAyah();
    const citation = ayah ? `\n[سورة ${ayah.surahName}، الآية ${ayah.numberInSurah}]` : '';
    const textToCopy = `﴿${ayahText}﴾\n\n${tafseerText}${citation}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      this.isCopied.set(true);
      setTimeout(() => this.isCopied.set(false), 2000);
    } catch {
      // Fallback
    }
  }

  protected readSelectedAyah(): void {
    const ayah = this.selectedPlayableAyah();
    if (!ayah) {
      return;
    }
    this.player.playAyah(ayah);
  }

  protected readToEnd(): void {
    const page = this.currentPage();
    const ayah = this.selectedPlayableAyah();
    if (!page || !ayah) {
      return;
    }
    const start = page.ayahs.findIndex((item) => item.number === ayah.number);
    if (start < 0) {
      return;
    }
    this.player.playRange(
      page.ayahs.map((item) => ({ number: item.number, audioUrl: item.audioUrl })),
      start,
      page.ayahs.length - 1,
    );
  }

  protected hideToEnd(): void {
    const ayah = this.selectedAyah();
    if (!ayah) {
      return;
    }
    this.revealedAyahs.set(new Set());
    this.hiddenFrom.set(ayah.hidden ? null : ayah.number);
  }

  protected toggleMemorized(): void {
    const ayah = this.selectedAyah();
    if (!ayah) {
      return;
    }
    this.progress.toggle(ayah.surahNumber, ayah.number);
  }

  protected reloadPage(): void {
    this.mushaf.reload();
  }

  private selectedPlayableAyah(): { number: number; audioUrl: string } | null {
    const page = this.currentPage();
    const ayahNumber = this.selectedAyahNumber();
    if (!page || ayahNumber === null) {
      return null;
    }
    const ayah = page.ayahs.find((item) => item.number === ayahNumber);
    if (!ayah) {
      return null;
    }
    return { number: ayah.number, audioUrl: ayah.audioUrl };
  }

  private openPage(pageNumber: number): void {
    if (pageNumber < 1 || pageNumber > this.pageCount || pageNumber === this.pageNumber()) {
      return;
    }
    this.player.stop();
    this.selectedAyahNumber.set(null);
    this.selectedLineNumber.set(null);
    this.closeTafseer();
    this.hiddenFrom.set(null);
    this.revealedAyahs.set(new Set());
    this.pageNumber.set(pageNumber);
    storePage(pageNumber);
  }

  private buildSurahOptions(): readonly { number: number; name: string }[] {
    const loaded = this.surahList.hasValue() ? this.surahList.value() : [];
    if (loaded && loaded.length > 0) {
      return loaded.map((s) => ({ number: s.number, name: s.name }));
    }
    return DEFAULT_SURAH_NAMES.map((name, index) => ({
      number: index + 1,
      name: `سورة ${name}`,
    }));
  }

  private buildReciterOptions(): readonly ReciterOption[] {
    const loaded = this.reciterList.hasValue() ? this.reciterList.value() : [];
    const options =
      loaded.length > 0
        ? loaded
            .map(toReciterOption)
            .sort((left, right) => left.name.localeCompare(right.name, 'ar'))
        : [...fallbackReciters()];
    if (options.some((option) => option.identifier === this.reciter())) {
      return options;
    }
    return [{ identifier: this.reciter(), name: this.reciter() }, ...options];
  }
}

function memorizedOnPage(
  ayahs: readonly { surahNumber: number }[],
  memorizedIds: (surahNumber: number) => readonly number[],
): Set<number> {
  const surahNumbers = [...new Set(ayahs.map((ayah) => ayah.surahNumber))];
  return new Set(surahNumbers.flatMap((surahNumber) => memorizedIds(surahNumber)));
}

function toReciterOption(edition: { identifier: string; name: string }): ReciterOption {
  return { identifier: edition.identifier, name: edition.name };
}
