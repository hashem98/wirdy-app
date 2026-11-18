import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AudioPlayerService, AyahRepeat, PlayableAyah } from '../core/audio-player';
import { QuranDataService } from '../core/quran-data';
import { AudioEdition, MushafPage, MushafWord } from '../core/quran.model';
import { PracticeComponent } from './practice';

describe('PracticeComponent', () => {
  const page: MushafPage = {
    number: 1,
    reciterEdition: 'ar.alafasy',
    ayahs: [
      {
        number: 1,
        numberInSurah: 1,
        surahNumber: 1,
        surahName: 'سورة الفاتحة',
        text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        audioUrl: 'https://cdn.example/1.mp3',
      },
      {
        number: 2,
        numberInSurah: 2,
        surahNumber: 1,
        surahName: 'سورة الفاتحة',
        text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
        audioUrl: 'https://cdn.example/2.mp3',
      },
      {
        number: 3,
        numberInSurah: 3,
        surahNumber: 1,
        surahName: 'سورة الفاتحة',
        text: 'مَالِكِ يَوْمِ الدِّينِ',
        audioUrl: 'https://cdn.example/3.mp3',
      },
    ],
    words: [
      pageWord(1, 1, 2, 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'),
      pageWord(1, 1, 2, '١', true),
      pageWord(1, 2, 3, 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ'),
      pageWord(1, 2, 3, '٢', true),
      pageWord(1, 3, 4, 'مَالِكِ يَوْمِ الدِّينِ'),
      pageWord(1, 3, 4, '٣', true),
    ],
  };
  const reciters: AudioEdition[] = [
    {
      identifier: 'ar.alafasy',
      language: 'ar',
      name: 'مشاري راشد العفاسي',
      englishName: 'Alafasy',
      format: 'audio',
    },
    {
      identifier: 'ar.husary',
      language: 'ar',
      name: 'محمود خليل الحصري',
      englishName: 'Husary',
      format: 'audio',
    },
  ];
  const requestedPages: { pageNumber: number; reciterEdition: string }[] = [];
  let player: FakePlayer;
  let fixture: ComponentFixture<PracticeComponent>;

  beforeEach(async () => {
    localStorage.clear();
    requestedPages.length = 0;
    player = new FakePlayer();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: QuranDataService,
          useValue: {
            getArabicAudioEditions: () => of(reciters),
            getSurahs: () =>
              of([
                {
                  number: 1,
                  name: 'سورة الفاتحة',
                  englishName: 'Al-Faatiha',
                  englishNameTranslation: 'The Opening',
                  numberOfAyahs: 7,
                  revelationType: 'Meccan' as const,
                },
                {
                  number: 2,
                  name: 'سورة البقرة',
                  englishName: 'Al-Baqara',
                  englishNameTranslation: 'The Cow',
                  numberOfAyahs: 286,
                  revelationType: 'Medinan' as const,
                },
              ]),
            getPageWithAudio: (pageNumber: number, reciterEdition = 'ar.alafasy') => {
              requestedPages.push({ pageNumber, reciterEdition });
              return of({
                ...page,
                number: pageNumber,
                reciterEdition,
              });
            },
            getAyahTafseer: (ayahNumber: number, edition = 'ar.muyassar') =>
              of({
                ayahNumber,
                text: 'تفسير تجريبي للآية الكريمة',
                editionName: 'التفسير الميسر',
              }),
          },
        },
        { provide: AudioPlayerService, useValue: player },
      ],
    });
    fixture = TestBed.createComponent(PracticeComponent);
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should_show_the_mushaf_page_as_one_page', () => {
    expect(text()).toContain('سورة الفاتحة');
    expect(text()).toContain('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
    expect(text()).toContain('الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ');
    expect(text()).toContain('الرَّحْمَٰنِ الرَّحِيمِ');
    expect(documentQueryAll('.mushaf')).toHaveLength(1);
  });

  it('should_read_only_the_selected_ayah_when_that_option_is_chosen', async () => {
    expect(documentQueryAll('#ayah-actions')).toHaveLength(0);

    click('الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ');
    await fixture.whenStable();
    expect(documentQueryAll('#ayah-actions')).toHaveLength(1);
    chooseAyahAction('read');
    await fixture.whenStable();

    expect(player.ranges).toEqual([
      {
        start: 0,
        end: 0,
        urls: ['https://cdn.example/2.mp3'],
      },
    ]);
  });

  it('should_read_from_the_selected_ayah_to_the_end_of_the_page', async () => {
    click('الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ');
    await fixture.whenStable();
    chooseAyahAction('read-to-end');
    await fixture.whenStable();

    expect(player.ranges).toEqual([
      {
        start: 1,
        end: 2,
        urls: ['https://cdn.example/2.mp3', 'https://cdn.example/3.mp3'],
      },
    ]);
  });

  it('should_hide_from_the_selected_ayah_to_the_end_of_the_page', async () => {
    click('الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ');
    await fixture.whenStable();
    chooseAyahAction('hide');
    await fixture.whenStable();

    expect(text()).toContain('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
    expect(text()).not.toContain('الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ');
    expect(text()).not.toContain('مَالِكِ يَوْمِ الدِّينِ');
    expect(text()).toContain('أظهر حتى نهاية الصفحة');

    chooseAyahAction('hide');
    await fixture.whenStable();

    expect(text()).toContain('الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ');
  });

  it('should_show_a_hidden_ayah_when_that_ayah_is_clicked', async () => {
    click('الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ');
    await fixture.whenStable();
    chooseAyahAction('hide');
    await fixture.whenStable();

    click('مخفية');
    await fixture.whenStable();

    expect(text()).toContain('الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ');
    expect(text()).not.toContain('مَالِكِ يَوْمِ الدِّينِ');
  });

  it('should_pause_and_resume_reading_when_those_options_are_chosen', async () => {
    click('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
    await fixture.whenStable();
    chooseAyahAction('read-to-end');
    await fixture.whenStable();

    click('توقيف');
    await fixture.whenStable();
    expect(player.isPlaying()).toBe(false);

    click('متابعة');
    await fixture.whenStable();
    expect(player.isPlaying()).toBe(true);
  });

  it('should_open_the_next_mushaf_page_when_next_is_chosen', async () => {
    click('التالي');
    await fixture.whenStable();

    expect(requestedPages.at(-1)).toEqual({ pageNumber: 2, reciterEdition: 'ar.alafasy' });
    expect(pageInput().value).toBe('2');
  });

  it('should_persist_a_memorized_ayah_on_the_page', async () => {
    click('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
    await fixture.whenStable();
    chooseAyahAction('memorized');
    await fixture.whenStable();

    expect(localStorage.getItem('quran.memorized-ayahs.v1')).toContain('"1":[1]');
    expect(text()).toContain('محفوظة');
  });

  it('should_open_tafseer_dialog_when_tafseer_is_chosen', async () => {
    expect(documentQueryAll('.tafseer-dialog')).toHaveLength(0);

    click('الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ');
    await fixture.whenStable();

    click('تفسير');
    await fixture.whenStable();

    expect(documentQueryAll('.tafseer-dialog')).toHaveLength(1);
    expect(text()).toContain('تفسير تجريبي للآية الكريمة');

    click('إغلاق');
    await fixture.whenStable();

    expect(documentQueryAll('.tafseer-dialog')).toHaveLength(0);
  });

  it('should_open_the_first_page_of_a_surah_when_selected', async () => {
    const select = (fixture.nativeElement as HTMLElement).querySelector('#surah-select');
    if (!(select instanceof HTMLSelectElement)) {
      throw new Error('Missing surah select');
    }
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(requestedPages.at(-1)?.pageNumber).toBe(2);
    expect(pageInput().value).toBe('2');
  });

  it('should_reload_the_page_when_another_reader_is_selected', async () => {
    const select = reciterSelect();
    select.value = 'ar.husary';
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();

    expect(requestedPages.at(-1)).toEqual({ pageNumber: 1, reciterEdition: 'ar.husary' });
    expect(localStorage.getItem('quran.reciter.v1')).toBe('ar.husary');
    expect(player.stops).toBe(1);
  });

  it('should_restore_the_reader_when_the_page_is_opened_again', async () => {
    localStorage.setItem('quran.reciter.v1', 'ar.husary');
    fixture.destroy();
    fixture = TestBed.createComponent(PracticeComponent);
    await fixture.whenStable();

    expect(reciterSelect().value).toBe('ar.husary');
    expect(requestedPages.at(-1)?.reciterEdition).toBe('ar.husary');
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function chooseAyahAction(action: string): void {
    const select = (fixture.nativeElement as HTMLElement).querySelector('#ayah-actions');
    if (!(select instanceof HTMLSelectElement)) {
      throw new Error('Missing ayah menu');
    }
    select.value = action;
    select.dispatchEvent(new Event('change'));
  }

  function click(label: string): void {
    const button = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (candidate) => candidate.textContent?.includes(label),
    );
    if (!button) {
      throw new Error(`Missing button ${label}`);
    }
    button.click();
  }

  function reciterSelect(): HTMLSelectElement {
    const select = (fixture.nativeElement as HTMLElement).querySelector('#reciter-select');
    if (!(select instanceof HTMLSelectElement)) {
      throw new Error('Missing reader select');
    }
    return select;
  }

  function pageInput(): HTMLInputElement {
    const input = (fixture.nativeElement as HTMLElement).querySelector('#page-number');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Missing page input');
    }
    return input;
  }

  function pageWord(
    surahNumber: number,
    numberInSurah: number,
    lineNumber: number,
    text: string,
    isMarker = false,
  ): MushafWord {
    return { surahNumber, numberInSurah, lineNumber, text, isMarker };
  }

  function documentQueryAll(selector: string): Element[] {
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll(selector)];
  }
});

class FakePlayer {
  readonly ranges: { start: number; end: number; urls: string[] }[] = [];
  stops = 0;
  private readonly playingState = signal(false);
  private readonly ayahState = signal<PlayableAyah | null>(null);
  private readonly repeatState = signal<AyahRepeat>(1);
  private readonly indexState = signal(-1);
  readonly isPlaying = this.playingState.asReadonly();
  readonly currentAyah = this.ayahState.asReadonly();
  readonly currentIndex = this.indexState.asReadonly();
  readonly repeat = this.repeatState.asReadonly();

  playAyah(ayah: PlayableAyah): void {
    this.playRange([ayah], 0, 0);
  }

  playRange(ayahs: readonly PlayableAyah[], start: number, end: number): void {
    this.ranges.push({
      start,
      end,
      urls: ayahs.slice(start, end + 1).map((ayah) => ayah.audioUrl),
    });
    this.ayahState.set(ayahs[start] ?? null);
    this.indexState.set(start);
    this.playingState.set(true);
  }

  pause(): void {
    this.playingState.set(false);
  }

  resume(): void {
    if (this.indexState() < 0) {
      return;
    }
    this.playingState.set(true);
  }

  setRepeat(repeat: AyahRepeat): void {
    this.repeatState.set(repeat);
  }

  stop(): void {
    this.stops += 1;
    this.playingState.set(false);
    this.ayahState.set(null);
    this.indexState.set(-1);
  }
}
