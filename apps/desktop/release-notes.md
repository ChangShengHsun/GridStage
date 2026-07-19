# GridStage 0.8.1

## Fix: the top-bar buttons are back

Since 0.6.0, on wide screens the title box swallowed the whole top bar and
pushed Library, Undo/Redo, Share live, Guide, Export and Preferences off the
right edge of the window. A CSS specificity slip — the global
`input[type=text] { width: 100% }` outranked the title's fixed width. Fixed,
with a geometry-based regression test so it cannot silently return.

Everything from 0.8.0 (the `.gridstage` file hand-off: double-click to open
on desktop, Android share sheet in/out) is included.
