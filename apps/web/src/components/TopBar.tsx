import { useState } from 'react';
import type { ReactElement } from 'react';
import { useEditor } from '../state/store';
import { formatEightCount, formatTimecode } from '../state/interpolate';
import { getLocalUser, setLocalUserName } from '../state/user';
import { collabRoom, isCollabActive, setAwarenessUser } from '../collab/collab';
import { usePeers } from '../hooks/usePeers';
import { isViewMode } from '../state/viewMode';

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

  const peers = usePeers();
  const [userName, setUserName] = useState(() => getLocalUser().name);
  const [shareNote, setShareNote] = useState('');

  const onShare = (): void => {
    if (!isCollabActive()) {
      const roomId = crypto.randomUUID().slice(0, 8);
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomId);
      window.location.href = url.toString(); // reload into the session
      return;
    }
    void navigator.clipboard.writeText(window.location.href).then(
      () => setShareNote('Link copied'),
      () => setShareNote(window.location.href),
    );
    window.setTimeout(() => setShareNote(''), 2500);
  };

  return (
    <header className="topbar">
      <span className="wordmark">
        Open<em>Stage</em>
      </span>
      <input
        type="text"
        aria-label="Performance title"
        value={title}
        readOnly={isViewMode}
        onChange={(e) => setTitle(e.target.value)}
        style={{ width: 200 }}
      />
      <button type="button" className="btn edit-only" onClick={undo} title="Undo (Ctrl+Z)">
        Undo
      </button>
      <button type="button" className="btn edit-only" onClick={redo} title="Redo (Ctrl+Shift+Z)">
        Redo
      </button>
      <span className="topbar-spacer" />
      {isCollabActive() && (
        <span className="presence" aria-label={`${peers.length + 1} people in session`}>
          <span
            className="presence-dot"
            style={{ background: getLocalUser().color }}
            title={`${getLocalUser().name} (you)`}
          />
          {peers.map((p) => (
            <span
              key={p.clientId}
              className="presence-dot"
              style={{ background: p.color }}
              title={p.name}
            />
          ))}
        </span>
      )}
      <input
        type="text"
        aria-label="Your display name"
        title="Your name on comments and live sessions"
        value={userName}
        style={{ width: 110 }}
        onChange={(e) => setUserName(e.target.value)}
        onBlur={() => {
          const user = setLocalUserName(userName);
          setUserName(user.name);
          setAwarenessUser(user.name, user.color);
        }}
      />
      <button type="button" className="btn edit-only" onClick={onShare}>
        {isCollabActive() ? `Copy link · ${collabRoom() ?? ''}` : 'Share live'}
      </button>
      {isCollabActive() && !isViewMode && (
        <button
          type="button"
          className="btn"
          title="Copy a view-only link (hides editing UI — not access control)"
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.set('mode', 'view');
            void navigator.clipboard.writeText(url.toString()).then(
              () => setShareNote('View link copied'),
              () => setShareNote(url.toString()),
            );
            window.setTimeout(() => setShareNote(''), 2500);
          }}
        >
          View link
        </button>
      )}
      {shareNote !== '' && (
        <span className="mono" role="status">
          {shareNote}
        </span>
      )}
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
