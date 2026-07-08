import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactElement } from 'react';
import { useLayout } from '../state/layout';
import { useT } from '../i18n';

type Side = 'cast' | 'props' | 'timeline';

/**
 * IDE-style drag handles overlaid on a panel's edge (rendered by App over
 * the grid — the panels themselves scroll, so a handle inside them would
 * scroll away). Cast starts at the window's left edge, props ends at its
 * right edge, timeline sits at its bottom, so the pointer coordinate maps
 * straight to the new size.
 */
export function PanelResizer({ side }: { side: Side }): ReactElement {
  const t = useT();
  const castWidth = useLayout((s) => s.castWidth);
  const propsWidth = useLayout((s) => s.propsWidth);
  const timelineHeight = useLayout((s) => s.timelineHeight);
  const setCastWidth = useLayout((s) => s.setCastWidth);
  const setPropsWidth = useLayout((s) => s.setPropsWidth);
  const setTimelineHeight = useLayout((s) => s.setTimelineHeight);

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    if (side === 'cast') setCastWidth(e.clientX);
    else if (side === 'props') setPropsWidth(window.innerWidth - e.clientX);
    else setTimelineHeight(window.innerHeight - e.clientY);
  };

  // Side handles stop at the timeline's top so they don't overlap it.
  const style: CSSProperties =
    side === 'cast'
      ? { left: castWidth - 3, bottom: timelineHeight }
      : side === 'props'
        ? { right: propsWidth - 3, bottom: timelineHeight }
        : { bottom: timelineHeight - 3 };

  const label =
    side === 'cast'
      ? t.layout.resizeCast
      : side === 'props'
        ? t.layout.resizeProps
        : t.layout.resizeTimeline;

  return (
    <div
      className={`panel-resize panel-resize-${side === 'timeline' ? 'row' : 'col'}`}
      style={style}
      role="separator"
      aria-orientation={side === 'timeline' ? 'horizontal' : 'vertical'}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={onPointerMove}
    />
  );
}
