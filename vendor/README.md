# Bundled libraries

Copied from npm so BA Builder works offline (no CDN needed). All are MIT licensed; each folder
keeps its LICENSE file. The only change: Mermaid's `.mjs` files are renamed to `.js` (and their
imports updated to match), because simple web servers such as `python -m http.server` on Windows
serve `.mjs` as plain text, which browsers refuse to run as a module.

| Folder | Package | Version | Used for |
| --- | --- | --- | --- |
| `mermaid/` | [mermaid](https://www.npmjs.com/package/mermaid) (`dist/mermaid.esm.min.mjs` + chunks, renamed `.js`) | 11.4.1 | Drawing every diagram |
| `layout-elk/` | [@mermaid-js/layout-elk](https://www.npmjs.com/package/@mermaid-js/layout-elk) (`dist/*.esm.min.mjs` + chunks, renamed `.js`) | 0.1.7 | Optional "tidy" layout |
| `sql.js/` | [sql.js](https://www.npmjs.com/package/sql.js) (`dist/sql-wasm.js`, `dist/sql-wasm.wasm`) | 1.10.3 | SQL workbench (SQLite in the browser) |

To update one: `npm pack <package>@<version>`, unpack it, copy the same files over (rename `.mjs` to `.js` and replace `.mjs"` with `.js"` inside them), change the
version here, then run `node tools/offline-list.mjs` so the offline cache lists the new files.
