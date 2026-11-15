import * as vscode from 'vscode';
import { FolderStyles, PALETTE, readStyles, saveStyles } from './config';
import { uiLanguage, webviewStrings } from './i18n';

interface IncomingMessage {
	type: 'ready' | 'save' | 'openWorkspaceFile';
	styles?: FolderStyles;
}

/** Customization screen: workspace folders on the left, style options on the right. */
export class StylePanel {
	private static current: StylePanel | undefined;
	private readonly disposables: vscode.Disposable[] = [];

	static show(extensionUri: vscode.Uri): void {
		if (StylePanel.current) {
			StylePanel.current.panel.reveal();
			return;
		}
		const panel = vscode.window.createWebviewPanel('workspaceStyle.panel', 'Workspace Style', vscode.ViewColumn.Active, {
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
		});
		StylePanel.current = new StylePanel(panel, extensionUri);
	}

	/** Pushes the latest config to the panel if it is open (e.g. after a manual edit of the file). */
	static refresh(): void {
		StylePanel.current?.postState();
	}

	private constructor(private readonly panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		panel.iconPath = new vscode.ThemeIcon('symbol-color');
		panel.webview.html = this.html(panel.webview, extensionUri);
		this.disposables.push(
			panel.onDidDispose(() => this.dispose()),
			panel.webview.onDidReceiveMessage((msg: IncomingMessage) => this.onMessage(msg)),
		);
	}

	private async onMessage(msg: IncomingMessage): Promise<void> {
		switch (msg.type) {
			case 'ready':
				this.postState();
				break;
			case 'save':
				try {
					await saveStyles(msg.styles ?? {});
					this.panel.webview.postMessage({ type: 'saved' });
					vscode.window.setStatusBarMessage(`$(check) ${vscode.l10n.t('Workspace Style: styles saved')}`, 3000);
				} catch (err) {
					vscode.window.showErrorMessage(vscode.l10n.t('Workspace Style: could not save: {0}', String(err)));
				}
				break;
			case 'openWorkspaceFile': {
				const file = vscode.workspace.workspaceFile;
				if (file && file.scheme === 'file') {
					await vscode.window.showTextDocument(file, { preview: false });
				}
				break;
			}
		}
	}

	private postState(): void {
		const styles = readStyles();
		const folders = (vscode.workspace.workspaceFolders ?? []).map(f => ({ name: f.name, path: f.uri.fsPath }));
		const file = vscode.workspace.workspaceFile;
		this.panel.webview.postMessage({
			type: 'state',
			folders,
			styles: Object.fromEntries(folders.filter(f => styles[f.name]).map(f => [f.name, styles[f.name]])),
			palette: PALETTE,
			workspaceFile: file?.scheme === 'file' ? file.fsPath : undefined,
			untitledWorkspace: file?.scheme === 'untitled',
			strings: webviewStrings(),
		});
	}

	private html(webview: vscode.Webview, extensionUri: vscode.Uri): string {
		const media = (f: string) => webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', f));
		const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
		const nonce = Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
		return /* html */ `<!DOCTYPE html>
<html lang="${uiLanguage()}">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="${media('panel.css')}" rel="stylesheet">
<title>Workspace Style</title>
</head>
<body>
<div id="notice" class="notice" hidden></div>
<div class="layout">
	<aside>
		<h2>${esc(vscode.l10n.t('Folders'))}</h2>
		<ul id="folders" role="listbox" aria-label="${esc(vscode.l10n.t('Workspace folders'))}"></ul>
		<button id="auto" class="secondary" title="${esc(vscode.l10n.t('Assign a color and badge to folders without a style'))}">${esc(vscode.l10n.t('Auto-assign'))}</button>
	</aside>
	<main id="editor">
		<p class="empty">${esc(vscode.l10n.t('The workspace has no folders.'))}</p>
	</main>
</div>
<footer>
	<span id="dirty" hidden>${esc(vscode.l10n.t('Unsaved changes'))}</span>
	<button id="discard" class="secondary">${esc(vscode.l10n.t('Discard'))}</button>
	<button id="save">${esc(vscode.l10n.t('Save to .code-workspace'))}</button>
</footer>
<script nonce="${nonce}" src="${media('panel.js')}"></script>
</body>
</html>`;
	}

	private dispose(): void {
		StylePanel.current = undefined;
		this.disposables.forEach(d => d.dispose());
		this.panel.dispose();
	}
}
