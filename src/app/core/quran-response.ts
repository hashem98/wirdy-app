import {
  AUDIO_CDN_BASE_URL,
  AudioEdition,
  AyahTafseer,
  isFreeReciter,
  RevelationType,
  SURAH_COUNT,
  MushafPage,
  MushafWord,
  PageAyah,
  SurahSummary,
  SurahWithAudio,
  UTHMANI_EDITION,
} from './quran.model';

interface EditionPayload {
  identifier: string;
  summary: SurahSummary;
  ayahs: RawAyah[];
}

interface RawAyah {
  number: number;
  numberInSurah: number;
  text: string;
  audioUrl: string;
}

export function readSurahIndex(payload: unknown): SurahSummary[] {
  const data = readDataArray(payload);
  if (data.length !== SURAH_COUNT) {
    throw new Error('Surah index did not include 114 surahs');
  }
  return data.map(readSurahSummary);
}

export function readCachedSurahs(payload: unknown): SurahSummary[] {
  if (!Array.isArray(payload) || payload.length !== SURAH_COUNT) {
    throw new Error('Cached surah index did not include 114 surahs');
  }
  return payload.map(readSurahSummary);
}

export function readSurahWithAudio(payload: unknown, reciterEdition: string): SurahWithAudio {
  const editions = readDataArray(payload).map(readEditionPayload);
  const textEdition = editions.find((edition) => edition.identifier === UTHMANI_EDITION);
  const audioEdition = editions.find((edition) => edition.identifier === reciterEdition);
  if (!textEdition || !audioEdition) {
    throw new Error('Surah response did not include Uthmani text and reciter audio');
  }
  return mergeEditions(textEdition, audioEdition, reciterEdition);
}

export function readPageWithAudio(
  textPayload: unknown,
  audioPayload: unknown,
  layoutPayload: unknown,
  reciterEdition: string,
): MushafPage {
  const textPage = readPageEdition(textPayload, reciterEdition);
  const audioPage = readPageEdition(audioPayload, reciterEdition);
  if (textPage.number !== audioPage.number) {
    throw new Error('Page text and audio did not match');
  }
  const audioByNumber = new Map(audioPage.ayahs.map((ayah) => [ayah.number, ayah.audioUrl]));
  return {
    number: textPage.number,
    reciterEdition,
    ayahs: textPage.ayahs.map((ayah) => ({
      ...ayah,
      audioUrl: audioByNumber.get(ayah.number) ?? audioCdnUrl(reciterEdition, ayah.number),
    })),
    words: readMushafWords(layoutPayload),
  };
}

export function readMushafWords(payload: unknown): MushafWord[] {
  if (!isRecord(payload) || !Array.isArray(payload['verses'])) {
    throw new Error('Mushaf layout was incomplete');
  }
  if (isRecord(payload['pagination']) && payload['pagination']['next_page'] != null) {
    throw new Error('Mushaf layout was incomplete');
  }
  const words = payload['verses'].flatMap((verse) => readVerseWords(verse));
  if (words.length === 0) {
    throw new Error('Mushaf layout was incomplete');
  }
  return words;
}

export function readAudioEditions(payload: unknown): AudioEdition[] {
  const editions = readDataArray(payload)
    .map(readAudioEdition)
    .filter((edition) => isFreeReciter(edition.identifier));
  if (editions.length === 0) {
    throw new Error('Audio edition list was empty');
  }
  return editions;
}

export function audioCdnUrl(reciterEdition: string, ayahNumber: number): string {
  return `${AUDIO_CDN_BASE_URL}/${reciterEdition}/${ayahNumber}.mp3`;
}

function readDataArray(payload: unknown): unknown[] {
  if (!isRecord(payload) || payload['code'] !== 200 || !Array.isArray(payload['data'])) {
    throw new Error('Quran API response was not successful');
  }
  return payload['data'];
}

function readEditionPayload(value: unknown): EditionPayload {
  if (!isRecord(value) || !isRecord(value['edition']) || !Array.isArray(value['ayahs'])) {
    throw new Error('Surah edition payload was incomplete');
  }
  const identifier = readText(value['edition']['identifier']);
  const summary = readSurahSummary(value);
  const ayahs = value['ayahs'].map((ayah) => readRawAyah(ayah, identifier));
  if (ayahs.length !== summary.numberOfAyahs) {
    throw new Error('Surah ayah count did not match the edition payload');
  }
  return { identifier, summary, ayahs };
}

function mergeEditions(
  textEdition: EditionPayload,
  audioEdition: EditionPayload,
  reciterEdition: string,
): SurahWithAudio {
  const audioByNumber = new Map(audioEdition.ayahs.map((ayah) => [ayah.number, ayah.audioUrl]));
  const ayahs = textEdition.ayahs.map((ayah) => ({
    number: ayah.number,
    numberInSurah: ayah.numberInSurah,
    text: ayah.text,
    audioUrl: audioByNumber.get(ayah.number) ?? audioCdnUrl(reciterEdition, ayah.number),
  }));
  return { ...textEdition.summary, reciterEdition, ayahs };
}

function readPageEdition(payload: unknown, edition: string): { number: number; ayahs: PageAyah[] } {
  if (!isRecord(payload) || payload['code'] !== 200 || !isRecord(payload['data'])) {
    throw new Error('Quran API response was not successful');
  }
  const data = payload['data'];
  if (!Array.isArray(data['ayahs']) || data['ayahs'].length === 0) {
    throw new Error('Page payload was incomplete');
  }
  return {
    number: readInteger(data['number']),
    ayahs: data['ayahs'].map((ayah) => readPageAyah(ayah, edition)),
  };
}

function readPageAyah(value: unknown, edition: string): PageAyah {
  if (!isRecord(value) || !isRecord(value['surah'])) {
    throw new Error('Page ayah payload was incomplete');
  }
  const number = readInteger(value['number']);
  const audioValue = value['audio'];
  return {
    number,
    numberInSurah: readInteger(value['numberInSurah']),
    surahNumber: readInteger(value['surah']['number']),
    surahName: readText(value['surah']['name']),
    text: readText(value['text']),
    audioUrl:
      typeof audioValue === 'string' && audioValue.trim() !== ''
        ? audioValue.trim()
        : audioCdnUrl(edition, number),
  };
}

function readSurahSummary(value: unknown): SurahSummary {
  if (!isRecord(value)) {
    throw new Error('Surah metadata was incomplete');
  }
  const number = readInteger(value['number']);
  const numberOfAyahs = readInteger(value['numberOfAyahs']);
  if (number < 1 || numberOfAyahs < 1) {
    throw new Error('Surah metadata was incomplete');
  }
  return {
    number,
    name: readText(value['name']),
    englishName: readText(value['englishName']),
    englishNameTranslation: readText(value['englishNameTranslation']),
    numberOfAyahs,
    revelationType: readRevelationType(value['revelationType']),
  };
}

function readRawAyah(value: unknown, edition: string): RawAyah {
  if (!isRecord(value)) {
    throw new Error('Ayah payload was incomplete');
  }
  const number = readInteger(value['number']);
  const numberInSurah = readInteger(value['numberInSurah']);
  const audioValue = value['audio'];
  const audioUrl =
    typeof audioValue === 'string' && audioValue.trim() !== ''
      ? audioValue.trim()
      : audioCdnUrl(edition, number);
  return {
    number,
    numberInSurah,
    text: readText(value['text']),
    audioUrl,
  };
}

function readAudioEdition(value: unknown): AudioEdition {
  if (!isRecord(value) || value['format'] !== 'audio' || value['language'] !== 'ar') {
    throw new Error('Audio edition payload was incomplete');
  }
  return {
    identifier: readText(value['identifier']),
    language: 'ar',
    name: readText(value['name']),
    englishName: readText(value['englishName']),
    format: 'audio',
  };
}

function readVerseWords(value: unknown): MushafWord[] {
  if (!isRecord(value) || !Array.isArray(value['words'])) {
    throw new Error('Mushaf layout was incomplete');
  }
  const key = readVerseKey(value['verse_key']);
  return value['words'].map((word) => readMushafWord(word, key));
}

function readMushafWord(
  value: unknown,
  key: { surahNumber: number; numberInSurah: number },
): MushafWord {
  if (!isRecord(value)) {
    throw new Error('Mushaf layout was incomplete');
  }
  const lineNumber = readInteger(value['line_number']);
  if (lineNumber < 1) {
    throw new Error('Mushaf layout was incomplete');
  }
  const marker = value['char_type_name'] === 'end';
  if (!marker && value['char_type_name'] !== 'word') {
    throw new Error('Mushaf layout was incomplete');
  }
  return {
    surahNumber: key.surahNumber,
    numberInSurah: key.numberInSurah,
    lineNumber,
    text: readText(value['text_uthmani']),
    isMarker: marker,
  };
}

function readVerseKey(value: unknown): { surahNumber: number; numberInSurah: number } {
  if (typeof value !== 'string') {
    throw new Error('Mushaf layout was incomplete');
  }
  const match = /^([1-9]\d*):([1-9]\d*)$/.exec(value);
  if (!match) {
    throw new Error('Mushaf layout was incomplete');
  }
  return { surahNumber: Number(match[1]), numberInSurah: Number(match[2]) };
}

export function readAyahTafseer(payload: unknown, ayahNumber: number): AyahTafseer {
  if (!isRecord(payload) || payload['code'] !== 200 || !isRecord(payload['data'])) {
    throw new Error('Tafseer API response was not successful');
  }
  const data = payload['data'];
  const text = readText(data['text']);
  const editionName = isRecord(data['edition']) ? readText(data['edition']['name']) : '';
  return {
    ayahNumber,
    text,
    editionName,
  };
}

function readRevelationType(value: unknown): RevelationType {
  if (value === 'Meccan' || value === 'Medinan') {
    return value;
  }
  throw new Error('Surah revelation type was invalid');
}

function readText(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Quran API text field was empty');
  }
  const text = value.replace(/^\uFEFF/, '').trim();
  if (text === '') {
    throw new Error('Quran API text field was empty');
  }
  return text;
}

function readInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error('Quran API numeric field was invalid');
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
