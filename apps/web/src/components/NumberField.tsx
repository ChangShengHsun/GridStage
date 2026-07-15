import { useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';

interface NumberFieldProps {
  value: number;
  /** Called with the parsed number as you type (valid values only) and on blur. */
  onCommit: (value: number) => void;
  /** Decimals to display when not being edited. */
  decimals?: number;
  id?: string;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  title?: string;
}

/**
 * Number input that lets you type freely — including intermediate values a
 * min/max would reject (you often select-all and retype). It shows what you
 * type as a draft and only re-syncs to the stored/clamped value when you
 * finish (blur or Enter); valid values still commit live so the canvas keeps
 * up. This fixes fields that used to snap to their lower bound mid-keystroke.
 */
export function NumberField({
  value,
  onCommit,
  decimals,
  ...rest
}: NumberFieldProps): ReactElement {
  const [draft, setDraft] = useState<string | null>(null);
  const shown =
    draft ?? String(decimals !== undefined ? Number(value.toFixed(decimals)) : value);
  return (
    <input
      type="number"
      value={shown}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value.trim() !== '' && !Number.isNaN(n)) onCommit(n);
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      {...rest}
    />
  );
}
