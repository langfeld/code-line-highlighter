# SiYuan Zeilen-Hervorhebung Plugin

Hebe spezifische Code-Zeilen in SiYuan Code-Blöcken mit kompakter Kommentar-Syntax und Mehrfarben-Unterstützung hervor.

## Verwendung

Füge einen Kommentar in der **ersten Zeile** deines Code-Blocks ein:

```javascript
// hl:1,3-5
const foo = "Zeile 1 - gelb hervorgehoben";
const bar = "Zeile 2 - normal";
const baz = "Zeile 3 - gelb hervorgehoben";
const qux = "Zeile 4 - gelb hervorgehoben";
const test = "Zeile 5 - gelb hervorgehoben";
```

### Mehrfarben-Syntax

- `hl:` (Standard) — gelb
- `hlr:` — rot
- `hlg:` — grün
- `hlb:` — blau

Kombiniere mehrere Farben mit `;`:

```javascript
// hlr:1;hlg:3;hlb:5-7
const error = "Zeile 1 - rot";
const normal = "Zeile 2 - normal";
const success = "Zeile 3 - grün";
const info = "Zeile 4 - normal";
const note1 = "Zeile 5 - blau";
const note2 = "Zeile 6 - blau";
const note3 = "Zeile 7 - blau";
```

### Unterstützte Kommentar-Syntaxen

- `// ...` (JavaScript, TypeScript, C++, Java, etc.)
- `# ...` (Python, Ruby, Bash, etc.)
- `<!-- ... -->` (HTML, XML)
- `/* ... */` (CSS, C)

## Features

- ✅ Nicht-invasive Overlays (werden nicht im Notiz-Inhalt gespeichert)
- ✅ Mehrfarben-Unterstützung (gelb, rot, grün, blau)
- ✅ Reagiert auf Fenster-Größenänderung und Code-Bearbeitung
- ✅ Funktioniert mit SiYuans nativer Syntax-Hervorhebung

## Installation

### Über den Marktplatz (empfohlen)

1. SiYuan öffnen → Einstellungen → Marktplatz → Plugins
2. Nach "Code Line Highlighter" suchen
3. Auf Installieren klicken

### Manuelle Installation

1. `package.zip` von [Releases](https://github.com/langfeld/code-line-highlighter/releases) herunterladen
2. Nach `{SiYuan}/data/plugins/code-line-highlighter` entpacken
3. SiYuan neustarten

### Build aus dem Quellcode

```bash
npm install
npm run build
# package.zip wird im Projektstamm erstellt
```

## Changelog (aktuell)

- v2.1.4 — Verhindert doppelte Overlays beim Öffnen von Notizen
- v2.1.3 — Bessere Re-Render-Erkennung wenn Overlays fehlen
- v2.1.2 — Input-Listener für Code-Bearbeitungs-Erkennung

## Lizenz

MIT

## Syntax

- `hl:1` - Hebt Zeile 1 hervor
- `hl:1,3` - Hebt Zeilen 1 und 3 hervor
- `hl:1-5` - Hebt Zeilen 1 bis 5 hervor
- `hl:1,3-5,8` - Kombination aus einzelnen Zeilen und Bereichen

## Unterstützte Kommentar-Syntaxen

- `// hl:...` (JavaScript, TypeScript, C++, Java, etc.)
- `# hl:...` (Python, Ruby, Bash, etc.)
- `<!-- hl:... -->` (HTML, XML)
- `/* hl:... */` (CSS, C)

## Features

- ✅ Funktioniert mit SiYuans nativem Syntax-Highlighting
- ✅ Einfacher, nicht-invasiver Ansatz
- ✅ Unterstützt mehrere Sprachen
- ✅ Visuelle Zeilen-Hervorhebung mit linkem Border
- ✅ Automatische Erkennung und Anwendung

## Installation

1. Lade `package.zip` herunter
2. Extrahiere nach `{SiYuan}/data/plugins/`
3. Starte SiYuan neu
4. Aktiviere das Plugin in Einstellungen → Marktplatz → Heruntergeladen

## Lizenz

MIT
