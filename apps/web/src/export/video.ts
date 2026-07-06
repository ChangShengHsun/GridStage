import { useEditor } from '../state/store';
import { formatEightCount, formatTimecode, posesAtTime, showEndMs } from '../state/interpolate';
import { getAudioBlob } from '../audio/audioPlayer';
import { safeFilename } from './filename';
import { messages } from '../i18n';

// 720p at 30fps — plenty for sharing a formation preview in a group chat.
const W = 1280;
const H = 720;
const FPS = 30;

const BG = '#191512';
const FLOOR = '#2e2a26';
const INK = '#ece5db';
const DIM = '#8a8074';
const EDGE = '#e8a84c';
const SANS = '"Instrument Sans", system-ui, sans-serif';
const MONO = '"IBM Plex Mono", monospace';

export interface VideoExportOptions {
  onProgress: (fraction: number) => void;
  signal?: AbortSignal;
}

/**
 * Records the playback animation to a movie file and triggers a download.
 * MP4 where the browser's MediaRecorder supports it, WebM otherwise; the
 * uploaded music is mixed into the file (silently — nothing plays aloud).
 *
 * The document is snapshotted once at the start, so edits made while the
 * export runs don't leak into the movie.
 *
 * ponytail: realtime capture — the export takes as long as the show and the
 * tab must stay visible (background tabs throttle requestAnimationFrame).
 * Upgrade path if that hurts: WebCodecs VideoEncoder + an mp4 muxer.
 */
export async function exportPerformanceVideo({
  onProgress,
  signal,
}: VideoExportOptions): Promise<void> {
  const s = useEditor.getState();
  const msg = messages();
  const durationMs = showEndMs(s.formations);
  if (durationMs <= 0) throw new Error(msg.videoExport.errNothingToExport);

  const mimeType = [
    'video/mp4;codecs=avc1.42E01F,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm',
  ].find((candidate) => MediaRecorder.isTypeSupported(candidate));
  if (mimeType === undefined) throw new Error(msg.videoExport.errUnsupported);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  // Chrome only delivers captureStream frames reliably for in-document canvases.
  canvas.style.cssText = 'position:fixed;left:-99999px;top:0';
  document.body.appendChild(canvas);

  let audioCtx: AudioContext | null = null;
  let audioSource: AudioBufferSourceNode | null = null;
  let audioStarted = false;
  let stream: MediaStream | null = null;

  try {
    const ctx = canvas.getContext('2d');
    if (ctx === null) throw new Error('Canvas 2D unavailable');

    stream = canvas.captureStream(FPS);

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

    // Stage box layout, meters -> pixels.
    const { stageWidth, stageHeight, title, bpm } = s.performance;
    const headerH = 72;
    const footerH = 56;
    const sideM = 72;
    const scale = Math.min((W - sideM * 2) / stageWidth, (H - headerH - footerH) / stageHeight);
    const stageW = stageWidth * scale;
    const stageH = stageHeight * scale;
    const originX = (W - stageW) / 2;
    const originY = headerH + (H - headerH - footerH - stageH) / 2;
    const markR = Math.max(0.3 * scale, 7);

    const draw = (tMs: number): void => {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);

      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = INK;
      ctx.font = `600 26px ${SANS}`;
      ctx.textAlign = 'left';
      ctx.fillText(title, sideM, 46);
      ctx.fillStyle = DIM;
      ctx.font = `16px ${MONO}`;
      ctx.textAlign = 'right';
      const counts = bpm !== null ? `  ${formatEightCount(tMs, bpm)}` : '';
      ctx.fillText(`${formatTimecode(tMs)}${counts}`, W - sideM, 46);

      ctx.fillStyle = FLOOR;
      ctx.fillRect(originX, originY, stageW, stageH);
      ctx.strokeStyle = DIM;
      ctx.lineWidth = 1;
      ctx.strokeRect(originX, originY, stageW, stageH);

      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(originX + stageW / 2, originY);
      ctx.lineTo(originX + stageW / 2, originY + stageH);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = EDGE;
      ctx.fillRect(originX, originY + stageH + 4, stageW, 3);
      ctx.fillStyle = DIM;
      ctx.font = `13px ${SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(msg.stage.audience, W / 2, originY + stageH + 28);

      const poses = posesAtTime(s.formations, s.positions, tMs);
      for (const performer of s.performers) {
        const pose = poses.get(performer.id);
        if (pose === undefined) continue;
        const x = originX + pose.x * scale;
        const y = originY + pose.y * scale;
        // rotation 0 = facing the audience (downstage, +y on the plan).
        const angleRad = ((pose.rotation + 90) * Math.PI) / 180;

        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angleRad) * markR * 1.7, y + Math.sin(angleRad) * markR * 1.7);
        ctx.stroke();

        ctx.fillStyle = performer.color;
        ctx.beginPath();
        ctx.arc(x, y, markR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = INK;
        ctx.font = `12px ${SANS}`;
        ctx.textAlign = 'center';
        ctx.fillText(performer.name, x, y + markR + 16);
      }
    };

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e): void => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    draw(0);
    recorder.start();
    audioSource?.start();
    audioStarted = true;
    const startedAt = Date.now();

    await new Promise<void>((resolve) => {
      const tick = (): void => {
        const t = Date.now() - startedAt;
        // 200ms tail so the final formation registers before the recorder stops.
        if (signal?.aborted === true || t >= durationMs + 200) {
          resolve();
          return;
        }
        draw(Math.min(t, durationMs));
        onProgress(Math.min(t / durationMs, 1));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    await new Promise<void>((resolve) => {
      recorder.onstop = (): void => resolve();
      recorder.stop();
    });

    if (signal?.aborted !== true) {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
      anchor.download = `${safeFilename(title)}-preview.${ext}`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
  } finally {
    if (audioStarted) audioSource?.stop();
    if (audioCtx !== null) void audioCtx.close();
    if (stream !== null) for (const track of stream.getTracks()) track.stop();
    canvas.remove();
  }
}
