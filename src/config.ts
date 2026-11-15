import * as vscode from 'vscode';

export const SECTION = 'workspaceStyle';

/** Number of color slots declared in package.json (`workspaceStyle.slot1..N`). */
export const SLOT_COUNT = 20;

/** Default palette. Must stay in sync with the defaults in package.json. */
export const PALETTE = [
	'#e5534b', '#f0883e', '#d4a72c', '#57ab5a', '#2fbfa0',
	'#39c5cf', '#4493f8', '#6e7bf2', '#a371f7', '#db61a2',
	'#b62324', '#bc4c00', '#9a6700', '#1a7f37', '#0a8a7a',
	'#0969da', '#8250df', '#bf3989', '#8b949e', '#c9d1d9',
];

export type LabelPosition = 'prefix' | 'suffix';

export interface FolderStyle {
	/** Hex color used for the tab label, the explorer and the status bar. */
	color?: string;
	/** Short badge (max 2 UTF-16 chars, e.g. "AP" or one emoji) shown at the right of the tab. */
	badge?: string;
	/** Emoji added to the tab title. */
	emoji?: string;
	/** Text (abbreviation) added to the tab title. */
	label?: string;
	/** Where emoji + label go relative to the file name. */
	labelPosition?: LabelPosition;
}

export type FolderStyles = Record<string, FolderStyle>;

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function isValidColor(value: unknown): value is string {
	return typeof value === 'string' && HEX_RE.test(value);
}

export function colorId(slot: number): string {
	return `${SECTION}.slot${slot + 1}`;
}

/** VS Code rejects decorations whose badge is longer than 2 UTF-16 code units. */
export function sanitizeBadge(badge: unknown): string | undefined {
	if (typeof badge !== 'string') {
		return undefined;
	}
	const trimmed = badge.trim();
	if (!trimmed) {
		return undefined;
	}
	// Keep whole code points (so an emoji is never cut in half) while fitting in 2 units.
	let out = '';
	for (const ch of trimmed) {
		if ((out + ch).length > 2) {
			break;
		}
		out += ch;
	}
	return out || undefined;
}

export function labelText(style: FolderStyle | undefined): string {
	if (!style) {
		return '';
	}
	return [style.emoji, style.label]
		.map(s => (typeof s === 'string' ? s.trim() : ''))
		.filter(Boolean)
		.join(' ');
}

export function readStyles(): FolderStyles {
	const value = vscode.workspace.getConfiguration(SECTION).get<unknown>('folders');
	return value && typeof value === 'object' && !Array.isArray(value) ? (value as FolderStyles) : {};
}

export function getFlag(key: string, fallback = true): boolean {
	return vscode.workspace.getConfiguration(SECTION).get<boolean>(key, fallback);
}

/**
 * Assigns a color slot to each workspace folder that has a valid color, in workspace order.
 * Slots are derived (not stored), so the `.code-workspace` only holds the hex colors.
 */
export function computeSlots(styles: FolderStyles): Map<string, number> {
	const slots = new Map<string, number>();
	let next = 0;
	for (const folder of vscode.workspace.workspaceFolders ?? []) {
		if (next >= SLOT_COUNT) {
			break;
		}
		if (isValidColor(styles[folder.name]?.color)) {
			slots.set(folder.name, next++);
		}
	}
	return slots;
}

/** Cached view of the configuration, refreshed on config / folder changes. */
export class StyleState {
	private _styles: FolderStyles = {};
	private _slots = new Map<string, number>();

	constructor() {
		this.reload();
	}

	reload(): void {
		this._styles = readStyles();
		this._slots = computeSlots(this._styles);
	}

	get styles(): FolderStyles {
		return this._styles;
	}

	styleFor(folder: vscode.WorkspaceFolder): FolderStyle | undefined {
		return this._styles[folder.name];
	}

	themeColorFor(folder: vscode.WorkspaceFolder): vscode.ThemeColor | undefined {
		const slot = this._slots.get(folder.name);
		return slot === undefined ? undefined : new vscode.ThemeColor(colorId(slot));
	}
}

/**
 * Saves styles for the current workspace folders and keeps entries for folders
 * that are not open right now (they might be re-added later).
 */
export async function saveStyles(updated: FolderStyles): Promise<void> {
	const current = readStyles();
	const currentNames = new Set((vscode.workspace.workspaceFolders ?? []).map(f => f.name));
	const merged: FolderStyles = {};
	for (const [name, style] of Object.entries(current)) {
		if (!currentNames.has(name)) {
			merged[name] = style;
		}
	}
	for (const [name, style] of Object.entries(updated)) {
		const clean = cleanStyle(style);
		if (clean) {
			merged[name] = clean;
		}
	}
	await vscode.workspace
		.getConfiguration(SECTION)
		.update('folders', Object.keys(merged).length ? merged : undefined, vscode.ConfigurationTarget.Workspace);
}

function cleanStyle(style: FolderStyle): FolderStyle | undefined {
	const out: FolderStyle = {};
	if (isValidColor(style.color)) {
		out.color = style.color.toLowerCase();
	}
	const badge = sanitizeBadge(style.badge);
	if (badge) {
		out.badge = badge;
	}
	if (style.emoji?.trim()) {
		out.emoji = style.emoji.trim();
	}
	if (style.label?.trim()) {
		out.label = style.label.trim();
	}
	if (style.labelPosition === 'suffix') {
		out.labelPosition = 'suffix';
	}
	return Object.keys(out).length ? out : undefined;
}
