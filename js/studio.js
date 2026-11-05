/**
 * LyricStudio — Dedicated Full-Viewport Lyric Authoring, Syncing & Verification Workspace
 * Inspired by AMLL TTML Tool (https://amll-ttml-tool.stevexmh.net/)
 *
 * Orchestrates modular sub-components under js/LyricStudio/:
 * - LyricStudioModel       (js/LyricStudio/model.js)
 * - LyricStudioHeader      (js/LyricStudio/header.js)
 * - LyricStudioEditMode    (js/LyricStudio/editMode.js)
 * - LyricStudioSyncMode    (js/LyricStudio/syncMode.js)
 * - LyricStudioPreviewMode (js/LyricStudio/previewMode.js)
 * - LyricStudioInspector   (js/LyricStudio/inspector.js)
 * - LyricStudioAudioDock   (js/LyricStudio/audioDock.js)
 */

// Node / VM fallback loader if sub-modules weren't preloaded in a custom harness
(function ensureLyricStudioModules() {
    if (typeof window !== 'undefined' && window.LyricStudioModel) return;
    if (typeof fs !== 'undefined' && typeof vm !== 'undefined' && typeof path !== 'undefined') {
        const subFiles = [
            'js/LyricStudio/model.js',
            'js/LyricStudio/header.js',
            'js/LyricStudio/editMode.js',
            'js/LyricStudio/syncMode.js',
            'js/LyricStudio/previewMode.js',
            'js/LyricStudio/inspector.js',
            'js/LyricStudio/audioDock.js'
        ];
        subFiles.forEach(rel => {
            try {
                const full = path.resolve(__dirname || '.', rel);
                if (fs.existsSync(full)) {
                    const code = fs.readFileSync(full, 'utf8');
                    vm.runInThisContext(code, { filename: rel });
                }
            } catch (err) {
                // Ignore in restricted environments
            }
        });
    }
})();

const LyricStudio = {
    isOpen: false,
    isTapToSync: false,
    isTtml: false,
    isAss: false,
    currentMode: 'edit',        // 'edit' | 'sync' | 'preview'
    syncGranularity: 'word',    // 'word' | 'line'
    previewLayout: 'split',     // 'apple' | 'canvas' | 'split'
    activeLineIndex: 0,
    activeWordIndex: 0,
    editingSyllableWord: null,
    lyricLines: [],             // Normalized studio lines: { id, time, endTime, text, words, isBG, isBacking, isDuet, translation, subText, romanization }

    // Timeline state
    timelineZoom: 1,
    timelineScrollX: 0,
    followPlayhead: true,

    // Studio-internal Undo/Redo stacks
    studioUndoStack: [],
    studioRedoStack: [],
    maxUndoLevels: 60,

    // Virtual playhead fallback when no audio track is loaded
    virtualPlaying: false,
    virtualStartPerf: 0,
    virtualPausedTime: 0,

    // Snapshot of pipeline lyrics on open
    _initialPipelineLyrics: null,
    _resizeBound: false,
    _rendererLyricsDirty: true,
    _cachedRendererLyrics: null,
    _loopFrameCount: 0,

    /**
     * Open the full-viewport Lyric Studio workspace
     */
    open() {
        const modal = document.getElementById('lyricStudioModal');
        if (!modal) return;

        modal.classList.remove('hidden');
        modal.classList.add('active', 'studio-open');
        this.isOpen = true;

        // Update track title in studio header
        const titleEl = document.getElementById('studioTrackTitle');
        if (titleEl) {
            const tEl = (typeof songTitleInput !== 'undefined' && songTitleInput) ? songTitleInput : (typeof titleInput !== 'undefined' ? titleInput : null);
            const aEl = (typeof songArtistInput !== 'undefined' && songArtistInput) ? songArtistInput : (typeof artistInput !== 'undefined' ? artistInput : null);
            const tVal = (tEl && tEl.value) ? tEl.value.trim() : '';
            const aVal = (aEl && aEl.value) ? aEl.value.trim() : '';
            titleEl.textContent = (tVal && aVal) ? `${tVal} — ${aVal}` : (tVal || aVal || 'Untitled Track');
        }

        // Snapshot current pipeline lyrics so closing without saving can restore cleanly
        if (typeof lyrics !== 'undefined' && Array.isArray(lyrics)) {
            this._initialPipelineLyrics = JSON.parse(JSON.stringify(lyrics));
        } else {
            this._initialPipelineLyrics = [];
        }

        // Load lyrics from main pipeline (`lyrics` array if non-empty, else `lyricsInput.value`)
        this.loadFromPipeline();

        // Reset Undo/Redo history for this studio session
        this.studioUndoStack = [];
        this.studioRedoStack = [];

        // Initialize sub-components
        if (window.LyricStudioHeader) LyricStudioHeader.init(this);
        if (window.LyricStudioEditMode) LyricStudioEditMode.init(this);
        if (window.LyricStudioSyncMode) LyricStudioSyncMode.init(this);
        if (window.LyricStudioPreviewMode) LyricStudioPreviewMode.init(this);
        if (window.LyricStudioInspector) LyricStudioInspector.init(this);
        if (window.LyricStudioAudioDock) LyricStudioAudioDock.init(this);

        if (!this._resizeBound) {
            this._resizeBound = true;
            window.addEventListener('resize', () => {
                if (this.isOpen) this.resizeTimelineCanvas();
            });
        }

        // Default to current mode (or 'edit' on initial open)
        this.switchMode(this.currentMode || 'edit');
        this.updateHeaderStats();
        this.refreshInspector();

        setTimeout(() => {
            this.resizeTimelineCanvas();
            this.startStudioLoop();
        }, 40);
    },

    /**
     * Close the Lyric Studio workspace and return to Video Maker
     */
    close(appliedChanges = false) {
        const modal = document.getElementById('lyricStudioModal');
        if (modal) {
            modal.classList.remove('active', 'studio-open');
            modal.classList.add('hidden');
        }
        this.isOpen = false;
        this.isTapToSync = false;
        this.virtualPlaying = false;

        if (!appliedChanges && this._initialPipelineLyrics && typeof lyrics !== 'undefined') {
            lyrics = JSON.parse(JSON.stringify(this._initialPipelineLyrics));
            if (typeof invalidateWrapCache === 'function') invalidateWrapCache();
            if (typeof drawFrame === 'function') drawFrame(this.getCurrentTime());
        }
    },

    /**
     * Switch between 'edit', 'sync', and 'preview' studio modes
     */
    switchMode(mode) {
        const validModes = ['edit', 'sync', 'preview'];
        const nextMode = validModes.includes(mode) ? mode : 'edit';
        this.currentMode = nextMode;
        this.isTapToSync = (nextMode === 'sync');

        // Ensure valid cursor indices
        if (this.lyricLines.length > 0) {
            this.activeLineIndex = Math.max(0, Math.min(this.lyricLines.length - 1, this.activeLineIndex || 0));
            const line = this.lyricLines[this.activeLineIndex];
            if (this.activeWordIndex === null || !line.words || this.activeWordIndex >= line.words.length) {
                this.activeWordIndex = 0;
            }
        } else {
            this.activeLineIndex = 0;
            this.activeWordIndex = 0;
        }

        // Toggle mode panels
        const editPanel = document.getElementById('studioEditWorkspace');
        const syncPanel = document.getElementById('studioSyncWorkspace');
        const previewPanel = document.getElementById('studioPreviewWorkspace');

        if (editPanel) editPanel.classList.toggle('hidden', nextMode !== 'edit');
        if (syncPanel) syncPanel.classList.toggle('hidden', nextMode !== 'sync');
        if (previewPanel) previewPanel.classList.toggle('hidden', nextMode !== 'preview');

        // Update legacy tap-to-sync button & banner if present
        const tapBtn = document.getElementById('studioTapSyncBtn');
        if (tapBtn) {
            tapBtn.classList.toggle('active', this.isTapToSync);
        }
        const tapBanner = document.getElementById('studioTapSyncBanner');
        if (tapBanner) {
            tapBanner.classList.toggle('hidden', !this.isTapToSync);
        }

        if (window.LyricStudioHeader) {
            LyricStudioHeader.updateModeTabs(nextMode);
        }
        if (window.LyricStudioSyncMode && typeof LyricStudioSyncMode.resetSingingState === 'function') {
            LyricStudioSyncMode.resetSingingState();
        }

        this.refreshActiveView();
        this.refreshInspector();
        this.drawTimeline();
    },

    setMode(mode) {
        this.switchMode(mode);
    },

    /**
     * Load lyrics from the existing Video Maker pipeline (`lrcEditor` textarea or `lyrics` array)
     */
    loadFromPipeline() {
        const editorEl = (typeof lrcEditor !== 'undefined' && lrcEditor)
            ? lrcEditor
            : (typeof lyricsInput !== 'undefined' && lyricsInput ? lyricsInput : document.getElementById('lrcEditor'));
        const rawText = editorEl && editorEl.value ? editorEl.value : '';

        const realLyrics = (typeof lyrics !== 'undefined' && Array.isArray(lyrics))
            ? lyrics.filter(l => l && l.text !== '• • •')
            : [];

        if (rawText && rawText.trim()) {
            this.loadFromLrc(rawText);
        } else if (realLyrics.length > 0) {
            this.lyricLines = realLyrics.map((item, idx) => LyricStudioModel.normalizeLine(item, realLyrics[idx + 1]?.time ?? null));
        } else {
            this.lyricLines = [
                LyricStudioModel.normalizeLine({ time: 0, endTime: 3, text: 'First lyric line' })
            ];
        }

        if (this.lyricLines.length > 0) {
            this.activeLineIndex = Math.min(this.activeLineIndex, this.lyricLines.length - 1);
            this.activeWordIndex = 0;
        } else {
            this.activeLineIndex = 0;
            this.activeWordIndex = 0;
        }
    },

    /**
     * Parse LRC / TTML / JSON / ASS / Raw text into `this.lyricLines` (backward compatible with loadFromLrc & loadLyrics)
     */
    loadFromLrc(text) {
        if (!text || !String(text).trim()) {
            this.lyricLines = [];
            return;
        }
        if (window.LyricStudioModel) {
            const parsed = LyricStudioModel.parseAnyFormat(text);
            if (Array.isArray(parsed)) {
                this.lyricLines = parsed;
            } else {
                this.lyricLines = parsed.lines || [];
                this.isTtml = parsed.format === 'ttml';
                this.isAss = parsed.format === 'ass';
            }
        } else {
            const lines = String(text).split(/\r?\n/).filter(l => l.trim());
            this.lyricLines = lines.map((l, idx) => ({
                id: 'line_' + idx,
                time: null,
                endTime: null,
                text: l.trim(),
                words: l.trim().split(/\s+/).map(w => ({ text: w + ' ', time: null, endTime: null, start: null, end: null })),
                isBG: false,
                isBacking: false,
                isDuet: false,
                translation: '',
                subText: '',
                romanization: ''
            }));
        }
        this.activeLineIndex = 0;
        this.activeWordIndex = 0;
        this.refreshActiveView();
        this.refreshInspector();
        this.updateHeaderStats();
    },

    loadLyrics(text) {
        this.loadFromLrc(text);
    },

    /**
     * Save & Apply studio lyrics back to the Video Maker pipeline
     */
    saveToLrc() {
        if (typeof HistoryManager !== 'undefined' && HistoryManager) {
            if (typeof HistoryManager.saveState === 'function') {
                HistoryManager.saveState();
            } else if (typeof HistoryManager.pushState === 'function') {
                HistoryManager.pushState('Apply Lyric Studio');
            }
        }

        // Normalize all lines & words before exporting
        this.lyricLines = this.lyricLines.map((line, i) =>
            LyricStudioModel.normalizeLine(line, this.lyricLines[i + 1]?.time ?? null)
        );

        // Sort timed lines chronologically if all lines have timestamps
        const allTimed = this.lyricLines.length > 0 && this.lyricLines.every(l => typeof l.time === 'number' && !isNaN(l.time));
        if (allTimed) {
            this.lyricLines.sort((a, b) => a.time - b.time);
        }

        // 1. Update `lrcEditor` textarea (TTML if originally TTML, otherwise Enhanced LRC)
        const editorEl = (typeof lrcEditor !== 'undefined' && lrcEditor)
            ? lrcEditor
            : (typeof lyricsInput !== 'undefined' && lyricsInput ? lyricsInput : document.getElementById('lrcEditor'));

        const serializedOutput = this.isTtml
            ? LyricStudioModel.exportToTtml(this.lyricLines, {
                title: (typeof songTitleInput !== 'undefined' && songTitleInput) ? songTitleInput.value : '',
                artist: (typeof songArtistInput !== 'undefined' && songArtistInput) ? songArtistInput.value : ''
            })
            : LyricStudioModel.exportToLrc(this.lyricLines, {
                includeWordTags: true,
                enhanced: true
            });

        if (editorEl) {
            editorEl.value = serializedOutput;
        }
        if (typeof lyricsInput !== 'undefined' && lyricsInput && lyricsInput !== editorEl) {
            lyricsInput.value = serializedOutput;
        }

        // 2. Update global `lyrics` array directly with rich word-level, BG, Duet, Translation & Romanization data
        const pipelineLyrics = LyricStudioModel.toRendererLyrics(this.lyricLines);
        if (typeof updateLyricsFromEditor === 'function' && editorEl) {
            try {
                updateLyricsFromEditor();
            } catch (_) {
                // Ignore if UI helpers like updateButtons are not loaded in partial test harnesses
            }
        }
        if (typeof lyrics !== 'undefined') {
            lyrics = pipelineLyrics;
        }

        // 3. Refresh Video Maker caches, quick editor, timeline, and preview frame
        if (typeof invalidateWrapCache === 'function') invalidateWrapCache();
        if (typeof updateTimelineRange === 'function') updateTimelineRange();
        if (typeof renderQuickEditor === 'function') renderQuickEditor();
        if (typeof syncPreviewToTime === 'function') {
            syncPreviewToTime(this.getCurrentTime());
        } else if (typeof drawFrame === 'function') {
            drawFrame(this.getCurrentTime());
        }
        if (typeof saveProgressToLocalStorage === 'function') saveProgressToLocalStorage();
        if (typeof saveProjectToLocal === 'function') saveProjectToLocal();

        this.close(true);
    },

    outputLrcFallback() {
        this.saveToLrc();
    },

    /**
     * Select a line and optionally a word token
     */
    selectLine(lineIdx, wordIdx = 0, options = { scroll: false }) {
        if (this.lyricLines.length === 0) {
            this.activeLineIndex = 0;
            this.activeWordIndex = 0;
            this.refreshInspector();
            return;
        }

        const clampedLine = Math.max(0, Math.min(this.lyricLines.length - 1, lineIdx));
        this.activeLineIndex = clampedLine;

        const line = this.lyricLines[clampedLine];
        if (wordIdx !== null && line && Array.isArray(line.words) && line.words.length > 0) {
            this.activeWordIndex = Math.max(0, Math.min(line.words.length - 1, wordIdx));
        } else {
            this.activeWordIndex = 0;
        }

        if (window.LyricStudioSyncMode && typeof LyricStudioSyncMode.resetSingingState === 'function') {
            LyricStudioSyncMode.resetSingingState();
        }

        this.refreshActiveView();
        this.refreshInspector();
        this.drawTimeline();

        if (options && options.scroll && this.currentMode === 'edit') {
            const card = document.querySelector(`.studio-lyric-card[data-index="${clampedLine}"], .studio-line-card[data-line-idx="${clampedLine}"]`);
            if (card && typeof card.scrollIntoView === 'function') {
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    },

    selectLineAndWord(lineIdx, wordIdx = 0, shouldRender = true) {
        if (this.lyricLines.length === 0) {
            this.activeLineIndex = 0;
            this.activeWordIndex = 0;
            return;
        }
        this.activeLineIndex = Math.max(0, Math.min(this.lyricLines.length - 1, lineIdx));
        const line = this.lyricLines[this.activeLineIndex];
        if (line && Array.isArray(line.words) && line.words.length > 0) {
            this.activeWordIndex = Math.max(0, Math.min(line.words.length - 1, wordIdx));
        } else {
            this.activeWordIndex = 0;
        }
        if (window.LyricStudioSyncMode && typeof LyricStudioSyncMode.resetSingingState === 'function') {
            LyricStudioSyncMode.resetSingingState();
        }
        if (shouldRender) {
            this.refreshAllViews();
        } else {
            this.refreshInspector();
            this.drawTimeline();
        }
    },

    /**
     * Line & Word Structure Operations (called by Edit Mode & Inspector)
     */
    insertLineAt(index, position = 'below') {
        this.pushUndoState('Insert Line');
        const clamped = Math.max(0, Math.min(this.lyricLines.length, index));
        const refLine = this.lyricLines[clamped] || null;
        let newTime = null;
        let newEnd = null;
        if (refLine && typeof refLine.time === 'number') {
            if (position === 'above') {
                newTime = Number(Math.max(0, refLine.time - 2.0).toFixed(3));
                newEnd = refLine.time;
            } else {
                newTime = typeof refLine.endTime === 'number' ? refLine.endTime : Number((refLine.time + 2.5).toFixed(3));
                newEnd = Number((newTime + 2.5).toFixed(3));
            }
        }
        const newLine = LyricStudioModel.normalizeLine({
            time: newTime,
            endTime: newEnd,
            text: 'New lyric line',
            isBG: false,
            isDuet: false
        });
        const insertIdx = position === 'above' ? clamped : Math.min(this.lyricLines.length, clamped + 1);
        this.lyricLines.splice(insertIdx, 0, newLine);
        this.activeLineIndex = insertIdx;
        this.activeWordIndex = 0;
        this.refreshAllViews();
    },

    addNewLineAtEnd() {
        this.pushUndoState('Add Line');
        const last = this.lyricLines[this.lyricLines.length - 1];
        const nextTime = last && typeof last.time === 'number'
            ? (typeof last.endTime === 'number' ? last.endTime : Number((last.time + 3.0).toFixed(3)))
            : (this.lyricLines.length === 0 ? 0 : null);
        const newLine = LyricStudioModel.normalizeLine({
            time: nextTime,
            endTime: typeof nextTime === 'number' ? Number((nextTime + 3.0).toFixed(3)) : null,
            text: 'New lyric line'
        });
        this.lyricLines.push(newLine);
        this.activeLineIndex = this.lyricLines.length - 1;
        this.activeWordIndex = 0;
        this.refreshAllViews();
    },

    duplicateLine(index) {
        const line = this.lyricLines[index];
        if (!line) return;
        this.pushUndoState('Duplicate Line');
        const clone = JSON.parse(JSON.stringify(line));
        clone.id = LyricStudioModel.nextUid('line');
        if (typeof clone.time === 'number') {
            const dur = (typeof clone.endTime === 'number' && clone.endTime > clone.time) ? (clone.endTime - clone.time) : 2.5;
            clone.time = typeof clone.endTime === 'number' ? clone.endTime : Number((clone.time + dur).toFixed(3));
            clone.endTime = Number((clone.time + dur).toFixed(3));
        }
        this.lyricLines.splice(index + 1, 0, LyricStudioModel.normalizeLine(clone));
        this.activeLineIndex = index + 1;
        this.activeWordIndex = 0;
        this.refreshAllViews();
    },

    deleteLine(index) {
        if (index < 0 || index >= this.lyricLines.length) return;
        this.pushUndoState('Delete Line');
        this.lyricLines.splice(index, 1);
        if (this.lyricLines.length === 0) {
            this.lyricLines.push(LyricStudioModel.normalizeLine({ time: 0, endTime: 3, text: '' }));
        }
        this.activeLineIndex = Math.max(0, Math.min(this.lyricLines.length - 1, index));
        this.activeWordIndex = 0;
        this.refreshAllViews();
    },

    moveLine(index, delta) {
        const target = index + delta;
        if (index < 0 || index >= this.lyricLines.length || target < 0 || target >= this.lyricLines.length) return;
        this.pushUndoState('Reorder Line');
        const [moved] = this.lyricLines.splice(index, 1);
        this.lyricLines.splice(target, 0, moved);
        this.activeLineIndex = target;
        this.refreshAllViews();
    },

    mergeLineWithNext(index) {
        if (index < 0 || index >= this.lyricLines.length - 1) return;
        this.pushUndoState('Merge Lines');
        const curr = this.lyricLines[index];
        const next = this.lyricLines[index + 1];
        if (Array.isArray(curr.words) && curr.words.length > 0) {
            const lastW = curr.words[curr.words.length - 1];
            if (lastW && !/\s+$/.test(lastW.text || '')) lastW.text += ' ';
        }
        curr.words = [...(curr.words || []), ...(next.words || [])];
        if (typeof next.endTime === 'number') curr.endTime = next.endTime;
        if (!curr.translation && next.translation) {
            curr.translation = next.translation;
            curr.subText = next.translation;
        }
        if (!curr.romanization && next.romanization) {
            curr.romanization = next.romanization;
        }
        LyricStudioModel.syncLineFromWords(curr);
        this.lyricLines.splice(index + 1, 1);
        this.activeLineIndex = index;
        this.refreshAllViews();
    },

    splitLineAtWord(lineIdx, wordIdx) {
        const line = this.lyricLines[lineIdx];
        if (!line || !Array.isArray(line.words) || wordIdx <= 0 || wordIdx >= line.words.length) return;
        this.pushUndoState('Split Line at Word');
        const firstWords = line.words.slice(0, wordIdx);
        const secondWords = line.words.slice(wordIdx);

        line.words = firstWords;
        LyricStudioModel.syncLineFromWords(line);

        const secondStart = (secondWords[0] && typeof secondWords[0].time === 'number')
            ? secondWords[0].time
            : (typeof line.endTime === 'number' ? line.endTime : null);
        const secondLine = LyricStudioModel.normalizeLine({
            time: secondStart,
            endTime: line.endTime,
            text: LyricStudioModel.reconstructLineText(secondWords),
            words: secondWords,
            isBG: line.isBG,
            isDuet: line.isDuet
        });
        this.lyricLines.splice(lineIdx + 1, 0, secondLine);
        this.activeLineIndex = lineIdx + 1;
        this.activeWordIndex = 0;
        this.refreshAllViews();
    },

    toggleLineBG(index) {
        const line = this.lyricLines[index];
        if (!line) return;
        this.pushUndoState('Toggle Background Vocal');
        const nextBg = !(line.isBG || line.isBacking);
        line.isBG = nextBg;
        line.isBacking = nextBg;
        if (Array.isArray(line.words)) {
            line.words.forEach(w => {
                w.isBG = nextBg;
                w.isBacking = nextBg;
            });
        }
        this.refreshAllViews();
    },

    toggleLineDuet(index) {
        const line = this.lyricLines[index];
        if (!line) return;
        this.pushUndoState('Toggle Duet Vocal');
        line.isDuet = !line.isDuet;
        this.refreshAllViews();
    },

    nudgeLineTimestamp(index, deltaSec) {
        const line = this.lyricLines[index];
        if (!line) return;
        this.pushUndoState('Nudge Line Timestamp');
        const base = typeof line.time === 'number' ? line.time : this.getCurrentTime();
        line.time = Number(Math.max(0, base + deltaSec).toFixed(3));
        if (typeof line.endTime === 'number') {
            line.endTime = Number(Math.max(line.time + 0.05, line.endTime + deltaSec).toFixed(3));
        }
        if (Array.isArray(line.words)) {
            line.words.forEach(w => {
                if (typeof w.time === 'number') {
                    w.time = Number(Math.max(0, w.time + deltaSec).toFixed(3));
                    w.start = w.time;
                }
                if (typeof w.endTime === 'number') {
                    w.endTime = Number(Math.max((w.time || 0) + 0.04, w.endTime + deltaSec).toFixed(3));
                    w.end = w.endTime;
                }
            });
        }
        this.refreshAllViews();
    },

    splitWord(lineIdx, wordIdx, partsInput) {
        const line = this.lyricLines[lineIdx];
        if (!line) return;
        this.pushUndoState('Split Word into Syllables');
        const count = LyricStudioModel.splitWordIntoSyllables(line, wordIdx, partsInput);
        if (count) {
            this.refreshAllViews();
            this.showToast(`✂️ Split into ${count} syllables!`);
        }
    },

    splitWordAtCharacter(lineIdx, wordIdx, charOffset) {
        const line = this.lyricLines[lineIdx];
        if (!line) return;
        this.pushUndoState('Split Syllable at Character');
        const count = LyricStudioModel.splitWordAtChar(line, wordIdx, charOffset);
        if (count) {
            this.refreshAllViews();
        }
    },

    mergeWords(lineIdx, firstIdx, secondIdx) {
        const line = this.lyricLines[lineIdx];
        if (!line) return;
        this.pushUndoState('Merge Tokens');
        if (LyricStudioModel.mergeAdjacentWords(line, firstIdx, secondIdx)) {
            this.activeWordIndex = Math.min(firstIdx, secondIdx);
            this.refreshAllViews();
        }
    },

    toggleWordTrailingSpace(lineIdx, wordIdx) {
        const line = this.lyricLines[lineIdx];
        if (!line || !line.words || !line.words[wordIdx]) return;
        this.pushUndoState('Toggle Token Space');
        const w = line.words[wordIdx];
        const clean = (w.text || '').trim();
        const hasSpace = /\s+$/.test(w.text || '');
        w.text = hasSpace ? clean : (clean + ' ');
        LyricStudioModel.syncLineFromWords(line);
        this.refreshAllViews();
    },

    autoSyllabifyLine(lineIdx) {
        const line = this.lyricLines[lineIdx];
        if (!line || !Array.isArray(line.words)) return;
        this.pushUndoState('Auto-Syllabify Line');
        for (let i = line.words.length - 1; i >= 0; i--) {
            LyricStudioModel.splitWordIntoSyllables(line, i, 'auto');
        }
        this.refreshAllViews();
        this.showToast('🔤 Auto-split line words into syllables!');
    },

    autoSyllabifyAllLines() {
        this.pushUndoState('Auto-Syllabify All Lines');
        this.lyricLines.forEach(line => {
            if (Array.isArray(line.words)) {
                for (let i = line.words.length - 1; i >= 0; i--) {
                    LyricStudioModel.splitWordIntoSyllables(line, i, 'auto');
                }
            }
        });
        this.refreshAllViews();
        this.showToast('🔤 Auto-split all English words into syllables!');
    },

    distributeCurrentLineTimings() {
        const line = this.lyricLines[this.activeLineIndex];
        if (!line) return;
        this.pushUndoState('Distribute Word Timings');
        LyricStudioModel.distributeWordTimings(line);
        this.refreshAllViews();
        this.showToast('⏱️ Distributed word timings across line duration!');
    },

    autoFitLineEnds() {
        if (!this.lyricLines || this.lyricLines.length === 0) return;
        this.pushUndoState('Auto-Fit Line Ends');
        let adjusted = 0;
        for (let i = 0; i < this.lyricLines.length; i++) {
            const line = this.lyricLines[i];
            if (typeof line.time !== 'number' || isNaN(line.time)) continue;
            const nextTimed = this.lyricLines.slice(i + 1).find(l => typeof l.time === 'number' && !isNaN(l.time) && l.time > line.time);
            const idealMax = nextTimed ? Math.max(line.time + 0.15, Number((nextTimed.time - 0.04).toFixed(3))) : Number((line.time + 3.2).toFixed(3));
            const idealEnd = nextTimed ? Math.min(idealMax, Number((line.time + 4.5).toFixed(3))) : idealMax;
            line.endTime = idealEnd;
            if (Array.isArray(line.words) && line.words.length > 0) {
                const anyUntimed = line.words.some(w => typeof w.time !== 'number' || isNaN(w.time));
                if (anyUntimed && window.LyricStudioModel) {
                    LyricStudioModel.distributeWordTimings(line);
                } else {
                    const lastW = line.words[line.words.length - 1];
                    if (lastW && typeof lastW.time === 'number' && lastW.time < idealEnd) {
                        lastW.endTime = idealEnd;
                        lastW.end = idealEnd;
                    }
                }
            }
            adjusted++;
        }
        this.refreshAllViews();
        this.showToast(`📐 Auto-fitted end times & gaps across ${adjusted} lines!`);
    },

    autoMarkBracketBackingVocals(allLines = true) {
        if (!this.lyricLines || this.lyricLines.length === 0) return;
        this.pushUndoState('Auto-mark Brackets as Backing Vocals');
        let affected = 0;
        const targets = allLines ? this.lyricLines : [this.lyricLines[this.activeLineIndex]].filter(Boolean);

        targets.forEach(line => {
            const beforeBg = Boolean(line.isBG || line.isBacking);
            const beforeWordBgCount = (line.words || []).filter(w => w.isBG || w.isBacking).length;
            
            if (window.LyricStudioModel && window.LyricStudioModel.autoMarkBracketBackingVocals) {
                window.LyricStudioModel.autoMarkBracketBackingVocals(line);
            }

            const afterBg = Boolean(line.isBG || line.isBacking);
            const afterWordBgCount = (line.words || []).filter(w => w.isBG || w.isBacking).length;
            if (beforeBg !== afterBg || beforeWordBgCount !== afterWordBgCount) {
                affected++;
            }
        });

        this.refreshAllViews();
        this.showToast(`🎤 Converted bracketed lyrics into backing vocals (${affected} lines updated)!`);
    },

    sortLinesByTime() {
        this.pushUndoState('Sort Lines by Time');
        this.lyricLines.sort((a, b) => {
            const ta = typeof a.time === 'number' ? a.time : Number.MAX_SAFE_INTEGER;
            const tb = typeof b.time === 'number' ? b.time : Number.MAX_SAFE_INTEGER;
            return ta - tb;
        });
        this.refreshAllViews();
    },

    shiftAllTimestamps(deltaSec) {
        this.pushUndoState('Shift All Timestamps');
        this.lyricLines.forEach(line => {
            if (typeof line.time === 'number') {
                line.time = Number(Math.max(0, line.time + deltaSec).toFixed(3));
            }
            if (typeof line.endTime === 'number') {
                line.endTime = Number(Math.max((line.time || 0) + 0.05, line.endTime + deltaSec).toFixed(3));
            }
            if (Array.isArray(line.words)) {
                line.words.forEach(w => {
                    if (typeof w.time === 'number') {
                        w.time = Number(Math.max(0, w.time + deltaSec).toFixed(3));
                        w.start = w.time;
                    }
                    if (typeof w.endTime === 'number') {
                        w.endTime = Number(Math.max((w.time || 0) + 0.04, w.endTime + deltaSec).toFixed(3));
                        w.end = w.endTime;
                    }
                });
            }
        });
        this.refreshAllViews();
    },

    clearAllTimings() {
        this.pushUndoState('Clear All Timings');
        this.lyricLines.forEach(line => {
            line.time = null;
            line.endTime = null;
            line.hasWordTiming = false;
            if (Array.isArray(line.words)) {
                line.words.forEach(w => {
                    w.time = null;
                    w.endTime = null;
                    w.start = null;
                    w.end = null;
                });
            }
        });
        this.refreshAllViews();
        this.showToast('🧹 Cleared all timestamps');
    },

    syncCardDomInputs(lineIdx) {
        const line = this.lyricLines[lineIdx];
        if (!line) return;
        const card = document.querySelector(`.studio-lyric-card[data-index="${lineIdx}"]`);
        if (!card) return;
        const subInput = card.querySelector('.studio-subtext-input');
        const romInput = card.querySelector('.studio-roman-input');
        if (subInput && document.activeElement !== subInput) {
            subInput.value = line.translation || line.subText || '';
        }
        if (romInput && document.activeElement !== romInput) {
            romInput.value = line.romanization || '';
        }
    },

    /**
     * Refresh whichever mode workspace is currently active
     */
    refreshActiveView() {
        this._rendererLyricsDirty = true;
        if (this.currentMode === 'edit' && window.LyricStudioEditMode) {
            LyricStudioEditMode.render(this);
        } else if (this.currentMode === 'sync' && window.LyricStudioSyncMode) {
            LyricStudioSyncMode.render(this);
        } else if (this.currentMode === 'preview' && window.LyricStudioPreviewMode) {
            LyricStudioPreviewMode.render(this);
        }
    },

    refreshAllViews() {
        this._rendererLyricsDirty = true;
        this.refreshActiveView();
        this.refreshInspector();
        this.updateHeaderStats();
        this.drawTimeline();
    },

    /**
     * Compatibility alias for existing callers/tests
     */
    renderLinesList() {
        if (window.LyricStudioEditMode) {
            LyricStudioEditMode.render(this);
        }
        if (this.currentMode === 'sync' && window.LyricStudioSyncMode) {
            LyricStudioSyncMode.render(this);
        }
    },

    refreshInspector() {
        if (window.LyricStudioInspector) {
            LyricStudioInspector.render(this);
        }
    },

    updateHeaderStats() {
        if (window.LyricStudioHeader) {
            if (typeof LyricStudioHeader.updateHeaderState === 'function') {
                LyricStudioHeader.studio = this;
                LyricStudioHeader.updateHeaderState();
            }
        }
    },

    updateHeader() {
        this.updateHeaderStats();
    },

    /**
     * Studio-level Undo / Redo management
     */
    pushUndoState() {
        const snapshot = JSON.stringify({
            lyricLines: this.lyricLines,
            activeLineIndex: this.activeLineIndex,
            activeWordIndex: this.activeWordIndex
        });
        if (this.studioUndoStack.length > 0 && this.studioUndoStack[this.studioUndoStack.length - 1] === snapshot) {
            return;
        }
        this.studioUndoStack.push(snapshot);
        if (this.studioUndoStack.length > this.maxUndoLevels) {
            this.studioUndoStack.shift();
        }
        this.studioRedoStack = [];
        this.updateHeaderStats();
    },

    undo() {
        if (this.studioUndoStack.length === 0) return;
        const currentSnapshot = JSON.stringify({
            lyricLines: this.lyricLines,
            activeLineIndex: this.activeLineIndex,
            activeWordIndex: this.activeWordIndex
        });
        this.studioRedoStack.push(currentSnapshot);

        const prev = JSON.parse(this.studioUndoStack.pop());
        this.lyricLines = prev.lyricLines || [];
        this.activeLineIndex = Math.min(prev.activeLineIndex || 0, Math.max(0, this.lyricLines.length - 1));
        this.activeWordIndex = prev.activeWordIndex || 0;

        this.refreshAllViews();
    },

    redo() {
        if (this.studioRedoStack.length === 0) return;
        const currentSnapshot = JSON.stringify({
            lyricLines: this.lyricLines,
            activeLineIndex: this.activeLineIndex,
            activeWordIndex: this.activeWordIndex
        });
        this.studioUndoStack.push(currentSnapshot);

        const next = JSON.parse(this.studioRedoStack.pop());
        this.lyricLines = next.lyricLines || [];
        this.activeLineIndex = Math.min(next.activeLineIndex || 0, Math.max(0, this.lyricLines.length - 1));
        this.activeWordIndex = next.activeWordIndex || 0;

        this.refreshAllViews();
    },

    /**
     * Legacy Tap-to-Sync compatibility helpers
     */
    toggleTapToSync() {
        if (this.currentMode === 'sync') {
            this.switchMode('edit');
        } else {
            this.switchMode('sync');
        }
    },

    stampCurrentLine() {
        if (window.LyricStudioSyncMode) {
            LyricStudioSyncMode.studio = this;
            LyricStudioSyncMode.stampPrimaryStart(true);
        }
    },

    undoLastStamp() {
        if (window.LyricStudioSyncMode) {
            LyricStudioSyncMode.studio = this;
            LyricStudioSyncMode.stepBackAndClear();
        } else {
            this.undo();
        }
    },

    highlightActiveTapLine() {
        if (window.LyricStudioSyncMode) {
            LyricStudioSyncMode.render(this);
        }
    },

    /**
     * Audio & Playhead Helpers (supports real WebAudio buffer OR virtual timer fallback)
     */
    isPlaying() {
        if (typeof isPlaying !== 'undefined' && isPlaying) return true;
        return this.virtualPlaying;
    },

    getCurrentTime() {
        if (typeof audioBuffer !== 'undefined' && audioBuffer) {
            if (typeof isPlaying !== 'undefined' && isPlaying) {
                return typeof getPlayheadTime === 'function' ? getPlayheadTime() : (typeof pausedTime !== 'undefined' ? pausedTime : 0);
            }
            return typeof pausedTime !== 'undefined' ? pausedTime : 0;
        }
        if (this.virtualPlaying) {
            const rate = typeof playbackRate !== 'undefined' ? playbackRate : 1.0;
            const elapsed = ((performance.now() - this.virtualStartPerf) / 1000) * rate;
            const dur = this.getDuration();
            const cur = this.virtualPausedTime + elapsed;
            if (cur >= dur) {
                this.virtualPausedTime = 0;
                this.virtualPlaying = false;
                return dur;
            }
            return cur;
        }
        return typeof pausedTime !== 'undefined' ? pausedTime : this.virtualPausedTime;
    },

    getCurrentAudioTime() {
        return this.getCurrentTime();
    },

    getDuration() {
        if (typeof audioBuffer !== 'undefined' && audioBuffer && audioBuffer.duration > 0) {
            return audioBuffer.duration;
        }
        let maxLyricTime = 60;
        this.lyricLines.forEach(l => {
            if (typeof l.endTime === 'number' && l.endTime + 10 > maxLyricTime) maxLyricTime = l.endTime + 10;
            else if (typeof l.time === 'number' && l.time + 15 > maxLyricTime) maxLyricTime = l.time + 15;
        });
        return maxLyricTime;
    },

    seekTo(targetSec) {
        const dur = this.getDuration();
        const clamped = Math.max(0, Math.min(dur, isNaN(targetSec) ? 0 : targetSec));

        if (typeof audioBuffer !== 'undefined' && audioBuffer) {
            const wasPlaying = typeof isPlaying !== 'undefined' && isPlaying;
            if (wasPlaying && typeof pausePlayback === 'function') {
                pausePlayback();
            } else if (wasPlaying && typeof stopPlayback === 'function') {
                stopPlayback();
            }
            if (typeof syncPreviewToTime === 'function') {
                syncPreviewToTime(clamped);
            } else if (typeof pausedTime !== 'undefined') {
                pausedTime = clamped;
            }
            if (wasPlaying && typeof startPlayback === 'function') {
                startPlayback();
            }
        } else {
            this.virtualPausedTime = clamped;
            if (typeof pausedTime !== 'undefined') pausedTime = clamped;
            if (this.virtualPlaying) {
                this.virtualStartPerf = performance.now();
            }
        }

        this.updateTransportReadout(clamped);
        this.drawTimeline();
    },

    seekAudioTo(targetSec) {
        this.seekTo(targetSec);
    },

    playFromTime(targetSec) {
        this.seekTo(targetSec);
        if (!this.isPlaying()) {
            this.togglePlayback();
        }
    },

    seekRelative(deltaSec) {
        this.seekTo(this.getCurrentTime() + deltaSec);
    },

    togglePlayback() {
        if (typeof audioBuffer !== 'undefined' && audioBuffer) {
            if (typeof isPlaying !== 'undefined' && isPlaying) {
                if (typeof pausePlayback === 'function') pausePlayback();
                else if (typeof stopPlayback === 'function') stopPlayback();
            } else if (typeof startPlayback === 'function') {
                startPlayback();
            }
        } else {
            if (this.virtualPlaying) {
                this.virtualPausedTime = this.getCurrentTime();
                this.virtualPlaying = false;
            } else {
                this.virtualStartPerf = performance.now();
                this.virtualPlaying = true;
            }
            if (typeof pausedTime !== 'undefined') pausedTime = this.virtualPausedTime;
        }
        this.updatePlayButtonUI();
    },

    updatePlayButtonUI() {
        const btn = document.getElementById('studioPlayPauseBtn');
        if (btn) {
            btn.textContent = this.isPlaying() ? '⏸' : '▶';
        }
    },

    updateTransportReadout(curTime) {
        const display = document.getElementById('studioTimeDisplay');
        if (display && window.LyricStudioModel) {
            const total = this.getDuration();
            display.textContent = `${LyricStudioModel.formatTimeMs(curTime)} / ${LyricStudioModel.formatTimeMs(total)}`;
        }

        // Live Lyric Position readout (Line & Word tracking in Studio Dock)
        const posBadge = document.getElementById('studioCurrentPositionBadge');
        if (posBadge && typeof getActiveLyricPosition === 'function') {
            const pos = getActiveLyricPosition(this.lyricLines || [], curTime);
            if (pos.lineIndex >= 0 && pos.line) {
                const lineNum = pos.lineIndex + 1;
                const totalLines = this.lyricLines.length;
                const lineText = (pos.line.text || '').trim();
                const shortLine = lineText.length > 22 ? (lineText.slice(0, 20) + '…') : lineText;
                const words = pos.line.words || [];
                let wordStr = '--';
                if (pos.wordIndex >= 0 && pos.word) {
                    const cleanW = (pos.word.text || '').trim();
                    wordStr = `#${pos.wordIndex + 1}/${words.length} "${cleanW}"`;
                } else if (words.length > 0) {
                    wordStr = `${words.length} words`;
                }
                posBadge.textContent = `Line #${lineNum}/${totalLines} (${shortLine}) • Word: ${wordStr}`;
                posBadge.classList.add('active');
            } else {
                posBadge.textContent = 'Line: -- | Word: --';
                posBadge.classList.remove('active');
            }
        }
        this.updatePlayButtonUI();
    },

    /**
     * Render live studio lyrics to the main Video Canvas so the mini canvas and Preview Mode canvas
     * reflect real-time unapplied studio edits!
     * Uses cached renderer objects so `cachedLines` word-wrap layout is not wiped 60 times/sec.
     */
    renderLiveFrameToMainCanvas(curTime) {
        if (typeof drawFrame !== 'function' || !window.LyricStudioModel) return;
        if (this._rendererLyricsDirty || !this._cachedRendererLyrics || this._cachedRendererLyrics.length !== this.lyricLines.length) {
            this._cachedRendererLyrics = LyricStudioModel.toRendererLyrics(this.lyricLines);
            this._rendererLyricsDirty = false;
        }
        if (typeof lyrics !== 'undefined') {
            lyrics = this._cachedRendererLyrics;
        }
        drawFrame(curTime);
    },

    /**
     * Timeline Canvas Sizing & Drawing
     */
    resizeTimelineCanvas() {
        const container = document.getElementById('studioTimelineContainer');
        const canvas = document.getElementById('studioTimelineCanvas');
        if (!container || !canvas) return;
        const rect = container.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        if (ctx && typeof ctx.setTransform === 'function') {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        this.drawTimeline();
    },

    drawTimeline() {
        if (window.LyricStudioAudioDock) {
            LyricStudioAudioDock.drawTimeline(this);
        }
    },

    /**
     * Studio Animation Loop (runs at 60fps while LyricStudio is open)
     */
    startStudioLoop() {
        const loop = () => {
            if (!this.isOpen) return;
            this._loopFrameCount = (this._loopFrameCount + 1) % 600;

            const curTime = this.getCurrentTime();
            this.updateTransportReadout(curTime);
            this.drawTimeline();

            // In Sync Mode, throttle heavy 1920x1080 video canvas redraws to every 6th frame (~10fps)
            // so keyboard syncing & DOM updates have zero frame latency.
            const shouldRenderVideoCanvas = this.currentMode !== 'sync' || (this._loopFrameCount % 6 === 0);
            if (shouldRenderVideoCanvas) {
                this.renderLiveFrameToMainCanvas(curTime);

                // Copy to mini inspector canvas
                const miniCanvas = document.getElementById('studioMiniCanvas');
                if (miniCanvas && typeof canvas !== 'undefined' && canvas) {
                    const mCtx = miniCanvas.getContext('2d');
                    if (mCtx) {
                        mCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
                        mCtx.drawImage(canvas, 0, 0, miniCanvas.width, miniCanvas.height);
                    }
                }
            }

            // Update mode-specific live ticks
            if (this.currentMode === 'sync' && window.LyricStudioSyncMode) {
                LyricStudioSyncMode.updateLiveTick(this, curTime);
            } else if (this.currentMode === 'edit' && window.LyricStudioEditMode && typeof LyricStudioEditMode.updateLivePlayingState === 'function') {
                LyricStudioEditMode.updateLivePlayingState(this, curTime);
            } else if (this.currentMode === 'preview' && window.LyricStudioPreviewMode) {
                LyricStudioPreviewMode.updateLivePreview(this, curTime);
            }

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    },

    /**
     * Keyboard Handler for Lyric Studio (Edit, Sync, Preview, Undo/Redo, Mode Switching)
     */
    handleKeyDown(e) {
        if (!this.isOpen) return false;

        const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
        const isInputFocused = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable);

        // Escape closes open sub-modals first
        if (e.key === 'Escape') {
            const batchModal = document.getElementById('studioBatchPasteModal');
            const ioModal = document.getElementById('studioImportExportModal');
            const shortcutsPop = document.getElementById('studioShortcutsPopover');
            if (batchModal && (!batchModal.classList.contains('hidden') || batchModal.classList.contains('active'))) {
                batchModal.classList.remove('active');
                batchModal.classList.add('hidden');
                e.preventDefault();
                return true;
            }
            if (ioModal && (!ioModal.classList.contains('hidden') || ioModal.classList.contains('active'))) {
                ioModal.classList.remove('active');
                ioModal.classList.add('hidden');
                e.preventDefault();
                return true;
            }
            if (shortcutsPop && (!shortcutsPop.classList.contains('hidden') || shortcutsPop.classList.contains('active'))) {
                shortcutsPop.classList.remove('active');
                shortcutsPop.classList.add('hidden');
                e.preventDefault();
                return true;
            }
            return false;
        }

        // Ctrl/Cmd + Z / Y Undo & Redo inside Studio (when not typing in a text field)
        if (!isInputFocused && (e.ctrlKey || e.metaKey)) {
            if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
                return true;
            }
            if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
                e.preventDefault();
                this.redo();
                return true;
            }
            if (e.key.toLowerCase() === 's') {
                e.preventDefault();
                this.saveToLrc();
                return true;
            }
        }

        if (isInputFocused) return false;

        // Ensure focused buttons never capture Space or Enter as synthetic clicks
        if (tag === 'BUTTON' && e.target && typeof e.target.blur === 'function') {
            e.target.blur();
        }

        // Quick mode switching: Alt+1 = Edit, Alt+2 = Sync, Alt+3 = Preview
        if (e.altKey && (e.key === '1' || e.key === '2' || e.key === '3')) {
            e.preventDefault();
            if (e.key === '1') this.switchMode('edit');
            if (e.key === '2') this.switchMode('sync');
            if (e.key === '3') this.switchMode('preview');
            return true;
        }

        // Question mark toggles shortcuts popover
        if (e.key === '?') {
            e.preventDefault();
            if (window.LyricStudioHeader) {
                LyricStudioHeader.toggleShortcutsPopover();
            }
            return true;
        }

        // SPACE IS ALWAYS PLAY / PAUSE ONLY ACROSS ALL MODES (never stamps, never moves cursor)
        if (e.code === 'Space') {
            e.preventDefault();
            if (!e.repeat) {
                this.togglePlayback();
            }
            return true;
        }

        // Sync Mode AMLL keyboard-first timing controls (F / G / H / R)
        if (this.currentMode === 'sync' && window.LyricStudioSyncMode) {
            if ((e.code === 'KeyF' || e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                if (!e.repeat) {
                    LyricStudioSyncMode.onKeyF(this);
                }
                return true;
            }
            if ((e.code === 'KeyG' || e.key === 'g' || e.key === 'G') && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                if (!e.repeat) {
                    LyricStudioSyncMode.onKeyG(this);
                }
                return true;
            }
            if ((e.code === 'KeyH' || e.key === 'h' || e.key === 'H' || e.code === 'KeyK' || e.key === 'k' || e.key === 'K') && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                if (!e.repeat) {
                    LyricStudioSyncMode.onKeyH(this);
                }
                return true;
            }
            if ((e.code === 'KeyR' || e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                if (!e.repeat) {
                    LyricStudioSyncMode.studio = this;
                    LyricStudioSyncMode.retryCurrentLine();
                }
                return true;
            }
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!e.repeat) {
                    LyricStudioSyncMode.studio = this;
                    LyricStudioSyncMode.stampPrimaryStart(true);
                }
                return true;
            }
            if (e.key === 'Home' || (e.key === '0' && !e.ctrlKey && !e.metaKey && !e.altKey)) {
                e.preventDefault();
                this.seekTo(0);
                return true;
            }
            if (e.key === 'Backspace') {
                e.preventDefault();
                LyricStudioSyncMode.studio = this;
                LyricStudioSyncMode.stepBackAndClear();
                return true;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                LyricStudioSyncMode.moveCursor(this, -1, 0);
                return true;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                LyricStudioSyncMode.moveCursor(this, 1, 0);
                return true;
            }
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (LyricStudioSyncMode.syncGranularity === 'word') {
                    LyricStudioSyncMode.moveCursor(this, 0, -1);
                } else {
                    this.seekRelative(-2);
                }
                return true;
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (LyricStudioSyncMode.syncGranularity === 'word') {
                    LyricStudioSyncMode.moveCursor(this, 0, 1);
                } else {
                    this.seekRelative(2);
                }
                return true;
            }
            if (e.key === '[' || e.key === '-') {
                e.preventDefault();
                LyricStudioSyncMode.studio = this;
                LyricStudioSyncMode.nudgeActiveTimestamp(-0.05);
                return true;
            }
            if (e.key === ']' || e.key === '=') {
                e.preventDefault();
                LyricStudioSyncMode.studio = this;
                LyricStudioSyncMode.nudgeActiveTimestamp(0.05);
                return true;
            }
            if (e.key.toLowerCase() === 'p') {
                e.preventDefault();
                this.togglePlayback();
                return true;
            }
        }

        // Edit & Preview Modes common shortcuts
        if (e.key === '[' || e.key === '-') {
            e.preventDefault();
            this.nudgeLineTimestamp(this.activeLineIndex, -0.05);
            return true;
        }
        if (e.key === ']' || e.key === '=') {
            e.preventDefault();
            this.nudgeLineTimestamp(this.activeLineIndex, 0.05);
            return true;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectLine(this.activeLineIndex - 1, this.activeWordIndex, { scroll: true });
            return true;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectLine(this.activeLineIndex + 1, this.activeWordIndex, { scroll: true });
            return true;
        }
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.seekRelative(-5);
            return true;
        }
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.seekRelative(5);
            return true;
        }

        return false;
    },

    handleKeyUp(e) {
        if (!this.isOpen) return false;
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return false;

        if (e.code === 'Space') {
            e.preventDefault();
            return true;
        }
        return false;
    },

    showToast(message) {
        const toast = document.getElementById('studioToast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove('hidden');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.classList.add('hidden');
        }, 2200);
    },

    showStudioToast(message) {
        this.showToast(message);
    }
};

window.LyricStudio = LyricStudio;
