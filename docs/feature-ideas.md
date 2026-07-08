# Feature ideas — suggested additions beyond the prompt.md roadmap

Ranked within each group by (value to a real choreographer) vs (effort).
Nothing here is committed scope — Ivan picks. Effort: S (<half day),
M (a day-ish), L (multi-day / needs design discussion).

Status legend: ✅ done · ⬜ open · 🔶 **needs Fable** (see "Which need Fable").

## Editing quality-of-life

- ✅ **Mirror / flip formation** — left–right across the center line.
- ✅ **Swap two performers** — in the current formation.
- ✅ **Align / distribute tools** — row/column align, even distribute.
- ✅ **Marquee select + mouse group-drag** — rubber-band on empty floor;
  dragging one selected mark moves the whole selection.
- ✅ **Copy positions from any formation** — "copy from…" picker in the
  formation panel.
- ✅ **Performer badge** — one CJK char / up to 4 letters inside the 2D mark
  and as a paper tag on the face in 3D (Ivan-requested).
- ⬜ **Snap-to-grid toggle** (S) — 0.5m grid snapping while dragging.

## Timeline & playback

- ✅ **Section markers** — named timeline labels (verse, chorus…).
- ✅ **Playback speed** (0.5–2×) and ✅ **resizable panels/timeline**.
- ⬜ **Count-based ruler mode** (M) — switch the ruler from seconds to
  8-counts when BPM is set; dancers think in counts. Mechanical once BPM +
  beat markers exist.
- ⬜ **Per-transition duration editing** (M) — today transition time = the gap
  between formations; an explicit handle/field on the gap makes it visible.
  Touches the timing model, so tread carefully.
- ⬜ **Loop a time range** (S) — rehearse one transition over and over.

## Performers & cast

- ⬜ **Performer groups/tags** (M) — "front row", "flyers"; filter highlight,
  per-group accents, template-to-a-group.
- ⬜ **Alternates / understudies** (M) — mark a performer inactive without
  deleting their positions (weekly attendance changes).
- ✅ **Per-performer path view** — "Show whole-show path" in the performer
  panel: numbered stops + dashed legs on the canvas.

## Export & sharing

- ✅ **2D & 3D video export** — MediaRecorder, music mixed in.
- ✅ **Individual walk sheets PDF** — one page per performer (numbered route +
  table); PDF-type picker next to Export PDF. CJK text is skipped (jsPDF has
  no CJK font — embedding a subset font is the known upgrade).
- ⬜ **PNG snapshot of current formation** (S) — one button, reuses the video
  exporter's draw function.
- ⬜ **GIF export** (M) — reuse the exporter's frame draw + a small encoder
  (`gifenc`), render offline ~12fps/640px. Mechanical.

## 3D

- ✅ **Camera presets** (audience / overhead / side).
- ✅ **Follow-a-performer camera** (chases the dancer, orbits with their facing).

## Collaboration

- ⬜ **Comment resolve/threads** (M) — resolving keeps old notes from drowning
  new ones.
- ⬜ **Follow peer mode** (M) — click a peer's avatar to follow their playhead
  and selection (teacher walks the team through the piece remotely).

## Big / design-first

- 🔶 **Rule-based formation suggestions** (M–L) — roadmap V3a. Given the cast
  and stage, propose 2–3 candidate next formations scored by spacing balance,
  symmetry, and minimal travel (reuse `planTransition`). **Needs Fable:** the
  hard part is the _scoring heuristic and taste_ — a weak model ships
  suggestions that look plausible and are actually bad, the same failure class
  as the auto-BPM detector Ivan rejected. No ML, no network — rules only.
- 🔶 **Stage lighting + light plot / cue sheet (編光表)** (L) — colored stage
  lights + timeline cues. A real subsystem (shared-types, store, 2D overlay,
  3D `SpotLight` wash, cue interpolation, PDF cue sheet). **Needs Fable for
  the design + plan:** genuine ambiguity (cues keyed to time vs formations,
  the beam/color model, how the editing UI reads) and cross-file interactions
  that are hard to hold in one head. Fable designs + does the hard parts;
  Sonnet can execute the mechanical phases. Propose the staged plan to Ivan
  before touching files (his >10-file rule). Phases: (1) data model,
  (2) 2D overlay + cue interpolation, (3) 3D wash, (4) PDF cue sheet.

## Which need Fable (vs any model)

Per Ivan's model-dispatch rule, Fable is for **taste / ambiguous product
judgment** and **hard algorithms where "plausible but wrong" is the failure
mode** — not for mechanical work.

- 🔶 **Formation suggestions** — heuristic + taste; wrong-but-plausible risk.
- 🔶 **Stage lighting + cue sheet** — big cross-file architecture + design
  ambiguity (at minimum, Fable writes the plan and the tricky parts).

Everything else (count ruler, GIF/PNG/walk-sheet export, groups, marquee
drag, snap-to-grid, loop, comment threads, per-performer path) is
well-specified execution — Sonnet or the main thread does it reliably.

## Recommendation (if Ivan asks "what next?")

1. Individual walk sheets PDF — the printable artifact teams want most (any model).
2. Count-based ruler — dance-audience differentiator (any model).
3. Formation suggestions — high wow-factor, **Fable**.
4. Stage lighting + cue sheet — biggest, **Fable plan first**.

## TODO (Ivan's own list)

1. ~~playback speed 0.5–2× (0.1 steps)~~ ✅ 2026-07-06
2. ~~resizable sidebars (VSCode-style)~~ ✅ 2026-07-06 (+ resizable timeline)
3.
