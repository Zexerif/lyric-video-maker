/* js/LyricStudio/editMode.js
 * Edit Mode Component: Fast Text & Word-Token Authoring, Interactive Line & Word Cards,
 * Inline Syllable Splitting & Merging, and Line Structure Operations.
 */

(function (global) {
    'use strict';

    function escapeHtmlAttr(str) {
        if (typeof global.escapeHtml === 'function') return global.escapeHtml(str);
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    const LyricStudioEditMode = {
        inlineSplitState: null, // { lineIndex, wordIndex }

        init(studio) {
            this.studio = studio;
            this.bindToolbarEvents();
        },

        bindToolbarEvents() {
            const doc = global.document;
            if (!doc) return;

            const addTopBtn = doc.getElementById('studioAddLineTopBtn');
            const addBottomBtn = doc.getElementById('studioEditAddLineBtn') || doc.getElementById('studioAddLineBottomBtn');
            const syllabifyLineBtn = doc.getElementById('studioEditSyllabifyLineBtn') || doc.getElementById('studioAutoTokenizeAllBtn');
            const syllabifyAllBtn = doc.getElementById('studioEditSyllabifyAllBtn') || doc.getElementById('studioAutoSyllabifyAllBtn');
            const autoFitEndsBtn = doc.getElementById('studioAutoFitEndsBtn');
            const autoBracketBgBtn = doc.getElementById('studioAutoBracketBgBtn');
            const distributeBtn = doc.getElementById('studioEditDistributeBtn');
            const sortBtn = doc.getElementById('studioEditSortBtn');
            const shiftBackBtn = doc.getElementById('studioEditShiftBackBtn');
            const shiftFwdBtn = doc.getElementById('studioEditShiftFwdBtn');
            const clearTimingsBtn = doc.getElementById('studioClearAllTimingsBtn');

            if (addTopBtn && !addTopBtn._bound) {
                addTopBtn._bound = true;
                addTopBtn.addEventListener('click', () => {
                    if (this.studio) this.studio.insertLineAt(0, 'above');
                });
            }
            if (addBottomBtn && !addBottomBtn._bound) {
                addBottomBtn._bound = true;
                addBottomBtn.addEventListener('click', () => {
                    if (this.studio) this.studio.addNewLineAtEnd();
                });
            }
            if (syllabifyLineBtn && !syllabifyLineBtn._bound) {
                syllabifyLineBtn._bound = true;
                syllabifyLineBtn.addEventListener('click', () => {
                    if (this.studio) this.studio.autoSyllabifyLine(this.studio.activeLineIndex);
                });
            }
            if (syllabifyAllBtn && !syllabifyAllBtn._bound) {
                syllabifyAllBtn._bound = true;
                syllabifyAllBtn.addEventListener('click', () => {
                    if (this.studio) this.studio.autoSyllabifyAllLines();
                });
            }
            if (autoFitEndsBtn && !autoFitEndsBtn._bound) {
                autoFitEndsBtn._bound = true;
                autoFitEndsBtn.addEventListener('click', () => {
                    if (this.studio && typeof this.studio.autoFitLineEnds === 'function') {
                        this.studio.autoFitLineEnds();
                    }
                });
            }
            if (autoBracketBgBtn && !autoBracketBgBtn._bound) {
                autoBracketBgBtn._bound = true;
                autoBracketBgBtn.addEventListener('click', () => {
                    if (this.studio && typeof this.studio.autoMarkBracketBackingVocals === 'function') {
                        this.studio.autoMarkBracketBackingVocals(true);
                    }
                });
            }
            if (distributeBtn && !distributeBtn._bound) {
                distributeBtn._bound = true;
                distributeBtn.addEventListener('click', () => {
                    if (this.studio) this.studio.distributeCurrentLineTimings();
                });
            }
            if (sortBtn && !sortBtn._bound) {
                sortBtn._bound = true;
                sortBtn.addEventListener('click', () => {
                    if (this.studio) this.studio.sortLinesByTime();
                });
            }
            if (shiftBackBtn && !shiftBackBtn._bound) {
                shiftBackBtn._bound = true;
                shiftBackBtn.addEventListener('click', () => {
                    if (this.studio) this.studio.shiftAllTimestamps(-0.1);
                });
            }
            if (shiftFwdBtn && !shiftFwdBtn._bound) {
                shiftFwdBtn._bound = true;
                shiftFwdBtn.addEventListener('click', () => {
                    if (this.studio) this.studio.shiftAllTimestamps(0.1);
                });
            }
            if (clearTimingsBtn && !clearTimingsBtn._bound) {
                clearTimingsBtn._bound = true;
                clearTimingsBtn.addEventListener('click', () => {
                    if (this.studio) this.studio.clearAllTimings();
                });
            }
        },

        render() {
            const doc = global.document;
            if (!doc || !this.studio) return;
            const container = doc.getElementById('studioLinesList');
            if (!container) return;

            const Model = global.LyricStudioModel;
            const lines = this.studio.lyricLines || [];
            const activeLineIdx = this.studio.activeLineIndex;
            const activeWordIdx = this.studio.activeWordIndex;

            container.innerHTML = '';

            lines.forEach((item, index) => {
                // Ensure words array exists on line
                if (!Array.isArray(item.words) || (item.words.length === 0 && item.text && item.text.trim())) {
                    if (Model) {
                        item.words = Model.tokenizeIntoWords(item.text || '', item.time, item.endTime, item.isBG || item.isBacking, false);
                    }
                }

                const isSelectedLine = index === activeLineIdx;
                const card = doc.createElement('div');
                card.className = `studio-lyric-card ${isSelectedLine ? 'selected-card' : ''} ${(index === activeLineIdx && this.studio.isTapToSync) ? 'tap-focused' : ''} ${(item.isBG || item.isBacking) ? 'is-bg-line' : ''} ${item.isDuet ? 'is-duet-line' : ''}`;
                card.setAttribute('data-index', index);

                const timeStr = typeof item.time === 'number' && !isNaN(item.time)
                    ? (Model ? Model.formatTimeMs(item.time) : global.formatTime(item.time))
                    : '--:--.---';
                const endTimeStr = typeof item.endTime === 'number' && !isNaN(item.endTime)
                    ? (Model ? Model.formatTimeMs(item.endTime) : global.formatTime(item.endTime))
                    : '--:--.---';

                const isBg = Boolean(item.isBG || item.isBacking);
                const isDuet = Boolean(item.isDuet);
                const transVal = (item.translation !== undefined && item.translation !== null) ? item.translation : (item.subText || '');
                const romanVal = item.romanization || '';

                // Build Word Chips HTML
                const words = item.words || [];
                let chipsHtml = '';
                words.forEach((w, wIdx) => {
                    const isSelectedWord = isSelectedLine && wIdx === activeWordIdx;
                    const hasNext = wIdx < words.length - 1;
                    const isSyllableJoin = hasNext && !/\s+$/.test(w.text || '');
                    const wTimeBadge = (typeof w.time === 'number' && !isNaN(w.time))
                        ? `<span class="chip-time-badge">${Model ? Model.formatTimeShort(w.time) : ''}</span>`
                        : '';
                    const cleanChipText = (w.text || '').trim() || '␣';
                    const chipRuby = (w.ruby || '').trim();
                    const chipRubyHtml = chipRuby
                        ? `<span class="chip-ruby">${escapeHtmlAttr(chipRuby)}</span>`
                        : '';

                    chipsHtml += `
                        <div class="studio-word-chip-wrap">
                            <button type="button" class="studio-word-chip ${isSelectedWord ? 'active-chip' : ''} ${typeof w.time === 'number' ? 'timed-chip' : ''} ${(w.isBG || w.isBacking) ? 'bg-chip' : ''} ${chipRuby ? 'has-ruby-chip' : ''}"
                                data-line-index="${index}" data-word-index="${wIdx}" title="Click to inspect/split token • Double-click to split into syllables">
                                <span class="chip-text-stack">${chipRubyHtml}<span class="chip-text">${escapeHtmlAttr(cleanChipText)}</span></span>
                                ${wTimeBadge}
                            </button>
                            ${isSyllableJoin ? '<span class="syllable-join-dot" title="Syllable boundary (no space)">·</span>' : ''}
                        </div>
                    `;
                });

                // Inline Syllable Splitter Bar when a word chip on this line is selected
                let inlineTokenBarHtml = '';
                if (isSelectedLine && words[activeWordIdx]) {
                    const selWord = words[activeWordIdx];
                    const cleanW = (selWord.text || '').trim();
                    const selRuby = (selWord.ruby || '').trim();
                    const suggestedSplit = Model ? Model.autoSyllabifyWord(cleanW).map(s => s.trim()).join('-') : cleanW;
                    const canMergeLeft = activeWordIdx > 0;
                    const canMergeRight = activeWordIdx < words.length - 1;

                    // Character-by-character quick split buttons (e.g. f | o | r | e | v | e | r)
                    let charSplitBtnsHtml = '';
                    const chars = Array.from(cleanW);
                    if (chars.length > 1 && chars.length <= 18) {
                        charSplitBtnsHtml = `<div class="studio-char-split-row" title="Click any | between letters to split token at that exact character">`;
                        for (let c = 0; c < chars.length; c++) {
                            charSplitBtnsHtml += `<span class="char-box">${escapeHtmlAttr(chars[c])}</span>`;
                            if (c < chars.length - 1) {
                                charSplitBtnsHtml += `<button type="button" class="char-split-point-btn" data-char-offset="${c + 1}" title="Split into '${escapeHtmlAttr(chars.slice(0, c + 1).join(''))}' + '${escapeHtmlAttr(chars.slice(c + 1).join(''))}'">∣</button>`;
                            }
                        }
                        charSplitBtnsHtml += `</div>`;
                    }

                    inlineTokenBarHtml = `
                        <div class="studio-inline-token-bar">
                            <div class="token-bar-left">
                                <span class="token-bar-badge">Token #${activeWordIdx + 1}: <strong>${escapeHtmlAttr(cleanW)}</strong></span>
                                <input type="text" class="studio-token-ruby-input" value="${escapeHtmlAttr(selRuby)}" placeholder="🈯 Ruby / Furigana..." title="Furigana / Ruby reading displayed above this word">
                                ${charSplitBtnsHtml}
                            </div>
                            <div class="token-bar-controls">
                                <input type="text" class="studio-syllable-split-input" value="${escapeHtmlAttr(suggestedSplit)}" placeholder="e.g. for-ev-er" title="Use hyphens (-) or slashes (/) to split into syllables">
                                <button type="button" class="studio-token-action-btn primary-token-btn" data-token-action="split-hyphen" title="Split token using hyphens">✂️ Split</button>
                                <button type="button" class="studio-token-action-btn" data-token-action="split-auto" title="Auto-detect syllables">✨ Auto</button>
                                <button type="button" class="studio-token-action-btn" data-token-action="merge-prev" ${canMergeLeft ? '' : 'disabled'} title="Merge with previous token">🔗 ← Merge</button>
                                <button type="button" class="studio-token-action-btn" data-token-action="merge-next" ${canMergeRight ? '' : 'disabled'} title="Merge with next token">Merge → 🔗</button>
                                <button type="button" class="studio-token-action-btn" data-token-action="toggle-space" title="Toggle space after this token (syllable vs word end)">${/\s+$/.test(selWord.text || '') ? '␣ Word End' : '· Syllable'}</button>
                                <button type="button" class="studio-token-action-btn" data-token-action="split-line" ${activeWordIdx > 0 ? '' : 'disabled'} title="Break line into two lines starting at this word">↵ Split Line</button>
                            </div>
                        </div>
                    `;
                }

                card.innerHTML = `
                    <div class="studio-card-top-bar">
                        <div class="studio-card-left-meta">
                            <div class="studio-card-index">#${index + 1}</div>
                            <div class="studio-reorder-btns">
                                <button type="button" class="studio-move-up-btn" title="Move line up" ${index === 0 ? 'disabled' : ''}>↑</button>
                                <button type="button" class="studio-move-down-btn" title="Move line down" ${index === lines.length - 1 ? 'disabled' : ''}>↓</button>
                            </div>
                            <div class="studio-card-time-group">
                                <button type="button" class="studio-nudge-btn" data-dir="-1" title="Nudge start -50ms">-50ms</button>
                                <span class="studio-card-time-val" title="Click to seek audio to line start">${timeStr}</span>
                                <button type="button" class="studio-nudge-btn" data-dir="1" title="Nudge start +50ms">+50ms</button>
                                <button type="button" class="studio-stamp-btn" title="Stamp current playhead as Start Time">📍 Start</button>
                                <span class="studio-time-arrow">→</span>
                                <span class="studio-card-endtime-val" title="Click to seek audio to line end">${endTimeStr}</span>
                                <button type="button" class="studio-stamp-end-btn" title="Stamp current playhead as End Time">🏁 End</button>
                            </div>
                        </div>

                        <div class="studio-card-role-pills">
                            <button type="button" class="studio-role-pill ${isBg ? 'active-bg' : ''}" data-role-toggle="bg" title="Toggle Background Vocal (isBG)">🎤 BG</button>
                            <button type="button" class="studio-role-pill ${isDuet ? 'active-duet' : ''}" data-role-toggle="duet" title="Toggle Duet / Secondary Singer (isDuet)">👥 Duet</button>
                        </div>

                        <div class="studio-card-actions">
                            <button type="button" class="studio-play-line-btn" title="Play audio from this line">▶</button>
                            <button type="button" class="studio-insert-above-btn" title="Insert line above">＋↑</button>
                            <button type="button" class="studio-insert-below-btn" title="Insert line below">＋↓</button>
                            <button type="button" class="studio-dup-line-btn" title="Duplicate line">⧉</button>
                            <button type="button" class="studio-merge-line-btn" title="Merge with next line" ${index < lines.length - 1 ? '' : 'disabled'}>🔗</button>
                            <button type="button" class="studio-del-line-btn" title="Delete line">✕</button>
                        </div>
                    </div>

                    <div class="studio-word-chips-row">
                        ${chipsHtml}
                    </div>

                    ${inlineTokenBarHtml}

                    <div class="studio-card-inputs">
                        <input type="text" class="studio-text-input" placeholder="Main lyric line text..." value="${escapeHtmlAttr(item.text || '')}">
                        <div class="studio-secondary-inputs-row">
                            <input type="text" class="studio-subtext-input" placeholder="🌐 Translation / Sub-lyric (optional)..." value="${escapeHtmlAttr(transVal)}">
                            <input type="text" class="studio-roman-input" placeholder="🔤 Romanization / Pronunciation (optional)..." value="${escapeHtmlAttr(romanVal)}">
                        </div>
                    </div>
                `;

                this.attachCardEvents(card, item, index);
                container.appendChild(card);
            });

            // Add Line button at the bottom of the list
            const addRow = doc.createElement('div');
            addRow.style.textAlign = 'center';
            addRow.style.padding = '0.85rem 0';
            addRow.innerHTML = `<button type="button" id="studioAddLineBtn" class="btn small secondary" style="width: auto; padding: 0.55rem 1.75rem; border-radius: 10px;">+ Add New Lyric Line</button>`;
            container.appendChild(addRow);

            const addLineBtn = doc.getElementById('studioAddLineBtn');
            if (addLineBtn) {
                addLineBtn.addEventListener('click', () => {
                    this.studio.addNewLineAtEnd();
                });
            }
        },

        attachCardEvents(card, item, index) {
            const Model = global.LyricStudioModel;

            // Card click selects line
            card.addEventListener('mousedown', (e) => {
                if (this.studio.activeLineIndex !== index) {
                    this.studio.selectLineAndWord(index, 0, false);
                    // Update selected card visual classes without full DOM rebuild if typing in input
                    const tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
                    if (tag !== 'button' && !e.target.closest('.studio-word-chip')) {
                        const allCards = card.parentElement ? card.parentElement.querySelectorAll('.studio-lyric-card') : [];
                        allCards.forEach((c, idx) => c.classList.toggle('selected-card', idx === index));
                    } else {
                        this.render();
                    }
                }
            });

            // Word Chip Click & Double Click
            const wordChips = card.querySelectorAll('.studio-word-chip');
            wordChips.forEach(chip => {
                chip.addEventListener('click', (e) => {
                    e.stopPropagation();
                    chip.blur();
                    const wIdx = parseInt(chip.getAttribute('data-word-index'), 10);
                    this.studio.selectLineAndWord(index, wIdx, true);
                    // Only seek audio when clicking the timestamp badge inside the chip (or Alt+Click) so selecting Word #1 never skips intro silence
                    const clickedTimeBadge = e.target && typeof e.target.closest === 'function' && e.target.closest('.chip-time-badge');
                    const wordObj = item.words && item.words[wIdx];
                    if ((clickedTimeBadge || e.altKey) && wordObj && typeof wordObj.time === 'number') {
                        this.studio.seekAudioTo(wordObj.time);
                    }
                });
                chip.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    const wIdx = parseInt(chip.getAttribute('data-word-index'), 10);
                    this.studio.selectLineAndWord(index, wIdx, true);
                    const splitInput = card.querySelector('.studio-syllable-split-input');
                    if (splitInput) {
                        splitInput.focus();
                        splitInput.select();
                    }
                });
            });

            // Character Boundary Quick Split Buttons
            const charSplitBtns = card.querySelectorAll('.char-split-point-btn');
            charSplitBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const charOffset = parseInt(btn.getAttribute('data-char-offset'), 10);
                    this.studio.splitWordAtCharacter(index, this.studio.activeWordIndex, charOffset);
                });
            });

            // Inline Token Action Bar Buttons
            const tokenRubyInput = card.querySelector('.studio-token-ruby-input');
            if (tokenRubyInput) {
                tokenRubyInput.addEventListener('focus', () => {
                    this.studio._pushedRubyUndo = false;
                });
                tokenRubyInput.addEventListener('input', (e) => {
                    const wIdx = this.studio.activeWordIndex;
                    const targetWord = item.words && item.words[wIdx];
                    if (!targetWord) return;
                    if (!this.studio._pushedRubyUndo) {
                        this.studio.pushUndoState('Edit Word Ruby');
                        this.studio._pushedRubyUndo = true;
                    }
                    targetWord.ruby = e.target.value.trim();
                    this.refreshChipsRowInCard(card, item, index);
                    this.studio.refreshInspector();
                    this.studio._rendererLyricsDirty = true;
                });
            }

            const splitInput = card.querySelector('.studio-syllable-split-input');
            if (splitInput) {
                splitInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        this.studio.splitWord(index, this.studio.activeWordIndex, splitInput.value);
                    }
                });
            }

            const tokenActionBtns = card.querySelectorAll('[data-token-action]');
            tokenActionBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.getAttribute('data-token-action');
                    const wIdx = this.studio.activeWordIndex;
                    if (action === 'split-hyphen' && splitInput) {
                        this.studio.splitWord(index, wIdx, splitInput.value);
                    } else if (action === 'split-auto') {
                        this.studio.splitWord(index, wIdx, 'auto');
                    } else if (action === 'merge-prev') {
                        this.studio.mergeWords(index, wIdx - 1, wIdx);
                    } else if (action === 'merge-next') {
                        this.studio.mergeWords(index, wIdx, wIdx + 1);
                    } else if (action === 'toggle-space') {
                        this.studio.toggleWordTrailingSpace(index, wIdx);
                    } else if (action === 'split-line') {
                        this.studio.splitLineAtWord(index, wIdx);
                    }
                });
            });

            // Main Text Input
            const textInput = card.querySelector('.studio-text-input');
            if (textInput) {
                textInput.addEventListener('focus', () => {
                    this.studio._pushedTextUndo = false;
                });
                textInput.addEventListener('input', (e) => {
                    if (!this.studio._pushedTextUndo) {
                        this.studio.pushUndoState('Edit Line Text');
                        this.studio._pushedTextUndo = true;
                    }
                    const newVal = e.target.value;
                    if (Model) {
                        Model.syncWordsFromLineText(item, newVal);
                    } else {
                        item.text = newVal;
                    }
                    this.refreshChipsRowInCard(card, item, index);
                    this.studio.drawTimeline();
                    this.studio.refreshInspector();
                    this.studio.updateHeader();
                });
            }

            // Translation Input
            const subtextInput = card.querySelector('.studio-subtext-input');
            if (subtextInput) {
                subtextInput.addEventListener('input', (e) => {
                    item.subText = e.target.value;
                    item.translation = e.target.value;
                    this.studio.drawTimeline();
                    this.studio.refreshInspector();
                });
            }

            // Romanization Input
            const romanInput = card.querySelector('.studio-roman-input');
            if (romanInput) {
                romanInput.addEventListener('input', (e) => {
                    item.romanization = e.target.value;
                    this.studio.refreshInspector();
                });
            }

            // Timestamp pill click -> seek
            const timeValEl = card.querySelector('.studio-card-time-val');
            if (timeValEl) {
                timeValEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.studio.activeLineIndex = index;
                    if (typeof item.time === 'number') {
                        this.studio.seekAudioTo(item.time);
                    }
                });
            }
            const endTimeValEl = card.querySelector('.studio-card-endtime-val');
            if (endTimeValEl) {
                endTimeValEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.studio.activeLineIndex = index;
                    if (typeof item.endTime === 'number') {
                        this.studio.seekAudioTo(item.endTime);
                    }
                });
            }

            // Stamp Start & Stamp End
            const stampBtn = card.querySelector('.studio-stamp-btn');
            if (stampBtn) {
                stampBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    stampBtn.blur();
                    this.studio.activeLineIndex = index;
                    this.studio.pushUndoState('Stamp Line Start');
                    const curTime = this.studio.getCurrentAudioTime();
                    item.time = Number(Math.max(0, curTime).toFixed(3));
                    if (typeof item.endTime !== 'number' || item.endTime <= item.time) {
                        item.endTime = Number((item.time + 3.0).toFixed(3));
                    }
                    if (timeValEl) {
                        timeValEl.textContent = Model ? Model.formatTimeMs(item.time) : global.formatTime(item.time);
                    }
                    if (endTimeValEl) {
                        endTimeValEl.textContent = Model ? Model.formatTimeMs(item.endTime) : global.formatTime(item.endTime);
                    }
                    this.studio.drawTimeline();
                    this.studio.refreshInspector();
                    this.studio.updateHeader();
                });
            }

            const stampEndBtn = card.querySelector('.studio-stamp-end-btn');
            if (stampEndBtn) {
                stampEndBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    stampEndBtn.blur();
                    this.studio.activeLineIndex = index;
                    this.studio.pushUndoState('Stamp Line End');
                    const curTime = this.studio.getCurrentAudioTime();
                    item.endTime = Number(Math.max((item.time || 0) + 0.05, curTime).toFixed(3));
                    if (endTimeValEl) {
                        endTimeValEl.textContent = Model ? Model.formatTimeMs(item.endTime) : global.formatTime(item.endTime);
                    }
                    this.studio.drawTimeline();
                    this.studio.refreshInspector();
                });
            }

            // Nudge buttons (+/- 50ms)
            const nudgeBtns = card.querySelectorAll('.studio-nudge-btn');
            nudgeBtns.forEach(b => {
                b.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const dir = parseFloat(b.getAttribute('data-dir'));
                    const delta = dir * 0.05; // 50ms nudge
                    this.studio.nudgeLineTimestamp(index, delta);
                });
            });

            // Role toggles (BG, Duet)
            const roleBtns = card.querySelectorAll('[data-role-toggle]');
            roleBtns.forEach(b => {
                b.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const role = b.getAttribute('data-role-toggle');
                    if (role === 'bg') {
                        this.studio.toggleLineBG(index);
                    } else if (role === 'duet') {
                        this.studio.toggleLineDuet(index);
                    }
                });
            });

            // Reorder Up / Down
            const upBtn = card.querySelector('.studio-move-up-btn');
            if (upBtn) {
                upBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.studio.moveLine(index, -1);
                });
            }
            const downBtn = card.querySelector('.studio-move-down-btn');
            if (downBtn) {
                downBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.studio.moveLine(index, 1);
                });
            }

            // Play Line
            const playLineBtn = card.querySelector('.studio-play-line-btn');
            if (playLineBtn) {
                playLineBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    playLineBtn.blur();
                    this.studio.selectLineAndWord(index, 0, true);
                    if (typeof item.time === 'number') {
                        this.studio.playFromTime(item.time);
                    } else if (index === 0) {
                        this.studio.playFromTime(0);
                    }
                });
            }

            // Insert Above / Below / Duplicate / Merge / Delete
            const insAboveBtn = card.querySelector('.studio-insert-above-btn');
            if (insAboveBtn) {
                insAboveBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.studio.insertLineAt(index, 'above');
                });
            }
            const insBelowBtn = card.querySelector('.studio-insert-below-btn');
            if (insBelowBtn) {
                insBelowBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.studio.insertLineAt(index, 'below');
                });
            }
            const dupBtn = card.querySelector('.studio-dup-line-btn');
            if (dupBtn) {
                dupBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.studio.duplicateLine(index);
                });
            }
            const mergeLineBtn = card.querySelector('.studio-merge-line-btn');
            if (mergeLineBtn) {
                mergeLineBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.studio.mergeLineWithNext(index);
                });
            }
            const delLineBtn = card.querySelector('.studio-del-line-btn');
            if (delLineBtn) {
                delLineBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.studio.deleteLine(index);
                });
            }
        },

        
        updateLivePlayingState(studio, curTime) {
            const doc = global.document;
            if (!doc || !studio || studio.currentMode !== 'edit') return;
            const container = doc.getElementById('studioLinesList');
            if (!container) return;

            const lines = studio.lyricLines || [];
            const cards = container.querySelectorAll('.studio-lyric-card');
            cards.forEach((card, idx) => {
                const line = lines[idx];
                if (!line) return;
                const isPlayingLine = typeof line.time === 'number' && curTime >= line.time &&
                    curTime <= (typeof line.endTime === 'number' ? line.endTime : line.time + 3.5);
                
                card.classList.toggle('playing-line', isPlayingLine);

                const chips = card.querySelectorAll('.studio-word-chip');
                const words = line.words || [];
                chips.forEach((chip, wIdx) => {
                    const w = words[wIdx];
                    if (!w) return;
                    const wStart = typeof w.time === 'number' ? w.time : w.start;
                    const wRawEnd = typeof w.endTime === 'number' ? w.endTime : w.end;
                    const wEnd = (typeof wRawEnd === 'number' && wRawEnd > wStart) ? wRawEnd : (typeof wStart === 'number' ? wStart + 0.35 : null);
                    
                    const isWordSinging = typeof wStart === 'number' && typeof wEnd === 'number' && curTime >= wStart && curTime <= wEnd;
                    const isWordSung = typeof wEnd === 'number' && curTime > wEnd;
                    
                    chip.classList.toggle('singing-chip', isWordSinging);
                    chip.classList.toggle('sung-chip', isWordSung);
                });
            });
        },

        refreshChipsRowInCard(card, item, index) {
            const chipsRow = card.querySelector('.studio-word-chips-row');
            if (!chipsRow) return;
            const Model = global.LyricStudioModel;
            const words = item.words || [];
            const isSelectedLine = index === this.studio.activeLineIndex;
            const activeWordIdx = this.studio.activeWordIndex;

            let chipsHtml = '';
            words.forEach((w, wIdx) => {
                const isSelectedWord = isSelectedLine && wIdx === activeWordIdx;
                const hasNext = wIdx < words.length - 1;
                const isSyllableJoin = hasNext && !/\s+$/.test(w.text || '');
                const wTimeBadge = (typeof w.time === 'number' && !isNaN(w.time))
                    ? `<span class="chip-time-badge">${Model ? Model.formatTimeShort(w.time) : ''}</span>`
                    : '';
                const cleanChipText = (w.text || '').trim() || '␣';
                const chipRuby = (w.ruby || '').trim();
                const chipRubyHtml = chipRuby
                    ? `<span class="chip-ruby">${escapeHtmlAttr(chipRuby)}</span>`
                    : '';

                chipsHtml += `
                    <div class="studio-word-chip-wrap">
                        <button type="button" class="studio-word-chip ${isSelectedWord ? 'active-chip' : ''} ${typeof w.time === 'number' ? 'timed-chip' : ''} ${(w.isBG || w.isBacking) ? 'bg-chip' : ''} ${chipRuby ? 'has-ruby-chip' : ''}"
                            data-line-index="${index}" data-word-index="${wIdx}">
                            <span class="chip-text-stack">${chipRubyHtml}<span class="chip-text">${escapeHtmlAttr(cleanChipText)}</span></span>
                            ${wTimeBadge}
                        </button>
                        ${isSyllableJoin ? '<span class="syllable-join-dot">·</span>' : ''}
                    </div>
                `;
            });
            chipsRow.innerHTML = chipsHtml;

            const wordChips = chipsRow.querySelectorAll('.studio-word-chip');
            wordChips.forEach(chip => {
                chip.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const wIdx = parseInt(chip.getAttribute('data-word-index'), 10);
                    this.studio.selectLineAndWord(index, wIdx, true);
                });
            });
        }
    };

    global.LyricStudioEditMode = LyricStudioEditMode;
})(typeof window !== 'undefined' ? window : global);
