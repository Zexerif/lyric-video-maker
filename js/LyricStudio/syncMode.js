/* js/LyricStudio/syncMode.js
 * Sync Mode Component: True AMLL TTML Tool (amll-ttml-tool.stevexmh.net) Keyboard Timing Engine.
 *
 * Keybindings (AMLL Standard):
 * - Space     : Strictly Play / Pause Audio (NEVER stamps or moves cursor!)
 * - F         : Set Start Time of current word/line & stay on it (press F again if you tapped early during silence!)
 * - G         : Set End Time of current word, immediately advance to next word & set its Start Time (Continuous Cut)
 * - H         : Set End Time of current word/line, immediately advance to next word & leave gap (Pause / Line End)
 * - R         : Retry Current Line (resets line to Word #1 & rewinds to 0:00 for Line #1 or pre-roll before line)
 * - Enter     : Quick Stamp Start Time & immediately advance to next word/line
 * - Backspace : Step back 1 word & clear its timestamp
 * - Arrows    : Move sync cursor between lines (Up/Down) and words (Left/Right)
 * - [ / ]     : Nudge active timestamp -50ms / +50ms
 *
 * Performance Architecture:
 * - Zero full-DOM rebuilds during syncing (< 0.2ms incremental DOM updates per keypress).
 * - Single delegated event listener on #studioSyncList.
 * - Instant cursor transitions with zero keyup blocking.
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

    const LyricStudioSyncMode = {
        syncGranularity: 'word', // 'word' (syllable/word karaoke) | 'line' (line-by-line)
        holdToEndEnabled: false,
        latencyOffsetSec: -0.05, // -50ms human reaction compensation when stamping during playback
        isWordSinging: false,    // True after F or G has started the current word/line
        activeSingingTarget: null, // { lineIndex, wordIndex }
        isHoldingPrimaryKey: false,
        heldKeyDownTimeMs: 0,
        heldTarget: null,
        lastStampedTarget: null,

        // Cached DOM pointers for <0.2ms incremental updates
        _stageBound: false,
        _rowEls: [],
        _lineTimePills: [],
        _tokenEls: [],
        _startPills: [],
        _endPills: [],
        _fillBars: [],
        _lastFillPcts: [],
        _prevActiveLine: 0,
        _prevActiveWord: 0,
        _deferredUiTimer: null,
        _lastUndoPushMs: 0,

        init(studio) {
            this.studio = studio;
            this.isWordSinging = false;
            this.activeSingingTarget = null;
            this.bindToolbarEvents();
        },

        getCompensatedTime() {
            if (!this.studio) return 0;
            const raw = this.studio.getCurrentAudioTime();
            const isPlayingNow = typeof this.studio.isPlaying === 'function' && this.studio.isPlaying();
            const offset = isPlayingNow ? (this.latencyOffsetSec || 0) : 0;
            return Number(Math.max(0, raw + offset).toFixed(3));
        },

        resetSingingState() {
            this.isWordSinging = false;
            this.activeSingingTarget = null;
            this.isHoldingPrimaryKey = false;
            this.heldTarget = null;
            this.lastStampedTarget = null;
        },

        flashKeyButton(btnId) {
            const doc = global.document;
            if (!doc) return;
            const btn = doc.getElementById(btnId);
            if (!btn) return;
            btn.classList.add('key-pressed-flash');
            clearTimeout(btn._flashTimer);
            btn._flashTimer = setTimeout(() => {
                btn.classList.remove('key-pressed-flash');
            }, 110);
        },

        scheduleDeferredSidebarSync() {
            if (!this.studio) return;
            this.studio._rendererLyricsDirty = true;
            clearTimeout(this._deferredUiTimer);
            this._deferredUiTimer = setTimeout(() => {
                if (!this.studio) return;
                this.studio.drawTimeline();
                this.studio.refreshInspector();
                this.studio.updateHeader();
            }, 90);
        },

        pushSyncUndoThrottled(label) {
            if (!this.studio) return;
            const now = Date.now();
            // Avoid expensive JSON.stringify on every rapid 100ms syllable tap; snapshot at phrase start or >450ms gap
            if (now - this._lastUndoPushMs > 450 || this.studio.studioUndoStack.length === 0) {
                this._lastUndoPushMs = now;
                this.studio.pushUndoState(label);
            }
        },

        bindToolbarEvents() {
            const doc = global.document;
            if (!doc) return;

            const latencySelect = doc.getElementById('studioSyncLatencySelect');
            if (latencySelect && !latencySelect._bound) {
                latencySelect._bound = true;
                latencySelect.addEventListener('change', (e) => {
                    const v = parseFloat(e.target.value);
                    this.latencyOffsetSec = isNaN(v) ? 0 : v;
                    latencySelect.blur();
                });
            }

            const granBtns = doc.querySelectorAll('[data-sync-granularity], [data-sync-gran]');
            granBtns.forEach(btn => {
                if (btn._bound) return;
                btn._bound = true;
                btn.addEventListener('click', () => {
                    btn.blur();
                    const g = btn.getAttribute('data-sync-granularity') || btn.getAttribute('data-sync-gran');
                    if (g === 'word' || g === 'line') {
                        this.syncGranularity = g;
                        this.resetSingingState();
                        if (this.studio) this.studio.syncGranularity = g;
                        granBtns.forEach(b => {
                            const bg = b.getAttribute('data-sync-granularity') || b.getAttribute('data-sync-gran');
                            b.classList.toggle('active', bg === g);
                        });
                        this.render();
                    }
                });
            });

            const playZeroBtn = doc.getElementById('studioSyncPlayFromZeroBtn');
            if (playZeroBtn && !playZeroBtn._bound) {
                playZeroBtn._bound = true;
                playZeroBtn.addEventListener('click', () => {
                    playZeroBtn.blur();
                    if (this.studio) {
                        this.resetSingingState();
                        this.studio.seekTo(0);
                        this.updateCursorAndLineDom(this.studio.activeLineIndex, this.studio.activeWordIndex);
                    }
                });
            }

            // [F] Set Start button
            const stampStartBtn = doc.getElementById('studioSyncStampStartBtn') || doc.getElementById('studioSyncPrimaryStampBtn');
            if (stampStartBtn && !stampStartBtn._bound) {
                stampStartBtn._bound = true;
                stampStartBtn.addEventListener('click', () => {
                    stampStartBtn.blur();
                    this.onKeyF();
                });
            }

            // [G] Next Word (Continuous Cut) button
            const nextCutBtn = doc.getElementById('studioSyncNextCutBtn');
            if (nextCutBtn && !nextCutBtn._bound) {
                nextCutBtn._bound = true;
                nextCutBtn.addEventListener('click', () => {
                    nextCutBtn.blur();
                    this.onKeyG();
                });
            }

            // [H] End & Gap button
            const stampEndBtn = doc.getElementById('studioSyncStampEndBtn') || doc.getElementById('studioSyncEndStampBtn');
            if (stampEndBtn && !stampEndBtn._bound) {
                stampEndBtn._bound = true;
                stampEndBtn.addEventListener('click', () => {
                    stampEndBtn.blur();
                    this.onKeyH();
                });
            }

            // [R] Retry Line button
            const retryLineBtn = doc.getElementById('studioSyncRetryLineBtn');
            if (retryLineBtn && !retryLineBtn._bound) {
                retryLineBtn._bound = true;
                retryLineBtn.addEventListener('click', () => {
                    retryLineBtn.blur();
                    this.retryCurrentLine();
                });
            }

            const stepBackBtn = doc.getElementById('studioSyncStepBackBtn');
            if (stepBackBtn && !stepBackBtn._bound) {
                stepBackBtn._bound = true;
                stepBackBtn.addEventListener('click', () => {
                    stepBackBtn.blur();
                    this.stepBackAndClear();
                });
            }

            const nudgeBackBtn = doc.getElementById('studioSyncNudgeBackBtn');
            if (nudgeBackBtn && !nudgeBackBtn._bound) {
                nudgeBackBtn._bound = true;
                nudgeBackBtn.addEventListener('click', () => {
                    nudgeBackBtn.blur();
                    this.nudgeActiveTimestamp(-0.05);
                });
            }

            const nudgeFwdBtn = doc.getElementById('studioSyncNudgeFwdBtn');
            if (nudgeFwdBtn && !nudgeFwdBtn._bound) {
                nudgeFwdBtn._bound = true;
                nudgeFwdBtn.addEventListener('click', () => {
                    nudgeFwdBtn.blur();
                    this.nudgeActiveTimestamp(0.05);
                });
            }

            const resetCursorBtn = doc.getElementById('studioSyncResetCursorBtn') || doc.getElementById('studioSyncResetFromCursorBtn');
            if (resetCursorBtn && !resetCursorBtn._bound) {
                resetCursorBtn._bound = true;
                resetCursorBtn.addEventListener('click', () => {
                    resetCursorBtn.blur();
                    if (this.studio) {
                        this.selectCursor(0, 0, true);
                    }
                });
            }
        },

        ensureLineWords(line) {
            if (!line) return [];
            if (!Array.isArray(line.words) || line.words.length === 0) {
                const Model = global.LyricStudioModel;
                line.words = Model
                    ? Model.tokenizeIntoWords(line.text || '', line.time, line.endTime, line.isBG || line.isBacking, false)
                    : [];
            }
            return line.words;
        },

        // ─── AMLL [F] KEY: Set Start Time of Current Word/Line & Stay ────────
        onKeyF() {
            if (!this.studio) return;
            const lines = this.studio.lyricLines || [];
            if (lines.length === 0) return;

            this.flashKeyButton('studioSyncPrimaryStampBtn');
            this.pushSyncUndoThrottled('AMLL Sync [F] Start');

            const curTime = this.getCompensatedTime();
            const lIdx = Math.max(0, Math.min(this.studio.activeLineIndex, lines.length - 1));
            const line = lines[lIdx];
            if (!line) return;

            const touchedLines = [lIdx];

            if (this.syncGranularity === 'line') {
                if (lIdx > 0) {
                    const prevLine = lines[lIdx - 1];
                    if (prevLine && typeof prevLine.time === 'number' && curTime > prevLine.time && prevLine.endTime > curTime) {
                        prevLine.endTime = curTime;
                        touchedLines.push(lIdx - 1);
                    }
                }
                line.time = curTime;
                if (typeof line.endTime !== 'number' || line.endTime <= curTime) {
                    line.endTime = Number((curTime + 3.0).toFixed(3));
                }
                this.isWordSinging = true;
                this.activeSingingTarget = { lineIndex: lIdx, wordIndex: 0 };
            } else {
                const words = this.ensureLineWords(line);
                const wIdx = Math.max(0, Math.min(this.studio.activeWordIndex, Math.max(0, words.length - 1)));
                const word = words[wIdx];

                if (word) {
                    // Clamp previous word if overlapping
                    if (wIdx > 0) {
                        const prevW = words[wIdx - 1];
                        if (prevW && typeof prevW.time === 'number' && curTime >= prevW.time && prevW.endTime > curTime) {
                            prevW.endTime = curTime;
                            prevW.end = curTime;
                        }
                    } else if (lIdx > 0) {
                        const prevLine = lines[lIdx - 1];
                        if (prevLine && Array.isArray(prevLine.words) && prevLine.words.length > 0) {
                            const lastPrevW = prevLine.words[prevLine.words.length - 1];
                            if (lastPrevW && typeof lastPrevW.time === 'number' && curTime > lastPrevW.time && lastPrevW.endTime > curTime) {
                                lastPrevW.endTime = curTime;
                                lastPrevW.end = curTime;
                            }
                            if (typeof prevLine.time === 'number' && curTime > prevLine.time && prevLine.endTime > curTime) {
                                prevLine.endTime = curTime;
                            }
                            touchedLines.push(lIdx - 1);
                        }
                    }

                    word.time = curTime;
                    word.start = curTime;
                    word.endTime = Number((curTime + 0.45).toFixed(3));
                    word.end = word.endTime;
                    line.hasWordTiming = true;

                    // If first word of line (or re-stamping first word after pressing F early during silence!), set line.time = curTime
                    if (wIdx === 0 || typeof line.time !== 'number' || curTime < line.time) {
                        line.time = curTime;
                    }
                    if (typeof line.endTime !== 'number' || line.endTime < word.endTime) {
                        line.endTime = word.endTime;
                    }
                } else {
                    line.time = curTime;
                    line.endTime = Number((curTime + 3.0).toFixed(3));
                }

                this.isWordSinging = true;
                this.activeSingingTarget = { lineIndex: lIdx, wordIndex: wIdx };
            }

            this.updateDomForLines(touchedLines);
            this.updateCursorAndLineDom(lIdx, this.studio.activeWordIndex);
            this.scheduleDeferredSidebarSync();
        },

        // ─── AMLL [G] KEY: End Current Word + Advance + Start Next Word ──────
        onKeyG() {
            if (!this.studio) return;
            const lines = this.studio.lyricLines || [];
            if (lines.length === 0) return;

            this.flashKeyButton('studioSyncNextCutBtn');

            // If current word hasn't been started yet in this sync streak, start it first so Word #1 isn't skipped!
            if (!this.isWordSinging) {
                this.onKeyF();
                return;
            }

            this.pushSyncUndoThrottled('AMLL Sync [G] Next');

            const curTime = this.getCompensatedTime();
            const prevL = Math.max(0, Math.min(this.studio.activeLineIndex, lines.length - 1));
            const curLine = lines[prevL];
            if (!curLine) return;

            const touchedLines = [prevL];

            if (this.syncGranularity === 'line') {
                const startT = typeof curLine.time === 'number' ? curLine.time : Math.max(0, curTime - 1.0);
                curLine.time = Math.min(startT, curTime);
                curLine.endTime = Math.max(Number((curLine.time + 0.04).toFixed(3)), curTime);

                if (prevL + 1 < lines.length) {
                    this.studio.activeLineIndex = prevL + 1;
                    this.studio.activeWordIndex = 0;
                    const nextLine = lines[prevL + 1];
                    nextLine.time = curTime;
                    if (typeof nextLine.endTime !== 'number' || nextLine.endTime <= curTime) {
                        nextLine.endTime = Number((curTime + 3.0).toFixed(3));
                    }
                    this.isWordSinging = true;
                    this.activeSingingTarget = { lineIndex: prevL + 1, wordIndex: 0 };
                    touchedLines.push(prevL + 1);
                } else {
                    this.isWordSinging = false;
                    this.activeSingingTarget = null;
                }
            } else {
                const words = this.ensureLineWords(curLine);
                const prevW = Math.max(0, Math.min(this.studio.activeWordIndex, Math.max(0, words.length - 1)));
                const curWord = words[prevW];

                // 1. End the current word
                if (curWord) {
                    if (typeof curWord.time !== 'number' || curWord.time > curTime) {
                        curWord.time = Number(Math.max(0, curTime - 0.2).toFixed(3));
                        curWord.start = curWord.time;
                    }
                    curWord.endTime = Math.max(Number((curWord.time + 0.02).toFixed(3)), curTime);
                    curWord.end = curWord.endTime;
                    curLine.hasWordTiming = true;
                    if (prevW === words.length - 1 || typeof curLine.endTime !== 'number' || curLine.endTime < curWord.endTime) {
                        curLine.endTime = curWord.endTime;
                    }
                }

                // 2. Advance cursor to next word (or first word of next line) & immediately stamp its Start Time
                if (prevW + 1 < words.length) {
                    const nextW = prevW + 1;
                    this.studio.activeWordIndex = nextW;
                    const nextWord = words[nextW];
                    if (nextWord) {
                        nextWord.time = curTime;
                        nextWord.start = curTime;
                        nextWord.endTime = Number((curTime + 0.45).toFixed(3));
                        nextWord.end = nextWord.endTime;
                        if (typeof curLine.endTime !== 'number' || curLine.endTime < nextWord.endTime) {
                            curLine.endTime = nextWord.endTime;
                        }
                    }
                    this.isWordSinging = true;
                    this.activeSingingTarget = { lineIndex: prevL, wordIndex: nextW };
                } else if (prevL + 1 < lines.length) {
                    const nextL = prevL + 1;
                    this.studio.activeLineIndex = nextL;
                    this.studio.activeWordIndex = 0;
                    const nextLine = lines[nextL];
                    const nextWords = this.ensureLineWords(nextLine);
                    nextLine.time = curTime;
                    if (nextWords[0]) {
                        nextWords[0].time = curTime;
                        nextWords[0].start = curTime;
                        nextWords[0].endTime = Number((curTime + 0.45).toFixed(3));
                        nextWords[0].end = nextWords[0].endTime;
                        nextLine.hasWordTiming = true;
                    }
                    if (typeof nextLine.endTime !== 'number' || nextLine.endTime <= curTime) {
                        nextLine.endTime = Number((curTime + 3.0).toFixed(3));
                    }
                    this.isWordSinging = true;
                    this.activeSingingTarget = { lineIndex: nextL, wordIndex: 0 };
                    touchedLines.push(nextL);
                } else {
                    // Reached the very end of the last line
                    this.isWordSinging = false;
                    this.activeSingingTarget = null;
                }
            }

            this.updateDomForLines(touchedLines);
            this.updateCursorAndLineDom(this.studio.activeLineIndex, this.studio.activeWordIndex, prevL !== this.studio.activeLineIndex);
            this.scheduleDeferredSidebarSync();
        },

        // ─── AMLL [H] KEY: End Current Word/Line & Advance with Gap ──────────
        onKeyH() {
            if (!this.studio) return;
            const lines = this.studio.lyricLines || [];
            if (lines.length === 0) return;

            this.flashKeyButton('studioSyncEndStampBtn');
            this.pushSyncUndoThrottled('AMLL Sync [H] End');

            const curTime = Number(Math.max(0, this.studio.getCurrentAudioTime()).toFixed(3));
            const prevL = Math.max(0, Math.min(this.studio.activeLineIndex, lines.length - 1));
            const curLine = lines[prevL];
            if (!curLine) return;

            const touchedLines = [prevL];

            if (this.syncGranularity === 'line') {
                const startT = typeof curLine.time === 'number' ? curLine.time : Math.max(0, curTime - 1.0);
                curLine.time = Math.min(startT, curTime);
                curLine.endTime = Math.max(Number((curLine.time + 0.04).toFixed(3)), curTime);
                if (prevL + 1 < lines.length) {
                    this.studio.activeLineIndex = prevL + 1;
                    this.studio.activeWordIndex = 0;
                }
            } else {
                const words = this.ensureLineWords(curLine);
                const prevW = Math.max(0, Math.min(this.studio.activeWordIndex, Math.max(0, words.length - 1)));
                const curWord = words[prevW];

                if (curWord) {
                    if (typeof curWord.time !== 'number' || curWord.time > curTime) {
                        curWord.time = Number(Math.max(0, curTime - 0.25).toFixed(3));
                        curWord.start = curWord.time;
                    }
                    curWord.endTime = Math.max(Number((curWord.time + 0.02).toFixed(3)), curTime);
                    curWord.end = curWord.endTime;
                    curLine.hasWordTiming = true;
                    if (prevW === words.length - 1 || typeof curLine.endTime !== 'number' || curLine.endTime < curWord.endTime) {
                        curLine.endTime = curWord.endTime;
                    }
                } else {
                    const startT = typeof curLine.time === 'number' ? curLine.time : Math.max(0, curTime - 1.0);
                    curLine.endTime = Math.max(Number((startT + 0.04).toFixed(3)), curTime);
                }

                // Advance to next word (or first word of next line) WITHOUT stamping its start time
                if (prevW + 1 < words.length) {
                    this.studio.activeWordIndex = prevW + 1;
                } else if (prevL + 1 < lines.length) {
                    this.studio.activeLineIndex = prevL + 1;
                    this.studio.activeWordIndex = 0;
                }
            }

            this.isWordSinging = false;
            this.activeSingingTarget = null;

            this.updateDomForLines(touchedLines);
            this.updateCursorAndLineDom(this.studio.activeLineIndex, this.studio.activeWordIndex, prevL !== this.studio.activeLineIndex);
            this.scheduleDeferredSidebarSync();
        },

        // ─── AMLL [R] KEY: Retry Current Line (with 0:00 or Pre-Roll) ────────
        retryCurrentLine(targetLineIdx) {
            if (!this.studio) return;
            const lines = this.studio.lyricLines || [];
            if (lines.length === 0) return;

            this.flashKeyButton('studioSyncRetryLineBtn');
            const lIdx = typeof targetLineIdx === 'number'
                ? Math.max(0, Math.min(lines.length - 1, targetLineIdx))
                : Math.max(0, Math.min(lines.length - 1, this.studio.activeLineIndex));
            const line = lines[lIdx];
            if (!line) return;

            this.studio.pushUndoState('Retry Line Sync');
            this.resetSingingState();

            // Determine pre-roll seek target BEFORE clearing line.time:
            // For Line #1 (lIdx === 0), ALWAYS seek to 0:00.000 so intro silence is NEVER skipped!
            let seekTarget = 0;
            if (lIdx > 0) {
                const prevLine = lines[lIdx - 1];
                if (prevLine && typeof prevLine.endTime === 'number') {
                    seekTarget = Math.max(0, prevLine.endTime - 1.2);
                } else if (prevLine && typeof prevLine.time === 'number') {
                    seekTarget = Math.max(0, prevLine.time);
                } else if (typeof line.time === 'number') {
                    seekTarget = Math.max(0, line.time - 2.5);
                } else {
                    seekTarget = Math.max(0, this.studio.getCurrentAudioTime() - 2.5);
                }
            }

            // Clear timestamps on this line's words so stale/too-far-ahead timings are wiped clean
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

            const prevL = this.studio.activeLineIndex;
            this.studio.activeLineIndex = lIdx;
            this.studio.activeWordIndex = 0;

            this.studio.seekTo(seekTarget);
            this.updateDomForLines([lIdx]);
            this.updateCursorAndLineDom(lIdx, 0, prevL !== lIdx);
            this.scheduleDeferredSidebarSync();
            this.studio.showStudioToast(lIdx === 0
                ? '↺ Reset Line #1 & rewound to 00:00.000 — Press [F] when vocals start!'
                : `↺ Reset Line #${lIdx + 1} with pre-roll — Press [F] when vocals start!`);
        },

        // ─── Legacy / Enter Key Compatibility: Stamp Start & Advance Immediately ──
        stampPrimaryStart(immediateAdvance = true) {
            if (!this.studio) return;
            const lines = this.studio.lyricLines || [];
            if (lines.length === 0) return;

            this.pushSyncUndoThrottled('Sync Stamp Start');

            const curTime = this.getCompensatedTime();
            const prevL = Math.max(0, Math.min(this.studio.activeLineIndex, lines.length - 1));
            const line = lines[prevL];
            if (!line) return;

            const touchedLines = [prevL];

            if (this.syncGranularity === 'line') {
                if (prevL > 0) {
                    const prevLine = lines[prevL - 1];
                    if (prevLine && typeof prevLine.time === 'number' && curTime > prevLine.time) {
                        if (typeof prevLine.endTime !== 'number' || prevLine.endTime > curTime) {
                            prevLine.endTime = curTime;
                            touchedLines.push(prevL - 1);
                        }
                    }
                }
                line.time = curTime;
                if (typeof line.endTime !== 'number' || line.endTime <= curTime) {
                    line.endTime = Number((curTime + 3.0).toFixed(3));
                }
                this.lastStampedTarget = { lineIndex: prevL, wordIndex: 0, granularity: 'line' };
                if (immediateAdvance) {
                    this.advanceCursor(1);
                }
            } else {
                const words = this.ensureLineWords(line);
                const wIdx = Math.max(0, Math.min(this.studio.activeWordIndex, Math.max(0, words.length - 1)));
                const word = words[wIdx];

                if (word) {
                    if (wIdx > 0) {
                        const prevW = words[wIdx - 1];
                        if (prevW && typeof prevW.time === 'number' && curTime >= prevW.time) {
                            prevW.endTime = curTime;
                            prevW.end = curTime;
                        }
                    } else if (prevL > 0) {
                        const prevLine = lines[prevL - 1];
                        if (prevLine && Array.isArray(prevLine.words) && prevLine.words.length > 0) {
                            const lastPrevW = prevLine.words[prevLine.words.length - 1];
                            if (lastPrevW && typeof lastPrevW.time === 'number' && curTime > lastPrevW.time) {
                                lastPrevW.endTime = curTime;
                                lastPrevW.end = curTime;
                            }
                            if (typeof prevLine.time === 'number' && curTime > prevLine.time && (!prevLine.endTime || prevLine.endTime > curTime)) {
                                prevLine.endTime = curTime;
                            }
                            touchedLines.push(prevL - 1);
                        }
                    }

                    word.time = curTime;
                    word.start = curTime;
                    if (typeof word.endTime !== 'number' || word.endTime <= curTime) {
                        word.endTime = Number((curTime + 0.45).toFixed(3));
                        word.end = word.endTime;
                    }
                    line.hasWordTiming = true;

                    if (wIdx === 0 || typeof line.time !== 'number' || curTime < line.time) {
                        line.time = curTime;
                    }
                    if (typeof line.endTime !== 'number' || line.endTime < word.endTime) {
                        line.endTime = word.endTime;
                    }
                } else {
                    line.time = curTime;
                    line.endTime = Number((curTime + 3.0).toFixed(3));
                }

                this.lastStampedTarget = { lineIndex: prevL, wordIndex: wIdx, granularity: 'word' };
                if (immediateAdvance) {
                    this.advanceCursor(1);
                }
            }

            this.isWordSinging = false;
            this.updateDomForLines(touchedLines);
            this.updateCursorAndLineDom(this.studio.activeLineIndex, this.studio.activeWordIndex, prevL !== this.studio.activeLineIndex);
            this.scheduleDeferredSidebarSync();
        },

        stampPrimaryRelease() {
            this.isHoldingPrimaryKey = false;
            this.heldTarget = null;
        },

        stampSecondaryEnd() {
            this.onKeyH();
        },

        // ─── Cursor Selection & Navigation ───────────────────────────────────
        selectCursor(lineIdx, wordIdx = 0, shouldScroll = false) {
            if (!this.studio) return;
            const lines = this.studio.lyricLines || [];
            if (lines.length === 0) return;

            const prevL = this.studio.activeLineIndex;
            const clampedL = Math.max(0, Math.min(lines.length - 1, lineIdx));
            const line = lines[clampedL];
            const words = this.ensureLineWords(line);
            const clampedW = words.length > 0 ? Math.max(0, Math.min(words.length - 1, wordIdx || 0)) : 0;

            this.resetSingingState();
            this.studio.activeLineIndex = clampedL;
            this.studio.activeWordIndex = clampedW;

            this.updateCursorAndLineDom(clampedL, clampedW, shouldScroll || (prevL !== clampedL && shouldScroll));
            this.scheduleDeferredSidebarSync();
        },

        advanceCursor(step = 1) {
            if (!this.studio) return;
            const lines = this.studio.lyricLines || [];
            if (lines.length === 0) return;

            let lIdx = this.studio.activeLineIndex;
            let wIdx = this.studio.activeWordIndex;

            if (this.syncGranularity === 'line') {
                lIdx = Math.max(0, Math.min(lines.length - 1, lIdx + step));
                wIdx = 0;
            } else {
                const curLine = lines[lIdx];
                const curWords = this.ensureLineWords(curLine);
                const curWordsCount = curWords.length;
                if (step > 0) {
                    if (wIdx + 1 < curWordsCount) {
                        wIdx++;
                    } else if (lIdx + 1 < lines.length) {
                        lIdx++;
                        wIdx = 0;
                    }
                } else if (step < 0) {
                    if (wIdx - 1 >= 0) {
                        wIdx--;
                    } else if (lIdx - 1 >= 0) {
                        lIdx--;
                        const prevWords = this.ensureLineWords(lines[lIdx]);
                        wIdx = Math.max(0, prevWords.length - 1);
                    }
                }
            }

            this.studio.activeLineIndex = lIdx;
            this.studio.activeWordIndex = wIdx;
        },

        moveCursorLine(deltaLines) {
            if (!this.studio) return;
            const lines = this.studio.lyricLines || [];
            if (lines.length === 0) return;

            const nextL = Math.max(0, Math.min(lines.length - 1, this.studio.activeLineIndex + deltaLines));
            const words = this.ensureLineWords(lines[nextL]);
            const nextW = Math.min(this.studio.activeWordIndex, Math.max(0, words.length - 1));
            this.selectCursor(nextL, nextW, true);
        },

        moveCursorWord(deltaWords) {
            if (!this.studio) return;
            const prevL = this.studio.activeLineIndex;
            this.resetSingingState();
            this.advanceCursor(deltaWords);
            this.updateCursorAndLineDom(this.studio.activeLineIndex, this.studio.activeWordIndex, prevL !== this.studio.activeLineIndex);
            this.scheduleDeferredSidebarSync();
        },

        stepBackAndClear() {
            if (!this.studio) return;
            const lines = this.studio.lyricLines || [];
            if (lines.length === 0) return;

            this.pushSyncUndoThrottled('Step Back & Clear');
            const prevL = this.studio.activeLineIndex;

            // If we haven't advanced away from a singing word yet, clear the current word; otherwise step back 1 word and clear it
            if (!this.isWordSinging) {
                this.advanceCursor(-1);
            }
            this.resetSingingState();

            const lIdx = this.studio.activeLineIndex;
            const wIdx = this.studio.activeWordIndex;
            const line = lines[lIdx];
            if (line) {
                if (this.syncGranularity === 'line') {
                    line.time = null;
                    line.endTime = null;
                } else if (Array.isArray(line.words) && line.words[wIdx]) {
                    line.words[wIdx].time = null;
                    line.words[wIdx].endTime = null;
                    line.words[wIdx].start = null;
                    line.words[wIdx].end = null;
                    if (wIdx === 0) {
                        line.time = null;
                    }
                }
            }

            this.updateDomForLines([prevL, lIdx]);
            this.updateCursorAndLineDom(lIdx, wIdx, prevL !== lIdx);
            this.scheduleDeferredSidebarSync();
        },

        // ─── Timestamp Nudging ([ / ] or - / = by 50ms) ──────────────────────
        nudgeActiveTimestamp(deltaSec = 0.05) {
            if (!this.studio) return;
            const lines = this.studio.lyricLines || [];
            const lIdx = this.studio.activeLineIndex;
            const wIdx = this.studio.activeWordIndex;
            const line = lines[lIdx];
            if (!line) return;

            this.pushSyncUndoThrottled(`Nudge ${deltaSec > 0 ? '+' : ''}${Math.round(deltaSec * 1000)}ms`);

            if (this.syncGranularity === 'word' && Array.isArray(line.words) && line.words[wIdx] && typeof line.words[wIdx].time === 'number') {
                const w = line.words[wIdx];
                w.time = Number(Math.max(0, w.time + deltaSec).toFixed(3));
                w.start = w.time;
                if (typeof w.endTime === 'number') {
                    w.endTime = Number(Math.max(w.time + 0.04, w.endTime + deltaSec).toFixed(3));
                    w.end = w.endTime;
                }
                if (wIdx === 0 && typeof line.time === 'number') {
                    line.time = w.time;
                }
            } else {
                const base = typeof line.time === 'number' ? line.time : this.studio.getCurrentAudioTime();
                line.time = Number(Math.max(0, base + deltaSec).toFixed(3));
                if (typeof line.endTime === 'number') {
                    line.endTime = Number(Math.max(line.time + 0.1, line.endTime + deltaSec).toFixed(3));
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
            }

            this.updateDomForLines([lIdx]);
            this.scheduleDeferredSidebarSync();
        },

        // ─── Ultra-Fast Incremental DOM Updates (< 0.2ms) ────────────────────
        updatePromptBanner() {
            const doc = global.document;
            if (!doc || !this.studio) return;
            const promptEl = doc.getElementById('studioTapPrompt');
            if (!promptEl) return;

            const lines = this.studio.lyricLines || [];
            const activeL = this.studio.activeLineIndex;
            const activeW = this.studio.activeWordIndex;
            const activeLineObj = lines[activeL];

            if (activeLineObj) {
                const stateBadge = this.isWordSinging ? '🎤 SINGING (Press G next / H end)' : '⏳ READY (Press F start)';
                if (this.syncGranularity === 'word' && Array.isArray(activeLineObj.words) && activeLineObj.words[activeW]) {
                    const tokText = (activeLineObj.words[activeW].text || '').trim();
                    promptEl.textContent = `Line #${activeL + 1} • Word #${activeW + 1} "${tokText}" — ${stateBadge}`;
                } else {
                    promptEl.textContent = `Line #${activeL + 1}: "${activeLineObj.text}" — ${stateBadge}`;
                }
                promptEl.classList.toggle('is-singing-now', this.isWordSinging);
            } else {
                promptEl.textContent = 'All lines synced!';
                promptEl.classList.remove('is-singing-now');
            }
        },

        updateDomForLines(lineIndices) {
            if (!this.studio) return;
            const Model = global.LyricStudioModel;
            const lines = this.studio.lyricLines || [];

            for (let i = 0; i < lineIndices.length; i++) {
                const lIdx = lineIndices[i];
                const line = lines[lIdx];
                if (!line) continue;

                const linePill = this._lineTimePills[lIdx];
                if (linePill) {
                    const lStartStr = (typeof line.time === 'number' && !isNaN(line.time))
                        ? (Model ? Model.formatTimeMs(line.time) : global.formatTime(line.time))
                        : '--:--.---';
                    const lEndStr = (typeof line.endTime === 'number' && !isNaN(line.endTime))
                        ? (Model ? Model.formatTimeMs(line.endTime) : global.formatTime(line.endTime))
                        : '--:--.---';
                    linePill.textContent = `⏱ ${lStartStr} → ${lEndStr}`;
                    linePill.setAttribute('data-seek-time', typeof line.time === 'number' ? String(line.time) : '');
                }

                const words = line.words || [];
                const tokRow = this._tokenEls[lIdx];
                const sPills = this._startPills[lIdx];
                const ePills = this._endPills[lIdx];
                if (!tokRow || !sPills || !ePills) continue;

                for (let wIdx = 0; wIdx < words.length; wIdx++) {
                    const w = words[wIdx];
                    const tCard = tokRow[wIdx];
                    const sPill = sPills[wIdx];
                    const ePill = ePills[wIdx];
                    if (!w || !tCard) continue;

                    const isTimed = typeof w.time === 'number' && !isNaN(w.time);
                    tCard.classList.toggle('sync-token-timed', isTimed);

                    if (sPill) {
                        const nextStartAttr = isTimed ? String(w.time) : '';
                        if (sPill.getAttribute('data-seek-time') !== nextStartAttr) {
                            sPill.textContent = isTimed
                                ? (Model ? Model.formatTimeMs(w.time) : global.formatTime(w.time))
                                : '--:--.---';
                            sPill.setAttribute('data-seek-time', nextStartAttr);
                        }
                    }
                    if (ePill) {
                        const hasEnd = typeof w.endTime === 'number' && !isNaN(w.endTime);
                        const nextEndAttr = hasEnd ? String(w.endTime) : '';
                        if (ePill.getAttribute('data-seek-time') !== nextEndAttr) {
                            ePill.textContent = hasEnd
                                ? (Model ? Model.formatTimeMs(w.endTime) : global.formatTime(w.endTime))
                                : '--:--.---';
                            ePill.setAttribute('data-seek-time', nextEndAttr);
                        }
                    }
                }
            }
        },

        updateCursorAndLineDom(nextL, nextW, shouldScroll = false) {
            const prevL = this._prevActiveLine;
            const prevW = this._prevActiveWord;

            // Clear old cursor classes
            if (this._rowEls[prevL] && prevL !== nextL) {
                this._rowEls[prevL].classList.remove('sync-line-target');
            }
            if (this._tokenEls[prevL]) {
                if (this.syncGranularity === 'line') {
                    this._tokenEls[prevL].forEach(el => {
                        if (el) el.classList.remove('sync-cursor-active', 'sync-token-holding', 'sync-token-singing');
                    });
                } else if (this._tokenEls[prevL][prevW]) {
                    this._tokenEls[prevL][prevW].classList.remove('sync-cursor-active', 'sync-token-holding', 'sync-token-singing');
                }
            }

            // Apply new cursor classes
            if (this._rowEls[nextL]) {
                this._rowEls[nextL].classList.add('sync-line-target');
            }
            if (this._tokenEls[nextL]) {
                if (this.syncGranularity === 'line') {
                    this._tokenEls[nextL].forEach(el => {
                        if (el) {
                            el.classList.add('sync-cursor-active');
                            el.classList.toggle('sync-token-singing', this.isWordSinging);
                        }
                    });
                } else if (this._tokenEls[nextL][nextW]) {
                    const targetTok = this._tokenEls[nextL][nextW];
                    targetTok.classList.add('sync-cursor-active');
                    targetTok.classList.toggle('sync-token-singing', this.isWordSinging);
                }
            }

            this._prevActiveLine = nextL;
            this._prevActiveWord = nextW;
            this.updatePromptBanner();

            if (shouldScroll) {
                this.scrollToActiveCursor(true);
            }
        },

        // ─── Initial Render of AMLL-Style Sync Stage ─────────────────────────
        render(studio) {
            if (studio) this.studio = studio;
            const doc = global.document;
            if (!doc || !this.studio) return;
            const stage = doc.getElementById('studioSyncStage') || doc.getElementById('studioSyncList');
            if (!stage) return;

            const Model = global.LyricStudioModel;
            const lines = this.studio.lyricLines || [];
            const activeL = this.studio.activeLineIndex;
            const activeW = this.studio.activeWordIndex;
            const curTime = this.studio.getCurrentAudioTime();

            this._prevActiveLine = activeL;
            this._prevActiveWord = activeW;
            this.updatePromptBanner();

            let html = '';
            lines.forEach((line, lIdx) => {
                const isTargetLine = lIdx === activeL;
                const lineStartStr = (typeof line.time === 'number' && !isNaN(line.time))
                    ? (Model ? Model.formatTimeMs(line.time) : global.formatTime(line.time))
                    : '--:--.---';
                const lineEndStr = (typeof line.endTime === 'number' && !isNaN(line.endTime))
                    ? (Model ? Model.formatTimeMs(line.endTime) : global.formatTime(line.endTime))
                    : '--:--.---';

                const isPlayingNow = typeof line.time === 'number' && curTime >= line.time &&
                    curTime <= (typeof line.endTime === 'number' ? line.endTime : line.time + 3.5);

                const words = this.ensureLineWords(line);

                let tokensHtml = '';
                words.forEach((w, wIdx) => {
                    const isTargetWord = isTargetLine && (this.syncGranularity === 'word' ? wIdx === activeW : true);
                    const isSingingThis = isTargetWord && this.isWordSinging;

                    const wStartStr = (typeof w.time === 'number' && !isNaN(w.time))
                        ? (Model ? Model.formatTimeMs(w.time) : global.formatTime(w.time))
                        : '--:--.---';
                    const wEndStr = (typeof w.endTime === 'number' && !isNaN(w.endTime))
                        ? (Model ? Model.formatTimeMs(w.endTime) : global.formatTime(w.endTime))
                        : '--:--.---';

                    let fillPct = 0;
                    if (typeof w.time === 'number') {
                        const wEnd = (typeof w.endTime === 'number' && w.endTime > w.time) ? w.endTime : (w.time + 0.4);
                        if (curTime >= wEnd) fillPct = 100;
                        else if (curTime > w.time) fillPct = Math.round(((curTime - w.time) / (wEnd - w.time)) * 100);
                    }

                    const hasNext = wIdx < words.length - 1;
                    const isSyllableJoin = hasNext && !/\s+$/.test(w.text || '');
                    const tokRuby = (w.ruby || '').trim();
                    const tokRubyHtml = tokRuby ? `<span class="sync-token-ruby">${escapeHtmlSafe(tokRuby)}</span>` : '';

                    tokensHtml += `
                        <div class="sync-token-card ${isTargetWord ? 'sync-cursor-active' : ''} ${isSingingThis ? 'sync-token-singing' : ''} ${typeof w.time === 'number' ? 'sync-token-timed' : ''} ${(w.isBG || w.isBacking) ? 'sync-token-bg' : ''}"
                            data-sync-line="${lIdx}" data-sync-word="${wIdx}">
                            <div class="sync-token-fill-bar" style="width: ${fillPct}%;"></div>
                            <div class="sync-token-top">
                                <span class="sync-token-text-stack">${tokRubyHtml}<span class="sync-token-text">${escapeHtmlSafe((w.text || '').trim() || '␣')}</span></span>
                                ${isSyllableJoin ? '<span class="sync-syllable-hyphen">-</span>' : ''}
                            </div>
                            <div class="sync-token-times">
                                <button type="button" class="sync-time-pill start-pill" data-seek-time="${typeof w.time === 'number' ? w.time : ''}" title="Click to select word & seek to start">${wStartStr}</button>
                                <span class="sync-time-sep">→</span>
                                <button type="button" class="sync-time-pill end-pill" data-seek-time="${typeof w.endTime === 'number' ? w.endTime : ''}" title="Click to select word & seek to end">${wEndStr}</button>
                            </div>
                        </div>
                    `;
                });

                const roleBadges = `
                    ${(line.isBG || line.isBacking) ? '<span class="sync-role-badge bg-badge">BG</span>' : ''}
                    ${line.isDuet ? '<span class="sync-role-badge duet-badge">Duet</span>' : ''}
                `;

                const subMetaHtml = (line.translation || line.subText || line.romanization)
                    ? `<div class="sync-line-submeta">
                        ${line.romanization ? `<div class="sync-roman-text">${escapeHtmlSafe(line.romanization)}</div>` : ''}
                        ${(line.translation || line.subText) ? `<div class="sync-trans-text">${escapeHtmlSafe(line.translation || line.subText)}</div>` : ''}
                       </div>`
                    : '';

                html += `
                    <div class="sync-line-row ${isTargetLine ? 'sync-line-target' : ''} ${isPlayingNow ? 'sync-line-playing' : ''} ${(line.isBG || line.isBacking) ? 'sync-line-bg' : ''} ${line.isDuet ? 'sync-line-duet' : ''}"
                        data-sync-line-row="${lIdx}">
                        <div class="sync-line-header">
                            <div class="sync-line-left">
                                <span class="sync-line-num">#${lIdx + 1}</span>
                                ${roleBadges}
                                <button type="button" class="sync-line-time-pill" data-seek-time="${typeof line.time === 'number' ? line.time : ''}" title="Click to select line & seek to line start">
                                    ⏱ ${lineStartStr} → ${lineEndStr}
                                </button>
                            </div>
                            <div class="sync-line-right-actions">
                                <button type="button" class="sync-line-nudge-btn" data-line-nudge="-0.05" data-line-idx="${lIdx}" title="Nudge line -50ms">-50ms</button>
                                <button type="button" class="sync-line-nudge-btn" data-line-nudge="0.05" data-line-idx="${lIdx}" title="Nudge line +50ms">+50ms</button>
                                <button type="button" class="sync-line-retry-btn" data-retry-line="${lIdx}" title="Reset this line & rewind to 0:00 (for Line #1) or pre-roll">↺ Retry</button>
                                <button type="button" class="sync-line-play-btn" data-play-line="${lIdx}" title="Select this line & play from its timestamp">▶ Play</button>
                            </div>
                        </div>
                        <div class="sync-tokens-flow">
                            ${tokensHtml}
                        </div>
                        ${subMetaHtml}
                    </div>
                `;
            });

            stage.innerHTML = html;
            this.buildDomCache(stage, lines.length);
            this.bindDelegatedStageEvents(stage);
        },

        buildDomCache(stage, lineCount) {
            this._rowEls = new Array(lineCount);
            this._lineTimePills = new Array(lineCount);
            this._tokenEls = new Array(lineCount);
            this._startPills = new Array(lineCount);
            this._endPills = new Array(lineCount);
            this._fillBars = new Array(lineCount);
            this._lastFillPcts = new Array(lineCount);

            const rows = stage.querySelectorAll('.sync-line-row');
            rows.forEach(row => {
                const lIdx = parseInt(row.getAttribute('data-sync-line-row'), 10);
                if (isNaN(lIdx)) return;
                this._rowEls[lIdx] = row;
                this._lineTimePills[lIdx] = row.querySelector('.sync-line-time-pill');

                const cards = row.querySelectorAll('.sync-token-card');
                const wCount = cards.length;
                this._tokenEls[lIdx] = new Array(wCount);
                this._startPills[lIdx] = new Array(wCount);
                this._endPills[lIdx] = new Array(wCount);
                this._fillBars[lIdx] = new Array(wCount);
                this._lastFillPcts[lIdx] = new Int16Array(wCount).fill(-1);

                cards.forEach(card => {
                    const wIdx = parseInt(card.getAttribute('data-sync-word'), 10);
                    if (isNaN(wIdx)) return;
                    this._tokenEls[lIdx][wIdx] = card;
                    this._startPills[lIdx][wIdx] = card.querySelector('.start-pill');
                    this._endPills[lIdx][wIdx] = card.querySelector('.end-pill');
                    this._fillBars[lIdx][wIdx] = card.querySelector('.sync-token-fill-bar');
                });
            });
        },

        // ─── Single Delegated Event Listener (Prevents Cursor-Jumping Bugs) ──
        bindDelegatedStageEvents(stage) {
            if (stage._delegatedSyncBound) return;
            stage._delegatedSyncBound = true;

            stage.addEventListener('click', (e) => {
                if (!this.studio) return;
                const target = e.target;
                if (!target || typeof target.closest !== 'function') return;

                // Always blur clicked buttons inside the Sync Stage so Spacebar / Enter never trigger a focused button!
                const clickedBtn = target.closest('button');
                if (clickedBtn && typeof clickedBtn.blur === 'function') {
                    clickedBtn.blur();
                }

                // 1. Retry Line button (↺ Retry)
                const retryBtn = target.closest('[data-retry-line]');
                if (retryBtn) {
                    const lIdx = parseInt(retryBtn.getAttribute('data-retry-line'), 10);
                    if (!isNaN(lIdx)) {
                        this.retryCurrentLine(lIdx);
                    }
                    return;
                }

                // 2. Play Line button (▶ Play) — ALWAYS selects this line (Word #1) AND plays!
                const playBtn = target.closest('[data-play-line]');
                if (playBtn) {
                    const lIdx = parseInt(playBtn.getAttribute('data-play-line'), 10);
                    if (!isNaN(lIdx)) {
                        this.selectCursor(lIdx, 0, false);
                        const line = this.studio.lyricLines[lIdx];
                        if (line && typeof line.time === 'number') {
                            this.studio.playFromTime(line.time);
                        } else if (lIdx === 0) {
                            this.studio.playFromTime(0);
                        }
                    }
                    return;
                }

                // 3. Line Nudge button (-50ms / +50ms)
                const nudgeBtn = target.closest('.sync-line-nudge-btn');
                if (nudgeBtn) {
                    const lIdx = parseInt(nudgeBtn.getAttribute('data-line-idx'), 10);
                    const delta = parseFloat(nudgeBtn.getAttribute('data-line-nudge'));
                    if (!isNaN(lIdx) && !isNaN(delta)) {
                        this.selectCursor(lIdx, 0, false);
                        this.studio.nudgeLineTimestamp(lIdx, delta);
                    }
                    return;
                }

                // 4. Token Card click (including its timestamp pills!) — ALWAYS selects (lIdx, wIdx)!
                const tokenCard = target.closest('.sync-token-card');
                if (tokenCard) {
                    const lIdx = parseInt(tokenCard.getAttribute('data-sync-line'), 10);
                    const wIdx = parseInt(tokenCard.getAttribute('data-sync-word'), 10);
                    if (!isNaN(lIdx) && !isNaN(wIdx)) {
                        this.selectCursor(lIdx, wIdx, false);
                    }
                    const seekPill = target.closest('[data-seek-time]');
                    if (seekPill) {
                        const rawT = seekPill.getAttribute('data-seek-time');
                        if (rawT !== null && rawT !== '') {
                            const sec = parseFloat(rawT);
                            if (!isNaN(sec)) {
                                this.studio.seekAudioTo(sec);
                            }
                        }
                    }
                    return;
                }

                // 5. Line Row or Line Time Pill click — ALWAYS selects (lIdx, 0)!
                const lineRow = target.closest('.sync-line-row');
                if (lineRow) {
                    const lIdx = parseInt(lineRow.getAttribute('data-sync-line-row'), 10);
                    if (!isNaN(lIdx)) {
                        this.selectCursor(lIdx, 0, false);
                    }
                    const seekPill = target.closest('[data-seek-time]');
                    if (seekPill) {
                        const rawT = seekPill.getAttribute('data-seek-time');
                        if (rawT !== null && rawT !== '') {
                            const sec = parseFloat(rawT);
                            if (!isNaN(sec)) {
                                this.studio.seekAudioTo(sec);
                            }
                        }
                    }
                }
            });
        },

        onPrimaryKeyDown(studio) {
            if (studio) this.studio = studio;
            this.onKeyF();
        },

        onPrimaryKeyUp(studio) {
            if (studio) this.studio = studio;
            this.stampPrimaryRelease();
        },

        moveCursor(studio, deltaLines, deltaWords) {
            if (studio) this.studio = studio;
            if (deltaLines !== 0) {
                this.moveCursorLine(deltaLines);
            } else if (deltaWords !== 0) {
                this.moveCursorWord(deltaWords);
            }
        },

        updateLiveTick(studio, curTime) {
            if (studio) this.studio = studio;
            this.updateLiveProgress(curTime);
        },

        // Fast O(lines) live progress update using cached DOM arrays
        updateLiveProgress(curTime) {
            if (!this.studio || this.studio.currentMode !== 'sync') return;
            const lines = this.studio.lyricLines || [];
            const rowCount = lines.length;
            if (this._rowEls.length !== rowCount) return;

            for (let lIdx = 0; lIdx < rowCount; lIdx++) {
                const line = lines[lIdx];
                const row = this._rowEls[lIdx];
                if (!line || !row) continue;

                const lStart = line.time;
                const hasLStart = typeof lStart === 'number' && !isNaN(lStart);
                const lEnd = (typeof line.endTime === 'number' && !isNaN(line.endTime)) ? line.endTime : (hasLStart ? lStart + 3.5 : -1);
                const isPlayingNow = hasLStart && curTime >= lStart && curTime <= lEnd;
                row.classList.toggle('sync-line-playing', isPlayingNow);

                const fillArr = this._fillBars[lIdx];
                const lastPctArr = this._lastFillPcts[lIdx];
                const words = line.words;
                if (!fillArr || !words) continue;

                for (let wIdx = 0; wIdx < words.length; wIdx++) {
                    const w = words[wIdx];
                    const fillBar = fillArr[wIdx];
                    if (!w || !fillBar) continue;

                    let fillPct = 0;
                    if (typeof w.time === 'number' && !isNaN(w.time)) {
                        const wEnd = (typeof w.endTime === 'number' && w.endTime > w.time) ? w.endTime : (w.time + 0.4);
                        if (curTime >= wEnd) fillPct = 100;
                        else if (curTime > w.time) fillPct = Math.round(((curTime - w.time) / (wEnd - w.time)) * 100);
                    }

                    if (lastPctArr && lastPctArr[wIdx] !== fillPct) {
                        lastPctArr[wIdx] = fillPct;
                        fillBar.style.width = `${fillPct}%`;
                    }
                }
            }
        },

        scrollToActiveCursor(immediate = true) {
            const doc = global.document;
            if (!doc || !this.studio) return;
            const stage = doc.getElementById('studioSyncStage') || doc.getElementById('studioSyncList');
            if (!stage) return;

            const activeRow = this._rowEls[this.studio.activeLineIndex] || stage.querySelector('.sync-line-target');
            if (!activeRow) return;

            // Compute direct scrollTop target so line transitions happen in 0ms without smooth-scroll lag
            const stageHeight = stage.clientHeight || 400;
            const rowTop = activeRow.offsetTop;
            const rowHeight = activeRow.offsetHeight || 72;
            const idealScrollTop = Math.max(0, rowTop - (stageHeight * 0.35) + (rowHeight * 0.5));

            if (immediate || typeof stage.scrollTo !== 'function') {
                stage.scrollTop = idealScrollTop;
            } else {
                stage.scrollTo({ top: idealScrollTop, behavior: 'auto' });
            }
        }
    };

    global.LyricStudioSyncMode = LyricStudioSyncMode;
})(typeof window !== 'undefined' ? window : global);
