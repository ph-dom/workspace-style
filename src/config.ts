import * as vscode from 'vscode';

export const SECTION = 'workspaceStyle';

/**
 * Number of color slots declared in package.json (`workspaceStyle.slot1..N`).
 * One slot per distinct color (not per folder), sized to fit the whole palette.
 */
export const SLOT_COUNT = 20;

/**
 * Palette offered in the panel. Its entries are also the slot defaults in package.json
 * (keep in sync). The first row mixes colors for dark and light themes; the
 * second row is tuned for dark/black backgrounds (>= 6:1 contrast on #1E1E1E) and kept
 * visually apart from each other, from git colors and from the default tab text color.
 * Greens, teals and yellows are excluded on purpose: git decorations (untracked /
 * added = green, modified = yellow) override the extension's color, so those hues
 * would make a folder color indistinguishable from a git status.
 */
export const PALETTE = [
	'#E34234', '#1E56D9', '#F25C19', '#D926A9', '#7C3AED',
	'#F06464', '#EC1C77', '#1D8FE1', '#C81E4B', '#5A3FD6',
	// Dark / black backgrounds
	'#FF9E64', '#FFB3D9', '#C9A2FF', '#7AA2FF', '#5FD4FF',
	'#FF5FC1', '#E57CFF', '#FF8FA3', '#C387C3', '#E18700',
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
	/** Where emoji + label go relative to the file name (default: after it). */
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
 * Assigns a color slot to each workspace folder that has a valid color. Slots are allocated
 * per distinct color (case-insensitive) in workspace order, so folders that share a color
 * share a slot and the number of colored folders is unlimited. Only folders whose color is
 * new once all SLOT_COUNT slots are taken stay uncolored (they keep their badge and label).
 * Slots are derived (not stored), so the `.code-workspace` only holds the hex colors.
 */
export function computeSlots(styles: FolderStyles): Map<string, number> {
	const slots = new Map<string, number>();
	const byColor = new Map<string, number>();
	for (const folder of vscode.workspace.workspaceFolders ?? []) {
		const color = styles[folder.name]?.color;
		if (!isValidColor(color)) {
			continue;
		}
		const key = color.toLowerCase();
		let slot = byColor.get(key);
		if (slot === undefined) {
			if (byColor.size >= SLOT_COUNT) {
				continue;
			}
			slot = byColor.size;
			byColor.set(key, slot);
		}
		slots.set(folder.name, slot);
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
	if (style.labelPosition === 'prefix') {
		out.labelPosition = 'prefix';
	}
	return Object.keys(out).length ? out : undefined;
}
