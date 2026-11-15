# Traducciones

[English](README.md) | **Español**

La extensión usa el sistema de localización estándar de VS Code. El idioma se toma de la
configuración de VS Code (`Configure Display Language`). Si no hay traducción para ese
idioma, o falta una cadena, se muestra en inglés.

| Idioma | Interfaz (`l10n/`) | Settings y comandos (raíz) |
| --- | --- | --- |
| English (base) | `bundle.l10n.json` | `package.nls.json` |
| Español | `bundle.l10n.es.json` | `package.nls.es.json` |

## Dónde están las cadenas

- **`l10n/bundle.l10n.json`**: textos de la pantalla de personalización, mensajes y barra de
  estado. La clave es el texto en inglés. **No se edita a mano**: se genera con
  `npm run l10n:export` a partir de las llamadas `vscode.l10n.t(...)` en `src/`.
- **`package.nls.json`**: descripciones de settings, títulos de comandos y colores
  (los `%clave%` de `package.json`).

## Agregar un idioma

1. Usa el código de idioma de VS Code (`fr`, `de`, `pt-br`, `zh-cn`, `ja`...).
2. Copia `l10n/bundle.l10n.json` a `l10n/bundle.l10n.<idioma>.json` y `package.nls.json`
   a `package.nls.<idioma>.json`.
3. Traduce solo los **valores**. Las claves no se tocan, y los marcadores `{0}`, `{1}`
   deben quedar en la traducción.
4. Ejecuta `npm run l10n:check` para ver el avance y detectar errores.
5. Prueba con `F5` después de cambiar el idioma con **Configure Display Language**
   (o lanzando VS Code con `--locale <idioma>`).

Se aceptan traducciones parciales: lo que falte se muestra en inglés, y cualquiera puede
completarlo después. `l10n:check` lista las claves pendientes de cada archivo.

## Agregar o cambiar un texto (desarrolladores)

1. En código de la extensión, usa `vscode.l10n.t('Texto en inglés')` (con `{0}` para
   valores variables). No uses un alias (`const t = vscode.l10n.t`): el extractor no lo detecta.
2. En el webview (`media/panel.js`), agrega una entrada a `webviewStrings()` en
   `src/i18n.ts` y úsala con `t('clave')`.
3. En `package.json`, usa `"%clave%"` y define la clave en `package.nls.json`.
4. Ejecuta `npm run l10n:export`, y agrega la traducción en los archivos de idiomas que
   conozcas. Si cambias un texto en inglés su clave cambia, así que `l10n:check` marcará
   la traducción antigua como obsoleta en los demás idiomas.
