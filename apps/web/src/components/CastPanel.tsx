import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useEditor } from '../state/store';
import { parseRoster } from '../state/csv';
import { useT } from '../i18n';

export function CastPanel(): ReactElement {
  const t = useT();
  const performers = useEditor((s) => s.performers);
  const selectedPerformerIds = useEditor((s) => s.selectedPerformerIds);
  const addPerformer = useEditor((s) => s.addPerformer);
  const importRoster = useEditor((s) => s.importRoster);
  const selectPerformer = useEditor((s) => s.selectPerformer);

  const fileRef = useRef<HTMLInputElement>(null);
  const [importNote, setImportNote] = useState('');

  return (
    <aside className="cast-panel side-panel">
      <div className="panel-title">{t.cast.title}</div>
      <div className="panel-section">
        <button type="button" className="btn" onClick={addPerformer}>
          {t.cast.addPerformer}
        </button>
        <button
          type="button"
          className="btn"
          title={t.cast.importCsvTitle}
          onClick={() => fileRef.current?.click()}
        >
          {t.cast.importCsv}
        </button>
        {importNote !== '' && (
          <span className="mono" role="status">
            {importNote}
          </span>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        aria-label={t.cast.rosterFileAria}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file === undefined) return;
          void file.text().then((text) => {
            const rows = parseRoster(text);
            if (rows.length === 0) {
              setImportNote(t.cast.importEmpty);
            } else {
              importRoster(rows);
              setImportNote(t.cast.imported(rows.length));
            }
          });
          e.target.value = '';
        }}
      />
      {performers.length === 0 ? (
        <p className="empty-note">{t.cast.emptyNote}</p>
      ) : (
        <div role="listbox" aria-label={t.cast.performersAria} aria-multiselectable="true">
          {performers.map((p) => {
            const selected = selectedPerformerIds.includes(p.id);
            return (
              <div
                key={p.id}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                className={`cast-row${selected ? ' selected' : ''}`}
                onClick={(e) => selectPerformer(p.id, e.shiftKey)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectPerformer(p.id, e.shiftKey);
                  }
                }}
              >
                <span className="cast-dot" style={{ background: p.color }} />
                <span className="cast-name">{p.name}</span>
                {p.role !== '' && <span className="cast-role">{p.role}</span>}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
