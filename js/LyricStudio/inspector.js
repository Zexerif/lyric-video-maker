/* js/LyricStudio/inspector.js
 * Right Inspector Sidebar: Context-sensitive Line Controls (Start/End timestamps, isBG,
 * isDuet, Translation, Romanization) and Word/Syllable Controls (Word text, individual
 * start/end times, Syllable Split & Merge actions).
 */

(function (global) {
    'use strict';

    function escapeHtmlSafe(str) {
        if (typeof global.escapeHtml === 'function') return global.escapeHtml(str);
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    const LyricStudioInspector = {
        init(studio) {
            this.studio = studio;
        },

        render(studio) {
            if (studio) this.studio = studio;
            const doc = global.document;
            if (!doc || !this.studio) return;
            const container = doc.getElementById('studioInspectorBody') || doc.getElementById('studioInspectorContent');
            if (!container) return;

            const Model = global.LyricStudioModel;
            const lines = this.studio.lyricLines || [];
            const lIdx = Math.max(0, Math.min(this.studio.activeLineIndex, Math.max(0, lines.length - 1)));
            const line = lines[lIdx];

            if (!line) {
                container.innerHTML = `<div class="inspector-empty">Select a line or word token to edit its properties.</div>`;
                return;
            }

            if (!Array.isArray(line.words) || (line.words.length === 0 && line.text && line.text.trim())) {
                line.words = Model ? Model.tokenizeIntoWords(line.text || '', line.time, line.endTime, line.isBG, false) : [];
            }

            const words = line.words || [];
            const wIdx = Math.max(0, Math.min(this.studio.activeWordIndex, Math.max(0, words.length - 1)));
            const word = words[wIdx] || null;

            const lineStartStr = typeof line.time === 'number' && !isNaN(line.time)
                ? (Model ? Model.formatTimeMs(line.time) : global.formatTime(line.time))
                : '';
            const lineEndStr = typeof line.endTime === 'number' && !isNaN(line.endTime)
                ? (Model ? Model.formatTimeMs(line.endTime) : global.formatTime(line.endTime))
                : '';

            const isLineBg = Boolean(line.isBG || line.isBacking);
            const isLineDuet = Boolean(line.isDuet);
            const transVal = (line.translation !== undefined && line.translation !== null) ? line.translation : (line.subText || '');
            const romanVal = line.romanization || '';

            // Word / Syllable Section HTML
            let wordSectionHtml = '';
            if (word) {
                const wStartStr = typeof word.time === 'number' && !isNaN(word.time)
                    ? (Model ? Model.formatTimeMs(word.time) : global.formatTime(word.time))
                    : '';
                const wEndStr = typeof word.endTime === 'number' && !isNaN(word.endTime)
                    ? (Model ? Model.formatTimeMs(word.endTime) : global.formatTime(word.endTime))
                    : '';
                const cleanW = (word.text || '').trim();
                const wordRubyVal = (word.ruby || '').trim();
                const hasTrailingSpace = /\s+$/.test(word.text || '');
                const suggestedSplit = Model ? Model.autoSyllabifyWord(cleanW).map(s => s.trim()).join('-') : cleanW;
                const canMergePrev = wIdx > 0;
                const canMergeNext = wIdx < words.length - 1;

                let tokenPillsNav = '';
                words.forEach((tok, idx) => {
                    const tokLabel = (tok.text || '').trim() || '␣';
                    const tokRuby = (tok.ruby || '').trim();
                    const pillInner = tokRuby
                        ? `<ruby>${escapeHtmlSafe(tokLabel)}<rt>${escapeHtmlSafe(tokRuby)}</rt></ruby>`
                        : escapeHtmlSafe(tokLabel);
                    tokenPillsNav += `<button type="button" class="insp-tok-pill ${idx === wIdx ? 'active' : ''}" data-insp-select-word="${idx}">${pillInner}</button>`;
                });

                wordSectionHtml = `
                    <div class="inspector-section">
                        <div class="inspector-section-header">
                            <span>🔤 Word / Syllable #${wIdx + 1} <small style="opacity:0.65;">(of ${words.length})</small></span>
                            <div class="inspector-nav-btns">
                                <button type="button" class="insp-mini-btn" id="inspPrevWordBtn" ${wIdx > 0 ? '' : 'disabled'} title="Previous token">◀</button>
                                <button type="button" class="insp-mini-btn" id="inspNextWordBtn" ${wIdx < words.length - 1 ? '' : 'disabled'} title="Next token">▶</button>
                            </div>
                        </div>

                        <div class="insp-token-strip">${tokenPillsNav}</div>

                        <div class="insp-field-row">
                            <label>Token Text</label>
                            <div style="display:flex; gap:0.35rem; align-items:center;">
                                <input type="text" id="inspWordTextInput" value="${escapeHtmlSafe(cleanW)}" placeholder="Word or syllable..." style="flex:1;">
                                <label class="insp-inline-check" title="Include space after this token (uncheck for mid-word syllables like 'for-ev-er')">
                                    <input type="checkbox" id="inspWordSpaceCheck" ${hasTrailingSpace ? 'checked' : ''}>
                                    <span>Space</span>
                                </label>
                                <label class="insp-inline-check ${(word.isBG || word.isBacking) ? 'active-bg' : ''}" title="Mark this individual word/syllable as Backing Vocal">
                                    <input type="checkbox" id="inspWordBgCheck" ${(word.isBG || word.isBacking) ? 'checked' : ''}>
                                    <span>🎤 BG</span>
                                </label>
                            </div>
                        </div>

                        <div class="insp-field-row">
                            <label>🈯 Ruby / Furigana (Reading Above Word)</label>
                            <input type="text" id="inspWordRubyInput" value="${escapeHtmlSafe(wordRubyVal)}" placeholder="e.g. すべ, こころ, furigana...">
                        </div>

                        <div class="insp-time-grid">
                            <div class="insp-time-box">
                                <label>Word Start</label>
                                <div class="insp-time-input-row">
                                    <input type="text" id="inspWordStartInput" value="${escapeHtmlSafe(wStartStr)}" placeholder="00:00.000">
                                    <button type="button" class="insp-mini-btn" id="inspWordStampStartBtn" title="Stamp playhead as word start">📍</button>
                                </div>
                                <div class="insp-nudge-pair">
                                    <button type="button" class="insp-nudge-btn" data-word-nudge-start="-0.05">-50ms</button>
                                    <button type="button" class="insp-nudge-btn" data-word-nudge-start="0.05">+50ms</button>
                                </div>
                            </div>

                            <div class="insp-time-box">
                                <label>Word End</label>
                                <div class="insp-time-input-row">
                                    <input type="text" id="inspWordEndInput" value="${escapeHtmlSafe(wEndStr)}" placeholder="00:00.000">
                                    <button type="button" class="insp-mini-btn" id="inspWordStampEndBtn" title="Stamp playhead as word end">🏁</button>
                                </div>
                                <div class="insp-nudge-pair">
                                    <button type="button" class="insp-nudge-btn" data-word-nudge-end="-0.05">-50ms</button>
                                    <button type="button" class="insp-nudge-btn" data-word-nudge-end="0.05">+50ms</button>
                                </div>
                            </div>
                        </div>

                        <div class="insp-syllable-box">
                            <label>✂️ Syllable Split & Merge</label>
                            <div style="display:flex; gap:0.35rem; margin-top:0.25rem;">
                                <input type="text" id="inspSyllableSplitInput" value="${escapeHtmlSafe(suggestedSplit)}" placeholder="e.g. for-ev-er" style="flex:1;">
                                <button type="button" class="insp-action-btn primary" id="inspSplitWordBtn" title="Split by hyphens (-)">Split</button>
                                <button type="button" class="insp-action-btn" id="inspAutoSplitWordBtn" title="Auto-detect syllables">✨ Auto</button>
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.35rem; margin-top:0.4rem;">
                                <button type="button" class="insp-action-btn" id="inspMergePrevWordBtn" ${canMergePrev ? '' : 'disabled'}>🔗 ← Merge Prev</button>
                                <button type="button" class="insp-action-btn" id="inspMergeNextWordBtn" ${canMergeNext ? '' : 'disabled'}>Merge Next → 🔗</button>
                            </div>
                        </div>
                    </div>
                `;
            }

            container.innerHTML = `
                <div class="inspector-section">
                    <div class="inspector-section-header">
                        <span>📝 Line #${lIdx + 1} <small style="opacity:0.65;">(of ${lines.length})</small></span>
                        <div class="inspector-nav-btns">
                            <button type="button" class="insp-mini-btn" id="inspPrevLineBtn" ${lIdx > 0 ? '' : 'disabled'} title="Previous line">◀</button>
                            <button type="button" class="insp-mini-btn" id="inspNextLineBtn" ${lIdx < lines.length - 1 ? '' : 'disabled'} title="Next line">▶</button>
                            <button type="button" class="insp-mini-btn accent" id="inspPlayLineBtn" title="Play from line start">▶ Play</button>
                        </div>
                    </div>

                    <div class="insp-time-grid">
                        <div class="insp-time-box">
                            <label>Line Start</label>
                            <div class="insp-time-input-row">
                                <input type="text" id="inspLineStartInput" value="${escapeHtmlSafe(lineStartStr)}" placeholder="00:00.000">
                                <button type="button" class="insp-mini-btn" id="inspLineStampStartBtn" title="Stamp playhead as line start">📍</button>
                            </div>
                            <div class="insp-nudge-pair">
                                <button type="button" class="insp-nudge-btn" data-line-nudge="-0.05">-50ms</button>
                                <button type="button" class="insp-nudge-btn" data-line-nudge="0.05">+50ms</button>
                            </div>
                        </div>

                        <div class="insp-time-box">
                            <label>Line End</label>
                            <div class="insp-time-input-row">
                                <input type="text" id="inspLineEndInput" value="${escapeHtmlSafe(lineEndStr)}" placeholder="00:00.000">
                                <button type="button" class="insp-mini-btn" id="inspLineStampEndBtn" title="Stamp playhead as line end">🏁</button>
                            </div>
                            <div class="insp-nudge-pair">
                                <button type="button" class="insp-nudge-btn" data-line-nudge-end="-0.05">-50ms</button>
                                <button type="button" class="insp-nudge-btn" data-line-nudge-end="0.05">+50ms</button>
                            </div>
                        </div>
                    </div>

                    <div class="insp-toggles-grid">
                        <label class="insp-toggle-card ${isLineBg ? 'active-bg' : ''}">
                            <input type="checkbox" id="inspLineBgToggle" ${isLineBg ? 'checked' : ''}>
                            <span>🎤 Background (isBG)</span>
                        </label>
                        <label class="insp-toggle-card ${isLineDuet ? 'active-duet' : ''}">
                            <input type="checkbox" id="inspLineDuetToggle" ${isLineDuet ? 'checked' : ''}>
                            <span>👥 Duet Singer (isDuet)</span>
                        </label>
                    </div>

                    <div class="insp-field-row">
                        <label>🌐 Translation Text</label>
                        <input type="text" id="inspLineTranslationInput" value="${escapeHtmlSafe(transVal)}" placeholder="Translated lyric line...">
                    </div>

                    <div class="insp-field-row">
                        <label>🔤 Romanization / Pronunciation</label>
                        <input type="text" id="inspLineRomanInput" value="${escapeHtmlSafe(romanVal)}" placeholder="Romaji / Pinyin / Pronunciation...">
                    </div>

                    <div class="insp-line-actions-grid">
                        <button type="button" class="insp-action-btn" id="inspDistributeWordsBtn" title="Evenly distribute word timings across line duration">⏱ Distribute Words</button>
                        <button type="button" class="insp-action-btn" id="inspDupLineBtn" title="Duplicate this line">⧉ Duplicate</button>
                        <button type="button" class="insp-action-btn" id="inspInsertBelowBtn" title="Insert new line below">＋ Insert Below</button>
                        <button type="button" class="insp-action-btn danger" id="inspDeleteLineBtn" title="Delete this line">✕ Delete</button>
                    </div>
                </div>

                ${wordSectionHtml}
            `;

            this.attachEvents(container, lIdx, wIdx, line, word);
        },

        attachEvents(container, lIdx, wIdx, line, word) {
            const Model = global.LyricStudioModel;

            // Line Navigation
            const prevLineBtn = container.querySelector('#inspPrevLineBtn');
            const nextLineBtn = container.querySelector('#inspNextLineBtn');
            const playLineBtn = container.querySelector('#inspPlayLineBtn');

            if (prevLineBtn) {
                prevLineBtn.addEventListener('click', () => {
                    this.studio.selectLineAndWord(Math.max(0, lIdx - 1), 0, true);
                });
            }
            if (nextLineBtn) {
                nextLineBtn.addEventListener('click', () => {
                    this.studio.selectLineAndWord(Math.min(this.studio.lyricLines.length - 1, lIdx + 1), 0, true);
                });
            }
            if (playLineBtn) {
                playLineBtn.addEventListener('click', () => {
                    if (typeof line.time === 'number') {
                        this.studio.playFromTime(line.time);
                    }
                });
            }

            // Line Start & End Inputs
            const lineStartInput = container.querySelector('#inspLineStartInput');
            const lineEndInput = container.querySelector('#inspLineEndInput');
            const lineStampStartBtn = container.querySelector('#inspLineStampStartBtn');
            const lineStampEndBtn = container.querySelector('#inspLineStampEndBtn');

            if (lineStartInput) {
                lineStartInput.addEventListener('change', (e) => {
                    const parsed = Model ? Model.parseTimeInput(e.target.value) : parseFloat(e.target.value);
                    if (parsed !== null && !isNaN(parsed)) {
                        this.studio.pushUndoState('Set Line Start Time');
                        line.time = Number(Math.max(0, parsed).toFixed(3));
                        this.studio.refreshAllViews();
                    }
                });
            }
            if (lineEndInput) {
                lineEndInput.addEventListener('change', (e) => {
                    const parsed = Model ? Model.parseTimeInput(e.target.value) : parseFloat(e.target.value);
                    if (parsed !== null && !isNaN(parsed)) {
                        this.studio.pushUndoState('Set Line End Time');
                        line.endTime = Number(Math.max((line.time || 0) + 0.05, parsed).toFixed(3));
                        this.studio.refreshAllViews();
                    }
                });
            }
            if (lineStampStartBtn) {
                lineStampStartBtn.addEventListener('click', () => {
                    this.studio.pushUndoState('Stamp Line Start');
                    line.time = Number(this.studio.getCurrentAudioTime().toFixed(3));
                    if (typeof line.endTime !== 'number' || line.endTime <= line.time) {
                        line.endTime = Number((line.time + 3.0).toFixed(3));
                    }
                    this.studio.refreshAllViews();
                });
            }
            if (lineStampEndBtn) {
                lineStampEndBtn.addEventListener('click', () => {
                    this.studio.pushUndoState('Stamp Line End');
                    line.endTime = Number(Math.max((line.time || 0) + 0.05, this.studio.getCurrentAudioTime()).toFixed(3));
                    this.studio.refreshAllViews();
                });
            }

            // Line Nudge Buttons
            container.querySelectorAll('[data-line-nudge]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const delta = parseFloat(btn.getAttribute('data-line-nudge'));
                    this.studio.nudgeLineTimestamp(lIdx, delta);
                });
            });
            container.querySelectorAll('[data-line-nudge-end]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const delta = parseFloat(btn.getAttribute('data-line-nudge-end'));
                    this.studio.pushUndoState('Nudge Line End');
                    const curEnd = typeof line.endTime === 'number' ? line.endTime : ((line.time || 0) + 3.0);
                    line.endTime = Number(Math.max((line.time || 0) + 0.05, curEnd + delta).toFixed(3));
                    this.studio.refreshAllViews();
                });
            });

            // Vocal Role Toggles (isBG, isDuet)
            const bgToggle = container.querySelector('#inspLineBgToggle');
            const duetToggle = container.querySelector('#inspLineDuetToggle');
            if (bgToggle) {
                bgToggle.addEventListener('change', () => {
                    this.studio.toggleLineBG(lIdx);
                });
            }
            if (duetToggle) {
                duetToggle.addEventListener('change', () => {
                    this.studio.toggleLineDuet(lIdx);
                });
            }

            // Translation & Romanization Inputs
            const transInput = container.querySelector('#inspLineTranslationInput');
            const romanInput = container.querySelector('#inspLineRomanInput');
            if (transInput) {
                transInput.addEventListener('input', (e) => {
                    line.translation = e.target.value;
                    line.subText = e.target.value;
                    this.studio.syncCardDomInputs(lIdx);
                });
            }
            if (romanInput) {
                romanInput.addEventListener('input', (e) => {
                    line.romanization = e.target.value;
                    this.studio.syncCardDomInputs(lIdx);
                });
            }

            // Line Quick Actions
            const distBtn = container.querySelector('#inspDistributeWordsBtn');
            const dupBtn = container.querySelector('#inspDupLineBtn');
            const insBelowBtn = container.querySelector('#inspInsertBelowBtn');
            const delBtn = container.querySelector('#inspDeleteLineBtn');

            if (distBtn) {
                distBtn.addEventListener('click', () => this.studio.distributeCurrentLineTimings());
            }
            if (dupBtn) {
                dupBtn.addEventListener('click', () => this.studio.duplicateLine(lIdx));
            }
            if (insBelowBtn) {
                insBelowBtn.addEventListener('click', () => this.studio.insertLineAt(lIdx, 'below'));
            }
            if (delBtn) {
                delBtn.addEventListener('click', () => this.studio.deleteLine(lIdx));
            }

            // ─── Word / Syllable Controls ────────────────────────────────────
            if (!word) return;

            container.querySelectorAll('[data-insp-select-word]').forEach(pill => {
                pill.addEventListener('click', () => {
                    const targetW = parseInt(pill.getAttribute('data-insp-select-word'), 10);
                    this.studio.selectLineAndWord(lIdx, targetW, true);
                });
            });

            const prevWordBtn = container.querySelector('#inspPrevWordBtn');
            const nextWordBtn = container.querySelector('#inspNextWordBtn');
            if (prevWordBtn) {
                prevWordBtn.addEventListener('click', () => {
                    this.studio.selectLineAndWord(lIdx, Math.max(0, wIdx - 1), true);
                });
            }
            if (nextWordBtn) {
                nextWordBtn.addEventListener('click', () => {
                    this.studio.selectLineAndWord(lIdx, Math.min((line.words || []).length - 1, wIdx + 1), true);
                });
            }

            const wordTextInput = container.querySelector('#inspWordTextInput');
            const wordSpaceCheck = container.querySelector('#inspWordSpaceCheck');
            const updateWordTextAndSpace = () => {
                const rawClean = wordTextInput ? wordTextInput.value.trim() : (word.text || '').trim();
                const addSpace = wordSpaceCheck ? wordSpaceCheck.checked : /\s+$/.test(word.text || '');
                word.text = rawClean + (addSpace ? ' ' : '');
                if (Model) Model.syncLineFromWords(line);
                this.studio.refreshAllViews();
            };

            if (wordTextInput) {
                wordTextInput.addEventListener('change', updateWordTextAndSpace);
            }
            if (wordSpaceCheck) {
                wordSpaceCheck.addEventListener('change', updateWordTextAndSpace);
            }
            const wordRubyInput = container.querySelector('#inspWordRubyInput');
            if (wordRubyInput) {
                wordRubyInput.addEventListener('change', (e) => {
                    this.studio.pushUndoState('Set Word Ruby / Furigana');
                    word.ruby = e.target.value.trim();
                    this.studio.refreshAllViews();
                });
            }
            const wordBgCheck = container.querySelector('#inspWordBgCheck');
            if (wordBgCheck) {
                wordBgCheck.addEventListener('change', (e) => {
                    this.studio.pushUndoState('Toggle Word Backing Vocal');
                    word.isBacking = e.target.checked;
                    word.isBG = e.target.checked;
                    this.studio.refreshAllViews();
                });
            }

            // Word Start & End Timestamps
            const wStartInput = container.querySelector('#inspWordStartInput');
            const wEndInput = container.querySelector('#inspWordEndInput');
            const wStampStartBtn = container.querySelector('#inspWordStampStartBtn');
            const wStampEndBtn = container.querySelector('#inspWordStampEndBtn');

            if (wStartInput) {
                wStartInput.addEventListener('change', (e) => {
                    const parsed = Model ? Model.parseTimeInput(e.target.value) : parseFloat(e.target.value);
                    if (parsed !== null && !isNaN(parsed)) {
                        this.studio.pushUndoState('Set Word Start Time');
                        word.time = Number(Math.max(0, parsed).toFixed(3));
                        if (typeof word.endTime !== 'number' || word.endTime <= word.time) {
                            word.endTime = Number((word.time + 0.4).toFixed(3));
                        }
                        if (Model) Model.syncLineFromWords(line);
                        this.studio.refreshAllViews();
                    }
                });
            }
            if (wEndInput) {
                wEndInput.addEventListener('change', (e) => {
                    const parsed = Model ? Model.parseTimeInput(e.target.value) : parseFloat(e.target.value);
                    if (parsed !== null && !isNaN(parsed)) {
                        this.studio.pushUndoState('Set Word End Time');
                        word.endTime = Number(Math.max((word.time || 0) + 0.04, parsed).toFixed(3));
                        if (Model) Model.syncLineFromWords(line);
                        this.studio.refreshAllViews();
                    }
                });
            }
            if (wStampStartBtn) {
                wStampStartBtn.addEventListener('click', () => {
                    this.studio.pushUndoState('Stamp Word Start');
                    word.time = Number(this.studio.getCurrentAudioTime().toFixed(3));
                    if (typeof word.endTime !== 'number' || word.endTime <= word.time) {
                        word.endTime = Number((word.time + 0.4).toFixed(3));
                    }
                    if (Model) Model.syncLineFromWords(line);
                    this.studio.refreshAllViews();
                });
            }
            if (wStampEndBtn) {
                wStampEndBtn.addEventListener('click', () => {
                    this.studio.pushUndoState('Stamp Word End');
                    word.endTime = Number(Math.max((word.time || 0) + 0.04, this.studio.getCurrentAudioTime()).toFixed(3));
                    if (Model) Model.syncLineFromWords(line);
                    this.studio.refreshAllViews();
                });
            }

            // Word Nudge Buttons
            container.querySelectorAll('[data-word-nudge-start]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const delta = parseFloat(btn.getAttribute('data-word-nudge-start'));
                    this.studio.pushUndoState('Nudge Word Start');
                    const curS = typeof word.time === 'number' ? word.time : (line.time || 0);
                    word.time = Number(Math.max(0, curS + delta).toFixed(3));
                    if (typeof word.endTime === 'number') {
                        word.endTime = Number(Math.max(word.time + 0.04, word.endTime + delta).toFixed(3));
                    }
                    if (Model) Model.syncLineFromWords(line);
                    this.studio.refreshAllViews();
                });
            });
            container.querySelectorAll('[data-word-nudge-end]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const delta = parseFloat(btn.getAttribute('data-word-nudge-end'));
                    this.studio.pushUndoState('Nudge Word End');
                    const curE = typeof word.endTime === 'number' ? word.endTime : ((word.time || 0) + 0.4);
                    word.endTime = Number(Math.max((word.time || 0) + 0.04, curE + delta).toFixed(3));
                    if (Model) Model.syncLineFromWords(line);
                    this.studio.refreshAllViews();
                });
            });

            // Syllable Split & Merge in Inspector
            const splitInput = container.querySelector('#inspSyllableSplitInput');
            const splitBtn = container.querySelector('#inspSplitWordBtn');
            const autoSplitBtn = container.querySelector('#inspAutoSplitWordBtn');
            const mergePrevBtn = container.querySelector('#inspMergePrevWordBtn');
            const mergeNextBtn = container.querySelector('#inspMergeNextWordBtn');

            if (splitInput) {
                splitInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.studio.splitWord(lIdx, wIdx, splitInput.value);
                    }
                });
            }
            if (splitBtn && splitInput) {
                splitBtn.addEventListener('click', () => {
                    this.studio.splitWord(lIdx, wIdx, splitInput.value);
                });
            }
            if (autoSplitBtn) {
                autoSplitBtn.addEventListener('click', () => {
                    this.studio.splitWord(lIdx, wIdx, 'auto');
                });
            }
            if (mergePrevBtn) {
                mergePrevBtn.addEventListener('click', () => {
                    this.studio.mergeWords(lIdx, wIdx - 1, wIdx);
                });
            }
            if (mergeNextBtn) {
                mergeNextBtn.addEventListener('click', () => {
                    this.studio.mergeWords(lIdx, wIdx, wIdx + 1);
                });
            }
        }
    };

    global.LyricStudioInspector = LyricStudioInspector;
})(typeof window !== 'undefined' ? window : global);
