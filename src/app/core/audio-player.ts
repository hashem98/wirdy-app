import { Service, computed, signal } from '@angular/core';

export type AyahRepeat = 1 | 3 | 5 | 'infinite';

export interface PlayableAyah {
  number: number;
  audioUrl: string;
}

const AYAH_REPEATS: readonly AyahRepeat[] = [1, 3, 5, 'infinite'];

@Service()
export class AudioPlayerService {
  private readonly playlistState = signal<readonly PlayableAyah[]>([]);
  private readonly indexState = signal(-1);
  private readonly rangeEndState = signal(-1);
  private readonly repeatState = signal<AyahRepeat>(1);
  private readonly completedRepeatsState = signal(0);
  private readonly playingState = signal(false);
  private readonly audio = this.bindAudio(new Audio());

  readonly currentIndex = this.indexState.asReadonly();
  readonly repeat = this.repeatState.asReadonly();
  readonly completedRepeats = this.completedRepeatsState.asReadonly();
  readonly isPlaying = this.playingState.asReadonly();
  readonly currentAyah = computed(() => this.ayahAt(this.indexState()));

  playAyah(ayah: PlayableAyah): void {
    this.playRange([ayah], 0, 0);
  }

  playRange(ayahs: readonly PlayableAyah[], startIndex = 0, endIndex = ayahs.length - 1): void {
    this.assertRange(ayahs, startIndex, endIndex);
    this.playlistState.set(ayahs.slice());
    this.rangeEndState.set(endIndex);
    this.completedRepeatsState.set(0);
    this.startAyah(startIndex);
  }

  setRepeat(repeat: AyahRepeat): void {
    if (!AYAH_REPEATS.includes(repeat)) {
      throw new Error('Repeat must be 1, 3, 5, or infinite');
    }
    this.repeatState.set(repeat);
    this.completedRepeatsState.set(0);
  }

  pause(): void {
    this.audio.pause();
  }

  resume(): void {
    if (this.indexState() < 0) {
      return;
    }
    void this.audio.play().catch(() => this.playingState.set(false));
  }

  stop(): void {
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.playlistState.set([]);
    this.indexState.set(-1);
    this.rangeEndState.set(-1);
    this.completedRepeatsState.set(0);
    this.playingState.set(false);
  }

  private advanceAfterAyah(): void {
    const repeat = this.repeatState();
    if (repeat === 'infinite') {
      this.completedRepeatsState.update((count) => count + 1);
      this.startAyah(this.indexState());
      return;
    }
    const completed = this.completedRepeatsState() + 1;
    if (completed < repeat) {
      this.completedRepeatsState.set(completed);
      this.startAyah(this.indexState());
      return;
    }
    const nextIndex = this.indexState() + 1;
    this.completedRepeatsState.set(0);
    if (nextIndex <= this.rangeEndState()) {
      this.startAyah(nextIndex);
      return;
    }
    this.playingState.set(false);
  }

  private startAyah(index: number): void {
    const ayah = this.ayahAt(index);
    if (!ayah) {
      return;
    }
    this.indexState.set(index);
    this.audio.src = ayah.audioUrl;
    void this.audio.play().catch(() => this.playingState.set(false));
  }

  private ayahAt(index: number): PlayableAyah | null {
    const playlist = this.playlistState();
    if (index < 0 || index >= playlist.length) {
      return null;
    }
    return playlist[index] ?? null;
  }

  private assertRange(ayahs: readonly PlayableAyah[], startIndex: number, endIndex: number): void {
    if (
      ayahs.length === 0 ||
      !Number.isInteger(startIndex) ||
      !Number.isInteger(endIndex) ||
      startIndex < 0 ||
      endIndex >= ayahs.length ||
      startIndex > endIndex
    ) {
      throw new RangeError('Playback range must reference at least one ayah');
    }
    if (ayahs.some((ayah) => ayah.audioUrl.trim() === '')) {
      throw new Error('Every ayah in the range needs an audio URL');
    }
  }

  private bindAudio(audio: HTMLAudioElement): HTMLAudioElement {
    audio.preload = 'none';
    audio.addEventListener('ended', () => this.advanceAfterAyah());
    audio.addEventListener('play', () => this.playingState.set(true));
    audio.addEventListener('pause', () => this.playingState.set(false));
    return audio;
  }
}
