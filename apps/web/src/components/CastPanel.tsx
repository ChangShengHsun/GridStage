import type { ReactElement } from 'react';
import { useEditor } from '../state/store';

export function CastPanel(): ReactElement {
  const performers = useEditor((s) => s.performers);
  const selectedPerformerIds = useEditor((s) => s.selectedPerformerIds);
  const addPerformer = useEditor((s) => s.addPerformer);
  const selectPerformer = useEditor((s) => s.selectPerformer);

  return (
    <aside className="cast-panel side-panel">
      <div className="panel-title">Cast</div>
      <div className="panel-section">
        <button type="button" className="btn" onClick={addPerformer}>
          Add performer
        </button>
      </div>
      {performers.length === 0 ? (
        <p className="empty-note">
          No performers yet. Add one, then drag their mark onto the stage.
        </p>
      ) : (
        <div role="listbox" aria-label="Performers" aria-multiselectable="true">
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
