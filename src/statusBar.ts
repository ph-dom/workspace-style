import * as vscode from 'vscode';
import { StyleState, getFlag } from './config';

/** Shows the folder / repo of the active editor in the status bar. */
export class FolderStatusBar implements vscode.Disposable {
	private readonly item = vscode.window.createStatusBarItem('workspaceStyle.folder', vscode.StatusBarAlignment.Left, 1000);
	private readonly disposables: vscode.Disposable[] = [];

	constructor(private readonly state: StyleState) {
		this.item.name = 'Workspace Style';
		this.item.command = 'workspaceStyle.openSettings';
		this.disposables.push(
			this.item,
			vscode.window.onDidChangeActiveTextEditor(() => this.update()),
			vscode.window.tabGroups.onDidChangeTabs(() => this.update()),
		);
		this.update();
	}

	update(): void {
		const uri = activeUri();
		const folder = uri && vscode.workspace.getWorkspaceFolder(uri);
		if (!folder || !getFlag('statusBar.enabled') || (vscode.workspace.workspaceFolders?.length ?? 0) < 2) {
			this.item.hide();
			return;
		}
		const style = this.state.styleFor(folder);
		const prefix = style?.emoji ? `${style.emoji} ` : '';
		this.item.text = `$(repo) ${prefix}${folder.name}`;
		this.item.color = this.state.themeColorFor(folder);
		this.item.tooltip = `${folder.uri.fsPath}\nClick para personalizar`;
		this.item.show();
	}

	dispose(): void {
		this.disposables.forEach(d => d.dispose());
	}
}

function activeUri(): vscode.Uri | undefined {
	const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
	if (input instanceof vscode.TabInputText || input instanceof vscode.TabInputCustom || input instanceof vscode.TabInputNotebook) {
		return input.uri;
	}
	if (input instanceof vscode.TabInputTextDiff) {
		return input.modified;
	}
	return vscode.window.activeTextEditor?.document.uri;
}
