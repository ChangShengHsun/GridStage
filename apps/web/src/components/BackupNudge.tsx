import { useState } from 'react';
import type { ReactElement } from 'react';
import { useEditor } from '../state/store';
import { shouldNudge, snooze } from '../state/backupNudge';
import { exportActiveDocFile } from '../state/docFile';
import { useT } from '../i18n';

/**
 * A small dismissible banner reminding the user to export a JSON backup:
 * all data lives in this browser, so "clear browsing data" deletes it.
 * Evaluated once per session; export or "later" quiets it for a week.
 */
export function BackupNudge(): ReactElement | null {
  const t = useT();
  // ponytail: checked once at mount — work created mid-session nudges the
  // NEXT session, which is enough for a weekly reminder.
  const [visible, setVisible] = useState(() =>
    shouldNudge({
      performers: useEditor.getState().performers,
      formations: useEditor.getState().formations,
    }),
  );
  if (!visible) return null;
  return (
    <div className="backup-nudge" role="status">
      <span>{t.backup.reminder}</span>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          exportActiveDocFile();
          setVisible(false);
        }}
      >
        {t.backup.exportNow}
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => {
          snooze();
          setVisible(false);
        }}
      >
        {t.backup.later}
      </button>
    </div>
  );
}
