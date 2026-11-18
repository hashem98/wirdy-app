import { HttpClient } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { Observable, forkJoin, map, of, tap } from 'rxjs';
import {
  readAudioEditions,
  readAyahTafseer,
  readCachedSurahs,
  readPageWithAudio,
  readSurahIndex,
  readSurahWithAudio,
} from './quran-response';
import {
  AudioEdition,
  AyahTafseer,
  DEFAULT_RECITER_EDITION,
  DEFAULT_TAFSEER_EDITION,
  MUSHAF_PAGE_COUNT,
  MushafPage,
  QURAN_API_BASE_URL,
  QURAN_LAYOUT_BASE_URL,
  SURAH_COUNT,
  SurahSummary,
  SurahWithAudio,
  UTHMANI_EDITION,
} from './quran.model';

const SURAH_INDEX_CACHE_KEY = 'quran.surah-index.v1';
const RECITER_EDITION_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/;

@Service()
export class QuranDataService {
  private readonly http = inject(HttpClient);
  private readonly surahIndex = signal<readonly SurahSummary[] | null>(null);

  getSurahs(): Observable<readonly SurahSummary[]> {
    const cached = this.surahIndex() ?? this.readStoredSurahs();
    if (cached) {
      this.surahIndex.set(cached);
      return of(cached);
    }
    return this.http.get<unknown>(`${QURAN_API_BASE_URL}/surah`).pipe(
      map((payload) => readSurahIndex(payload)),
      tap((surahs) => this.storeSurahs(surahs)),
    );
  }

  getSurahWithAudio(
    surahNumber: number,
    reciterEdition: string = DEFAULT_RECITER_EDITION,
  ): Observable<SurahWithAudio> {
    this.assertSurahNumber(surahNumber);
    this.assertReciterEdition(reciterEdition);
    const editions = `${UTHMANI_EDITION},${reciterEdition}`;
    const url = `${QURAN_API_BASE_URL}/surah/${surahNumber}/editions/${editions}`;
    return this.http
      .get<unknown>(url)
      .pipe(map((payload) => readSurahWithAudio(payload, reciterEdition)));
  }

  getPageWithAudio(
    pageNumber: number,
    reciterEdition: string = DEFAULT_RECITER_EDITION,
  ): Observable<MushafPage> {
    this.assertPageNumber(pageNumber);
    this.assertReciterEdition(reciterEdition);
    return forkJoin({
      text: this.http.get<unknown>(`${QURAN_API_BASE_URL}/page/${pageNumber}/${UTHMANI_EDITION}`),
      audio: this.http.get<unknown>(`${QURAN_API_BASE_URL}/page/${pageNumber}/${reciterEdition}`),
      layout: this.http.get<unknown>(`${QURAN_LAYOUT_BASE_URL}/verses/by_page/${pageNumber}`, {
        params: { words: 'true', per_page: '50', word_fields: 'text_uthmani,line_number' },
      }),
    }).pipe(
      map((editions) =>
        readPageWithAudio(editions.text, editions.audio, editions.layout, reciterEdition),
      ),
    );
  }

  getArabicAudioEditions(): Observable<readonly AudioEdition[]> {
    return this.http
      .get<unknown>(`${QURAN_API_BASE_URL}/edition`, {
        params: { format: 'audio', language: 'ar' },
      })
      .pipe(map((payload) => readAudioEditions(payload)));
  }

  getAyahTafseer(
    ayahNumber: number,
    edition: string = DEFAULT_TAFSEER_EDITION,
  ): Observable<AyahTafseer> {
    return this.http
      .get<unknown>(`${QURAN_API_BASE_URL}/ayah/${ayahNumber}/${edition}`)
      .pipe(map((payload) => readAyahTafseer(payload, ayahNumber)));
  }

  private readStoredSurahs(): readonly SurahSummary[] | null {
    const raw = localStorage.getItem(SURAH_INDEX_CACHE_KEY);
    if (raw === null) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      return readCachedSurahs(parsed);
    } catch {
      localStorage.removeItem(SURAH_INDEX_CACHE_KEY);
      return null;
    }
  }

  private storeSurahs(surahs: readonly SurahSummary[]): void {
    this.surahIndex.set(surahs);
    localStorage.setItem(SURAH_INDEX_CACHE_KEY, JSON.stringify(surahs));
  }

  private assertPageNumber(pageNumber: number): void {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > MUSHAF_PAGE_COUNT) {
      throw new RangeError('Page number must be between 1 and 604');
    }
  }

  private assertSurahNumber(surahNumber: number): void {
    if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > SURAH_COUNT) {
      throw new RangeError('Surah number must be between 1 and 114');
    }
  }

  private assertReciterEdition(reciterEdition: string): void {
    if (!RECITER_EDITION_PATTERN.test(reciterEdition)) {
      throw new Error('Reciter edition identifier is invalid');
    }
  }
}
