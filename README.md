# SiYuan Code Line Highlighter Plugin

Highlight specific code lines in SiYuan code blocks using an intuitive context menu or comment syntax with multi-color support and customizable colors.

## Usage

### Method 1: Context Menu (New in v3.0.0) 🎨

Simply **right-click** on any line (or select multiple lines) in a code block to:
- Highlight single or multiple lines with your choice of color (yellow, red, green, blue + 3 Custom Colors)
- Remove existing highlights from single or multiple lines

**Multi-Line Selection**: Select lines 3-10 and right-click to highlight all of them at once!

This is the **recommended method** as it:
- Stores highlights in block attributes (doesn't modify your code)
- Works with any programming language
- Provides a visual, user-friendly interface
- Supports multi-line selection

### Method 2: Comment Syntax (Legacy, still supported)

Add a comment in the **first line** of your code block:

```javascript
// hl:1,3-5
const foo = "line 1 - highlighted yellow";
const bar = "line 2 - normal";
const baz = "line 3 - highlighted yellow";
const qux = "line 4 - highlighted yellow";
const test = "line 5 - highlighted yellow";
```

#### Multi-Color Syntax

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

#### New Numerical Syntax (v3.0.0+)

You can also use numbers `1-7` instead of letters:

- `hl1`...`hl4`: Standard colors (Yellow, Red, Green, Blue)
- `hl5`...`hl7`: **Custom Colors** defined in settings

Example:
```javascript
// hl5:1-3;hl2:10
```

#### Supported Comment Syntaxes

- `// ...` (JavaScript, TypeScript, C++, Java, etc.)
- `# ...` (Python, Ruby, Bash, etc.)
- `<!-- ... -->` (HTML, XML)
- `/* ... */` (CSS, C)

## Features

- ✅ **Context menu integration** - Right-click to highlight/unhighlight lines
- ✅ **Quick Access** - Set a default color for one-click highlighting
- ✅ **Multi-line selection** - Select and highlight multiple lines at once (e.g., lines 3-10)
- ✅ **7 Color Slots** - 4 Standard + 3 Custom Colors
- ✅ **Customizable colors** - Personalize colors via settings panel (background, border, opacity)
- ✅ **Renamable Labels** - Give your colors meaningful names (e.g., "Error", "Todo")
- ✅ **Toggle Visibility** - Hide colors you don't use
- ✅ **Attribute-based storage** - Highlights stored in block attributes, not in code
- ✅ Non-invasive overlays (not saved into note content)
- ✅ Multi-color support (yellow, red, green, blue)
- ✅ Responsive to window resize and code editing
- ✅ Works with SiYuan's native syntax highlighting
- ✅ Backward compatible with comment syntax

## Customization

Access plugin settings to customize highlight colors:
1. Go to Settings → Plugins → Code Line Highlighter → Settings
2. Customize each color (yellow, red, green, blue, custom1-3):
   - **Default**: Select which color appears at the top of the context menu
   - **Visible**: Show/Hide color in the menu
   - **Label**: Rename colors (e.g., "Important" instead of "Red")
   - **Background/Border/Opacity**: Full color control
3. Click individual reset buttons or "Reset All Colors to Default"
4. Changes apply immediately to all highlighted code blocks

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

- v3.0.0 — **Major Update**: Context menu integration, multi-line selection, color customization, attribute-based storage
- v2.1.4 — Prevent duplicate overlays on note open
- v2.1.3 — Better re-render detection when overlays missing
- v2.1.2 — Input listeners for code editing detection

## License

MIT
