import {
    Plugin,
    fetchSyncPost,
    showMessage,
    Setting
} from "siyuan";
import "./index.css";

// Type definitions for multi-color highlighting
interface HighlightGroup {
    lines: number[];
    color: 'yellow' | 'red' | 'green' | 'blue';
}

interface ColorTheme {
    background: string;
    border: string;
}

export default class LineHighlightPlugin extends Plugin {
    private observer: MutationObserver | null = null;
    private processingTimeouts: Map<HTMLElement, number> = new Map();
    private cleanupObserver: MutationObserver | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private inputListeners: WeakMap<HTMLElement, (e: Event) => void> = new WeakMap();

    // Map colors to attribute names
    private readonly colorToAttr: Record<string, string> = {
        'yellow': 'custom-hl',
        'red': 'custom-hlr',
        'green': 'custom-hlg',
        'blue': 'custom-hlb'
    };

    // Default color configurations
    private readonly defaultColors: Record<string, ColorTheme> = {
        yellow: { background: 'rgba(255, 193, 7, 0.2)', border: '#ffc107' },
        red: { background: 'rgba(244, 67, 54, 0.2)', border: '#f44336' },
        green: { background: 'rgba(76, 175, 80, 0.2)', border: '#4caf50' },
        blue: { background: 'rgba(33, 150, 243, 0.2)', border: '#2196f3' }
    };

    // Current color configurations (initialized from defaults, can be customized)
    private colors: Record<string, ColorTheme> = {};

    async onload() {
        // console.log("✅ Code Line Highlighter Plugin loaded - Version 3.0.0");

        // Load custom colors from storage
        await this.loadCustomColors();

        // CRITICAL: Monitor for overlays being added to code blocks and remove them!
        this.startCleanupObserver();

        // Process all existing code blocks first
        setTimeout(() => {
            this.processAllCodeBlocks();
        }, 500);

        // Attach input listeners to all existing code blocks
        setTimeout(() => {
            this.attachAllInputListeners();
        }, 600);

        // Start ResizeObserver for responsive highlights AFTER processing
        setTimeout(() => {
            this.startResizeObserver();
        }, 700);

        // Then start observing for changes
        setTimeout(() => {
            this.observeCodeBlocks();
        }, 600);

        // Add context menu listener for right-click on code blocks
        this.eventBus.on("open-menu-content", this.handleContextMenu.bind(this));
    }

    /**
     * Called after layout is ready - setup settings panel here
     */
    onLayoutReady() {
        // Setup settings panel (must be done after layout is ready)
        this.setupSettings();
    }

    /**
     * Load custom colors from storage
     */
    private async loadCustomColors() {
        try {
            const customColors = await this.loadData('colors.json');
            // Start with defaults, then override with custom colors
            this.colors = { ...this.defaultColors };
            if (customColors) {
                Object.assign(this.colors, customColors);
            }
        } catch (error) {
            console.error('Error loading custom colors:', error);
            // Fallback to defaults on error
            this.colors = { ...this.defaultColors };
        }
    }

    /**
     * Save custom colors to storage
     */
    private async saveCustomColors() {
        try {
            await this.saveData('colors.json', this.colors);
            // Re-process all code blocks to apply new colors
            this.processAllCodeBlocks();
        } catch (error) {
            console.error('Error saving custom colors:', error);
        }
    }

    /**
     * Setup settings panel
     */
    private setupSettings() {
        // Initialize the setting object if not already done
        if (!this.setting) {
            this.setting = new Setting({
                confirmCallback: () => {
                    // Settings are auto-saved when changed, no need for explicit confirm
                }
            });
        }

        this.setting.addItem({
            title: 'Highlight Colors',
            description: 'Customize the colors used for code line highlighting',
            direction: 'row',
            createActionElement: () => {
                const container = document.createElement('div');
                container.style.cssText = 'display: flex; flex-direction: column; gap: 16px; width: 100%;';

                const colorNames: Array<'yellow' | 'red' | 'green' | 'blue'> = ['yellow', 'red', 'green', 'blue'];
                
                colorNames.forEach(colorName => {
                    const colorRow = document.createElement('div');
                    colorRow.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 8px; border: 1px solid var(--b3-border-color); border-radius: 4px;';
                    colorRow.setAttribute('data-color-name', colorName);

                    // Color name label
                    const label = document.createElement('div');
                    label.textContent = colorName.charAt(0).toUpperCase() + colorName.slice(1);
                    label.style.cssText = 'min-width: 80px; font-weight: 500;';
                    colorRow.appendChild(label);

                    // Background color picker
                    const bgLabel = document.createElement('span');
                    bgLabel.textContent = 'Background:';
                    bgLabel.style.cssText = 'font-size: 12px; color: var(--b3-theme-on-surface);';
                    colorRow.appendChild(bgLabel);

                    const bgInput = document.createElement('input');
                    bgInput.type = 'color';
                    bgInput.value = this.rgbaToHex(this.colors[colorName].background);
                    bgInput.style.cssText = 'width: 50px; height: 30px; border: none; cursor: pointer;';
                    bgInput.setAttribute('data-input-type', 'background');
                    bgInput.addEventListener('change', async () => {
                        const opacity = this.extractOpacity(this.colors[colorName].background);
                        this.colors[colorName].background = this.hexToRgba(bgInput.value, opacity);
                        await this.saveCustomColors();
                    });
                    colorRow.appendChild(bgInput);

                    // Opacity slider
                    const opacityLabel = document.createElement('span');
                    opacityLabel.textContent = 'Opacity:';
                    opacityLabel.style.cssText = 'font-size: 12px; color: var(--b3-theme-on-surface); margin-left: 8px;';
                    colorRow.appendChild(opacityLabel);

                    const opacityInput = document.createElement('input');
                    opacityInput.type = 'range';
                    opacityInput.min = '0';
                    opacityInput.max = '100';
                    opacityInput.value = String(this.extractOpacity(this.colors[colorName].background) * 100);
                    opacityInput.style.cssText = 'width: 100px;';
                    opacityInput.setAttribute('data-input-type', 'opacity');
                    opacityInput.addEventListener('input', async () => {
                        const opacity = parseFloat(opacityInput.value) / 100;
                        const hex = this.rgbaToHex(this.colors[colorName].background);
                        this.colors[colorName].background = this.hexToRgba(hex, opacity);
                        await this.saveCustomColors();
                    });
                    colorRow.appendChild(opacityInput);

                    // Border color picker
                    const borderLabel = document.createElement('span');
                    borderLabel.textContent = 'Border:';
                    borderLabel.style.cssText = 'font-size: 12px; color: var(--b3-theme-on-surface); margin-left: 8px;';
                    colorRow.appendChild(borderLabel);

                    const borderInput = document.createElement('input');
                    borderInput.type = 'color';
                    borderInput.value = this.colors[colorName].border;
                    borderInput.style.cssText = 'width: 50px; height: 30px; border: none; cursor: pointer;';
                    borderInput.setAttribute('data-input-type', 'border');
                    borderInput.addEventListener('change', async () => {
                        this.colors[colorName].border = borderInput.value;
                        await this.saveCustomColors();
                    });
                    colorRow.appendChild(borderInput);

                    // Reset button
                    const resetBtn = document.createElement('button');
                    resetBtn.textContent = '↺';
                    resetBtn.title = 'Reset to default';
                    resetBtn.style.cssText = 'padding: 4px 8px; margin-left: auto; cursor: pointer; border: 1px solid var(--b3-border-color); border-radius: 4px; background: var(--b3-theme-background);';
                    resetBtn.addEventListener('click', async () => {
                        this.colors[colorName] = { ...this.defaultColors[colorName] };
                        bgInput.value = this.rgbaToHex(this.colors[colorName].background);
                        opacityInput.value = String(this.extractOpacity(this.colors[colorName].background) * 100);
                        borderInput.value = this.colors[colorName].border;
                        await this.saveCustomColors();
                    });
                    colorRow.appendChild(resetBtn);

                    container.appendChild(colorRow);
                });

                // Reset all button
                const resetAllBtn = document.createElement('button');
                resetAllBtn.textContent = 'Reset All Colors to Default';
                resetAllBtn.style.cssText = 'padding: 8px 16px; cursor: pointer; border: 1px solid var(--b3-border-color); border-radius: 4px; background: var(--b3-theme-background); margin-top: 8px;';
                resetAllBtn.addEventListener('click', async () => {
                    // Reset all colors to defaults
                    this.colors = { ...this.defaultColors };
                    
                    // Update all UI elements
                    colorNames.forEach(colorName => {
                        const colorRow = container.querySelector(`[data-color-name="${colorName}"]`) as HTMLElement;
                        if (colorRow) {
                            const bgInput = colorRow.querySelector('[data-input-type="background"]') as HTMLInputElement;
                            const opacityInput = colorRow.querySelector('[data-input-type="opacity"]') as HTMLInputElement;
                            const borderInput = colorRow.querySelector('[data-input-type="border"]') as HTMLInputElement;
                            
                            if (bgInput) bgInput.value = this.rgbaToHex(this.colors[colorName].background);
                            if (opacityInput) opacityInput.value = String(this.extractOpacity(this.colors[colorName].background) * 100);
                            if (borderInput) borderInput.value = this.colors[colorName].border;
                        }
                    });
                    
                    await this.saveCustomColors();
                });
                container.appendChild(resetAllBtn);

                return container;
            }
        });
    }

    /**
     * Convert rgba string to hex color
     */
    private rgbaToHex(rgba: string): string {
        const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
        if (!match) return '#000000';
        
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    /**
     * Convert hex color to rgba with opacity
     */
    private hexToRgba(hex: string, opacity: number): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    /**
     * Extract opacity from rgba string
     */
    private extractOpacity(rgba: string): number {
        // Handle rgba() format with alpha channel
        const rgbaMatch = rgba.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
        if (rgbaMatch) {
            return parseFloat(rgbaMatch[1]);
        }
        
        // Handle rgb() format without alpha (default to 0.2)
        const rgbMatch = rgba.match(/rgb\([^,]+,[^,]+,[^,]+\)/);
        if (rgbMatch) {
            return 0.2;
        }
        
        // Fallback
        return 0.2;
    }

    /**
     * Handle context menu for code blocks
     */
    private handleContextMenu(event: CustomEvent<any>) {
        const detail = event.detail;
        const { menu, protyle, element, range } = detail;

        // Check if the selection is inside a code block
        const codeBlock = element?.closest('.code-block') as HTMLElement;
        if (!codeBlock) {
            return;
        }

        // Calculate which lines are selected
        const lineRange = this.getLineRangeFromSelection(codeBlock, range);
        if (lineRange === null) {
            return;
        }

        const { startLine, endLine } = lineRange;
        const isMultiLine = startLine !== endLine;
        const lineLabel = isMultiLine ? `lines ${startLine}-${endLine}` : `line ${startLine}`;

        // Add separator
        menu.addSeparator();

        // Add highlight submenu
        const highlightMenu = {
            label: `Highlight ${lineLabel}`,
            iconHTML: '🎨',
            submenu: [
                {
                    label: 'Yellow',
                    iconHTML: `<span style="color: ${this.colors.yellow.border};">●</span>`,
                    click: () => this.toggleHighlightRange(codeBlock, startLine, endLine, 'yellow')
                },
                {
                    label: 'Red',
                    iconHTML: `<span style="color: ${this.colors.red.border};">●</span>`,
                    click: () => this.toggleHighlightRange(codeBlock, startLine, endLine, 'red')
                },
                {
                    label: 'Green',
                    iconHTML: `<span style="color: ${this.colors.green.border};">●</span>`,
                    click: () => this.toggleHighlightRange(codeBlock, startLine, endLine, 'green')
                },
                {
                    label: 'Blue',
                    iconHTML: `<span style="color: ${this.colors.blue.border};">●</span>`,
                    click: () => this.toggleHighlightRange(codeBlock, startLine, endLine, 'blue')
                }
            ]
        };

        menu.addItem(highlightMenu);

        // Add remove highlight option
        menu.addItem({
            label: `Remove highlight from ${lineLabel}`,
            iconHTML: '🚫',
            click: () => this.removeHighlightFromLineRange(codeBlock, startLine, endLine)
        });
    }

    /**
     * Get line range from selection (supports multi-line selection)
     */
    private getLineRangeFromSelection(codeBlock: HTMLElement, range: Range): { startLine: number, endLine: number } | null {
        if (!range) {
            return null;
        }

        const hljsElement = codeBlock.querySelector('.hljs');
        if (!hljsElement) {
            return null;
        }

        const codeContentDiv = hljsElement.querySelector('div[contenteditable="true"]') as HTMLElement;
        if (!codeContentDiv) {
            return null;
        }

        // Get the text content
        const textContent = codeContentDiv.textContent || '';
        const lines = textContent.split('\n');

        // Helper function to calculate line number from offset
        const getLineFromOffset = (offset: number): number => {
            let currentOffset = 0;
            for (let i = 0; i < lines.length; i++) {
                currentOffset += lines[i].length + 1; // +1 for newline
                if (offset < currentOffset) {
                    return i + 1; // Line numbers are 1-based
                }
            }
            return lines.length;
        };

        // Calculate start offset
        const startOffset = this.calculateOffset(range.startContainer, range.startOffset, codeContentDiv);
        if (startOffset === null) {
            return null;
        }

        // Calculate end offset
        const endOffset = this.calculateOffset(range.endContainer, range.endOffset, codeContentDiv);
        if (endOffset === null) {
            return null;
        }

        const startLine = getLineFromOffset(startOffset);
        const endLine = getLineFromOffset(endOffset);

        return { startLine, endLine };
    }

    /**
     * Calculate offset from the start of contenteditable element
     */
    private calculateOffset(node: Node, offset: number, codeContentDiv: HTMLElement): number | null {
        let startNode = node;
        
        // If startNode is not a text node, try to get a text node
        if (startNode.nodeType !== Node.TEXT_NODE) {
            const walker = document.createTreeWalker(
                startNode,
                NodeFilter.SHOW_TEXT,
                null
            );
            const textNode = walker.nextNode();
            if (!textNode) {
                // If no text node found, can't determine offset
                console.warn('Could not find text node for offset calculation');
                return null;
            }
            startNode = textNode;
        }

        // Calculate offset from the start of contenteditable
        let totalOffset = offset;
        let currentNode: Node | null = startNode;

        // Walk backwards to calculate total offset
        while (currentNode && currentNode !== codeContentDiv) {
            const prevSibling: Node | null = currentNode.previousSibling;
            if (prevSibling) {
                totalOffset += prevSibling.textContent?.length || 0;
                currentNode = prevSibling;
            } else {
                currentNode = currentNode.parentNode;
                if (currentNode === codeContentDiv) {
                    break;
                }
            }
        }

        return totalOffset;
    }

    /**
     * Get line number from cursor/selection position (legacy method, kept for compatibility)
     */
    private getLineNumberFromRange(codeBlock: HTMLElement, range: Range): number | null {
        if (!range) {
            return null;
        }

        const hljsElement = codeBlock.querySelector('.hljs');
        if (!hljsElement) {
            return null;
        }

        const codeContentDiv = hljsElement.querySelector('div[contenteditable="true"]') as HTMLElement;
        if (!codeContentDiv) {
            return null;
        }

        // Get the text content and calculate line number from cursor position
        const textContent = codeContentDiv.textContent || '';
        const lines = textContent.split('\n');

        // Find the line containing the range start
        let startNode = range.startContainer;
        
        // If startNode is not a text node, try to get a text node
        if (startNode.nodeType !== Node.TEXT_NODE) {
            const walker = document.createTreeWalker(
                startNode,
                NodeFilter.SHOW_TEXT,
                null
            );
            const textNode = walker.nextNode();
            if (!textNode) {
                // If no text node found, can't determine line number
                console.warn('Could not find text node for line number calculation');
                return null;
            }
            startNode = textNode;
        }

        // Calculate offset from the start of contenteditable
        let offset = range.startOffset;
        let currentNode: Node | null = startNode;

        // Walk backwards to calculate total offset
        while (currentNode && currentNode !== codeContentDiv) {
            const prevSibling: Node | null = currentNode.previousSibling;
            if (prevSibling) {
                offset += prevSibling.textContent?.length || 0;
                currentNode = prevSibling;
            } else {
                currentNode = currentNode.parentNode;
                if (currentNode === codeContentDiv) {
                    break;
                }
            }
        }

        // Calculate line number from offset
        let currentOffset = 0;
        for (let i = 0; i < lines.length; i++) {
            currentOffset += lines[i].length + 1; // +1 for newline
            if (offset < currentOffset) {
                return i + 1; // Line numbers are 1-based
            }
        }

        return lines.length;
    }

    /**
     * Toggle highlight for a specific line with a color
     */
    private async toggleHighlight(codeBlock: HTMLElement, lineNumber: number, color: 'yellow' | 'red' | 'green' | 'blue') {
        const nodeElement = codeBlock.closest('[data-node-id]') as HTMLElement;
        if (!nodeElement) {
            showMessage('Cannot find block ID', 3000, 'error');
            return;
        }

        const blockId = nodeElement.getAttribute('data-node-id');
        if (!blockId) {
            showMessage('Cannot find block ID', 3000, 'error');
            return;
        }

        // Get current highlights from attributes
        const groups = await this.getHighlightGroupsFromAttributes(blockId);

        // Find the group for this color
        let group = groups.find(g => g.color === color);
        if (!group) {
            group = { lines: [], color };
            groups.push(group);
        }

        // Add line if not already present
        if (!group.lines.includes(lineNumber)) {
            group.lines.push(lineNumber);
            group.lines.sort((a, b) => a - b);
        }

        // Save to attributes
        await this.saveHighlightGroupsToAttributes(blockId, groups);

        // Re-process the code block to apply changes (fire and forget)
        this.processCodeBlock(codeBlock).catch(err => {
            console.error('Error processing code block:', err);
        });

        showMessage(`Line ${lineNumber} highlighted in ${color}`, 2000, 'info');
    }

    /**
     * Remove highlight from a specific line
     */
    private async removeHighlightFromLine(codeBlock: HTMLElement, lineNumber: number) {
        const nodeElement = codeBlock.closest('[data-node-id]') as HTMLElement;
        if (!nodeElement) {
            showMessage('Cannot find block ID', 3000, 'error');
            return;
        }

        const blockId = nodeElement.getAttribute('data-node-id');
        if (!blockId) {
            showMessage('Cannot find block ID', 3000, 'error');
            return;
        }

        // Get current highlights from attributes
        const groups = await this.getHighlightGroupsFromAttributes(blockId);

        // Remove line from all groups
        let removed = false;
        for (const group of groups) {
            const index = group.lines.indexOf(lineNumber);
            if (index !== -1) {
                group.lines.splice(index, 1);
                removed = true;
            }
        }

        // Remove empty groups
        const filteredGroups = groups.filter(g => g.lines.length > 0);

        // Save to attributes
        await this.saveHighlightGroupsToAttributes(blockId, filteredGroups);

        // Re-process the code block (fire and forget)
        this.processCodeBlock(codeBlock).catch(err => {
            console.error('Error processing code block:', err);
        });

        if (removed) {
            showMessage(`Highlight removed from line ${lineNumber}`, 2000, 'info');
        }
    }

    /**
     * Toggle highlight for a range of lines with a color
     */
    private async toggleHighlightRange(codeBlock: HTMLElement, startLine: number, endLine: number, color: 'yellow' | 'red' | 'green' | 'blue') {
        const nodeElement = codeBlock.closest('[data-node-id]') as HTMLElement;
        if (!nodeElement) {
            showMessage('Cannot find block ID', 3000, 'error');
            return;
        }

        const blockId = nodeElement.getAttribute('data-node-id');
        if (!blockId) {
            showMessage('Cannot find block ID', 3000, 'error');
            return;
        }

        // Get current highlights from attributes
        const groups = await this.getHighlightGroupsFromAttributes(blockId);

        // Find the group for this color
        let group = groups.find(g => g.color === color);
        if (!group) {
            group = { lines: [], color };
            groups.push(group);
        }

        // Add all lines in the range if not already present
        for (let line = startLine; line <= endLine; line++) {
            if (!group.lines.includes(line)) {
                group.lines.push(line);
            }
        }
        group.lines.sort((a, b) => a - b);

        // Save to attributes
        await this.saveHighlightGroupsToAttributes(blockId, groups);

        // Re-process the code block to apply changes (fire and forget)
        this.processCodeBlock(codeBlock).catch(err => {
            console.error('Error processing code block:', err);
        });

        const lineLabel = startLine === endLine ? `Line ${startLine}` : `Lines ${startLine}-${endLine}`;
        showMessage(`${lineLabel} highlighted in ${color}`, 2000, 'info');
    }

    /**
     * Remove highlight from a range of lines
     */
    private async removeHighlightFromLineRange(codeBlock: HTMLElement, startLine: number, endLine: number) {
        const nodeElement = codeBlock.closest('[data-node-id]') as HTMLElement;
        if (!nodeElement) {
            showMessage('Cannot find block ID', 3000, 'error');
            return;
        }

        const blockId = nodeElement.getAttribute('data-node-id');
        if (!blockId) {
            showMessage('Cannot find block ID', 3000, 'error');
            return;
        }

        // Get current highlights from attributes
        const groups = await this.getHighlightGroupsFromAttributes(blockId);

        // Remove lines from all groups
        let removed = false;
        for (let line = startLine; line <= endLine; line++) {
            for (const group of groups) {
                const index = group.lines.indexOf(line);
                if (index !== -1) {
                    group.lines.splice(index, 1);
                    removed = true;
                }
            }
        }

        // Remove empty groups
        const filteredGroups = groups.filter(g => g.lines.length > 0);

        // Save to attributes
        await this.saveHighlightGroupsToAttributes(blockId, filteredGroups);

        // Re-process the code block (fire and forget)
        this.processCodeBlock(codeBlock).catch(err => {
            console.error('Error processing code block:', err);
        });

        if (removed) {
            const lineLabel = startLine === endLine ? `line ${startLine}` : `lines ${startLine}-${endLine}`;
            showMessage(`Highlight removed from ${lineLabel}`, 2000, 'info');
        }
    }

    /**
     * Get highlight groups from block attributes
     */
    private async getHighlightGroupsFromAttributes(blockId: string): Promise<HighlightGroup[]> {
        try {
            const response = await fetchSyncPost('/api/attr/getBlockAttrs', { id: blockId });
            if (response.code !== 0) {
                console.warn('Failed to get block attributes:', response);
                return [];
            }

            const attrs = response.data || {};
            const groups: HighlightGroup[] = [];

            // Invert colorToAttr mapping for reading
            const attrToColor = Object.fromEntries(
                Object.entries(this.colorToAttr).map(([color, attr]) => [attr, color as 'yellow' | 'red' | 'green' | 'blue'])
            );

            for (const [attrName, color] of Object.entries(attrToColor)) {
                const value = attrs[attrName];
                if (value) {
                    const lines = this.parseLineSpec(value);
                    if (lines.length > 0) {
                        groups.push({ lines, color });
                    }
                }
            }

            return groups;
        } catch (error) {
            console.error('Error getting block attributes:', error);
            return [];
        }
    }

    /**
     * Save highlight groups to block attributes
     */
    private async saveHighlightGroupsToAttributes(blockId: string, groups: HighlightGroup[]): Promise<void> {
        try {
            const attrs: Record<string, string> = {};

            for (const group of groups) {
                const attrName = this.colorToAttr[group.color];
                if (attrName && group.lines.length > 0) {
                    attrs[attrName] = this.formatLineSpec(group.lines);
                }
            }

            // Also set empty strings for colors that are not used (to clear them)
            for (const color of Object.keys(this.colorToAttr)) {
                const attrName = this.colorToAttr[color];
                if (!(attrName in attrs)) {
                    attrs[attrName] = '';
                }
            }

            const response = await fetchSyncPost('/api/attr/setBlockAttrs', {
                id: blockId,
                attrs
            });

            if (response.code !== 0) {
                console.error('Failed to set block attributes:', response);
                showMessage('Failed to save highlights', 3000, 'error');
            }
        } catch (error) {
            console.error('Error setting block attributes:', error);
            showMessage('Failed to save highlights', 3000, 'error');
        }
    }

    /**
     * Format line numbers into a spec string like "1,3,5-7"
     */
    private formatLineSpec(lines: number[]): string {
        if (lines.length === 0) {
            return '';
        }

        const sorted = [...lines].sort((a, b) => a - b);
        const ranges: string[] = [];
        let rangeStart = sorted[0];
        let rangeEnd = sorted[0];

        for (let i = 1; i <= sorted.length; i++) {
            if (i < sorted.length && sorted[i] === rangeEnd + 1) {
                rangeEnd = sorted[i];
            } else {
                if (rangeStart === rangeEnd) {
                    ranges.push(`${rangeStart}`);
                } else if (rangeEnd === rangeStart + 1) {
                    ranges.push(`${rangeStart},${rangeEnd}`);
                } else {
                    ranges.push(`${rangeStart}-${rangeEnd}`);
                }

                if (i < sorted.length) {
                    rangeStart = sorted[i];
                    rangeEnd = sorted[i];
                }
            }
        }

        return ranges.join(',');
    }

    /**
     * CRITICAL: Remove any overlays that accidentally get into wrong places
     */
    private startCleanupObserver() {
        this.cleanupObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as HTMLElement;

                        // If an overlay wrapper was added, check if it's in the right place
                        if (element.classList?.contains('code-line-highlighter-overlay-wrapper')) {
                            const parent = element.parentElement;

                            // OK if in .protyle-linenumber__rows (our target location)
                            if (parent?.classList?.contains('protyle-linenumber__rows')) {
                                return; // This is correct!
                            }

                            // NOT OK if in .code-block, .hljs, or contenteditable area
                            if (parent && (parent.classList?.contains('code-block') ||
                                          parent.classList?.contains('hljs') ||
                                          parent.closest('.hljs'))) {
                                console.warn('🚨 Overlay wrapper found in wrong location - removing!', element);
                                element.remove();
                            }
                        }
                    }
                });
            });
        });

        // Observe all areas
        this.cleanupObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // console.log('🛡️ Cleanup observer active - overlays must be in .protyle-linenumber__rows');
    }

    /**
     * Start ResizeObserver to update highlight positions on window resize
     */
    private startResizeObserver() {
        this.resizeObserver = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                const codeBlock = entry.target as HTMLElement;
                if (codeBlock && codeBlock.classList.contains('code-block')) {
                    const spec = codeBlock.getAttribute('data-hl-active');
                    if (spec) {
                        // console.log('🔄 Resize detected for code block, updating dimensions');
                        // Re-apply highlights with updated dimensions
                        this.updateHighlightDimensions(codeBlock);
                    }
                }
            });
        });

        // Observe all code blocks
        document.querySelectorAll('.code-block').forEach((block) => {
            this.resizeObserver?.observe(block);
        });

        // console.log('📐 ResizeObserver active - highlights will adapt to window resize');
    }

    /**
     * Update highlight dimensions without re-parsing
     */
    private updateHighlightDimensions(codeBlock: HTMLElement) {
        const lineNumberRows = codeBlock.querySelector('.protyle-linenumber__rows') as HTMLElement;
    const wrapper = lineNumberRows?.querySelector('.code-line-highlighter-overlay-wrapper') as HTMLElement;
        const codeContentDiv = codeBlock.querySelector('.hljs div[contenteditable="true"]') as HTMLElement;

        if (!wrapper || !lineNumberRows || !codeContentDiv) {
            // console.log('⚠️ updateHighlightDimensions: Missing elements', {
            //     wrapper: !!wrapper,
            //     lineNumberRows: !!lineNumberRows,
            //     codeContentDiv: !!codeContentDiv
            // });
            return;
        }

        // Recalculate dimensions
        const lineNumberRect = lineNumberRows.getBoundingClientRect();
        const lineNumberWidth = lineNumberRect.width;
        const codeContentRect = codeContentDiv.getBoundingClientRect();
        const codeBlockRect = codeBlock.getBoundingClientRect();
        const codeContentStyle = window.getComputedStyle(codeContentDiv);
        const paddingLeft = parseFloat(codeContentStyle.paddingLeft) || 0;
        const contentLeftOffset = (codeContentRect.left - lineNumberRect.left) - paddingLeft;
        const contentWidth = codeContentRect.width;
        const wrapperWidth = lineNumberWidth + Math.abs(contentLeftOffset) + contentWidth;

        // console.log('📐 Updating dimensions:', {
        //     lineNumberWidth,
        //     contentLeftOffset,
        //     contentWidth,
        //     wrapperWidth
        // });

        // Update wrapper dimensions
        wrapper.style.width = `${wrapperWidth}px`;

        // Overlays don't need left position update - they're always at left: 0 relative to wrapper
        // console.log('✅ Dimensions updated - overlays remain at left: 0');
    }

    /**
     * Process all existing code blocks on page
     */
    private processAllCodeBlocks() {
        document.querySelectorAll('.code-block').forEach((block) => {
            // Fire and forget - no need to await
            this.processCodeBlock(block as HTMLElement).catch(err => {
                console.error('Error processing code block:', err);
            });
        });
    }

    /**
     * Schedule processing with debouncing to avoid multiple rapid calls
     */
    private scheduleProcessing(codeBlock: HTMLElement, delay: number) {
        // Clear existing timeout for this code block
        const existingTimeout = this.processingTimeouts.get(codeBlock);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Schedule new processing
        const timeout = window.setTimeout(() => {
            // Fire and forget - no need to await
            this.processCodeBlock(codeBlock).catch(err => {
                console.error('Error processing code block:', err);
            });
            this.processingTimeouts.delete(codeBlock);

            // Also observe for resizes
            if (this.resizeObserver && !codeBlock.dataset.resizeObserved) {
                this.resizeObserver.observe(codeBlock);
                codeBlock.dataset.resizeObserved = 'true';
            }
        }, delay);

        this.processingTimeouts.set(codeBlock, timeout);
    }

    /**
     * Start observing code blocks for changes
     */
    private observeCodeBlocks() {
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Check for data-render attribute changes
                if (mutation.type === 'attributes' && mutation.attributeName === 'data-render') {
                    const target = mutation.target as HTMLElement;
                    const codeBlock = target.closest('.code-block') as HTMLElement;
                    if (codeBlock) {
                        this.scheduleProcessing(codeBlock, 150);
                    }
                }

                // Check for new code blocks being added OR line numbers being re-rendered
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as HTMLElement;

                            // Check if the added node is a code block
                            if (element.classList?.contains('code-block')) {
                                this.scheduleProcessing(element, 150);
                                this.attachInputListener(element);
                            }

                            // Check for code blocks within the added node
                            element.querySelectorAll?.('.code-block').forEach((block) => {
                                this.scheduleProcessing(block as HTMLElement, 150);
                                this.attachInputListener(block as HTMLElement);
                            });

                            // IMPORTANT: If line numbers were re-created, re-apply highlights
                            if (element.classList?.contains('protyle-linenumber__rows')) {
                                const codeBlock = element.closest('.code-block') as HTMLElement;
                                if (codeBlock && codeBlock.getAttribute('data-hl-active')) {
                                    this.scheduleProcessing(codeBlock, 100);
                                }
                            }

                            // Check if this is a new document being loaded (protyle-wysiwyg)
                            if (element.classList?.contains('protyle-wysiwyg') ||
                                element.querySelector?.('.protyle-wysiwyg')) {
                                setTimeout(() => {
                                    this.processAllCodeBlocks();
                                    this.attachAllInputListeners();
                                }, 200);
                            }
                        }
                    });

                    // Check if line number rows were removed (means they'll be re-added)
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as HTMLElement;

                            // If line numbers were removed, the parent is mutation.target
                            if (element.classList?.contains('protyle-linenumber__rows')) {
                                const codeBlock = (mutation.target as HTMLElement).closest('.code-block') as HTMLElement;
                                if (codeBlock && codeBlock.getAttribute('data-hl-active')) {
                                    // Wait for new line numbers to be added
                                    setTimeout(() => {
                                        this.scheduleProcessing(codeBlock, 50);
                                    }, 150);
                                }
                            }
                        }
                    });
                }
            });
        });

        // Observe document.body to catch ALL changes, including new documents
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-render']
        });

        // console.log('👀 Observer active on document.body');
    }

    /**
     * Attach input listener to a code block's contenteditable area
     */
    private attachInputListener(codeBlock: HTMLElement) {
        const contentEditable = codeBlock.querySelector('.hljs div[contenteditable="true"]') as HTMLElement;
        if (!contentEditable) {
            return;
        }

        // Don't attach if already attached
        if (this.inputListeners.has(contentEditable)) {
            return;
        }

        const listener = (e: Event) => {
            // Only process if this code block has highlights
            const activeSpec = codeBlock.getAttribute('data-hl-active');
            if (activeSpec) {
                // console.log('⌨️ Input detected in highlighted code block, re-processing...');
                // Force re-processing after a short delay to let SiYuan finish its updates
                setTimeout(() => {
                    this.processCodeBlock(codeBlock).catch(err => {
                        console.error('Error processing code block:', err);
                    });
                }, 300);
            }
        };

        contentEditable.addEventListener('input', listener);
        this.inputListeners.set(contentEditable, listener);
        // console.log('🎧 Input listener attached to code block');
    }

    /**
     * Attach input listeners to all existing code blocks
     */
    private attachAllInputListeners() {
        document.querySelectorAll('.code-block').forEach((block) => {
            this.attachInputListener(block as HTMLElement);
        });
    }

    /**
     * Process a code block to check for highlight markers
     * Now reads from block attributes first, falls back to comment parsing
     */
    private async processCodeBlock(codeBlock: HTMLElement) {
        const hljsElement = codeBlock.querySelector('.hljs');
        if (!hljsElement) {
            return;
        }

        // Get block ID
        const nodeElement = codeBlock.closest('[data-node-id]') as HTMLElement;
        const blockId = nodeElement?.getAttribute('data-node-id');

        let groups: HighlightGroup[] = [];
        let spec = '';

        // First, try to read from block attributes
        if (blockId) {
            groups = await this.getHighlightGroupsFromAttributes(blockId);
            if (groups.length > 0) {
                // Generate spec string for tracking changes
                spec = groups.map(g => `${g.color}:${this.formatLineSpec(g.lines)}`).join(';');
            }
        }

        // Fall back to comment parsing if no attributes found (backward compatibility)
        if (groups.length === 0) {
            const text = hljsElement.textContent || '';
            const lines = text.split('\n');
            const firstLine = lines[0] || '';
            const marker = this.parseHighlightMarker(firstLine);

            if (marker) {
                groups = marker.groups;
                spec = marker.rawSpec;
            }
        }

        // Check existing overlays (stored as data attribute to avoid DOM pollution)
        const currentSpec = codeBlock.getAttribute('data-hl-active');

        if (groups.length > 0) {
            // Check if overlays still exist
            const existingWrapper = codeBlock.querySelector('.protyle-linenumber__rows .code-line-highlighter-overlay-wrapper');

            // Update if: spec changed OR no highlights exist (they were removed by SiYuan)
            if (!currentSpec || currentSpec !== spec || !existingWrapper) {
                // Remove old highlights FIRST
                this.removeHighlights(codeBlock);

                // Enable line numbers if not already enabled
                this.enableLineNumbers(codeBlock);

                // Wait a bit for line numbers to render, then apply
                setTimeout(() => {
                    this.applyHighlight(codeBlock, groups, spec);
                }, 100);
            }
            // else: highlights are already correct and still exist, don't touch them!
        } else if (currentSpec) {
            // No highlights found but highlights exist - remove them
            this.removeHighlights(codeBlock);
        }
    }

    /**
     * Enable line numbers for a code block
     */
    private enableLineNumbers(codeBlock: HTMLElement) {
        // Check if line numbers are already enabled
        if (codeBlock.querySelector('.protyle-linenumber__rows')) {
            return;
        }

        // Find the parent node element
        const nodeElement = codeBlock.closest('[data-node-id]') as HTMLElement;
        if (!nodeElement) {
            return;
        }

        // Set the linenumber attribute
        nodeElement.setAttribute('linenumber', 'true');

        // Remove data-render to force re-render with line numbers
        const hljsElement = codeBlock.querySelector('.hljs');
        if (hljsElement) {
            hljsElement.removeAttribute('data-render');
        }
    }

    /**
     * Remove existing highlights for a code block
     */
    private removeHighlights(codeBlock: HTMLElement) {
        // Find line number rows and remove ALL overlays from there
        const lineNumberRows = codeBlock.querySelector('.protyle-linenumber__rows');
        if (lineNumberRows) {
            const wrappers = lineNumberRows.querySelectorAll('.code-line-highlighter-overlay-wrapper');
            if (wrappers.length > 0) {
                wrappers.forEach(el => el.remove());
            }
        }

        // Also clean up from wysiwyg container (from v1.8.0/1.8.1)
        const codeBlockId = this.getCodeBlockId(codeBlock);
        const wysiwygContainer = codeBlock.closest('.protyle-wysiwyg');
        if (wysiwygContainer) {
            wysiwygContainer.querySelectorAll(`.code-line-highlighter-overlay-wrapper[data-code-block-id="${codeBlockId}"]`)
                .forEach(el => el.remove());
        }

        // Clean up any other old overlays
        codeBlock.querySelectorAll('.code-line-highlighter-overlay-wrapper, .code-line-highlighter-container')
            .forEach(el => el.remove());

        // Remove data attribute AFTER cleanup
        codeBlock.removeAttribute('data-hl-active');
    }

    /**
     * Get or create a unique ID for a code block
     */
    private getCodeBlockId(codeBlock: HTMLElement): string {
        const nodeElement = codeBlock.closest('[data-node-id]') as HTMLElement;
        return nodeElement?.getAttribute('data-node-id') || 'unknown';
    }

    /**
     * Apply highlighting by attaching overlays to .protyle-linenumber__rows
     * CRITICAL: Overlays are placed IN .protyle-linenumber__rows which is contenteditable="false"
     * Supports multi-color highlighting with different colors for different line groups
     */
    private applyHighlight(codeBlock: HTMLElement, groups: HighlightGroup[], spec: string) {
        const lineNumberRows = codeBlock.querySelector('.protyle-linenumber__rows') as HTMLElement;
        if (!lineNumberRows) {
            return;
        }

        // IMPORTANT: Check if wrapper already exists - avoid duplicates!
        const existingWrappers = lineNumberRows.querySelectorAll('.code-line-highlighter-overlay-wrapper');
        if (existingWrappers.length > 0) {
            // console.info(`⚠️ Wrapper already exists (${existingWrappers.length}), removing before adding new one`);
            existingWrappers.forEach(el => el.remove());
        }

        const lineSpans = lineNumberRows.querySelectorAll('span');
        if (lineSpans.length === 0) {
            return;
        }

        const codeBlockId = this.getCodeBlockId(codeBlock);

        // Mark code block as having highlights (for tracking)
        codeBlock.setAttribute('data-hl-active', spec);

        // Make sure line number container is positioned
        lineNumberRows.style.position = 'relative';

        // Get the contenteditable code div (sibling of line numbers)
        const hljsElement = codeBlock.querySelector('.hljs') as HTMLElement;
        const codeContentDiv = hljsElement?.querySelector('div[contenteditable="true"]') as HTMLElement;

        if (!codeContentDiv) {
            console.warn('Could not find contenteditable code div');
            return;
        }

        // Get the width of the line numbers column
        const lineNumberRect = lineNumberRows.getBoundingClientRect();
        const lineNumberWidth = lineNumberRect.width;

        // Get the position of the code content area and its computed styles
        const codeContentRect = codeContentDiv.getBoundingClientRect();
        const codeBlockRect = codeBlock.getBoundingClientRect();

        // Get padding from contenteditable div
        const codeContentStyle = window.getComputedStyle(codeContentDiv);
        const paddingLeft = parseFloat(codeContentStyle.paddingLeft) || 0;

        // Calculate offset: distance from line numbers to content, minus left padding
        const contentLeftOffset = (codeContentRect.left - lineNumberRect.left) - paddingLeft;

        // Calculate proper width: content width + absolute value of negative offset
        // If contentLeftOffset is negative, we need to add its absolute value to cover the full area
        const contentWidth = codeContentRect.width;
        const wrapperWidth = lineNumberWidth + Math.abs(contentLeftOffset) + contentWidth;

        // console.log(`📏 Measurements: lineNumberWidth=${lineNumberWidth}, contentLeftOffset=${contentLeftOffset}, contentWidth=${contentWidth}, paddingLeft=${paddingLeft}, wrapperWidth=${wrapperWidth}, codeContentRect.width=${codeContentRect.width}`);

        // Create wrapper to hold all overlays
        const wrapper = document.createElement('div');
    wrapper.className = 'code-line-highlighter-overlay-wrapper';
        wrapper.setAttribute('data-code-block-id', codeBlockId);
        wrapper.setAttribute('data-hl-spec', spec);

        // Position wrapper with NEGATIVE left to align with code block left edge
        wrapper.style.position = 'absolute';
        wrapper.style.left = `-${lineNumberWidth}px`;
        wrapper.style.top = '0';
        wrapper.style.width = `${wrapperWidth}px`;
        wrapper.style.height = '100%';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.zIndex = '10';

        // Create overlays for each group with its specific color
        groups.forEach(group => {
            const colorTheme = this.colors[group.color];

            group.lines.forEach(lineNum => {
                const lineIndex = lineNum - 1;
                if (lineIndex >= 0 && lineIndex < lineSpans.length) {
                    const lineSpan = lineSpans[lineIndex] as HTMLElement;

                    // Get position relative to the line number container
                    const spanTop = lineSpan.offsetTop;
                    const spanHeight = lineSpan.offsetHeight;

                    const overlay = document.createElement('div');
                    overlay.className = 'code-line-highlighter-overlay';
                    overlay.setAttribute('data-color', group.color);
                    overlay.style.position = 'absolute';
                    overlay.style.left = '0';  // Wrapper already positioned, start at wrapper's left edge
                    overlay.style.right = '0';
                    overlay.style.top = spanTop + 'px';
                    overlay.style.height = spanHeight + 'px';
                    overlay.style.backgroundColor = colorTheme.background;
                    // Use box-shadow instead of border to ensure it's visible
                    overlay.style.boxShadow = `inset 3px 0 0 ${colorTheme.border}`;
                    overlay.style.pointerEvents = 'none';

                    wrapper.appendChild(overlay);
                }
            });
        });

        // Insert wrapper INTO .protyle-linenumber__rows (NOT into wysiwyg!)
        lineNumberRows.appendChild(wrapper);

        // console.log('✅ Overlay wrapper added to .protyle-linenumber__rows for code block', codeBlockId);
    }

    /**
     * Parse highlight marker from first line - supports multi-color syntax
     * Examples:
     * // hl:1,3-5              -> yellow (default)
     * // hlr:1;hlg:3;hlb:5-7   -> red line 1, green line 3, blue lines 5-7
     */
    private parseHighlightMarker(line: string): { groups: HighlightGroup[], rawSpec: string } | null {
        const commentPatterns = [
            /^\/\/\s*(.+)$/,           // // ...
            /^#\s*(.+)$/,              // # ...
            /^<!--\s*(.+?)\s*-->$/,    // <!-- ... -->
            /^\/\*\s*(.+?)\s*\*\/$/    // /* ... */
        ];

        let content = '';
        for (const pattern of commentPatterns) {
            const match = line.trim().match(pattern);
            if (match) {
                content = match[1].trim();
                break;
            }
        }

        if (!content) {
            return null;
        }

        // Parse multi-color syntax: hlr:1;hlg:3;hlb:5-7 or hl:1,3-5
        const groups: HighlightGroup[] = [];
        const highlightPattern = /hl([rgby])?:([0-9,\-]+)/g;
        let match;
        let hasMatch = false;

        while ((match = highlightPattern.exec(content)) !== null) {
            hasMatch = true;
            const colorCode = match[1] || 'y'; // Default to yellow
            const spec = match[2];
            const lines = this.parseLineSpec(spec);

            const color = this.getColorFromCode(colorCode);
            groups.push({ lines, color });
        }

        if (!hasMatch) {
            return null;
        }

        return { groups, rawSpec: content };
    }

    /**
     * Map color code to color name
     */
    private getColorFromCode(code: string): 'yellow' | 'red' | 'green' | 'blue' {
        const colorMap: Record<string, 'yellow' | 'red' | 'green' | 'blue'> = {
            'y': 'yellow',
            'r': 'red',
            'g': 'green',
            'b': 'blue'
        };
        return colorMap[code] || 'yellow';
    }

    /**
     * Parse line specification like "1,3-5,8"
     */
    private parseLineSpec(spec: string): number[] {
        const lines = new Set<number>();
        const parts = spec.split(',');

        for (const part of parts) {
            const trimmed = part.trim();

            if (trimmed.includes('-')) {
                // Range like "3-5"
                const [start, end] = trimmed.split('-').map(s => parseInt(s.trim(), 10));
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = start; i <= end; i++) {
                        lines.add(i);
                    }
                }
            } else {
                // Single line like "3"
                const lineNum = parseInt(trimmed, 10);
                if (!isNaN(lineNum)) {
                    lines.add(lineNum);
                }
            }
        }

        return Array.from(lines).sort((a, b) => a - b);
    }

    onunload() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        if (this.cleanupObserver) {
            this.cleanupObserver.disconnect();
            this.cleanupObserver = null;
        }

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // Clear all timeouts
        this.processingTimeouts.forEach(timeout => clearTimeout(timeout));
        this.processingTimeouts.clear();

        // Clean up all overlay wrappers (no scroll listeners to remove anymore)
    document.querySelectorAll('.code-line-highlighter-overlay-wrapper').forEach(el => el.remove());

        // Clean up any old-style containers (from previous versions)
    document.querySelectorAll('.code-line-highlighter-container').forEach(el => el.remove());
    }
}
