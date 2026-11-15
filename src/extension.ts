import * as vscode from 'vscode';
import { SECTION, StyleState } from './config';
import { FolderDecorationProvider } from './decorations';
import { StylePanel } from './panel';
import { FolderStatusBar } from './statusBar';
import { syncDerivedSettings } from './sync';

export function activate(context: vscode.ExtensionContext) {
	const state = new StyleState();
	const decorations = new FolderDecorationProvider(state);
	const statusBar = new FolderStatusBar(state);

	const refreshAll = () => {
		state.reload();
		decorations.refresh();
		statusBar.update();
		StylePanel.refresh();
		void syncDerivedSettings();
	};

	context.subscriptions.push(
		decorations,
		statusBar,
		vscode.window.registerFileDecorationProvider(decorations),
		vscode.commands.registerCommand('workspaceStyle.openSettings', () => StylePanel.show(context.extensionUri)),
		vscode.commands.registerCommand('workspaceStyle.resync', refreshAll),
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(SECTION)) {
				refreshAll();
			}
		}),
		vscode.workspace.onDidChangeWorkspaceFolders(refreshAll),
	);

	void syncDerivedSettings();
}

export function deactivate() {}
