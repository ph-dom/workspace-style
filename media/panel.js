// @ts-check
(function () {
	// @ts-ignore acquireVsCodeApi is injected by VS Code.
	const vscode = acquireVsCodeApi();

	const EMOJIS = ['👍', '❤️', '🔥', '⭐', '⚡', '☃️', '💡', '📌', '🤖', '🚀'];

	/** @type {{name: string, path: string}[]} */
	let folders = [];
	/** @type {string[]} */
	let palette = [];
	/** @type {Record<string, any>} saved config */
	let saved = {};
	/** @type {Record<string, any>} working copy */
	let draft = {};
	let selected = '';
	let dirty = false;
	/** @type {Record<string, string>} localized strings sent by the extension (src/i18n.ts) */
	let strings = {};

	/** Localized string for `key`; falls back to the key itself so a missing entry is visible but harmless. */
	const t = (/** @type {string} */ key) => strings[key] ?? key;

	const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));

	/**
	 * @param {string} tag
	 * @param {Record<string, any>} [props]
	 * @param {(Node|string)[]} [children]
	 */
	function el(tag, props = {}, children = []) {
		const node = document.createElement(tag);
		for (const [k, v] of Object.entries(props)) {
			if (k === 'class') { node.className = v; }
			else if (k === 'text') { node.textContent = v; }
			else if (k.startsWith('on')) { node.addEventListener(k.slice(2), v); }
			else if (v !== undefined && v !== false) { node.setAttribute(k, v === true ? '' : String(v)); }
		}
		for (const c of children) { node.append(c); }
		return node;
	}

	const clone = (/** @type {any} */ o) => JSON.parse(JSON.stringify(o ?? {}));
	const styleOf = (/** @type {string} */ name) => (draft[name] ??= {});

	function setDirty(value) {
		dirty = value;
		$('dirty').hidden = !dirty;
	}

	function update(/** @type {string} */ key, /** @type {any} */ value) {
		const s = styleOf(selected);
		if (value === undefined || value === '') { delete s[key]; } else { s[key] = value; }
		setDirty(true);
		renderList();
		renderPreview();
	}

	// ---------------------------------------------------------------- list
	function renderList() {
		const list = $('folders');
		list.replaceChildren(...folders.map(f => {
			const s = draft[f.name] ?? {};
			const dot = el('span', { class: 'dot' });
			if (s.color) { dot.style.background = s.color; }
			const li = el('li', {
				role: 'option',
				tabindex: f.name === selected ? 0 : -1,
				'aria-selected': String(f.name === selected),
				title: f.path,
				onclick: () => select(f.name),
				onkeydown: (/** @type {KeyboardEvent} */ e) => {
					const i = folders.findIndex(x => x.name === f.name);
					if (e.key === 'ArrowDown' && folders[i + 1]) { e.preventDefault(); select(folders[i + 1].name, true); }
					if (e.key === 'ArrowUp' && folders[i - 1]) { e.preventDefault(); select(folders[i - 1].name, true); }
				},
			}, [dot, el('span', { class: 'fname', text: f.name }), el('span', { class: 'mini-badge', text: [s.emoji, s.badge].filter(Boolean).join(' ') })]);
			if (s.color) { /** @type {HTMLElement} */ (li.querySelector('.fname')).style.color = s.color; }
			return li;
		}));
	}

	function select(/** @type {string} */ name, focus = false) {
		selected = name;
		renderList();
		renderEditor();
		if (focus) { /** @type {HTMLElement|null} */ (document.querySelector('#folders li[aria-selected="true"]'))?.focus(); }
	}

	// ---------------------------------------------------------------- editor
	function tabLabel(/** @type {any} */ s, /** @type {string} */ file) {
		const text = [s.emoji, s.label].filter(Boolean).join(' ');
		if (!text) { return file; }
		return s.labelPosition === 'prefix' ? `${text} ${file}` : `${file} ${text}`;
	}

	function renderPreview() {
		const host = document.getElementById('preview');
		if (!host) { return; }
		const s = draft[selected] ?? {};
		const files = ['index.ts', 'README.md'];
		host.replaceChildren(...files.map((file, i) => {
			const label = el('span', { text: tabLabel(s, file) });
			const badge = el('span', { class: 'badge', text: s.badge ?? '' });
			if (s.color) { label.style.color = s.color; badge.style.color = s.color; }
			return el('div', { class: i === 0 ? 'tab active' : 'tab' }, [label, badge, el('span', { class: 'close', text: '×' })]);
		}));
	}

	function renderEditor() {
		const main = $('editor');
		const folder = folders.find(f => f.name === selected);
		if (!folder) {
			main.replaceChildren(el('p', { class: 'empty', text: t('noFolders') }));
			return;
		}
		const s = styleOf(folder.name);

		// Color
		const picker = /** @type {HTMLInputElement} */ (el('input', {
			type: 'color', value: s.color ?? palette[0] ?? '#1E56D9', title: t('customColor'),
			oninput: (/** @type {Event} */ e) => { update('color', /** @type {HTMLInputElement} */ (e.target).value); markSwatch(); },
		}));
		const swatches = el('div', { class: 'swatches', role: 'group', 'aria-label': t('palette') }, [
			el('button', { class: 'swatch none', title: t('noColor'), 'aria-label': t('noColor'), 'data-color': '', onclick: () => { update('color', undefined); markSwatch(); } }),
			...palette.map(c => {
				const b = el('button', { class: 'swatch', title: c, 'aria-label': c, 'data-color': c, onclick: () => { update('color', c); picker.value = c; markSwatch(); } });
				b.style.background = c;
				return b;
			}),
		]);
		function markSwatch() {
			const cur = (draft[selected]?.color ?? '').toLowerCase();
			swatches.querySelectorAll('.swatch').forEach(b => b.setAttribute('aria-pressed', String((b.getAttribute('data-color') ?? '').toLowerCase() === cur)));
		}

		// Text inputs
		const textInput = (/** @type {string} */ key, /** @type {Record<string, any>} */ extra) => /** @type {HTMLInputElement} */ (el('input', {
			type: 'text', value: s[key] ?? '', ...extra,
			oninput: (/** @type {Event} */ e) => update(key, /** @type {HTMLInputElement} */ (e.target).value.trim()),
		}));
		const badgeInput = textInput('badge', { class: 'short', maxlength: 2, 'aria-label': t('badge') });
		const emojiInput = textInput('emoji', { class: 'short', maxlength: 8, 'aria-label': t('emoji') });
		const labelInput = textInput('label', { class: 'mid', maxlength: 24, 'aria-label': t('labelText') });

		const position = /** @type {HTMLSelectElement} */ (el('select', {
			'aria-label': t('position'),
			onchange: (/** @type {Event} */ e) => update('labelPosition', /** @type {HTMLSelectElement} */ (e.target).value === 'prefix' ? 'prefix' : undefined),
		}, [el('option', { value: 'suffix', text: t('afterName') }), el('option', { value: 'prefix', text: t('beforeName') })]));
		position.value = s.labelPosition === 'prefix' ? 'prefix' : 'suffix';

		const emojiButtons = (/** @type {HTMLInputElement} */ target, /** @type {string} */ key) => el('div', { class: 'row' }, EMOJIS.map(em =>
			el('button', { class: 'emoji', text: em, title: em, onclick: () => { target.value = em; update(key, em); } })));

		main.replaceChildren(
			el('div', {}, [el('h3', { text: folder.name }), el('p', { class: 'path', text: folder.path })]),
			el('div', { class: 'field' }, [el('h2', { text: t('preview') }), el('div', { id: 'preview', class: 'preview' })]),
			el('div', { class: 'field' }, [
				el('h2', { text: t('nameColor') }),
				el('div', { class: 'row' }, [swatches, picker]),
				el('p', { class: 'hint', text: t('nameColorHint') }),
			]),
			el('div', { class: 'field' }, [
				el('h2', { text: t('badgeTitle') }),
				el('div', { class: 'row' }, [badgeInput, el('button', { class: 'link', text: t('useInitials'), onclick: () => { const v = initials(folder.name); badgeInput.value = v; update('badge', v); } })]),
				emojiButtons(badgeInput, 'badge'),
				el('p', { class: 'hint', text: t('badgeHint') }),
			]),
			el('div', { class: 'field' }, [
				el('h2', { text: t('tabText') }),
				el('div', { class: 'row' }, [el('label', { text: t('emoji') }), emojiInput, el('label', { text: t('text') }), labelInput, position]),
				emojiButtons(emojiInput, 'emoji'),
				el('p', { class: 'hint', text: t('tabTextHint') }),
			]),
			el('div', { class: 'row' }, [el('button', { class: 'secondary', text: t('removeStyle'), onclick: () => { draft[selected] = {}; setDirty(true); renderList(); renderEditor(); } })]),
		);
		markSwatch();
		renderPreview();
	}

	function initials(/** @type {string} */ name) {
		const words = name.split(/[^a-zA-Z0-9]+|(?<=[a-z])(?=[A-Z])/).filter(Boolean);
		const raw = words.length > 1 ? words[0][0] + words[1][0] : name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2);
		return raw.toUpperCase();
	}

	// ---------------------------------------------------------------- actions
	$('auto').addEventListener('click', () => {
		const used = new Set(Object.values(draft).map(s => s?.color?.toLowerCase()).filter(Boolean));
		let p = 0;
		for (const f of folders) {
			const s = styleOf(f.name);
			if (!s.color) {
				while (p < palette.length && used.has(palette[p].toLowerCase())) { p++; }
				s.color = palette[p % palette.length];
				used.add(s.color.toLowerCase());
				p++;
			}
			s.badge ??= initials(f.name);
		}
		setDirty(true);
		renderList();
		renderEditor();
	});

	$('save').addEventListener('click', () => vscode.postMessage({ type: 'save', styles: draft }));
	$('discard').addEventListener('click', () => {
		draft = clone(saved);
		setDirty(false);
		renderList();
		renderEditor();
	});

	window.addEventListener('message', ev => {
		const msg = ev.data;
		if (msg.type === 'state') {
			folders = msg.folders;
			palette = msg.palette;
			strings = msg.strings ?? {};
			saved = msg.styles;
			if (!dirty) { draft = clone(saved); }
			if (!folders.some(f => f.name === selected)) { selected = folders[0]?.name ?? ''; }
			renderNotice(msg);
			renderList();
			renderEditor();
		} else if (msg.type === 'saved') {
			setDirty(false);
		}
	});

	function renderNotice(/** @type {any} */ msg) {
		const n = $('notice');
		if (msg.workspaceFile) {
			n.hidden = true;
			return;
		}
		n.hidden = false;
		n.textContent = msg.untitledWorkspace
			? t('untitledWorkspace')
			: t('noWorkspaceFile');
	}

	vscode.postMessage({ type: 'ready' });
})();
