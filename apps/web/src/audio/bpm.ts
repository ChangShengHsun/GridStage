/**
 * Automatic BPM detection — pure signal processing, no browser APIs, so the
 * whole thing is unit-testable with synthesized sample buffers.
 *
 * Pipeline:
 *   1. Onset envelope: frame the signal at ~100 frames/sec, take each
 *      frame's energy, keep only energy INCREASES (positive flux). Beats in
 *      dance music are energy bursts, so the envelope spikes on each beat.
 *   2. Autocorrelation: slide the envelope against itself; at a lag equal to
 *      the beat period the spikes line up and the correlation peaks.
 *   3. Pick the best lag in the 60–180 BPM window, using a mild prior toward
 *      ~120 BPM to resolve octave ambiguity (a 120 BPM track also correlates
 *      at 60 BPM — every OTHER beat lines up too), then refine the integer
 *      lag with parabolic interpolation for sub-frame precision.
 *
 * ponytail: time-domain energy flux, not spectral flux — no FFT needed and
 * it is reliable for percussive/danceable material. If melodic material with
 * soft onsets misdetects, the upgrade path is per-band flux via an FFT.
 */

export interface BpmEstimate {
  bpm: number;
  /** Normalized autocorrelation at the chosen lag, 0..1-ish. */
  confidence: number;
}

const MIN_BPM = 60;
const MAX_BPM = 180;
/** Onset envelope rate. 100 Hz keeps lag quantization error well under ±2 BPM. */
const ENVELOPE_HZ = 100;
/** Below this correlation the signal has no steady beat (noise, speech, tone). */
const MIN_CONFIDENCE = 0.15;
/** A slower candidate must beat the current one by this factor (ties go to the faster tempo). */
const SLOWER_CANDIDATE_MARGIN = 1.03;
/** Log-2 width of the tempo prior around 120 BPM (≈ one octave standard deviation ~0.9). */
const PRIOR_LOG2_WIDTH = 0.9;

export function detectBpm(samples: Float32Array, sampleRate: number): BpmEstimate | null {
  // Need at least ~4 seconds to see enough beat periods at 60 BPM.
  if (sampleRate <= 0 || samples.length < sampleRate * 4) return null;

  const hop = Math.max(1, Math.round(sampleRate / ENVELOPE_HZ));
  const framesPerSec = sampleRate / hop;
  const frameCount = Math.floor(samples.length / hop);

  // 1. Energy per frame, then positive flux (energy increases only).
  const energy = new Float64Array(frameCount);
  for (let frame = 0; frame < frameCount; frame++) {
    let sum = 0;
    const start = frame * hop;
    for (let i = start; i < start + hop; i++) {
      const v = samples[i] ?? 0;
      sum += v * v;
    }
    energy[frame] = sum;
  }
  let flux = new Float64Array(frameCount);
  let maxFlux = 0;
  let fluxSum = 0;
  for (let frame = 1; frame < frameCount; frame++) {
    const rise = Math.max(0, (energy[frame] ?? 0) - (energy[frame - 1] ?? 0));
    flux[frame] = rise;
    fluxSum += rise;
    if (rise > maxFlux) maxFlux = rise;
  }
  if (maxFlux <= 1e-12) return null; // silence or perfectly steady signal

  // Beats are SPARSE energy rises (most frames have ~zero flux). A dense
  // flux — every frame rising a little — is amplitude ripple from a tone or
  // noise, not rhythm; without this check the max-normalization below would
  // blow that ripple up into a confident false tempo.
  // ponytail: 0.25 is the knob to loosen if real songs report "no beat".
  if (fluxSum / (frameCount * maxFlux) > 0.25) return null;

  // Normalize so the numbers below are scale-free.
  for (let frame = 0; frame < frameCount; frame++) {
    flux[frame] = (flux[frame] ?? 0) / maxFlux;
  }

  // Widen each spike (5-point smoothing = [1,2,1]/4 twice) so a beat period
  // that falls BETWEEN integer lags still correlates; otherwise a fractional
  // true lag can score below its exactly-integer half-tempo subharmonic.
  for (let pass = 0; pass < 2; pass++) {
    const smoothed = new Float64Array(frameCount);
    for (let frame = 0; frame < frameCount; frame++) {
      smoothed[frame] =
        (flux[frame - 1] ?? 0) * 0.25 + (flux[frame] ?? 0) * 0.5 + (flux[frame + 1] ?? 0) * 0.25;
    }
    flux = smoothed;
  }

  // Remove the mean so the autocorrelation measures rhythm, not loudness.
  let mean = 0;
  for (let frame = 0; frame < frameCount; frame++) mean += flux[frame] ?? 0;
  mean /= frameCount;
  let zeroLagPower = 0;
  for (let frame = 0; frame < frameCount; frame++) {
    const centered = (flux[frame] ?? 0) - mean;
    flux[frame] = centered;
    zeroLagPower += centered * centered;
  }
  if (zeroLagPower <= 1e-12) return null;

  // 2 + 3. Normalized autocorrelation over the lag window for 60–180 BPM.
  const minLag = Math.max(1, Math.floor((framesPerSec * 60) / MAX_BPM));
  const maxLag = Math.ceil((framesPerSec * 60) / MIN_BPM);
  if (maxLag >= frameCount) return null;

  // Compute one lag beyond each end so the peak's neighbors exist for the
  // parabolic refinement below.
  const corrByLag = new Float64Array(maxLag + 2);
  for (let lag = Math.max(1, minLag - 1); lag <= maxLag + 1; lag++) {
    let acc = 0;
    for (let frame = lag; frame < frameCount; frame++) {
      acc += (flux[frame] ?? 0) * (flux[frame - lag] ?? 0);
    }
    corrByLag[lag] = acc / zeroLagPower;
  }

  let bestLag = 0;
  let bestScore = 0;
  let bestCorr = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const corr = corrByLag[lag] ?? 0;
    if (corr <= 0) continue;
    const bpm = (60 * framesPerSec) / lag;
    const prior = Math.exp(-0.5 * (Math.log2(bpm / 120) / PRIOR_LOG2_WIDTH) ** 2);
    const score = corr * prior;
    // Ascending lag order = descending BPM, so requiring a margin means a
    // subharmonic (half-tempo) needs a clearly better score to displace the
    // true (faster) tempo it duplicates.
    if (score > bestScore * SLOWER_CANDIDATE_MARGIN) {
      bestScore = score;
      bestLag = lag;
      bestCorr = corr;
    }
  }
  if (bestLag === 0 || bestCorr < MIN_CONFIDENCE) return null;

  // Parabolic interpolation through the peak and its neighbors gives the
  // sub-frame lag; without it the integer lag alone can be off by >2 BPM.
  const before = corrByLag[bestLag - 1] ?? 0;
  const after = corrByLag[bestLag + 1] ?? 0;
  const denom = before - 2 * bestCorr + after;
  const offset = denom === 0 ? 0 : Math.max(-0.5, Math.min(0.5, (0.5 * (before - after)) / denom));
  const refinedLag = bestLag + offset;

  const bpm = (60 * framesPerSec) / refinedLag;
  if (bpm < MIN_BPM - 1 || bpm > MAX_BPM + 1) return null;
  return { bpm, confidence: bestCorr };
}
