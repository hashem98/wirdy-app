import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { QuranDataService } from './quran-data';
import { QURAN_API_BASE_URL, QURAN_LAYOUT_BASE_URL, SURAH_COUNT } from './quran.model';

describe('QuranDataService', () => {
  let service: QuranDataService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    ({ service, http } = setup());
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('should_fetch_and_cache_surah_metadata_when_storage_is_empty', async () => {
    const pending = firstValueFrom(service.getSurahs());
    http.expectOne(`${QURAN_API_BASE_URL}/surah`).flush(surahIndexResponse());

    const surahs = await pending;

    expect(surahs).toHaveLength(SURAH_COUNT);
    expect(surahs[0]).toEqual(expect.objectContaining({ number: 1, revelationType: 'Meccan' }));
    expect(surahs[1]).toEqual(expect.objectContaining({ number: 2, revelationType: 'Medinan' }));

    const cached = await firstValueFrom(service.getSurahs());
    http.expectNone(`${QURAN_API_BASE_URL}/surah`);
    expect(cached).toEqual(surahs);
  });

  it('should_read_surah_metadata_from_local_storage_when_a_new_service_starts', async () => {
    const pending = firstValueFrom(service.getSurahs());
    http.expectOne(`${QURAN_API_BASE_URL}/surah`).flush(surahIndexResponse());
    await pending;
    http.verify();

    TestBed.resetTestingModule();
    ({ service, http } = setup());

    const cached = await firstValueFrom(service.getSurahs());
    http.expectNone(`${QURAN_API_BASE_URL}/surah`);
    expect(cached).toHaveLength(SURAH_COUNT);
  });

  it('should_refetch_surahs_when_cached_metadata_is_invalid', async () => {
    const pending = firstValueFrom(service.getSurahs());
    http.expectOne(`${QURAN_API_BASE_URL}/surah`).flush(surahIndexResponse());
    await pending;
    const cacheKey = localStorage.key(0);
    expect(cacheKey).not.toBeNull();
    localStorage.setItem(cacheKey ?? '', '{');
    http.verify();

    TestBed.resetTestingModule();
    ({ service, http } = setup());
    const retry = firstValueFrom(service.getSurahs());
    http.expectOne(`${QURAN_API_BASE_URL}/surah`).flush(surahIndexResponse());

    await expect(retry).resolves.toHaveLength(SURAH_COUNT);
  });

  it('should_merge_uthmani_text_and_audio_when_loading_a_surah', async () => {
    const pending = firstValueFrom(service.getSurahWithAudio(1));
    const request = http.expectOne(
      `${QURAN_API_BASE_URL}/surah/1/editions/quran-uthmani,ar.alafasy`,
    );
    request.flush(surahEditionResponse('ar.alafasy', ''));

    const surah = await pending;

    expect(surah.reciterEdition).toBe('ar.alafasy');
    expect(surah.ayahs[0]).toEqual({
      number: 1,
      numberInSurah: 1,
      text: 'بِسْمِ اللَّهِ',
      audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3',
    });
  });

  it('should_request_the_selected_reciter_when_the_edition_changes', async () => {
    const pending = firstValueFrom(service.getSurahWithAudio(2, 'ar.husary'));
    const request = http.expectOne(
      `${QURAN_API_BASE_URL}/surah/2/editions/quran-uthmani,ar.husary`,
    );
    request.flush(
      surahEditionResponse(
        'ar.husary',
        'https://cdn.islamic.network/quran/audio/128/ar.husary/8.mp3',
      ),
    );

    const surah = await pending;

    expect(surah.reciterEdition).toBe('ar.husary');
    expect(surah.ayahs[0]?.audioUrl).toBe(
      'https://cdn.islamic.network/quran/audio/128/ar.husary/8.mp3',
    );
  });

  it('should_reject_a_surah_number_outside_1_to_114', () => {
    expect(() => service.getSurahWithAudio(0)).toThrow(RangeError);
    expect(() => service.getSurahWithAudio(115)).toThrow(RangeError);
    http.expectNone(() => true);
  });

  it('should_reject_an_unsafe_reciter_edition', () => {
    expect(() => service.getSurahWithAudio(1, '../ar.alafasy')).toThrow(
      /Reciter edition identifier is invalid/,
    );
    http.expectNone(() => true);
  });

  it('should_list_only_free_arabic_readers_when_the_edition_endpoint_succeeds', async () => {
    const pending = firstValueFrom(service.getArabicAudioEditions());
    const request = http.expectOne(
      (candidate) =>
        candidate.url === `${QURAN_API_BASE_URL}/edition` &&
        candidate.params.get('format') === 'audio' &&
        candidate.params.get('language') === 'ar',
    );
    request.flush({
      code: 200,
      status: 'OK',
      data: [
        {
          identifier: 'ar.minshawi',
          language: 'ar',
          name: 'محمد صديق المنشاوي',
          englishName: 'Minshawi',
          format: 'audio',
          type: 'translation',
        },
        {
          identifier: 'ar.yasseraldossari',
          language: 'ar',
          name: 'ياسر الدوسري',
          englishName: 'Yasser ad-Dossari',
          format: 'audio',
          type: 'surahbysurah',
        },
      ],
    });

    const editions = await pending;

    expect(editions).toEqual([
      {
        identifier: 'ar.minshawi',
        language: 'ar',
        name: 'محمد صديق المنشاوي',
        englishName: 'Minshawi',
        format: 'audio',
      },
    ]);
  });

  it('should_merge_uthmani_text_and_audio_when_loading_a_page', async () => {
    const pending = firstValueFrom(service.getPageWithAudio(2, 'ar.husary'));
    http
      .expectOne(`${QURAN_API_BASE_URL}/page/2/quran-uthmani`)
      .flush(pageEditionResponse('quran-uthmani', ''));
    http
      .expectOne(`${QURAN_API_BASE_URL}/page/2/ar.husary`)
      .flush(
        pageEditionResponse(
          'ar.husary',
          'https://cdn.islamic.network/quran/audio/128/ar.husary/8.mp3',
        ),
      );
    http
      .expectOne(
        `${QURAN_LAYOUT_BASE_URL}/verses/by_page/2?words=true&per_page=50&word_fields=text_uthmani,line_number`,
      )
      .flush({
      verses: [
        {
          verse_key: '2:1',
          words: [
            { text_uthmani: 'الٓمٓ', line_number: 3, char_type_name: 'word' },
            { text_uthmani: '١', line_number: 3, char_type_name: 'end' },
          ],
        },
      ],
      pagination: { next_page: null },
    });

    const page = await pending;

    expect(page).toEqual({
      number: 2,
      reciterEdition: 'ar.husary',
      ayahs: [
        {
          number: 8,
          numberInSurah: 1,
          surahNumber: 2,
          surahName: 'سورة البقرة',
          text: 'الم',
          audioUrl: 'https://cdn.islamic.network/quran/audio/128/ar.husary/8.mp3',
        },
      ],
      words: [
        {
          surahNumber: 2,
          numberInSurah: 1,
          lineNumber: 3,
          text: 'الٓمٓ',
          isMarker: false,
        },
        {
          surahNumber: 2,
          numberInSurah: 1,
          lineNumber: 3,
          text: '١',
          isMarker: true,
        },
      ],
    });
  });

  it('should_reject_a_page_number_outside_the_mushaf', () => {
    expect(() => service.getPageWithAudio(0)).toThrow(RangeError);
    expect(() => service.getPageWithAudio(605)).toThrow(RangeError);
    http.expectNone(() => true);
  });

  it('should_fetch_ayah_tafseer_from_the_edition_endpoint', async () => {
    const pending = firstValueFrom(service.getAyahTafseer(1, 'ar.muyassar'));
    const request = http.expectOne(`${QURAN_API_BASE_URL}/ayah/1/ar.muyassar`);
    request.flush({
      code: 200,
      status: 'OK',
      data: {
        number: 1,
        text: 'ابتدئ قراءتي للقرآن باسم الله مستعينا به',
        edition: {
          identifier: 'ar.muyassar',
          language: 'ar',
          name: 'تفسير الميسر',
          englishName: 'King Fahad Quran Complex',
          format: 'text',
          type: 'tafsir',
        },
      },
    });

    const tafseer = await pending;

    expect(tafseer).toEqual({
      ayahNumber: 1,
      text: 'ابتدئ قراءتي للقرآن باسم الله مستعينا به',
      editionName: 'تفسير الميسر',
    });
  });
});

function setup(): { service: QuranDataService; http: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    service: TestBed.inject(QuranDataService),
    http: TestBed.inject(HttpTestingController),
  };
}

function surahIndexResponse(): object {
  return {
    code: 200,
    status: 'OK',
    data: Array.from({ length: SURAH_COUNT }, (_, index) => ({
      number: index + 1,
      name: `سورة ${index + 1}`,
      englishName: `Surah ${index + 1}`,
      englishNameTranslation: 'Translation',
      numberOfAyahs: 7,
      revelationType: index % 2 === 0 ? 'Meccan' : 'Medinan',
    })),
  };
}

function surahEditionResponse(reciterEdition: string, audioUrl: string): object {
  const textAyah = {
    number: reciterEdition === 'ar.husary' ? 8 : 1,
    text: '\uFEFFبِسْمِ اللَّهِ',
    numberInSurah: 1,
    juz: 1,
    manzil: 1,
    page: 1,
    ruku: 1,
    hizbQuarter: 1,
    sajda: false,
  };
  const audioAyah = audioUrl === '' ? { ...textAyah } : { ...textAyah, audio: audioUrl };
  return {
    code: 200,
    status: 'OK',
    data: [editionPayload('quran-uthmani', textAyah), editionPayload(reciterEdition, audioAyah)],
  };
}

function pageEditionResponse(edition: string, audioUrl: string): object {
  const ayah = {
    number: 8,
    text: 'الم',
    numberInSurah: 1,
    surah: {
      number: 2,
      name: 'سورة البقرة',
      englishName: 'Al-Baqara',
      englishNameTranslation: 'The Cow',
      numberOfAyahs: 286,
      revelationType: 'Medinan',
    },
  };
  return {
    code: 200,
    status: 'OK',
    data: {
      number: 2,
      ayahs: [audioUrl === '' ? ayah : { ...ayah, audio: audioUrl }],
      edition: { identifier: edition },
    },
  };
}

function editionPayload(identifier: string, ayah: object): object {
  return {
    number: 1,
    name: 'سورة الفاتحة',
    englishName: 'Al-Faatiha',
    englishNameTranslation: 'The Opening',
    revelationType: 'Meccan',
    numberOfAyahs: 1,
    ayahs: [ayah],
    edition: {
      identifier,
      language: 'ar',
      name: identifier,
      englishName: identifier,
      format: identifier === 'quran-uthmani' ? 'text' : 'audio',
      type: 'quran',
    },
  };
}
