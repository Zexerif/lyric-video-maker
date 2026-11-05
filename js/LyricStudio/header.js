/* js/LyricStudio/header.js
 * Top Studio Header: Mode Switcher Tabs, Track Stats, Import/Export Modal,
 * Raw Paste / Batch Split Modal, Undo/Redo, and Keyboard Shortcuts Popover.
 */

(function (global) {
    'use strict';

    const LyricStudioHeader = {
        activeExportFormat: 'ttml',

        init(studio) {
            this.studio = studio;
            this.bindEvents();
        },

        bindEvents() {
            const doc = global.document;
            if (!doc) return;

            // Mode switcher tabs
            const modeTabs = doc.querySelectorAll('[data-studio-mode]');
            modeTabs.forEach(tab => {
                if (tab._hasModeListener) return;
                tab._hasModeListener = true;
                tab.addEventListener('click', () => {
                    const mode = tab.getAttribute('data-studio-mode');
                    if (this.studio && mode) {
                        this.studio.setMode(mode);
                    }
                });
            });

            // Batch Paste button & modal
            const batchBtn = doc.getElementById('studioBatchPasteBtn');
            const openBatchFromEditBtn = doc.getElementById('studioOpenBatchFromEditBtn');
            const closeBatchBtn = doc.getElementById('closeStudioBatchModalBtn') || doc.getElementById('closeStudioBatchPasteBtn');
            const cancelBatchBtn = doc.getElementById('cancelStudioBatchBtn') || doc.getElementById('cancelStudioBatchPasteBtn');
            const applyBatchReplaceBtn = doc.getElementById('applyStudioBatchReplaceBtn') || doc.getElementById('studioBatchReplaceBtn');
            const applyBatchAppendBtn = doc.getElementById('applyStudioBatchAppendBtn') || doc.getElementById('studioBatchAppendBtn');

            if (batchBtn && !batchBtn._bound) {
                batchBtn._bound = true;
                batchBtn.addEventListener('click', () => this.openBatchPasteModal());
            }
            if (openBatchFromEditBtn && !openBatchFromEditBtn._bound) {
                openBatchFromEditBtn._bound = true;
                openBatchFromEditBtn.addEventListener('click', () => this.openBatchPasteModal());
            }
            if (closeBatchBtn && !closeBatchBtn._bound) {
                closeBatchBtn._bound = true;
                closeBatchBtn.addEventListener('click', () => this.closeBatchPasteModal());
            }
            if (cancelBatchBtn && !cancelBatchBtn._bound) {
                cancelBatchBtn._bound = true;
                cancelBatchBtn.addEventListener('click', () => this.closeBatchPasteModal());
            }
            if (applyBatchReplaceBtn && !applyBatchReplaceBtn._bound) {
                applyBatchReplaceBtn._bound = true;
                applyBatchReplaceBtn.addEventListener('click', () => this.applyBatchPaste(false));
            }
            if (applyBatchAppendBtn && !applyBatchAppendBtn._bound) {
                applyBatchAppendBtn._bound = true;
                applyBatchAppendBtn.addEventListener('click', () => this.applyBatchPaste(true));
            }

            // Import / Export button & modal
            const ioBtn = doc.getElementById('studioImportExportBtn');
            const closeIoBtn = doc.getElementById('closeStudioIoModalBtn') || doc.getElementById('closeStudioImportExportBtn');
            const ioFileInput = doc.getElementById('studioIoFileInput') || doc.getElementById('studioImportFileInput');
            const ioUploadTriggerBtn = doc.getElementById('studioIoUploadBtn') || doc.getElementById('studioImportFileBtn');
            const ioCopyBtn = doc.getElementById('studioIoCopyBtn') || doc.getElementById('studioCopyExportBtn');
            const ioDownloadBtn = doc.getElementById('studioIoDownloadBtn') || doc.getElementById('studioDownloadExportBtn');
            const ioLoadFromTextBtn = doc.getElementById('studioIoLoadTextBtn') || doc.getElementById('studioApplyImportBtn');

            if (ioBtn && !ioBtn._bound) {
                ioBtn._bound = true;
                ioBtn.addEventListener('click', () => this.openImportExportModal());
            }
            if (closeIoBtn && !closeIoBtn._bound) {
                closeIoBtn._bound = true;
                closeIoBtn.addEventListener('click', () => this.closeImportExportModal());
            }
            if (ioUploadTriggerBtn && ioFileInput && !ioUploadTriggerBtn._bound) {
                ioUploadTriggerBtn._bound = true;
                ioUploadTriggerBtn.addEventListener('click', () => ioFileInput.click());
                ioFileInput.addEventListener('change', (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (file) {
                        this.importFileIntoStudio(file);
                        ioFileInput.value = '';
                    }
                });
            }
            if (ioCopyBtn && !ioCopyBtn._bound) {
                ioCopyBtn._bound = true;
                ioCopyBtn.addEventListener('click', () => this.copyExportOutput());
            }
            if (ioDownloadBtn && !ioDownloadBtn._bound) {
                ioDownloadBtn._bound = true;
                ioDownloadBtn.addEventListener('click', () => this.downloadExportOutput());
            }
            if (ioLoadFromTextBtn && !ioLoadFromTextBtn._bound) {
                ioLoadFromTextBtn._bound = true;
                ioLoadFromTextBtn.addEventListener('click', () => this.importFromTextarea());
            }

            // Format tabs inside Import/Export modal
            const ioFormatBtns = doc.querySelectorAll('[data-studio-io-format], [data-fmt]');
            ioFormatBtns.forEach(btn => {
                if (btn._bound) return;
                btn._bound = true;
                btn.addEventListener('click', () => {
                    this.activeExportFormat = btn.getAttribute('data-studio-io-format') || btn.getAttribute('data-fmt') || 'ttml';
                    ioFormatBtns.forEach(b => b.classList.toggle('active', b === btn));
                    this.refreshExportPreview();
                });
            });

            // Export / Import sub-tabs inside Import/Export modal
            const ioSubTabs = doc.querySelectorAll('.studio-io-tab');
            ioSubTabs.forEach(tab => {
                if (tab._bound) return;
                tab._bound = true;
                tab.addEventListener('click', () => {
                    const target = tab.getAttribute('data-io-tab');
                    ioSubTabs.forEach(t => t.classList.toggle('active', t === tab));
                    const expPanel = doc.getElementById('studioExportPanel');
                    const impPanel = doc.getElementById('studioImportPanel');
                    if (expPanel) expPanel.classList.toggle('hidden', target !== 'export');
                    if (impPanel) impPanel.classList.toggle('hidden', target !== 'import');
                });
            });

            // Studio Undo / Redo buttons
            const undoBtn = doc.getElementById('studioUndoBtn');
            const redoBtn = doc.getElementById('studioRedoBtn');
            if (undoBtn && !undoBtn._bound) {
                undoBtn._bound = true;
                undoBtn.addEventListener('click', () => {
                    if (this.studio) this.studio.undo();
                });
            }
            if (redoBtn && !redoBtn._bound) {
                redoBtn._bound = true;
                redoBtn.addEventListener('click', () => {
                    if (this.studio) this.studio.redo();
                });
            }

            // Shortcuts Cheatsheet Popover toggle
            const shortcutsBtn = doc.getElementById('studioShortcutsBtn');
            const closeShortcutsPopBtn = doc.getElementById('closeStudioShortcutsPopBtn') || doc.getElementById('closeStudioShortcutsPopover');
            if (shortcutsBtn && !shortcutsBtn._bound) {
                shortcutsBtn._bound = true;
                shortcutsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleShortcutsPopover();
                });
            }
            if (closeShortcutsPopBtn && !closeShortcutsPopBtn._bound) {
                closeShortcutsPopBtn._bound = true;
                closeShortcutsPopBtn.addEventListener('click', () => this.toggleShortcutsPopover(false));
            }
        },

        updateHeaderState() {
            const doc = global.document;
            if (!doc || !this.studio) return;

            // Update Track Title
            const titleEl = doc.getElementById('studioTrackTitle');
            if (titleEl) {
                const sTitle = (typeof global.songTitleInput !== 'undefined' && global.songTitleInput) ? global.songTitleInput.value.trim() : '';
                const sArtist = (typeof global.songArtistInput !== 'undefined' && global.songArtistInput) ? global.songArtistInput.value.trim() : '';
                titleEl.textContent = (sTitle || sArtist) ? `${sTitle || 'Untitled'}${sArtist ? ' — ' + sArtist : ''}` : 'Untitled Project';
            }

            // Update Stats Badge
            const statsEl = doc.getElementById('studioStatsBadge') || doc.getElementById('studioLineCountBadge');
            if (statsEl) {
                const lines = this.studio.lyricLines || [];
                const totalLines = lines.length;
                let totalWords = 0;
                let timedLines = 0;
                lines.forEach(l => {
                    if (typeof l.time === 'number' && !isNaN(l.time)) timedLines++;
                    totalWords += Array.isArray(l.words) ? l.words.length : 0;
                });
                const pct = totalLines > 0 ? Math.round((timedLines / totalLines) * 100) : 0;
                const fmtBadge = this.studio.isTtml ? 'TTML' : (this.studio.isAss ? 'ASS' : 'LRC');
                statsEl.textContent = `${fmtBadge} • ${totalLines} Lines • ${totalWords} Tokens • ${pct}% Timed`;
            }

            // Update Mode Switcher active tab
            const modeTabs = doc.querySelectorAll('[data-studio-mode]');
            modeTabs.forEach(tab => {
                const mode = tab.getAttribute('data-studio-mode');
                tab.classList.toggle('active', mode === this.studio.currentMode);
            });

            // Update Undo/Redo button states
            const undoBtn = doc.getElementById('studioUndoBtn');
            const redoBtn = doc.getElementById('studioRedoBtn');
            const canUndo = (this.studio.studioUndoStack && this.studio.studioUndoStack.length > 0) ||
                (typeof global.HistoryManager !== 'undefined' && global.HistoryManager.undoStack.length > 1);
            const canRedo = (this.studio.studioRedoStack && this.studio.studioRedoStack.length > 0) ||
                (typeof global.HistoryManager !== 'undefined' && global.HistoryManager.redoStack.length > 0);

            if (undoBtn) {
                undoBtn.disabled = !canUndo;
                undoBtn.style.opacity = canUndo ? '1' : '0.4';
            }
            if (redoBtn) {
                redoBtn.disabled = !canRedo;
                redoBtn.style.opacity = canRedo ? '1' : '0.4';
            }
        },

        updateHeaderStats(studio) {
            if (studio) this.studio = studio;
            this.updateHeaderState();
        },

        updateUndoRedoButtons(studio) {
            if (studio) this.studio = studio;
            this.updateHeaderState();
        },

        updateModeTabs(mode) {
            const doc = global.document;
            if (!doc) return;
            doc.querySelectorAll('[data-studio-mode]').forEach(tab => {
                tab.classList.toggle('active', tab.getAttribute('data-studio-mode') === mode);
            });
        },

        // ─── Batch Paste / Split Modal ────────────────────────────────────
        openBatchPasteModal() {
            const doc = global.document;
            if (!doc || !this.studio) return;
            const modal = doc.getElementById('studioBatchPasteModal');
            const textarea = doc.getElementById('studioBatchPasteInput');
            if (!modal) return;
            if (textarea) {
                textarea.value = global.LyricStudioModel.exportToRawText(this.studio.lyricLines, true);
                setTimeout(() => textarea.focus(), 50);
            }
            modal.classList.remove('hidden');
            modal.classList.add('active');
        },

        closeBatchPasteModal() {
            const doc = global.document;
            if (!doc) return;
            const modal = doc.getElementById('studioBatchPasteModal');
            if (modal) {
                modal.classList.remove('active');
                modal.classList.add('hidden');
            }
        },

        applyBatchPaste(appendMode = false) {
            const doc = global.document;
            if (!doc || !this.studio || !global.LyricStudioModel) return;
            const textarea = doc.getElementById('studioBatchPasteInput');
            const autoSyllabifyToggle = doc.getElementById('studioBatchAutoSyllabify') || doc.getElementById('studioBatchAutoSyllable');
            const autoBracketBgToggle = doc.getElementById('studioBatchBracketBg');
            const raw = textarea ? textarea.value : '';
            if (!raw.trim()) {
                this.closeBatchPasteModal();
                return;
            }

            this.studio.pushUndoState(appendMode ? 'Append Batch Lyrics' : 'Batch Paste Lyrics');
            const newLines = global.LyricStudioModel.batchSplitRawText(raw, {
                autoSyllabify: autoSyllabifyToggle ? autoSyllabifyToggle.checked : false,
                autoBracketBg: autoBracketBgToggle ? autoBracketBgToggle.checked : true
            });

            if (newLines.length > 0) {
                if (appendMode) {
                    this.studio.lyricLines.push(...newLines);
                } else {
                    this.studio.lyricLines = newLines;
                    this.studio.activeLineIndex = 0;
                    this.studio.activeWordIndex = 0;
                }
                this.studio.refreshAllViews();
                this.studio.showStudioToast(`✅ Split into ${newLines.length} lines and tokenized words!`);
            }
            this.closeBatchPasteModal();
        },

        // ─── Import / Export Modal ────────────────────────────────────────
        openImportExportModal() {
            const doc = global.document;
            if (!doc) return;
            const modal = doc.getElementById('studioImportExportModal');
            if (!modal) return;
            this.refreshExportPreview();
            modal.classList.remove('hidden');
            modal.classList.add('active');
        },

        closeImportExportModal() {
            const doc = global.document;
            if (!doc) return;
            const modal = doc.getElementById('studioImportExportModal');
            if (modal) {
                modal.classList.remove('active');
                modal.classList.add('hidden');
            }
        },

        getFormattedExportText(format) {
            if (!this.studio || !global.LyricStudioModel) return '';
            const lines = this.studio.lyricLines || [];
            const sTitle = (typeof global.songTitleInput !== 'undefined' && global.songTitleInput) ? global.songTitleInput.value.trim() : '';
            const sArtist = (typeof global.songArtistInput !== 'undefined' && global.songArtistInput) ? global.songArtistInput.value.trim() : '';
            const meta = { title: sTitle, artist: sArtist };

            switch (format) {
                case 'ttml':
                    return global.LyricStudioModel.exportToTtml(lines, meta);
                case 'lrc-enhanced':
                    return global.LyricStudioModel.exportToLrc(lines, { includeWordTags: true });
                case 'lrc':
                    return global.LyricStudioModel.exportToLrc(lines, { includeWordTags: false });
                case 'json':
                    return global.LyricStudioModel.exportToJson(lines, meta);
                case 'raw':
                    return global.LyricStudioModel.exportToRawText(lines, true);
                default:
                    return global.LyricStudioModel.exportToTtml(lines, meta);
            }
        },

        refreshExportPreview() {
            const doc = global.document;
            if (!doc) return;
            const outTextarea = doc.getElementById('studioIoOutputTextarea') || doc.getElementById('studioExportTextarea');
            if (!outTextarea) return;
            outTextarea.value = this.getFormattedExportText(this.activeExportFormat);
        },

        copyExportOutput() {
            const doc = global.document;
            if (!doc) return;
            const outTextarea = doc.getElementById('studioIoOutputTextarea') || doc.getElementById('studioExportTextarea');
            if (!outTextarea) return;
            outTextarea.select();
            if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
                global.navigator.clipboard.writeText(outTextarea.value).catch(() => {
                    doc.execCommand('copy');
                });
            } else {
                doc.execCommand('copy');
            }
            if (this.studio) {
                this.studio.showStudioToast(`📋 Copied ${this.activeExportFormat.toUpperCase()} output to clipboard!`);
            }
        },

        downloadExportOutput() {
            const doc = global.document;
            if (!doc || !this.studio) return;
            const content = this.getFormattedExportText(this.activeExportFormat);
            const extMap = {
                'ttml': 'ttml',
                'lrc-enhanced': 'lrc',
                'lrc': 'lrc',
                'json': 'json',
                'raw': 'txt'
            };
            const ext = extMap[this.activeExportFormat] || 'lrc';
            const rawTitle = (typeof global.songTitleInput !== 'undefined' && global.songTitleInput && global.songTitleInput.value.trim())
                ? global.songTitleInput.value.trim().replace(/[^a-z0-9_-]/gi, '_').toLowerCase()
                : 'lyrics';

            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = doc.createElement('a');
            a.href = url;
            a.download = `${rawTitle}.${ext}`;
            doc.body.appendChild(a);
            a.click();
            setTimeout(() => {
                doc.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 3000);
            this.studio.showStudioToast(`💾 Downloaded ${rawTitle}.${ext}!`);
        },

        async importFileIntoStudio(file) {
            if (!file || !this.studio) return;
            try {
                const text = await file.text();
                this.studio.pushUndoState(`Import ${file.name}`);
                this.studio.loadLyrics(text);
                this.studio.refreshAllViews();
                this.closeImportExportModal();
                this.studio.showStudioToast(`📂 Imported ${file.name} (${this.studio.lyricLines.length} lines)!`);
            } catch (err) {
                console.error('Import file error:', err);
            }
        },

        importFromTextarea() {
            const doc = global.document;
            if (!doc || !this.studio) return;
            const impTextarea = doc.getElementById('studioImportTextarea') || doc.getElementById('studioIoOutputTextarea');
            if (!impTextarea || !impTextarea.value.trim()) return;
            this.studio.pushUndoState('Import Text');
            this.studio.loadLyrics(impTextarea.value);
            this.studio.refreshAllViews();
            this.closeImportExportModal();
            this.studio.showStudioToast(`📥 Loaded ${this.studio.lyricLines.length} lines from editor text!`);
        },

        toggleShortcutsPopover(forceState) {
            const doc = global.document;
            if (!doc) return;
            const pop = doc.getElementById('studioShortcutsPopover');
            if (!pop) return;
            const isCurrentlyOpen = pop.classList.contains('active') || !pop.classList.contains('hidden');
            const nextState = typeof forceState === 'boolean' ? forceState : !isCurrentlyOpen;
            pop.classList.toggle('active', nextState);
            pop.classList.toggle('hidden', !nextState);
        }
    };

    global.LyricStudioHeader = LyricStudioHeader;
})(typeof window !== 'undefined' ? window : global);
