import * as vscode from 'vscode';
import { StyleState, getFlag, sanitizeBadge } from './config';

/**
 * Colors the file name and adds a badge in editor tabs (and the explorer / open
 * editors) depending on which workspace folder the file belongs to.
 */
export class FolderDecorationProvider implements vscode.FileDecorationProvider, vscode.Disposable {
	private readonly emitter = new vscode.EventEmitter<undefined>();
	readonly onDidChangeFileDecorations = this.emitter.event;

	constructor(private readonly state: StyleState) {}

	refresh(): void {
		this.emitter.fire(undefined);
	}

	provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
		const folder = vscode.workspace.getWorkspaceFolder(uri);
		if (!folder) {
			return undefined;
		}
		const style = this.state.styleFor(folder);
		if (!style) {
			return undefined;
		}
		const badge = getFlag('decorations.badge') ? sanitizeBadge(style.badge) : undefined;
		const color = getFlag('decorations.color') ? this.state.themeColorFor(folder) : undefined;
		if (!badge && !color) {
			return undefined;
		}
		return new vscode.FileDecoration(badge, folder.name, color);
	}

	dispose(): void {
		this.emitter.dispose();
	}
}
