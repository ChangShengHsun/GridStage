import { getAudioBlob } from '../audio/audioPlayer';
import { messages } from '../i18n';

const FPS = 30;

export interface RecordResult {
  blob: Blob;
  /** File extension matching the negotiated container ('mp4' | 'webm'). */
  ext: string;
}

export interface RecordOptions {
  /** The canvas being drawn into; must already be in the document. */
  canvas: HTMLCanvasElement;
  durationMs: number;
  /** Paint one frame at show-time tMs. Called ~30fps in real time. */
  renderFrame: (tMs: number) => void;
  onProgress: (fraction: number) => void;
  signal?: AbortSignal;
  /**
   * Sound source override: this element's audio is routed into the file
   * (silently for the user) INSTEAD of the uploaded music — the reference
   * video's sound when one is loaded. The caller seeks it; it starts
   * playing via onRecordStart.
   */
  audioElement?: HTMLMediaElement;
  /** Fires right after the recorder starts — sync external media here. */
  onRecordStart?: () => void;
}

/**
 * Shared realtime capture harness for both the 2D and 3D exporters: mixes the
 * uploaded music in (silently), records the canvas via MediaRecorder while
 * pumping renderFrame on each animation frame, and resolves with the movie
 * blob (or null if aborted). The caller owns the canvas and the download.
 *
 * ponytail: realtime — capture takes as long as the show and the tab must
 * stay visible. Upgrade path is WebCodecs, same as noted in video.ts.
 */
export async function recordCanvas(opts: RecordOptions): Promise<RecordResult | null> {
  const { canvas, durationMs, renderFrame, onProgress, signal } = opts;

  const mimeType = [
    'video/mp4;codecs=avc1.42E01F,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm',
  ].find((candidate) => MediaRecorder.isTypeSupported(candidate));
  if (mimeType === undefined) throw new Error(messages().videoExport.errUnsupported);

  const stream = canvas.captureStream(FPS);
  let audioCtx: AudioContext | null = null;
  let audioSource: AudioBufferSourceNode | null = null;
  let audioStarted = false;

  try {
    if (opts.audioElement !== undefined) {
      // Element audio (the reference video): reroute it into the recording —
      // MediaElementSource detaches the element from the speakers, so the
      // export stays silent for the user just like the buffer path.
      audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(opts.audioElement);
      const destination = audioCtx.createMediaStreamDestination();
      source.connect(destination);
      const track = destination.stream.getAudioTracks()[0];
      if (track !== undefined) stream.addTrack(track);
    } else {
      const audioBlob = getAudioBlob();
      if (audioBlob !== null) {
        audioCtx = new AudioContext();
        const decoded = await audioCtx.decodeAudioData(await audioBlob.arrayBuffer());
        const destination = audioCtx.createMediaStreamDestination();
        audioSource = audioCtx.createBufferSource();
        audioSource.buffer = decoded;
        audioSource.connect(destination); // destination only, so the export is silent
        const track = destination.stream.getAudioTracks()[0];
        if (track !== undefined) stream.addTrack(track);
      }
    }

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e): void => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    renderFrame(0);
    recorder.start();
    audioSource?.start();
    audioStarted = true;
    opts.onRecordStart?.();
    const startedAt = Date.now();

    await new Promise<void>((resolve) => {
      const tick = (): void => {
        const t = Date.now() - startedAt;
        // 200ms tail so the final formation registers before the recorder stops.
        if (signal?.aborted === true || t >= durationMs + 200) {
          resolve();
          return;
        }
        renderFrame(Math.min(t, durationMs));
        onProgress(Math.min(t / durationMs, 1));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    await new Promise<void>((resolve) => {
      recorder.onstop = (): void => resolve();
      recorder.stop();
    });

    if (signal?.aborted === true) return null;
    return {
      blob: new Blob(chunks, { type: mimeType }),
      ext: mimeType.startsWith('video/mp4') ? 'mp4' : 'webm',
    };
  } finally {
    if (audioStarted) audioSource?.stop();
    opts.audioElement?.pause();
    if (audioCtx !== null) void audioCtx.close();
    for (const track of stream.getTracks()) track.stop();
  }
}
