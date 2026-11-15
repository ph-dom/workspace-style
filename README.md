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
    "api-backend": { "color": "#e5534b", "badge": "AB", "emoji": "🟥", "label": "API" }
  },
  // Generado automáticamente a partir de lo anterior:
  "workbench.colorCustomizations": { "workspaceStyle.slot1": "#e5534b" },
  "workbench.editor.customLabels.patterns": {
    "api-backend/**/?*.*": "🟥 API ${filename}.${extname}",
    "api-backend/**": "🟥 API ${filename}"
  },
  "workspaceStyle.managedLabelPatterns": ["api-backend/**/?*.*", "api-backend/**"]
}
```

Si se edita `workspaceStyle.folders` a mano, los ajustes derivados se regeneran solos. Los patrones de labels que hayas escrito tú no se tocan.

## Limitaciones (de la API de VS Code)

- No se puede cambiar el **icono** del archivo por repo, porque depende del tema de iconos. Usa el emoji en su lugar.
- No se puede cambiar el **fondo o borde de una pestaña** por separado, ni su fuente o CSS.
- Los colores de **git** (archivo modificado, sin rastrear) pueden tener prioridad sobre el color de la carpeta.
- Hay un máximo de 20 carpetas con color (slots `workspaceStyle.slot1..20`).
- Si dos carpetas tienen el mismo nombre de directorio, sus patrones usan la ruta absoluta, que no es portable entre máquinas.

## Configuración

- `workspaceStyle.decorations.color` / `workspaceStyle.decorations.badge`
- `workspaceStyle.tabLabels.enabled`
- `workspaceStyle.statusBar.enabled`

## Desarrollo

- `F5` abre el Extension Development Host con `sample/sample.code-workspace`.
- `npm test` ejecuta los tests de integración sobre `test-fixture/test.code-workspace`.
