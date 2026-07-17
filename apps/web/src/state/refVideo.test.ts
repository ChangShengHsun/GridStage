import { describe, expect, it } from 'vitest';
import { timelineMsToVideoSeconds, videoTimeToTimelineMs } from './refVideo';

describe('reference-video time mapping', () => {
  it('maps video time to timeline time through the offset', () => {
    // 3.5s of countdown before the piece: video 3.5s = timeline 0.
    expect(videoTimeToTimelineMs(3.5, 3500)).toBe(0);
    expect(videoTimeToTimelineMs(5.0, 3500)).toBe(1500);
  });

  it('is negative inside the lead-in (before timeline 0)', () => {
    expect(videoTimeToTimelineMs(2.0, 3500)).toBe(-1500);
  });

  it('maps timeline time back to video seconds', () => {
    expect(timelineMsToVideoSeconds(0, 3500)).toBe(3.5);
    expect(timelineMsToVideoSeconds(1500, 3500)).toBe(5);
  });

  it('round-trips', () => {
    const offset = 1234;
    for (const ms of [0, 100, 5000, 61_234]) {
      expect(videoTimeToTimelineMs(timelineMsToVideoSeconds(ms, offset), offset)).toBeCloseTo(ms);
    }
  });

  it('floors video seeks at 0 for a negative offset target', () => {
    // Negative offset = the show starts BEFORE the video does; early
    // timeline positions have no video frame, so the seek clamps to 0.
    expect(timelineMsToVideoSeconds(500, -2000)).toBe(0);
  });
});
