import { TestBed } from '@angular/core/testing';
import { AudioPlayerService, PlayableAyah } from './audio-player';

describe('AudioPlayerService', () => {
  let service: AudioPlayerService;
  let audio: FakeAudioElement;

  const ayahs: PlayableAyah[] = [
    { number: 1, audioUrl: 'https://cdn.example/1.mp3' },
    { number: 2, audioUrl: 'https://cdn.example/2.mp3' },
    { number: 3, audioUrl: 'https://cdn.example/3.mp3' },
  ];

  beforeEach(() => {
    audio = new FakeAudioElement();
    vi.stubGlobal(
      'Audio',
      class {
        constructor() {
          return audio;
        }
      },
    );
    TestBed.configureTestingModule({});
    service = TestBed.inject(AudioPlayerService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should_play_one_ayah_when_play_ayah_is_called', () => {
    service.playAyah(ayahs[0]!);

    expect(audio.src).toBe(ayahs[0]!.audioUrl);
    expect(audio.play).toHaveBeenCalledOnce();
    expect(service.isPlaying()).toBe(true);
    expect(service.currentAyah()).toEqual(ayahs[0]);
  });

  it('should_stop_after_one_play_when_repeat_is_1', () => {
    service.setRepeat(1);
    service.playAyah(ayahs[0]!);

    audio.dispatch('ended');

    expect(audio.play).toHaveBeenCalledOnce();
    expect(service.isPlaying()).toBe(false);
    expect(service.currentAyah()).toEqual(ayahs[0]);
  });

  it('should_replay_the_same_ayah_when_repeat_is_3', () => {
    service.setRepeat(3);
    service.playAyah(ayahs[1]!);

    audio.dispatch('ended');
    audio.dispatch('ended');

    expect(audio.play).toHaveBeenCalledTimes(3);
    expect(audio.src).toBe(ayahs[1]!.audioUrl);
    expect(service.completedRepeats()).toBe(2);

    audio.dispatch('ended');

    expect(audio.play).toHaveBeenCalledTimes(3);
    expect(service.isPlaying()).toBe(false);
    expect(service.completedRepeats()).toBe(0);
  });

  it('should_keep_replaying_the_ayah_when_repeat_is_infinite', () => {
    service.setRepeat('infinite');
    service.playAyah(ayahs[0]!);

    audio.dispatch('ended');
    audio.dispatch('ended');

    expect(audio.play).toHaveBeenCalledTimes(3);
    expect(audio.src).toBe(ayahs[0]!.audioUrl);
    expect(service.currentIndex()).toBe(0);
    expect(service.isPlaying()).toBe(true);
  });

  it('should_advance_through_the_selected_range_when_an_ayah_finishes', () => {
    service.setRepeat(1);
    service.playRange(ayahs, 1, 2);

    expect(service.currentAyah()?.number).toBe(2);

    audio.dispatch('ended');

    expect(service.currentAyah()?.number).toBe(3);
    expect(audio.src).toBe(ayahs[2]!.audioUrl);

    audio.dispatch('ended');

    expect(service.isPlaying()).toBe(false);
    expect(service.currentIndex()).toBe(2);
    expect(audio.play).toHaveBeenCalledTimes(2);
  });

  it('should_pause_and_resume_the_current_ayah', () => {
    service.playAyah(ayahs[0]!);

    service.pause();
    expect(service.isPlaying()).toBe(false);

    service.resume();
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(service.isPlaying()).toBe(true);
  });

  it('should_clear_playback_when_stopped', () => {
    service.playRange(ayahs, 0, 2);

    service.stop();

    expect(service.currentAyah()).toBeNull();
    expect(service.isPlaying()).toBe(false);
    expect(service.currentIndex()).toBe(-1);
    expect(audio.load).toHaveBeenCalledOnce();
  });

  it('should_reject_a_range_outside_the_ayah_list', () => {
    expect(() => service.playRange(ayahs, 2, 1)).toThrow(RangeError);
    expect(() => service.playRange([])).toThrow(RangeError);
    expect(() => service.setRepeat(2 as never)).toThrow(/Repeat must be 1, 3, 5, or infinite/);
  });
});

class FakeAudioElement {
  src = '';
  preload = '';
  readonly play = vi.fn(async () => {
    this.dispatch('play');
  });
  readonly pause = vi.fn(() => {
    this.dispatch('pause');
  });
  readonly load = vi.fn();
  private readonly listeners = new Map<string, Array<() => void>>();

  addEventListener(type: string, listener: () => void): void {
    const group = this.listeners.get(type) ?? [];
    group.push(listener);
    this.listeners.set(type, group);
  }

  removeAttribute(name: string): void {
    if (name === 'src') {
      this.src = '';
    }
  }

  dispatch(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }
}
