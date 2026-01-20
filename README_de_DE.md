# SiYuan Code Line Highlighter Plugin

Hebe bestimmte Codezeilen in SiYuan-Codeblöcken hervor — per intuitivem Kontextmenü oder per Kommentar-Syntax. Unterstützt mehrere Farben und anpassbare Einstellungen.

## Verwendung

### Methode 1: Kontextmenü (Neu in v3.0.0)

Rechtsklicke einfach auf eine Zeile (oder markiere mehrere Zeilen) in einem Codeblock, um:
- Eine oder mehrere Zeilen in einer gewählten Farbe hervorzuheben (gelb, rot, grün, blau + 3 Benutzerdefinierte)
- Bestehende Hervorhebungen von einer oder mehreren Zeilen zu entfernen

Mehrere Zeilen auswählen: Markiere z. B. Zeilen 3–10 und rechtsklicke, um alle auf einmal zu markieren.

Dies ist die empfohlene Methode, da sie:
- Hervorhebungen in Block-Attributen speichert (verändert nicht deinen Code)
- Mit jeder Programmiersprache funktioniert
- Eine visuelle, benutzerfreundliche Oberfläche bietet
- Mehrfachauswahl von Zeilen unterstützt

### Methode 2: Kommentar-Syntax (Legacy, weiterhin unterstützt)

Füge einen Kommentar in die **erste Zeile** deines Codeblocks ein:

```javascript
// hl:1,3-5
const foo = "line 1 - highlighted yellow";
const bar = "line 2 - normal";
const baz = "line 3 - highlighted yellow";
const qux = "line 4 - highlighted yellow";
const test = "line 5 - highlighted yellow";
```

#### Mehrfarben-Syntax

- `hl:` (Standard) — gelb
- `hlr:` — rot
- `hlg:` — grün
- `hlb:` — blau

Mehrere Farben mit `;` kombinieren:

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

#### Neue nummerische Syntax (ab v3.0.0)

Du kannst auch Zahlen `1-7` statt Buchstaben verwenden:

- `hl1`...`hl4`: Standardfarben (Gelb, Rot, Grün, Blau)
- `hl5`...`hl7`: **Custom Colors** (in den Einstellungen definiert)

Beispiel:
```javascript
// hl5:1-3;hl2:10
```

#### Unterstützte Kommentar-Syntaxen

- `// ...` (JavaScript, TypeScript, C++, Java, etc.)
- `# ...` (Python, Ruby, Bash, etc.)
- `<!-- ... -->` (HTML, XML)
- `/* ... */` (CSS, C)

## Features

- ✅ Kontextmenü-Integration — Rechtsklick zum Hervorheben/Entfernen
- ✅ **Schnellzugriff** — Wähle eine Standardfarbe für 1-Klick-Highlighting
- ✅ Mehrzeilenauswahl — Markiere und hebe mehrere Zeilen gleichzeitig hervor (z. B. 3–10)
- ✅ **7 Farben** — 4 Standard + 3 Benutzerdefinierte Farben
- ✅ Anpassbare Farben — Farben (Hintergrund, Rahmen, Opazität) in den Einstellungen ändern
- ✅ **Eigene Bezeichnungen** — Benenne Farben um (z. B. „Fehler“, „Todo“)
- ✅ **Sichtbarkeit umschalten** — Verstecke Farben, die du nicht nutzt
- ✅ Speicherung in Block-Attributen — Hervorhebungen werden nicht in den Code geschrieben
- ✅ Nicht-invasive Overlays (nicht im Notizinhalt gespeichert)
- ✅ Mehrfarben-Unterstützung (gelb, rot, grün, blau)
- ✅ Reagiert auf Fenstergrößenänderung und Code-Edit
- ✅ Funktioniert mit SiYuans nativer Syntax-Highlighting
- ✅ Rückwärtskompatibel mit Kommentar-Syntax

## Anpassung

Öffne die Plugin-Einstellungen, um Hervorhebungsfarben zu personalisieren:
1. Einstellungen → Plugins → Code Line Highlighter → Settings
2. Passe jede Farbe an (gelb, rot, grün, blau, custom1-3):
	- **Standard**: Wähle, welche Farbe ganz oben im Menü erscheint
	- **Sichtbar**: Farben im Menü ein-/ausblenden
	- **Label**: Farben umbenennen (z. B. „Wichtig“ statt „Rot“)
	- **Farbe**: Volle Kontrolle über Hintergrund, Rahmen und Opazität
3. Einzelne Reset-Buttons oder „Alle Farben auf Standard zurücksetzen“ nutzen
4. Änderungen werden sofort auf alle hervorgehobenen Codeblöcke angewendet

## Installation

### Aus dem Marketplace (empfohlen)

1. SiYuan → Einstellungen → Marketplace → Plugins öffnen
2. Nach „Code Line Highlighter“ suchen
3. Auf Installieren klicken

### Manuelle Installation

1. `package.zip` von den Releases herunterladen: https://github.com/langfeld/code-line-highlighter/releases
2. Nach `{SiYuan}/data/plugins/code-line-highlighter` entpacken
3. SiYuan neu starten

### Aus dem Quellcode bauen

```bash
npm install
npm run build
# package.zip wird im Projektstamm erstellt
```

## Changelog (aktuell)

- v3.2.1 — Legacy Highlight-Kommentar-Syntax kann per Kontext-Menü verwendet werden (Option hinzugefügt)
- v3.1.2 — Kleinere optische Anpassungen
- v3.1.1 — Z-Index Fix
- v3.1.0 — Benutzerdefinierte Farben für Hervorhebungen und weitere Verbesserungen
- v3.0.0 — Major Update: Kontextmenü, Mehrzeilenauswahl, Farbanpassung, Speicherung in Block-Attributen
- v2.1.4 — Verhindert doppelte Overlays beim Öffnen von Notizen
- v2.1.3 — Verbesserte Re-Render-Erkennung, wenn Overlays fehlen
- v2.1.2 — Input-Listener zur Erkennung von Code-Änderungen

## Lizenz

MIT
