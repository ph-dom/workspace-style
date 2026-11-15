import * as assert from 'assert';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { readStyles, sanitizeBadge, saveStyles } from '../config';
import { uiLanguage, webviewStrings } from '../i18n';
import { syncDerivedSettings } from '../sync';

function readWorkspaceFile(): { text: string; json: any } {
	const file = vscode.workspace.workspaceFile;
	assert.ok(file, 'tests must run inside a .code-workspace');
	const text = fs.readFileSync(file.fsPath, 'utf8');
	const json = JSON.parse(text.replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1'));
	return { text, json };
}

suite('workspace-style', () => {
	let original = '';

	suiteSetup(async () => {
		await vscode.extensions.getExtension('undefined_publisher.workspace-style')?.activate();
		original = fs.readFileSync(vscode.workspace.workspaceFile!.fsPath, 'utf8');
	});

	suiteTeardown(async () => {
		await saveStyles({});
		await syncDerivedSettings();
		fs.writeFileSync(vscode.workspace.workspaceFile!.fsPath, original);
	});

	test('webview strings come from the l10n bundle, with English as the fallback', () => {
		const strings = webviewStrings();
		for (const [key, value] of Object.entries(strings)) {
			assert.ok(value, `string "${key}" is empty`);
		}
		if (uiLanguage() === 'en') {
			assert.strictEqual(strings.noFolders, 'The workspace has no folders.');
		}
	});

	test('sanitizeBadge respects the 2-char limit', () => {
		assert.strictEqual(sanitizeBadge('ABC'), 'AB');
		assert.strictEqual(sanitizeBadge('🔵x'), '🔵');
		assert.strictEqual(sanitizeBadge('  '), undefined);
	});

	test('styles and derived settings are written to the .code-workspace', async () => {
		await saveStyles({
			alpha: { color: '#FF0000', badge: 'AL', emoji: '🟦', label: 'A', labelPosition: 'prefix' },
			beta: { color: '#00ff00', label: 'B' },
		});
		await syncDerivedSettings();

		const { text, json } = readWorkspaceFile();
		const s = json.settings;
		assert.ok(text.includes('// comentario que debe conservarse'), 'comments are preserved');
		assert.deepStrictEqual(s['workspaceStyle.folders'].alpha, { color: '#ff0000', badge: 'AL', emoji: '🟦', label: 'A', labelPosition: 'prefix' });
		assert.strictEqual(s['workbench.colorCustomizations']['workspaceStyle.slot1'], '#ff0000');
		assert.strictEqual(s['workbench.colorCustomizations']['workspaceStyle.slot2'], '#00ff00');

		const patterns = s['workbench.editor.customLabels.patterns'];
		assert.strictEqual(patterns['alpha/**/?*.*'], '🟦 A ${filename}.${extname}');
		assert.strictEqual(patterns['alpha/**'], '🟦 A ${filename}');
		assert.strictEqual(patterns['beta/**/?*.*'], '${filename}.${extname} B');
		assert.strictEqual(readStyles().beta.labelPosition, undefined, 'suffix is the default and is not stored');
	});

	test('folders that share a color share a slot', async () => {
		await saveStyles({ alpha: { color: '#ABCDEF' }, beta: { color: '#abcdef' } });
		await syncDerivedSettings();

		const colors = readWorkspaceFile().json.settings['workbench.colorCustomizations'];
		assert.deepStrictEqual(colors, { 'workspaceStyle.slot1': '#abcdef' });
	});

	test('user patterns are kept and managed ones are removed on reset', async () => {
		const cfg = vscode.workspace.getConfiguration();
		const current = cfg.inspect<Record<string, string>>('workbench.editor.customLabels.patterns')?.workspaceValue ?? {};
		await cfg.update('workbench.editor.customLabels.patterns', { ...current, '**/mine/*.ts': 'mine ${filename}' }, vscode.ConfigurationTarget.Workspace);

		await saveStyles({});
		await syncDerivedSettings();

		const s = readWorkspaceFile().json.settings;
		assert.deepStrictEqual(s['workbench.editor.customLabels.patterns'], { '**/mine/*.ts': 'mine ${filename}' });
		assert.strictEqual(s['workbench.colorCustomizations'], undefined);
		assert.strictEqual(s['workspaceStyle.folders'], undefined);
	});
});
