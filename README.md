# SiYuan Code Line Highlighter Plugin

Highlight specific code lines in SiYuan code blocks using compact comment syntax with multi-color support.

## Usage

Add a comment in the **first line** of your code block:

```javascript
// hl:1,3-5
const foo = "line 1 - highlighted yellow";
const bar = "line 2 - normal";
const baz = "line 3 - highlighted yellow";
const qux = "line 4 - highlighted yellow";
const test = "line 5 - highlighted yellow";
```

### Multi-Color Syntax

- `hl:` (default) — yellow
- `hlr:` — red
- `hlg:` — green
- `hlb:` — blue

Combine multiple colors with `;`:

```javascript
// hlr:1;hlg:3;hlb:5-7
const error = "line 1 - red";
const normal = "line 2 - normal";
const success = "line 3 - green";
const info = "line 4 - normal";
const note1 = "line 5 - blue";
const note2 = "line 6 - blue";
const note3 = "line 7 - blue";
```

### Supported Comment Syntaxes

- `// ...` (JavaScript, TypeScript, C++, Java, etc.)
- `# ...` (Python, Ruby, Bash, etc.)
- `<!-- ... -->` (HTML, XML)
- `/* ... */` (CSS, C)

## Features

- ✅ Non-invasive overlays (not saved into note content)
- ✅ Multi-color support (yellow, red, green, blue)
- ✅ Responsive to window resize and code editing
- ✅ Works with SiYuan's native syntax highlighting

## Installation

### From Marketplace (recommended)

1. Open SiYuan → Settings → Marketplace → Plugins
2. Search for "Code Line Highlighter"
3. Click Install

### Manual Installation

1. Download `package.zip` from [Releases](https://github.com/langfeld/code-line-highlighter/releases)
2. Extract to `{SiYuan}/data/plugins/code-line-highlighter`
3. Restart SiYuan

### Build from Source

```bash
npm install
npm run build
# package.zip is created in project root
```

## Changelog (recent)

- v2.1.4 — Prevent duplicate overlays on note open
- v2.1.3 — Better re-render detection when overlays missing
- v2.1.2 — Input listeners for code editing detection

## License

MIT
