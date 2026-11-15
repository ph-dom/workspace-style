# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A VS Code extension (`workspace-style`) for multi-root workspaces. It marks each editor tab with the folder or repo the file belongs to, using a color, a badge, and an emoji or text prefix. The config lives in the `.code-workspace` file. User-facing strings (UI, setting descriptions, README) are in Spanish.

## Commands

- `npm run compile`: `tsc` from `src/` to `out/`. The `include` in `tsconfig.json` is limited to `src`, so the `.ts` files in `sample/` and `test-fixture/` are not compiled.
- `npm run watch`: incremental compile. This is the default build task that F5 uses.
- `npm run lint`: runs eslint on `src`.
- `npm test`: compiles, lints, and runs the integration tests in a real VS Code instance (`@vscode/test-cli`, downloaded into `.vscode-test/`). The workspace opened is `test-fixture/test.code-workspace`.
- Single test: `npx vscode-test --grep "<test name substring>"`. Compile first, because the runner executes `out/test/**/*.test.js`.
- F5 ("Run Extension (sample workspace)") opens the Extension Development Host on `sample/sample.code-workspace`.

## Architecture

VS Code lets an extension style a tab in only two ways, and the design is built around them:

1. **File decorations** (`src/decorations.ts`): add the badge and the label color in tabs, the Explorer, and Open Editors. A decoration color must be a `ThemeColor` id, not a hex value. So `package.json` declares 20 color slots (`workspaceStyle.slot1..20`), one per palette color. The user's hex values are mapped onto those slots through `workbench.colorCustomizations`.
2. **Custom labels** (`workbench.editor.customLabels.patterns`): add the emoji or text to the tab title.

The extension cannot change the file icon, the background of a single tab, or the tab's CSS. See the README for the full list of limits.

### One source of truth, derived settings

- The source of truth is `workspaceStyle.folders`, keyed by `WorkspaceFolder.name`. It is written with `ConfigurationTarget.Workspace`, which means the `settings` section of the `.code-workspace`.
- `src/sync.ts` (`syncDerivedSettings`) regenerates the derived settings from it:
  - `workbench.colorCustomizations`: entries whose key starts with `workspaceStyle.` are owned by the extension. Other keys are kept.
  - `workbench.editor.customLabels.patterns`: the generated keys are tracked in `workspaceStyle.managedLabelPatterns`, so the user's own patterns are left alone.
- Sync runs on every `workspaceStyle.*` config change and on every change to the workspace folders. It only writes when a value actually changes, so its own writes don't cause a loop. Calls go through a promise queue so they run one at a time.
- Slots are not stored. `computeSlots` (`src/config.ts`) allocates one slot per distinct color (case-insensitive), in workspace-folder order, so folders sharing a color share a slot. Slots shift when folders or colors change. That's fine because sync rewrites all of them.
- `StyleState` is a cache of the parsed config. The decoration provider and the status bar read from it, and `extension.ts` reloads it on changes.

### Label pattern details (from VS Code's customEditorLabelService)

- A relative pattern is matched against the path relative to the *parent* of the workspace root, so its first segment is the root's directory basename. When two roots share a basename, the code falls back to the absolute `uri.path`.
- `${filename}` cuts at the first dot, and `${extname}` stays literal text when the file has no extension. That's why each folder gets two patterns: `<base>/**/?*.*` (heavier, so it wins) and `<base>/**`.
- Patterns are sorted by weight: a literal segment counts more than a wildcard. Templates with no alphanumeric character are ignored.

### Webview panel

- `src/panel.ts` is a singleton `WebviewPanel`. The UI is plain JS and CSS in `media/panel.js` and `media/panel.css`: no bundler and no framework.
- The CSP has no `'unsafe-inline'`, so dynamic styles must be set through `element.style` in JS, not through inline `style=""` attributes.
- Messages:
  - webview → extension: `ready`, `save`, `openWorkspaceFile`.
  - extension → webview: `state`, `saved`.
- The webview keeps a local draft. While the draft is dirty, external `state` updates refresh the folder list but not the styles.
- `saveStyles` keeps entries for folders that are not currently open in the workspace.

## Tests

The integration tests (`src/test/extension.test.ts`) write to `test-fixture/test.code-workspace` and restore its original contents in `suiteTeardown`. They parse the file and check the comment `// comentario que debe conservarse`, which verifies that config writes keep comments.
