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
  const [draft, setDraft] = useState('');

  const visible = comments.filter(
    (c) => c.formationId === selectedFormationId && c.performerId === performerId,
  );

  const submit = (): void => {
    addComment(draft, performerId, getLocalUser().name);
    setDraft('');
  };

  return (
    <>
      <div className="panel-title">{t.comments.title}</div>
      <div className="panel-section">
        {visible.length === 0 && <span className="mono">{t.comments.none}</span>}
        {visible.map((c) => (
          <div key={c.id} className="comment-row">
            <div className="comment-head">
              <span className="comment-author">{c.authorName}</span>
              <button
                type="button"
                className="comment-delete"
                aria-label={t.comments.deleteAria(c.text.slice(0, 30))}
                onClick={() => removeComment(c.id)}
              >
                ×
              </button>
            </div>
            <div className="comment-text">{c.text}</div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            aria-label={t.comments.newCommentAria}
            placeholder={
              performerId === null ? t.comments.placeholderFormation : t.comments.placeholderPerformer
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
