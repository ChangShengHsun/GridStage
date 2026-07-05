import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { TopBar } from './components/TopBar';
import { CastPanel } from './components/CastPanel';
import { StageCanvas } from './components/StageCanvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Timeline } from './components/Timeline';
import { useAppHotkeys } from './hooks/useAppHotkeys';
import { usePlayback } from './hooks/usePlayback';
import { clearAudio, loadPersistedAudio, setAudioBlob } from './audio/audioPlayer';

export function App(): ReactElement {
  const { togglePlay } = usePlayback();
  useAppHotkeys(togglePlay);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [audioVersion, setAudioVersion] = useState(0);

  useEffect(() => {
    void loadPersistedAudio().then((loaded) => {
      if (loaded) setAudioVersion((v) => v + 1);
    });
  }, []);

  return (
    <div className="app">
      <TopBar
        onTogglePlay={togglePlay}
        onExportPdf={() => {
          // Implemented in the PDF export milestone.
          void import('./export/pdf').then((m) => m.exportPerformancePdf());
        }}
      />
      <CastPanel />
      <main className="stage-area" aria-label="Stage canvas">
        <StageCanvas />
      </main>
      <PropertiesPanel />
      <Timeline
        audioVersion={audioVersion}
        onUploadAudio={() => fileInputRef.current?.click()}
        onClearAudio={() => {
          void clearAudio().then(() => setAudioVersion((v) => v + 1));
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file === undefined) return;
          void setAudioBlob(file).then(() => setAudioVersion((v) => v + 1));
          e.target.value = '';
        }}
      />
    </div>
  );
}
