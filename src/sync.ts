import * as vscode from 'vscode';
import { SECTION, FolderStyle, colorId, computeSlots, getFlag, labelText, readStyles } from './config';

const COLOR_KEY = 'workbench.colorCustomizations';
const LABEL_KEY = 'workbench.editor.customLabels.patterns';
const MANAGED_KEY = 'managedLabelPatterns';

type Dict = Record<string, unknown>;

/**
 * Keeps the settings VS Code itself reads (`workbench.colorCustomizations` and
 * `workbench.editor.customLabels.patterns`) in sync with `workspaceStyle.folders`.
 * Everything is written to the workspace target, which is the `.code-workspace` file
 * when a multi-root workspace is open. Calls are serialized to avoid racing writes.
 */
let queue: Promise<void> = Promise.resolve();

export function syncDerivedSettings(): Promise<void> {
	queue = queue.then(doSync).catch(err => {
		console.error('[workspace-style] sync failed', err);
	});
	return queue;
}

async function doSync(): Promise<void> {
	const folders = vscode.workspace.workspaceFolders;
	if (!folders?.length) {
		return;
	}
	const styles = readStyles();
	const root = vscode.workspace.getConfiguration();

	// --- colors -----------------------------------------------------------------
	const slots = computeSlots(styles);
	const currentColors = (root.inspect<Dict>(COLOR_KEY)?.workspaceValue ?? {}) as Dict;
	const nextColors: Dict = {};
	for (const [key, value] of Object.entries(currentColors)) {
		if (!key.startsWith(`${SECTION}.`)) {
			nextColors[key] = value;
		}
	}
	for (const folder of folders) {
		const slot = slots.get(folder.name);
		if (slot !== undefined) {
			nextColors[colorId(slot)] = styles[folder.name].color;
		}
	}
	await writeIfChanged(root, COLOR_KEY, currentColors, nextColors);

	// --- tab labels -------------------------------------------------------------
	const ownCfg = vscode.workspace.getConfiguration(SECTION);
	const previouslyManaged = ownCfg.inspect<string[]>(MANAGED_KEY)?.workspaceValue ?? [];
	const currentPatterns = (root.inspect<Dict>(LABEL_KEY)?.workspaceValue ?? {}) as Dict;
	const nextPatterns: Dict = { ...currentPatterns };
	for (const key of previouslyManaged) {
		delete nextPatterns[key];
	}
	const managed: string[] = [];
	if (getFlag('tabLabels.enabled')) {
		const collisions = basenameCollisions(folders);
		for (const folder of folders) {
			const style = styles[folder.name];
			for (const [pattern, template] of buildPatterns(folder, style, collisions)) {
				nextPatterns[pattern] = template;
				managed.push(pattern);
			}
		}
	}
	await writeIfChanged(root, LABEL_KEY, currentPatterns, nextPatterns);
	if (JSON.stringify(previouslyManaged) !== JSON.stringify(managed)) {
		await ownCfg.update(MANAGED_KEY, managed.length ? managed : undefined, vscode.ConfigurationTarget.Workspace);
	}
}

async function writeIfChanged(cfg: vscode.WorkspaceConfiguration, key: string, current: Dict, next: Dict) {
	if (JSON.stringify(current) === JSON.stringify(next)) {
		return;
	}
	await cfg.update(key, Object.keys(next).length ? next : undefined, vscode.ConfigurationTarget.Workspace);
}

function uriBasename(uri: vscode.Uri): string {
	const parts = uri.path.split('/').filter(Boolean);
	const last = parts[parts.length - 1] ?? '';
	// A drive root like "/c:" has no usable basename.
	return /^[a-z]:$/i.test(last) ? '' : last;
}

function basenameCollisions(folders: readonly vscode.WorkspaceFolder[]): Set<string> {
	const seen = new Map<string, number>();
	for (const f of folders) {
		const b = uriBasename(f.uri).toLowerCase();
		seen.set(b, (seen.get(b) ?? 0) + 1);
	}
	return new Set([...seen].filter(([, n]) => n > 1).map(([b]) => b));
}

/** Neutralize glob metacharacters that may appear in folder names. */
function escapeGlob(s: string): string {
	return s.replace(/[[\]{}*?]/g, '?');
}

/**
 * Builds the custom label patterns for one folder.
 *
 * Relative patterns are matched by VS Code against the path relative to the
 * *parent* of the workspace folder, so `api/**` targets files of the root whose
 * directory is named `api`. They are portable (no absolute paths in the
 * `.code-workspace`). If two roots share a directory name, the absolute URI path is used.
 *
 * `${filename}` stops at the first dot and `${extname}` is everything after it. A file
 * without an extension would show a literal `${extname}`, so we emit two patterns:
 * the first one (`?*.*`) has more weight and catches files that have an extension.
 */
function buildPatterns(
	folder: vscode.WorkspaceFolder,
	style: FolderStyle | undefined,
	collisions: Set<string>,
): [string, string][] {
	const text = labelText(style);
	if (!text) {
		return [];
	}
	const base = uriBasename(folder.uri);
	const glob = !base || collisions.has(base.toLowerCase())
		? escapeGlob(folder.uri.path.replace(/\/$/, ''))
		: escapeGlob(base);
	const withText = (name: string) =>
		style?.labelPosition === 'prefix' ? `${text} ${name}` : `${name} ${text}`;
	return [
		[`${glob}/**/?*.*`, withText('${filename}.${extname}')],
		[`${glob}/**`, withText('${filename}')],
	];
}
