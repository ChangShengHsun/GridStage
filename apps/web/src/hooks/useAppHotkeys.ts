import { useEffect } from 'react';
import { useEditor } from '../state/store';

const NUDGE_M = 0.1;
const NUDGE_BIG_M = 1;
const ROTATE_STEP_DEG = 15;

/**
 * Global editor hotkeys: arrows nudge (Shift = 1m), [ ] rotate ±15°,
 * Space toggles play, Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y undo/redo.
 * Ignored while typing in a form control.
 */
export function useAppHotkeys(togglePlay: () => void): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      const s = useEditor.getState();

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) s.redo();
          else s.undo();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          s.redo();
        }
        return;
      }

      const step = e.shiftKey ? NUDGE_BIG_M : NUDGE_M;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          s.nudgeSelected(-step, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          s.nudgeSelected(step, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          s.nudgeSelected(0, -step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          s.nudgeSelected(0, step);
          break;
        case '[':
          s.rotateSelected(-ROTATE_STEP_DEG);
          break;
        case ']':
          s.rotateSelected(ROTATE_STEP_DEG);
          break;
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        default:
          break;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlay]);
}
