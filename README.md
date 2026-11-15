# Workspace Style

Identifica de qué carpeta o repositorio viene cada pestaña en un workspace multi-root (`.code-workspace`).

## Uso

`Ctrl+Shift+P` → **Workspace Style: Personalizar carpetas**. A la izquierda está la lista de carpetas del workspace y a la derecha las opciones:

| Opción | Dónde se ve | Mecanismo de VS Code |
|---|---|---|
| Color | nombre en la pestaña, Explorer, barra de estado | `FileDecorationProvider` + `workbench.colorCustomizations` |
| Badge (2 caracteres o 1 emoji) | derecha de la pestaña, Explorer | `FileDecorationProvider` |
| Emoji y texto en el nombre | título de la pestaña | `workbench.editor.customLabels.patterns` |

**Guardar** escribe todo en `settings` del `.code-workspace`:

```jsonc
"settings": {
  "workspaceStyle.folders": {
    "api-backend": { "color": "#E34234", "badge": "AB", "emoji": "🚀", "label": "API" }
  },
  // Generado automáticamente a partir de lo anterior:
  "workbench.colorCustomizations": { "workspaceStyle.slot1": "#E34234" },
  "workbench.editor.customLabels.patterns": {
    "api-backend/**/?*.*": "${filename}.${extname} 🚀 API",
    "api-backend/**": "${filename} 🚀 API"
  },
  "workspaceStyle.managedLabelPatterns": ["api-backend/**/?*.*", "api-backend/**"]
}
```

Si se edita `workspaceStyle.folders` a mano, los ajustes derivados se regeneran solos. Los patrones de labels que hayas escrito tú no se tocan.

## Limitaciones (de la API de VS Code)

- No se puede cambiar el **icono** del archivo por repo, porque depende del tema de iconos. Usa el emoji en su lugar.
- No se puede cambiar el **fondo o borde de una pestaña** por separado, ni su fuente o CSS.
- Los colores de **git** reemplazan al color de la carpeta cuando el archivo tiene cambios: verde si es nuevo o sin rastrear, amarillo si está modificado. La API no permite darle más prioridad a la extensión, así que en esos casos la pestaña se identifica por la letra de git (`U`, `M`) y por el emoji o texto del nombre. Por eso la paleta no incluye verdes ni amarillos. Si eliges uno con el selector libre, se confundirá con git.
- No hay límite de carpetas con color: las carpetas que comparten un color comparten un slot. VS Code obliga a declarar los colores de antemano, así que se pueden usar hasta 20 colores distintos a la vez (slots `workspaceStyle.slot1..20`, uno por cada color de la paleta). Si usas más de 20 colores personalizados, las carpetas que sobran se quedan sin color, pero conservan el badge y el texto en el nombre.
- Si dos carpetas tienen el mismo nombre de directorio, sus patrones usan la ruta absoluta, que no es portable entre máquinas.

## Configuración

- `workspaceStyle.decorations.color` / `workspaceStyle.decorations.badge`
- `workspaceStyle.tabLabels.enabled`
- `workspaceStyle.statusBar.enabled`

## Idiomas

La interfaz está en inglés y español, y sigue el idioma de VS Code (los idiomas sin traducción se muestran en inglés). Para contribuir una traducción, completa o crea los archivos según [l10n/README.es.md](l10n/README.es.md) ([English](l10n/README.md)).

## Desarrollo

- `F5` abre el Extension Development Host con `sample/sample.code-workspace`.
- `npm test` ejecuta los tests de integración sobre `test-fixture/test.code-workspace`.
- `npm run l10n:export` regenera `l10n/bundle.l10n.json` y `npm run l10n:check` valida las traducciones.

## Licencia

Copyright (C) 2026 Pablo Henriquez

Este programa es software libre: puedes redistribuirlo y/o modificarlo bajo los términos de la [GNU General Public License](LICENSE) publicada por la Free Software Foundation, ya sea la versión 3 de la licencia o (a tu elección) cualquier versión posterior.
