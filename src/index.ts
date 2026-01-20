import { Plugin, fetchSyncPost, showMessage, Setting } from "siyuan";
import "./index.css";

// Type definitions
interface HighlightGroup {
    lines: number[];
    color: 'yellow' | 'red' | 'green' | 'blue';
}

interface ColorTheme {
    background: string;
    border: string;
}

const COLORS = ['yellow', 'red', 'green', 'blue'] as const;
type ColorName = typeof COLORS[number];

export default class LineHighlightPlugin extends Plugin {
    private observer: MutationObserver | null = null;
    private processingTimeouts: Map<HTMLElement, number> = new Map();
    private cleanupObserver: MutationObserver | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private inputListeners: WeakMap<HTMLElement, (e: Event) => void> = new WeakMap();

    // Map colors to attribute names
    private readonly colorToAttr: Record<string, string> = {
        'yellow': 'custom-hl', 'red': 'custom-hlr', 'green': 'custom-hlg', 'blue': 'custom-hlb'
    };

    // Default color configurations
    private readonly defaultColors: Record<string, ColorTheme> = {
        yellow: { background: 'rgba(255, 193, 7, 0.2)', border: '#ffc107' },
        red: { background: 'rgba(244, 67, 54, 0.2)', border: '#f44336' },
        green: { background: 'rgba(76, 175, 80, 0.2)', border: '#4caf50' },
        blue: { background: 'rgba(33, 150, 243, 0.2)', border: '#2196f3' }
    };

    private colors: Record<string, ColorTheme> = {};
    private config: { autoEnableLineNumber: boolean, defaultColor: string } = { autoEnableLineNumber: true, defaultColor: 'yellow' };

    async onload() {
        console.log('LineHighlightPlugin: onload');
        await this.loadConfig();
        await this.loadCustomColors();
        this.startCleanupObserver();

        // Staggered initialization
        setTimeout(() => this.processAllCodeBlocks(), 500);
        setTimeout(() => this.attachAllInputListeners(), 600);
        setTimeout(() => this.startResizeObserver(), 700);
        setTimeout(() => this.observeCodeBlocks(), 600);

        this.eventBus.on("open-menu-content", this.handleContextMenu.bind(this));
    }

    onLayoutReady() {
        console.log('LineHighlightPlugin: onLayoutReady');
        this.setupSettings();
    }

    private async loadConfig() {
        try {
            const loaded = await this.loadData('config.json');
            if (loaded) {
                this.config = { ...this.config, ...loaded };
            }
        } catch (e) {
            console.error('Error loading config:', e);
        }
    }

    private async saveConfig() {
        await this.saveData('config.json', this.config);
    }

    private async loadCustomColors() {
        console.log('LineHighlightPlugin: loadCustomColors');
        try {
            const custom = await this.loadData('colors.json');
            this.colors = { ...this.defaultColors, ...custom };
        } catch (e) {
            console.error('Error loading custom colors:', e);
            this.colors = { ...this.defaultColors };
        }
    }

    private async saveCustomColors() {
        console.log('LineHighlightPlugin: saveCustomColors');
        await this.saveData('colors.json', this.colors);
        this.processAllCodeBlocks();
    }

    /**
     * Helper to create DOM elements concisely
     */
    private createElement<K extends keyof HTMLElementTagNameMap>(
        tag: K,
        styles: Partial<CSSStyleDeclaration> = {},
        props: Record<string, any> = {},
        children: (HTMLElement | string)[] = []
    ): HTMLElementTagNameMap[K] {
        const el = document.createElement(tag);
        Object.assign(el.style, styles);
        Object.entries(props).forEach(([k, v]) => {
            if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.substring(2).toLowerCase(), v);
            else el.setAttribute(k, v);
        });
        children.forEach(c => typeof c === 'string' ? el.textContent = c : el.appendChild(c));
        return el;
    }

    private setupSettings() {
        if (!this.setting) this.setting = new Setting({ confirmCallback: () => {} });

        this.setting.addItem({
            title: '',
            description: '',
            direction: 'column',
            createActionElement: () => {
                const wrapper = this.createElement('div', { display: 'flex', flexDirection: 'column', width: '100%', marginBottom: '10px' });

                // Custom Title
                wrapper.appendChild(this.createElement('div', { fontWeight: 'bold', marginBottom: '5px' }, {}, ['Auto Enable Line Numbers']));

                const container = this.createElement('div', { display: 'flex', alignItems: 'center', width: '100%' });
                const switchEl = this.createElement('input', { cursor: 'pointer' }, { type: 'checkbox' });
                if (this.config.autoEnableLineNumber) switchEl.checked = true;
                switchEl.addEventListener('change', async () => {
                    this.config.autoEnableLineNumber = switchEl.checked;
                    await this.saveConfig();
                });
                container.appendChild(switchEl);
                container.appendChild(this.createElement('span', { marginLeft: '8px' }, {}, ['Automatically enable line numbers when adding highlights (Required for highlights to show properly)']));

                wrapper.appendChild(container);
                return wrapper;
            }
        });

        this.setting.addItem({
            title: '',
            description: '',
            direction: 'column',
            createActionElement: () => {
                const wrapper = this.createElement('div', { display: 'flex', flexDirection: 'column', width: '100%' });

                // Custom Title & Description
                wrapper.appendChild(this.createElement('div', { fontWeight: 'bold', marginBottom: '5px' }, {}, ['Highlight Colors']));
                wrapper.appendChild(this.createElement('div', { marginBottom: '10px' }, {}, ['Customize the colors used for code line highlighting']));

                const container = this.createElement('div', { display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' });

                COLORS.forEach(colorName => {
                    const row = this.createElement('div',
                        { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', border: '1px solid var(--b3-border-color)', borderRadius: '4px' },
                        { 'data-color-name': colorName }
                    );

                    // Default Color Radio
                    const defaultRadio = this.createElement('input', { cursor: 'pointer' }, { type: 'radio', name: 'hl-default-color' });
                    if (this.config.defaultColor === colorName) defaultRadio.checked = true;

                    defaultRadio.addEventListener('change', async () => {
                        if (defaultRadio.checked) {
                            this.config.defaultColor = colorName;
                            await this.saveConfig();
                        }
                    });

                    // Inputs
                    const bgInput = this.createElement('input', { width: '50px', height: '30px', border: 'none', cursor: 'pointer' }, { type: 'color', value: this.rgbaToHex(this.colors[colorName].background) });
                    const opacityInput = this.createElement('input', { width: '100px' }, { type: 'range', min: '0', max: '100', value: String(this.extractOpacity(this.colors[colorName].background) * 100) });
                    const borderInput = this.createElement('input', { width: '50px', height: '30px', border: 'none', cursor: 'pointer' }, { type: 'color', value: this.colors[colorName].border });

                    // Event Listeners
                    bgInput.addEventListener('change', async () => {
                        const opacity = this.extractOpacity(this.colors[colorName].background);
                        this.colors[colorName].background = this.hexToRgba(bgInput.value, opacity);
                        await this.saveCustomColors();
                    });
                    opacityInput.addEventListener('input', async () => {
                        const hex = this.rgbaToHex(this.colors[colorName].background);
                        this.colors[colorName].background = this.hexToRgba(hex, parseFloat(opacityInput.value) / 100);
                        await this.saveCustomColors();
                    });
                    borderInput.addEventListener('change', async () => {
                        this.colors[colorName].border = borderInput.value;
                        await this.saveCustomColors();
                    });

                    // Reset Button
                    const resetBtn = this.createElement('button',
                        { padding: '4px 8px', marginLeft: 'auto', cursor: 'pointer', border: '1px solid var(--b3-border-color)', borderRadius: '4px', background: 'var(--b3-theme-background)' },
                        { title: 'Reset to default', onclick: async () => {
                            this.colors[colorName] = { ...this.defaultColors[colorName] };
                            bgInput.value = this.rgbaToHex(this.colors[colorName].background);
                            opacityInput.value = String(this.extractOpacity(this.colors[colorName].background) * 100);
                            borderInput.value = this.colors[colorName].border;
                            await this.saveCustomColors();
                        }}, ['↺']
                    );

                    row.append(
                        this.createElement('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '8px' }, {}, [
                            this.createElement('span', { fontSize: '10px', color: 'var(--b3-theme-on-surface)' }, {}, ['Default']),
                            defaultRadio
                        ]),
                        this.createElement('div', { minWidth: '80px', fontWeight: '500' }, {}, [colorName.charAt(0).toUpperCase() + colorName.slice(1)]),
                        this.createElement('span', { fontSize: '12px', color: 'var(--b3-theme-on-surface)' }, {}, ['Background:']), bgInput,
                        this.createElement('span', { fontSize: '12px', color: 'var(--b3-theme-on-surface)', marginLeft: '8px' }, {}, ['Opacity:']), opacityInput,
                        this.createElement('span', { fontSize: '12px', color: 'var(--b3-theme-on-surface)', marginLeft: '8px' }, {}, ['Border:']), borderInput,
                        resetBtn
                    );
                    container.appendChild(row);
                });

                // Reset All Button
                container.appendChild(this.createElement('button',
                    { padding: '8px 16px', cursor: 'pointer', border: '1px solid var(--b3-border-color)', borderRadius: '4px', background: 'var(--b3-theme-background)', marginTop: '8px' },
                    { onclick: async () => {
                        this.colors = { ...this.defaultColors };
                        await this.saveCustomColors();
                        this.setupSettings(); // Refresh UI
                    }}, ['Reset All Colors to Default']
                ));

                wrapper.appendChild(container);
                return wrapper;
            }
        });
    }

    private rgbaToHex(rgba: string): string {
        const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return '#000000';
        return '#' + [match[1], match[2], match[3]].map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
    }

    private hexToRgba(hex: string, opacity: number): string {
        const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    private extractOpacity(rgba: string): number {
        const match = rgba.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)/);
        return match ? parseFloat(match[1]) : 0.2;
    }

    private handleContextMenu(event: CustomEvent<any>) {
        console.log('LineHighlightPlugin: handleContextMenu');
        const { menu, element, range } = event.detail;
        const codeBlock = element?.closest('.code-block') as HTMLElement;
        if (!codeBlock) return;

        const lineRange = this.getLineRangeFromSelection(codeBlock, range);
        if (!lineRange) return;

        const { startLine, endLine } = lineRange;
        const label = startLine !== endLine ? `lines ${startLine}-${endLine}` : `line ${startLine}`;

        menu.addSeparator();

        const defaultColor = this.config.defaultColor || 'yellow';

        // 1. Default Color Action (Quick Access)
        menu.addItem({
            label: `Highlight ${label} (${defaultColor.charAt(0).toUpperCase() + defaultColor.slice(1)})`,
            iconHTML: `<span style="color: ${this.colors[defaultColor].border};">●</span>`,
            click: () => this.modifyBlockHighlights(codeBlock, (groups) => {
                let group = groups.find(g => g.color === defaultColor);
                if (!group) { group = { lines: [], color: defaultColor as any }; groups.push(group); }
                for (let l = startLine; l <= endLine; l++) if (!group.lines.includes(l)) group.lines.push(l);
                group.lines.sort((a, b) => a - b);
                return groups;
            }, `${label} highlighted in ${defaultColor}`)
        });

        // 2. Submenu with all colors
        const submenu: any[] = [];
        COLORS.forEach(color => {
            submenu.push({
                label: `${color.charAt(0).toUpperCase() + color.slice(1)}`,
                iconHTML: `<span style="color: ${this.colors[color].border};">●</span>`,
                click: () => this.modifyBlockHighlights(codeBlock, (groups) => {
                    let group = groups.find(g => g.color === color);
                    if (!group) { group = { lines: [], color }; groups.push(group); }
                    for (let l = startLine; l <= endLine; l++) if (!group.lines.includes(l)) group.lines.push(l);
                    group.lines.sort((a, b) => a - b);
                    return groups;
                }, `${label} highlighted in ${color}`)
            });
        });

        menu.addItem({
            label: "All Colors",
            icon: "iconTheme",
            type: "submenu",
            submenu: submenu
        });

        // 3. Remove Highlight Action
        menu.addItem({
            label: `Remove highlight from ${label}`, iconHTML: '🚫',
            click: () => this.modifyBlockHighlights(codeBlock, (groups) => {
                let removed = false;
                for (let l = startLine; l <= endLine; l++) {
                    groups.forEach(g => {
                        const idx = g.lines.indexOf(l);
                        if (idx !== -1) { g.lines.splice(idx, 1); removed = true; }
                    });
                }
                return removed ? groups.filter(g => g.lines.length > 0) : groups; // Filter empty
            }, `Highlight removed from ${label}`)
        });
    }

    private getLineRangeFromSelection(codeBlock: HTMLElement, range: Range): { startLine: number, endLine: number } | null {
        if (!range) return null;
        const codeContentDiv = codeBlock.querySelector('.hljs div[contenteditable="true"]') as HTMLElement;
        if (!codeContentDiv) return null;

        const lines = (codeContentDiv.textContent || '').split('\n');

        const getLine = (node: Node, offset: number) => {
            let totalOffset = this.calculateOffset(node, offset, codeContentDiv);
            if (totalOffset === null) return null;

            let current = 0;
            for (let i = 0; i < lines.length; i++) {
                current += lines[i].length + 1;
                if (totalOffset < current) return i + 1;
            }
            return lines.length;
        };

        const startLine = getLine(range.startContainer, range.startOffset);
        const endLine = getLine(range.endContainer, range.endOffset);

        return (startLine && endLine) ? { startLine, endLine } : null;
    }

    private calculateOffset(node: Node, offset: number, root: HTMLElement): number | null {
        let n: Node | null = node;
        if (n.nodeType !== Node.TEXT_NODE) {
            const walker = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, null);
            n = walker.nextNode();
            if (!n) return null;
        }

        let total = offset;
        while (n && n !== root) {
            if (n.previousSibling) {
                total += n.previousSibling.textContent?.length || 0;
                n = n.previousSibling;
            } else {
                n = n.parentNode;
            }
        }
        return total;
    }

    private async modifyBlockHighlights(codeBlock: HTMLElement, action: (groups: HighlightGroup[]) => HighlightGroup[], successMsg?: string) {
        console.log('LineHighlightPlugin: modifyBlockHighlights');
        const nodeElement = codeBlock.closest('[data-node-id]') as HTMLElement;
        const blockId = nodeElement?.getAttribute('data-node-id');
        if (!blockId) { showMessage('Cannot find block ID', 3000, 'error'); return; }

        let groups = await this.getHighlightGroupsFromAttributes(blockId);
        groups = action(groups);

        await this.saveHighlightGroupsToAttributes(blockId, groups, codeBlock);

        // Immediate local update
        this.processCodeBlock(codeBlock);

        if (successMsg) showMessage(successMsg, 2000, 'info');
    }

    private async getHighlightGroupsFromAttributes(blockId: string): Promise<HighlightGroup[]> {
        console.log('LineHighlightPlugin: getHighlightGroupsFromAttributes', blockId);
        const response = await fetchSyncPost('/api/attr/getBlockAttrs', { id: blockId });
        const attrs = response.data || {};
        const groups: HighlightGroup[] = [];

        Object.entries(this.colorToAttr).forEach(([color, attr]) => {
            const val = attrs[attr];
            if (val) {
                const lines = this.parseLineSpec(val);
                if (lines.length) groups.push({ lines, color: color as ColorName });
            }
        });
        return groups;
    }

    private async saveHighlightGroupsToAttributes(blockId: string, groups: HighlightGroup[], codeBlock?: HTMLElement): Promise<void> {
        console.log('LineHighlightPlugin: saveHighlightGroupsToAttributes', blockId, groups);
        const attrs: Record<string, string> = {};
        const hasHighlights = groups.length > 0;

        groups.forEach(g => {
            if (g.lines.length) attrs[this.colorToAttr[g.color]] = this.formatLineSpec(g.lines);
        });

        Object.keys(this.colorToAttr).forEach(c => {
            const attr = this.colorToAttr[c];
            if (!attrs[attr]) attrs[attr] = '';
        });

        // CRITICAL FIX: Ensure linenumber is set if highlights exist
        if (hasHighlights && this.config.autoEnableLineNumber) {
            attrs['linenumber'] = 'true';
        }

        await fetchSyncPost('/api/attr/setBlockAttrs', { id: blockId, attrs });

        // CRITICAL FIX: Force UI update immediately if we enabled line numbers
        if (hasHighlights && codeBlock && this.config.autoEnableLineNumber) {
            const nodeElement = codeBlock.closest('[data-node-id]') as HTMLElement;
            if (nodeElement) {
                // 1. Set DOM attribute immediately
                nodeElement.setAttribute('linenumber', 'true');

                // 2. Dispatch input event to contenteditable to wake up editor
                const content = codeBlock.querySelector('.hljs div[contenteditable="true"]');
                if (content) {
                    content.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                }

                // 3. Remove data-render to trigger Siyuan re-render
                codeBlock.querySelector('.hljs')?.removeAttribute('data-render');
            }
        }
    }

    private formatLineSpec(lines: number[]): string {
        if (!lines.length) return '';
        const sorted = [...lines].sort((a, b) => a - b);
        const ranges: string[] = [];
        let start = sorted[0], end = sorted[0];

        for (let i = 1; i <= sorted.length; i++) {
            if (i < sorted.length && sorted[i] === end + 1) {
                end = sorted[i];
            } else {
                ranges.push(start === end ? `${start}` : (end === start + 1 ? `${start},${end}` : `${start}-${end}`));
                if (i < sorted.length) start = end = sorted[i];
            }
        }
        return ranges.join(',');
    }

    private startCleanupObserver() {
        this.cleanupObserver = new MutationObserver((mutations) => {
            mutations.forEach((m) => m.addedNodes.forEach((n) => {
                if (n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).classList?.contains('code-line-highlighter-overlay-wrapper')) {
                    const p = n.parentElement;
                    if (p?.classList?.contains('protyle-linenumber__rows')) return;
                    if (p && (p.classList?.contains('code-block') || p.classList?.contains('hljs') || p.closest('.hljs'))) {
                        (n as HTMLElement).remove();
                    }
                }
            }));
        });
        this.cleanupObserver.observe(document.body, { childList: true, subtree: true });
    }

    private startResizeObserver() {
        this.resizeObserver = new ResizeObserver((entries) => {
            entries.forEach(e => {
                const block = e.target as HTMLElement;
                if (block.getAttribute('data-hl-active')) this.updateHighlightDimensions(block);
            });
        });
        document.querySelectorAll('.code-block').forEach(b => this.resizeObserver?.observe(b));
    }

    private updateHighlightDimensions(codeBlock: HTMLElement) {
        const rows = codeBlock.querySelector('.protyle-linenumber__rows') as HTMLElement;
        const wrapper = rows?.querySelector('.code-line-highlighter-overlay-wrapper') as HTMLElement;
        const content = codeBlock.querySelector('.hljs div[contenteditable="true"]') as HTMLElement;

        if (!wrapper || !rows || !content) return;

        const rowRect = rows.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const padding = parseFloat(window.getComputedStyle(content).paddingLeft) || 0;
        const offset = (contentRect.left - rowRect.left) - padding;
        const totalWidth = rowRect.width + Math.abs(offset) + contentRect.width - 10;

        // CRITICAL FIX: Wrapper has 0 width to not affect layout, overlays have full width
        wrapper.style.width = '0px';

        const overlays = wrapper.querySelectorAll('.code-line-highlighter-overlay');
        overlays.forEach(overlay => {
            (overlay as HTMLElement).style.width = `${totalWidth}px`;
        });
    }

    private processAllCodeBlocks() {
        console.log('LineHighlightPlugin: processAllCodeBlocks');
        document.querySelectorAll('.code-block').forEach(b => this.processCodeBlock(b as HTMLElement));
    }

    private scheduleProcessing(block: HTMLElement, delay: number) {
        // console.log('LineHighlightPlugin: scheduleProcessing', block); // Might be too noisy
        if (this.processingTimeouts.has(block)) clearTimeout(this.processingTimeouts.get(block));
        this.processingTimeouts.set(block, window.setTimeout(() => {
            this.processCodeBlock(block);
            this.processingTimeouts.delete(block);
            if (this.resizeObserver && !block.dataset.resizeObserved) {
                this.resizeObserver.observe(block);
                block.dataset.resizeObserved = 'true';
            }
        }, delay));
    }

    private observeCodeBlocks() {
        console.log('LineHighlightPlugin: observeCodeBlocks');
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((m) => {
                if (m.type === 'attributes' && m.attributeName === 'data-render') {
                    const block = (m.target as HTMLElement).closest('.code-block');
                    if (block) this.scheduleProcessing(block as HTMLElement, 150);
                } else if (m.type === 'childList') {
                    m.addedNodes.forEach(n => {
                        if (n.nodeType !== Node.ELEMENT_NODE) return;
                        const el = n as HTMLElement;
                        if (el.classList?.contains('code-block')) {
                            this.scheduleProcessing(el, 150);
                            this.attachInputListener(el);
                        }
                        el.querySelectorAll?.('.code-block').forEach(b => {
                            this.scheduleProcessing(b as HTMLElement, 150);
                            this.attachInputListener(b as HTMLElement);
                        });
                        if (el.classList?.contains('protyle-linenumber__rows')) {
                            const block = el.closest('.code-block') as HTMLElement;
                            if (block?.getAttribute('data-hl-active')) this.scheduleProcessing(block, 100);
                        }
                    });
                }
            });
        });
        this.observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-render'] });
    }

    private attachInputListener(codeBlock: HTMLElement) {
        // console.log('LineHighlightPlugin: attachInputListener', codeBlock); // Might be too noisy
        const content = codeBlock.querySelector('.hljs div[contenteditable="true"]') as HTMLElement;
        if (!content || this.inputListeners.has(content)) return;
        const fn = () => {
            if (codeBlock.getAttribute('data-hl-active')) setTimeout(() => this.processCodeBlock(codeBlock), 300);
        };
        content.addEventListener('input', fn);
        this.inputListeners.set(content, fn);
    }

    private attachAllInputListeners() {
        document.querySelectorAll('.code-block').forEach(b => this.attachInputListener(b as HTMLElement));
    }

    private async processCodeBlock(codeBlock: HTMLElement) {
        console.log('LineHighlightPlugin: processCodeBlock');
        const node = codeBlock.closest('[data-node-id]') as HTMLElement;
        const blockId = node?.getAttribute('data-node-id');
        let groups: HighlightGroup[] = [], spec = '';

        if (blockId) {
            groups = await this.getHighlightGroupsFromAttributes(blockId);
            if (groups.length) spec = groups.map(g => `${g.color}:${this.formatLineSpec(g.lines)}`).join(';');
        }

        if (!groups.length) {
            const firstLine = (codeBlock.querySelector('.hljs')?.textContent || '').split('\n')[0] || '';
            const marker = this.parseHighlightMarker(firstLine);
            if (marker) { groups = marker.groups; spec = marker.rawSpec; }
        }

        const currentSpec = codeBlock.getAttribute('data-hl-active');
        const existingWrapper = codeBlock.querySelector('.protyle-linenumber__rows .code-line-highlighter-overlay-wrapper');

        if (groups.length > 0) {
            if (!currentSpec || currentSpec !== spec || !existingWrapper) {
                this.removeHighlights(codeBlock);
                this.enableLineNumbers(codeBlock);
                setTimeout(() => this.applyHighlight(codeBlock, groups, spec), 100);
            }
        } else if (currentSpec) {
            this.removeHighlights(codeBlock);
        }
    }

    private enableLineNumbers(codeBlock: HTMLElement) {
        if (!this.config.autoEnableLineNumber) return;
        console.log('LineHighlightPlugin: enableLineNumbers');
        if (codeBlock.querySelector('.protyle-linenumber__rows')) return;
        const node = codeBlock.closest('[data-node-id]') as HTMLElement;
        if (node) {
            node.setAttribute('linenumber', 'true');
            codeBlock.querySelector('.hljs')?.removeAttribute('data-render');
        }
    }

    private removeHighlights(codeBlock: HTMLElement) {
        console.log('LineHighlightPlugin: removeHighlights');
        codeBlock.querySelectorAll('.code-line-highlighter-overlay-wrapper, .code-line-highlighter-container').forEach(el => el.remove());
        const id = this.getCodeBlockId(codeBlock);
        codeBlock.closest('.protyle-wysiwyg')?.querySelectorAll(`.code-line-highlighter-overlay-wrapper[data-code-block-id="${id}"]`).forEach(el => el.remove());
        codeBlock.removeAttribute('data-hl-active');
    }

    private getCodeBlockId(codeBlock: HTMLElement): string {
        return codeBlock.closest('[data-node-id]')?.getAttribute('data-node-id') || 'unknown';
    }

    private applyHighlight(codeBlock: HTMLElement, groups: HighlightGroup[], spec: string) {
        console.log('LineHighlightPlugin: applyHighlight');
        const rows = codeBlock.querySelector('.protyle-linenumber__rows') as HTMLElement;
        const content = codeBlock.querySelector('.hljs div[contenteditable="true"]') as HTMLElement;
        if (!rows || !content) return;

        if (rows.querySelector('.code-line-highlighter-overlay-wrapper')) return;

        const spans = rows.querySelectorAll('span');
        if (!spans.length) return;

        codeBlock.setAttribute('data-hl-active', spec);
        // rows.style.position = 'relative';

        const rowRect = rows.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const padding = parseFloat(window.getComputedStyle(content).paddingLeft) || 0;
        const offset = (contentRect.left - rowRect.left) - padding;
        const totalWidth = rowRect.width + Math.abs(offset) + contentRect.width - 10;

        const wrapper = this.createElement('div',
            { position: 'absolute', left: '-10px', top: '0', width: '0px', height: '100%', pointerEvents: 'none', zIndex: '10', overflow: 'visible' },
            { class: 'code-line-highlighter-overlay-wrapper', 'data-code-block-id': this.getCodeBlockId(codeBlock), 'data-hl-spec': spec }
        );

        groups.forEach(g => {
            const theme = this.colors[g.color];
            g.lines.forEach(line => {
                const idx = line - 1;
                if (spans[idx]) {
                    const span = spans[idx] as HTMLElement;
                    wrapper.appendChild(this.createElement('div',
                        { position: 'absolute', left: '0', top: `${span.offsetTop}px`, width: `${totalWidth}px`, height: `${span.offsetHeight}px`, backgroundColor: theme.background, boxShadow: `inset 3px 0 0 ${theme.border}`, pointerEvents: 'none' },
                        { class: 'code-line-highlighter-overlay', 'data-color': g.color }
                    ));
                }
            });
        });
        rows.appendChild(wrapper);
    }

    private parseHighlightMarker(line: string): { groups: HighlightGroup[], rawSpec: string } | null {
        const content = ['//', '#', '<!--', '/*'].reduce((acc, p) => acc || (line.trim().startsWith(p) ? line.match(new RegExp(`^\\${p}\\s*(.+?)(?:\\s*\\*/|\\s*-->)?$`))?.[1]?.trim() || null : null), null as string | null);
        if (!content) return null;

        const groups: HighlightGroup[] = [];
        let hasMatch = false, match;
        const regex = /hl([rgby])?:([0-9,\-]+)/g;

        while ((match = regex.exec(content)) !== null) {
            hasMatch = true;
            groups.push({ lines: this.parseLineSpec(match[2]), color: this.getColorFromCode(match[1] || 'y') });
        }
        return hasMatch ? { groups, rawSpec: content } : null;
    }

    private getColorFromCode(code: string): ColorName {
        return (({ 'y': 'yellow', 'r': 'red', 'g': 'green', 'b': 'blue' } as any)[code]) || 'yellow';
    }

    private parseLineSpec(spec: string): number[] {
        const lines = new Set<number>();
        spec.split(',').forEach(p => {
            const [s, e] = p.trim().split('-').map(n => parseInt(n));
            if (!isNaN(s)) {
                if (!isNaN(e)) for (let i = s; i <= e; i++) lines.add(i);
                else lines.add(s);
            }
        });
        return Array.from(lines).sort((a, b) => a - b);
    }

    onunload() {
        console.log('LineHighlightPlugin: onunload');
        this.observer?.disconnect();
        this.cleanupObserver?.disconnect();
        this.resizeObserver?.disconnect();
        this.processingTimeouts.forEach(t => clearTimeout(t));
        document.querySelectorAll('.code-line-highlighter-overlay-wrapper, .code-line-highlighter-container').forEach(el => el.remove());
    }
}