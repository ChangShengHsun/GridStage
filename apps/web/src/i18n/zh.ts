import type { Messages } from './index';

/**
 * Traditional Chinese (繁體中文) dictionary.
 *
 * TODO(translation): every value below is still the English placeholder —
 * translate them all to 繁體中文. Rules:
 * - Keep every key and every function signature exactly as in `en.ts`;
 *   the `Messages` type makes the build fail if anything is missing.
 * - Translate the RETURN VALUES of the functions (word order may change
 *   freely, e.g. `Imported ${n} performers` → `已匯入 ${n} 位舞者`).
 * - Do NOT translate: `dateLocale` (already correct), `locale.english` /
 *   `locale.chinese` (language names stay in their own language), and
 *   technical notation like "BPM", "CSV", "X (m)" units — translate the
 *   words around them.
 * - Dance-context glossary: performer 舞者 / formation 隊形 / transition
 *   走位（隊形轉換）/ stage 舞台 / downstage-audience 觀眾席方向 /
 *   beat marker 節拍標記 / snapshot 快照 / cast 卡司.
 */
export const zh: Messages = {
  dateLocale: 'zh-TW',

  locale: {
    label: 'Language',
    english: 'English',
    chinese: '中文',
  },

  topbar: {
    performanceTitleAria: 'Performance title',
    undo: 'Undo',
    undoTitle: 'Undo (Ctrl+Z)',
    redo: 'Redo',
    redoTitle: 'Redo (Ctrl+Shift+Z)',
    peopleInSession: (n: number): string => `${n} people in session`,
    youTag: (name: string): string => `${name} (you)`,
    displayNameAria: 'Your display name',
    displayNameTitle: 'Your name on comments and live sessions',
    shareLive: 'Share live',
    copyLink: (room: string): string => `Copy link · ${room}`,
    linkCopied: 'Link copied',
    viewLink: 'View link',
    viewLinkTitle: 'Copy a view-only link (hides editing UI — not access control)',
    viewLinkCopied: 'View link copied',
    playheadAria: 'Playhead time',
    play: 'Play',
    pause: 'Pause',
    exportPdf: 'Export PDF',
    exportVideo: 'Export video',
    exportVideoTitle: 'Record the playback animation to a movie file (runs in real time)',
    exportVideoCancel: (percent: number): string => `Cancel ${percent}%`,
    videoExportFailed: 'Video export failed',
  },

  cast: {
    title: 'Cast',
    addPerformer: 'Add performer',
    importCsv: 'Import CSV',
    importCsvTitle: 'CSV columns: name, role, color (header row optional)',
    rosterFileAria: 'Roster CSV file',
    importEmpty: 'No rows found — expected: name, role, color',
    imported: (n: number): string => `Imported ${n} performer${n === 1 ? '' : 's'}`,
    emptyNote: 'No performers yet. Add one, then drag their mark onto the stage.',
    performersAria: 'Performers',
  },

  performer: {
    titleOne: 'Performer',
    titleMany: 'Performers',
    multiSelected: (n: number): string => `${n} selected. Arrow keys nudge, [ and ] rotate.`,
    name: 'Name',
    role: 'Role',
    rolePlaceholder: 'e.g. captain, flyer',
    color: 'Color',
    xLabel: 'X (m)',
    yLabel: 'Y (m)',
    facingLabel: 'Facing (° — 0 = audience)',
    facingDegreesAria: 'Facing degrees',
    removeFromCast: 'Remove from cast',
  },

  formation: {
    title: 'Formation',
    name: 'Name',
    startLabel: 'Start (s)',
    holdLabel: 'Hold (s)',
    transitionLabel: 'Transition to next',
    transitionLinear: 'Linear (straight paths)',
    transitionCurve: 'Curve (drag the path handles)',
    earlier: '← Earlier',
    later: 'Later →',
    templateLabel: 'Template',
    templates: {
      line: 'Line',
      v: 'V shape',
      circle: 'Circle',
      grid: 'Grid',
    },
    apply: 'Apply',
    applyTitle: 'Arrange everyone into this shape',
    applyDisabledTitle: 'Add performers first',
    untangle: 'Untangle from previous',
    untangleFirstTitle: 'No previous formation to walk from',
    untangleTitle:
      'Swap who takes which spot so total walking distance is minimal (red paths = crossings)',
    deleteFormation: 'Delete formation',
  },

  stage: {
    title: 'Stage',
    width: 'Width (m)',
    depth: 'Depth (m)',
    bpm: 'BPM (empty = unknown)',
    canvasAria: 'Stage canvas',
    audience: 'AUDIENCE',
    loading3d: 'Loading 3D preview…',
    to3dTitle: '3D preview (view only)',
    to2dTitle: 'Back to the 2D editor',
    audioFileAria: 'Audio file',
  },

  history: {
    title: 'History',
    saveSnapshot: 'Save snapshot',
    noSnapshots: 'No snapshots yet.',
    deleteSnapshotAria: (name: string): string => `Delete snapshot ${name}`,
    restore: 'Restore',
  },

  comments: {
    title: 'Comments',
    none: 'No comments yet.',
    deleteAria: (excerpt: string): string => `Delete comment: ${excerpt}`,
    placeholderFormation: 'Note on this formation…',
    placeholderPerformer: 'Note on this performer…',
    newCommentAria: 'New comment',
    add: 'Add',
  },

  timeline: {
    panelAria: 'Timeline',
    addFormation: 'Add formation',
    uploadAudio: 'Upload audio',
    replaceAudio: 'Replace audio',
    removeAudio: 'Remove audio',
    tapBeat: 'Tap beat',
    tapBeatTitle: 'Drop a beat marker at the playhead (great while music plays)',
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
    playing: 'playing',
    hint: 'drag formations to move · Ctrl+scroll to zoom',
    playheadAria: 'Playhead position',
    removeBeatAria: (seconds: string): string => `Remove beat marker at ${seconds}s`,
    formationAria: (name: string, seconds: string): string =>
      `Formation ${name}, starts at ${seconds}s`,
  },

  videoExport: {
    errNothingToExport: 'Nothing to export — add a formation first',
    errUnsupported: 'This browser cannot record video',
  },
};
