import { useState } from 'react';
import type { ReactElement } from 'react';
import { useEditor } from '../state/store';
import { getLocalUser } from '../state/user';
import { useT } from '../i18n';

interface CommentsSectionProps {
  /** Null = comments on the whole selected formation. */
  performerId: string | null;
}

export function CommentsSection({ performerId }: CommentsSectionProps): ReactElement {
  const t = useT();
  const selectedFormationId = useEditor((s) => s.selectedFormationId);
  const comments = useEditor((s) => s.comments);
  const addComment = useEditor((s) => s.addComment);
  const removeComment = useEditor((s) => s.removeComment);
  const toggleCommentResolved = useEditor((s) => s.toggleCommentResolved);
  const [draft, setDraft] = useState('');

  const visible = comments.filter(
    (c) => c.formationId === selectedFormationId && c.performerId === performerId,
  );
  const open = visible.filter((c) => c.resolved !== true);
  const resolved = visible.filter((c) => c.resolved === true);

  const submit = (): void => {
    addComment(draft, performerId, getLocalUser().name);
    setDraft('');
  };

  const row = (c: (typeof visible)[number]): ReactElement => (
    <div key={c.id} className={`comment-row${c.resolved === true ? ' comment-resolved' : ''}`}>
      <div className="comment-head">
        <span className="comment-author">{c.authorName}</span>
        <span>
          <button
            type="button"
            className="comment-delete"
            title={c.resolved === true ? t.comments.reopenTitle : t.comments.resolveTitle}
            aria-label={
              c.resolved === true
                ? t.comments.reopenAria(c.text.slice(0, 30))
                : t.comments.resolveAria(c.text.slice(0, 30))
            }
            onClick={() => toggleCommentResolved(c.id)}
          >
            {c.resolved === true ? '↺' : '✓'}
          </button>
          <button
            type="button"
            className="comment-delete"
            aria-label={t.comments.deleteAria(c.text.slice(0, 30))}
            onClick={() => removeComment(c.id)}
          >
            ×
          </button>
        </span>
      </div>
      <div className="comment-text">{c.text}</div>
    </div>
  );

  return (
    <>
      <div className="panel-title">{t.comments.title}</div>
      <div className="panel-section">
        {visible.length === 0 && <span className="mono">{t.comments.none}</span>}
        {open.map(row)}
        {resolved.length > 0 && (
          <details className="panel-fold">
            <summary>{t.comments.resolvedFold(resolved.length)}</summary>
            {resolved.map(row)}
          </details>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            aria-label={t.comments.newCommentAria}
            placeholder={
              performerId === null
                ? t.comments.placeholderFormation
                : t.comments.placeholderPerformer
            }
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
          <button type="button" className="btn" disabled={draft.trim() === ''} onClick={submit}>
            {t.comments.add}
          </button>
        </div>
      </div>
    </>
  );
}
