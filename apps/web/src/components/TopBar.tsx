import type { ReactElement } from 'react';
import { useEditor } from '../state/store';
import { formatEightCount, formatTimecode } from '../state/interpolate';

interface TopBarProps {
  onTogglePlay: () => void;
  onExportPdf: () => void;
}

export function TopBar({ onTogglePlay, onExportPdf }: TopBarProps): ReactElement {
  const title = useEditor((s) => s.performance.title);
  const bpm = useEditor((s) => s.performance.bpm);
  const setTitle = useEditor((s) => s.setTitle);
  const isPlaying = useEditor((s) => s.isPlaying);
  const playheadMs = useEditor((s) => s.playheadMs);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);

  return (
    <header className="topbar">
      <span className="wordmark">
        Open<em>Stage</em>
      </span>
      <input
        type="text"
        aria-label="Performance title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ width: 240 }}
      />
      <button type="button" className="btn" onClick={undo} title="Undo (Ctrl+Z)">
        Undo
      </button>
      <button type="button" className="btn" onClick={redo} title="Redo (Ctrl+Shift+Z)">
        Redo
      </button>
      <span className="topbar-spacer" />
      <span className="timecode" aria-label="Playhead time">
        {formatTimecode(playheadMs)}
        {bpm !== null ? `  ${formatEightCount(playheadMs, bpm)}` : ''}
      </span>
      <button type="button" className="btn btn-primary" onClick={onTogglePlay}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <button type="button" className="btn" onClick={onExportPdf}>
        Export PDF
      </button>
    </header>
  );
}
