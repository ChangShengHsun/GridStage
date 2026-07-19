import { create } from 'zustand';
import type { Point2 } from '../vision/homography';

/**
 * Reference video — play an imported video against the charts on ONE shared
 * timeline (design: docs/ref-video-sync-design.md). Session-only by choice:
 * the file is a blob URL, gone on refresh, so no storage quota to manage.
 *
 * Sync model: timelineMs = videoCurrentTime * 1000 − offsetMs, where
 * offsetMs is where timeline 0 sits inside the video (countdowns, applause).
 */

export type RefVideoLayout = 'pip' | 'split';

interface RefVideoState {
  objectUrl: string | null;
  fileName: string;
  offsetMs: number;
  layout: RefVideoLayout;
  /** Split mode: fraction of the stage area the video pane takes (0.2–0.8). */
  splitRatio: number;
  /**
   * Stage-corner calibration for video→formation capture: the four stage
   * corners as VIDEO-INTRINSIC pixels (videoWidth×videoHeight space), in
   * stage order upstage-left, upstage-right, downstage-right,
   * downstage-left. Null until the user calibrates.
   */
  corners: Point2[] | null;
  /** Calibration overlay visible (pins + reprojected meter grid). */
  calibrating: boolean;
  load: (file: File) => void;
  clear: () => void;
  setOffsetMs: (ms: number) => void;
  setLayout: (layout: RefVideoLayout) => void;
  setSplitRatio: (ratio: number) => void;
  setCorners: (corners: Point2[] | null) => void;
  setCalibrating: (on: boolean) => void;
}

export const useRefVideo = create<RefVideoState>((set, get) => ({
  objectUrl: null,
  fileName: '',
  offsetMs: 0,
  layout: 'pip',
  splitRatio: 0.5,
  corners: null,
  calibrating: false,
  load: (file) => {
    const old = get().objectUrl;
    if (old !== null) URL.revokeObjectURL(old);
    set({
      objectUrl: URL.createObjectURL(file),
      fileName: file.name,
      offsetMs: 0,
      corners: null,
      calibrating: false,
    });
  },
  clear: () => {
    const old = get().objectUrl;
    if (old !== null) URL.revokeObjectURL(old);
    set({ objectUrl: null, fileName: '', corners: null, calibrating: false });
  },
  setOffsetMs: (ms) => set({ offsetMs: ms }),
  setLayout: (layout) => set({ layout }),
  setSplitRatio: (ratio) => set({ splitRatio: Math.min(0.8, Math.max(0.2, ratio)) }),
  setCorners: (corners) => set({ corners }),
  setCalibrating: (on) => set({ calibrating: on }),
}));

// The single <video> element, registered by RefVideo.tsx — the playback
// hook reaches it here, same idiom as audioPlayer's getAudioElement().
let videoEl: HTMLVideoElement | null = null;

export function registerVideoElement(el: HTMLVideoElement | null): void {
  videoEl = el;
}

/** The reference <video> when one is loaded and mounted, else null. */
export function getVideoElement(): HTMLVideoElement | null {
  return useRefVideo.getState().objectUrl !== null ? videoEl : null;
}

/** Pure: video position (s) -> shared timeline position (ms). */
export function videoTimeToTimelineMs(videoSeconds: number, offsetMs: number): number {
  return videoSeconds * 1000 - offsetMs;
}

/** Pure: shared timeline position (ms) -> video position (s), floored at 0. */
export function timelineMsToVideoSeconds(timelineMs: number, offsetMs: number): number {
  return Math.max(0, (timelineMs + offsetMs) / 1000);
}
