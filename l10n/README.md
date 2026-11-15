# Translations

**English** | [Español](README.es.md)

The extension uses VS Code's standard localization system. The language follows VS Code's
display language (`Configure Display Language`). If there is no translation for that
language, or a string is missing, it is shown in English.

| Language | UI (`l10n/`) | Settings and commands (root) |
| --- | --- | --- |
| English (base) | `bundle.l10n.json` | `package.nls.json` |
| Español | `bundle.l10n.es.json` | `package.nls.es.json` |

## Where the strings live

- **`l10n/bundle.l10n.json`**: texts of the customization screen, messages, and the status
  bar. The key is the English text. **Do not edit it by hand**: it is generated with
  `npm run l10n:export` from the `vscode.l10n.t(...)` calls in `src/`.
- **`package.nls.json`**: setting descriptions, command titles, and colors
  (the `%key%` entries in `package.json`).

## Adding a language

1. Use VS Code's language code (`fr`, `de`, `pt-br`, `zh-cn`, `ja`...).
2. Copy `l10n/bundle.l10n.json` to `l10n/bundle.l10n.<language>.json` and `package.nls.json`
   to `package.nls.<language>.json`.
3. Translate only the **values**. Leave the keys unchanged, and keep the `{0}`, `{1}`
   placeholders in the translation.
4. Run `npm run l10n:check` to see your progress and catch errors.
5. Test with `F5` after switching the language with **Configure Display Language**
   (or by launching VS Code with `--locale <language>`).

Partial translations are welcome: anything missing is shown in English, and anyone can
complete it later. `l10n:check` lists the pending keys of each file.

## Adding or changing a text (developers)

1. In extension code, use `vscode.l10n.t('English text')` (with `{0}` for variable
   values). Do not use an alias (`const t = vscode.l10n.t`): the extractor does not detect it.
2. In the webview (`media/panel.js`), add an entry to `webviewStrings()` in
   `src/i18n.ts` and use it with `t('key')`.
3. In `package.json`, use `"%key%"` and define the key in `package.nls.json`.
4. Run `npm run l10n:export`, and add the translation to the language files you know.
   Changing an English text changes its key, so `l10n:check` will flag the old
   translation as obsolete in the other languages.
