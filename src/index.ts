import {
    Plugin
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

    // Color definitions
    private readonly colors: Record<string, ColorTheme> = {
        yellow: { background: 'rgba(255, 193, 7, 0.2)', border: '#ffc107' },
        red: { background: 'rgba(244, 67, 54, 0.2)', border: '#f44336' },
        green: { background: 'rgba(76, 175, 80, 0.2)', border: '#4caf50' },
        blue: { background: 'rgba(33, 150, 243, 0.2)', border: '#2196f3' }
    };

    onload() {
        // console.log("✅ Code Line Highlighter Plugin loaded - Version 2.1.4 - Prevents duplicates!");

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
            this.processCodeBlock(block as HTMLElement);
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
            this.processCodeBlock(codeBlock);
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
                    this.processCodeBlock(codeBlock);
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
     */
    private processCodeBlock(codeBlock: HTMLElement) {
        const hljsElement = codeBlock.querySelector('.hljs');
        if (!hljsElement) {
            return;
        }

        const text = hljsElement.textContent || '';
        const lines = text.split('\n');
        const firstLine = lines[0] || '';

        const marker = this.parseHighlightMarker(firstLine);

        // Check existing overlays (stored as data attribute to avoid DOM pollution)
        const currentSpec = codeBlock.getAttribute('data-hl-active');

        if (marker) {
            // Check if overlays still exist
            const existingWrapper = codeBlock.querySelector('.protyle-linenumber__rows .code-line-highlighter-overlay-wrapper');

            // Update if: spec changed OR no highlights exist (they were removed by SiYuan)
            if (!currentSpec || currentSpec !== marker.rawSpec || !existingWrapper) {
                // Remove old highlights FIRST
                this.removeHighlights(codeBlock);

                // Enable line numbers if not already enabled
                this.enableLineNumbers(codeBlock);

                // Wait a bit for line numbers to render, then apply
                setTimeout(() => {
                    this.applyHighlight(codeBlock, marker.groups, marker.rawSpec);
                }, 100);
            }
            // else: highlights are already correct and still exist, don't touch them!
        } else if (currentSpec) {
            // No marker found but highlights exist - remove them
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
            console.warn(`⚠️ Wrapper already exists (${existingWrappers.length}), removing before adding new one`);
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
