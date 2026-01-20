# Changelog

All notable changes to this project will be documented in this file.

## [3.0.0] - 2026-01-20
### Added
- **Context menu integration**: Right-click on code block lines to highlight or remove highlights
- **Multi-line selection support**: Select multiple lines (e.g., lines 3-10) and highlight them all at once
- **Color customization**: Settings panel to customize all highlight colors
  - Background color picker for each color (yellow, red, green, blue)
  - Opacity slider (0-100%) for background transparency
  - Border color picker for accent colors
  - Individual reset buttons and "Reset All" option
  - Persistent storage of custom colors
- **Attribute-based storage**: Highlights now stored in custom block attributes (custom-hl, custom-hlr, custom-hlg, custom-hlb)
- Color submenu in context menu for choosing highlight color
- Line range calculation from cursor/selection position

### Changed
- `processCodeBlock` now reads from attributes first, then falls back to comment parsing
- Improved user experience: no need to modify code content directly
- Backward compatible with existing comment syntax

## [2.1.5] - 2025-11-19
### Changed
- Build process optimized: README_zh_CN.md included in package, outdated i18n configuration removed, .d.ts files disabled, dist directory cleared before each build

## [2.1.4] - 2025-11-18
### Changed
- Prevent duplicate overlays on note open (race condition fixes)

## [2.1.3] - 2025-11-18
### Changed
- Re-render detection improved (checks for missing overlays)

## [2.1.2] - 2025-11-18
### Changed
- Input listeners for editing inside code blocks (now reprocessing while typing)

## [2.0.2] - 2025-11-18
### Changed
- Overlay left: 0 and border visibility fixed

