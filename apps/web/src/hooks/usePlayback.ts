import { useCallback, useEffect, useRef } from 'react';
import { useEditor } from '../state/store';
import { showEndMs } from '../state/interpolate';
import { audioDurationMs, getAudioElement } from '../audio/audioPlayer';
import {
  getVideoElement,
  timelineMsToVideoSeconds,
  useRefVideo,
  videoTimeToTimelineMs,
} from '../state/refVideo';
import { tickMetronome } from '../audio/metronome';

function playbackEndMs(): number {
  return Math.max(showEndMs(useEditor.getState().formations), audioDurationMs());
}

/**
 * Drives the playhead. Clock ladder (docs/ref-video-sync-design.md):
 * a loaded reference video is the clock (its sound is the master — project
 * audio stays silent); else audio; else a requestAnimationFrame timer.
 */
export function usePlayback(): { togglePlay: () => void } {
  const isPlaying = useEditor((s) => s.isPlaying);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) return;

    const video = getVideoElement();
    const audio = video === null ? getAudioElement() : null;
    const endMs = playbackEndMs();
    const startState = useEditor.getState();
    if (video !== null) {
      video.currentTime = timelineMsToVideoSeconds(
        startState.playheadMs,
        useRefVideo.getState().offsetMs,
      );
      video.playbackRate = startState.playbackRate;
      void video.play();
    } else if (audio !== null) {
      audio.currentTime = startState.playheadMs / 1000;
      audio.playbackRate = startState.playbackRate;
      void audio.play();
    }
    let lastTick = window.performance.now();

    const tick = (now: number): void => {
      const s = useEditor.getState();
      // The media element is the clock and carries the rate (kept in sync
      // here so mid-playback speed changes take effect).
      const media = video ?? audio;
      if (media !== null && media.playbackRate !== s.playbackRate) {
        media.playbackRate = s.playbackRate;
      }
      const t =
        video !== null
          ? videoTimeToTimelineMs(video.currentTime, useRefVideo.getState().offsetMs)
          : audio !== null
            ? audio.currentTime * 1000
            : s.playheadMs + (now - lastTick) * s.playbackRate;
      lastTick = now;
      if (t >= endMs || (media !== null && media.ended)) {
        s.setPlayhead(endMs);
        s.setIsPlaying(false);
        return;
      }
      if (s.metronomeOn && s.performance.bpm !== null) {
        tickMetronome(s.playheadMs, t, s.performance.bpm, s.performance.countSegments);
      }
      // Before the video reaches timeline 0 (inside its offset lead-in) the
      // clock is negative — hold the playhead at 0 until the show starts.
      s.setPlayhead(Math.max(0, t));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (video !== null) video.pause();
      if (audio !== null) audio.pause();
    };
  }, [isPlaying]);

  // While paused, scrubbing the timeline (or adjusting the offset) seeks the
  // video so the frame always matches the charts. Throttled: seeking on every
  // pixel of a drag is choppy.
  useEffect(() => {
    let lastSeek = 0;
    const seek = (): void => {
      const s = useEditor.getState();
      if (s.isPlaying) return;
      const video = getVideoElement();
      if (video === null) return;
      const now = Date.now();
      if (now - lastSeek < 100) return;
      lastSeek = now;
      const target = timelineMsToVideoSeconds(s.playheadMs, useRefVideo.getState().offsetMs);
      if (Math.abs(video.currentTime - target) > 0.05) video.currentTime = target;
    };
    const unsubEditor = useEditor.subscribe(seek);
    const unsubVideo = useRefVideo.subscribe(seek);
    return () => {
      unsubEditor();
      unsubVideo();
    };
  }, []);

  const togglePlay = useCallback(() => {
    const s = useEditor.getState();
    if (s.isPlaying) {
      s.setIsPlaying(false);
      return;
    }
    const endMs = playbackEndMs();
    if (endMs <= 0) return;
    if (s.playheadMs >= endMs - 10) s.setPlayhead(0);
    s.setIsPlaying(true);
  }, []);

  return { togglePlay };
}
