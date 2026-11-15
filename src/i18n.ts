import * as vscode from 'vscode';

/**
 * Localization helpers.
 *
 * Every user-facing string in the extension code goes through `vscode.l10n.t`, with the
 * English text as the key. VS Code loads `l10n/bundle.l10n.<language>.json` for the UI
 * language (`vscode.env.language`) and falls back to the English source text when there is
 * no bundle for that language or a key is missing, so translations can be added
 * incrementally. `npm run l10n:export` regenerates `l10n/bundle.l10n.json` from these calls.
 */

/** BCP 47 tag of the language the UI is actually shown in (English when no bundle was loaded). */
export function uiLanguage(): string {
	return vscode.l10n.bundle ? vscode.env.language : 'en';
}

/**
 * Strings used by the webview (`media/panel.js`). The webview cannot call `vscode.l10n`, so
 * they are resolved here and sent in the `state` message. Keep the keys in sync with the
 * `t('...')` calls in `media/panel.js`.
 */
export function webviewStrings() {
	return {
		noFolders: vscode.l10n.t('The workspace has no folders.'),
		customColor: vscode.l10n.t('Custom color'),
		palette: vscode.l10n.t('Palette'),
		noColor: vscode.l10n.t('No color'),
		badge: vscode.l10n.t('Badge'),
		emoji: vscode.l10n.t('Emoji'),
		text: vscode.l10n.t('Text'),
		labelText: vscode.l10n.t('Text in the name'),
		position: vscode.l10n.t('Position'),
		afterName: vscode.l10n.t('After the name'),
		beforeName: vscode.l10n.t('Before the name'),
		preview: vscode.l10n.t('Preview'),
		nameColor: vscode.l10n.t('Name color'),
		nameColorHint: vscode.l10n.t('Colors the name in the tab, the Explorer, and the status bar. Git decorations (modified file, etc.) may override it.'),
		badgeTitle: vscode.l10n.t('Badge (max. 2 characters)'),
		useInitials: vscode.l10n.t('Use initials'),
		badgeHint: vscode.l10n.t('Shown to the right of the name in the tab. An emoji also works.'),
		tabText: vscode.l10n.t('Text in the tab name'),
		tabTextHint: vscode.l10n.t('Applied through workbench.editor.customLabels.patterns. It is the only way to give each repo an "icon", because the file icon depends on the icon theme.'),
		removeStyle: vscode.l10n.t('Remove style from this folder'),
		untitledWorkspace: vscode.l10n.t('This workspace is not saved yet. Use "File > Save Workspace As..." to save the styles in a .code-workspace file.'),
		noWorkspaceFile: vscode.l10n.t('No .code-workspace is open. Styles will be saved in the folder\'s .vscode/settings.json.'),
	};
}

export type WebviewStrings = ReturnType<typeof webviewStrings>;
