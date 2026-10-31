/* Undo / Redo History Manager for Lyric Video Generator */

const HistoryManager = {
    undoStack: [],
    redoStack: [],
    maxHistory: 40,
    isApplyingState: false,

    captureState(label = 'Action') {
        if (typeof lrcEditor === 'undefined') return null;

        return {
            label,
            timestamp: Date.now(),
            lyricsText: lrcEditor ? lrcEditor.value : '',
            styles: {
                font: typeof fontSelect !== 'undefined' && fontSelect ? fontSelect.value : currentFont,
                lyricColor: typeof lyricColorInput !== 'undefined' && lyricColorInput ? lyricColorInput.value : currentLyricColor,
                glowColor: typeof glowColorInput !== 'undefined' && glowColorInput ? glowColorInput.value : currentGlowColor,
                dynamicGlow: typeof dynamicGlowCheckbox !== 'undefined' && dynamicGlowCheckbox ? dynamicGlowCheckbox.checked : false,
                bgStyle: typeof bgStyleSelect !== 'undefined' && bgStyleSelect ? bgStyleSelect.value : currentBgStyle,
                lyricAlignment: typeof lyricAlignmentSelect !== 'undefined' && lyricAlignmentSelect ? lyricAlignmentSelect.value : currentLyricAlignment,
                fontSize: typeof fontSizeSlider !== 'undefined' && fontSizeSlider ? fontSizeSlider.value : currentFontSize,
                lineSpacing: typeof lineSpacingSlider !== 'undefined' && lineSpacingSlider ? lineSpacingSlider.value : currentLineSpacing,
                verticalOffset: typeof verticalOffsetSlider !== 'undefined' && verticalOffsetSlider ? verticalOffsetSlider.value : currentVerticalOffset,
                lyricTransition: typeof lyricTransitionSelect !== 'undefined' && lyricTransitionSelect ? lyricTransitionSelect.value : currentLyricTransition,
                backingVocals: typeof backingVocalsSelect !== 'undefined' && backingVocalsSelect ? backingVocalsSelect.value : 'styled',
                backingVocalsAlongside: typeof backingVocalsAlongsideToggle !== 'undefined' && backingVocalsAlongsideToggle ? backingVocalsAlongsideToggle.checked : true,
                bpmVisualizer: typeof bpmVisualizerSelect !== 'undefined' && bpmVisualizerSelect ? bpmVisualizerSelect.value : 'ring-contract',
                animatePlainLyrics: typeof animatePlainLyricsSelect !== 'undefined' && animatePlainLyricsSelect ? animatePlainLyricsSelect.value : 'default',
                audioReactive: typeof audioReactiveSelect !== 'undefined' && audioReactiveSelect ? audioReactiveSelect.value : 'none'
            },
            meta: {
                songTitle: typeof songTitleInput !== 'undefined' && songTitleInput ? songTitleInput.value : '',
                songArtist: typeof songArtistInput !== 'undefined' && songArtistInput ? songArtistInput.value : '',
                songKey: typeof songKeyInput !== 'undefined' && songKeyInput ? songKeyInput.value : ''
            },
            bpm: typeof bpmMarkers !== 'undefined' ? JSON.parse(JSON.stringify(bpmMarkers)) : [{ time: 0, bpm: 0 }]
        };
    },

    pushState(label = 'Edit') {
        if (this.isApplyingState) return;
        const state = this.captureState(label);
        if (!state) return;

        // Check if state is identical to the top of undoStack to avoid duplicate entries
        if (this.undoStack.length > 0) {
            const top = this.undoStack[this.undoStack.length - 1];
            if (top.lyricsText === state.lyricsText &&
                JSON.stringify(top.styles) === JSON.stringify(state.styles) &&
                JSON.stringify(top.meta) === JSON.stringify(state.meta) &&
                JSON.stringify(top.bpm) === JSON.stringify(state.bpm)) {
                return;
            }
        }

        this.undoStack.push(state);
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        // New action clears redo stack
        this.redoStack = [];
        this.updateButtons();
    },

    applyState(state) {
        if (!state) return;
        this.isApplyingState = true;

        try {
            // Apply lyrics
            if (typeof lrcEditor !== 'undefined' && lrcEditor) {
                lrcEditor.value = state.lyricsText || '';
                if (typeof updateLyricsFromEditor === 'function') {
                    updateLyricsFromEditor();
                }
            }

            // Apply styles
            if (state.styles) {
                const s = state.styles;
                if (s.font && typeof fontSelect !== 'undefined' && fontSelect) {
                    fontSelect.value = s.font;
                    currentFont = s.font;
                }
                if (s.lyricColor && typeof lyricColorInput !== 'undefined' && lyricColorInput) {
                    lyricColorInput.value = s.lyricColor;
                    currentLyricColor = s.lyricColor;
                }
                if (s.glowColor && typeof glowColorInput !== 'undefined' && glowColorInput) {
                    glowColorInput.value = s.glowColor;
                    currentGlowColor = s.glowColor;
                }
                if (typeof s.dynamicGlow !== 'undefined' && typeof dynamicGlowCheckbox !== 'undefined' && dynamicGlowCheckbox) {
                    dynamicGlowCheckbox.checked = s.dynamicGlow;
                }
                if (s.bgStyle && typeof bgStyleSelect !== 'undefined' && bgStyleSelect) {
                    bgStyleSelect.value = s.bgStyle;
                    currentBgStyle = s.bgStyle;
                }
                if (s.lyricAlignment && typeof lyricAlignmentSelect !== 'undefined' && lyricAlignmentSelect) {
                    lyricAlignmentSelect.value = s.lyricAlignment;
                    currentLyricAlignment = s.lyricAlignment;
                }
                if (s.fontSize && typeof fontSizeSlider !== 'undefined' && fontSizeSlider) {
                    fontSizeSlider.value = s.fontSize;
                    currentFontSize = parseInt(s.fontSize);
                    if (typeof fontSizeValue !== 'undefined' && fontSizeValue) fontSizeValue.textContent = `${s.fontSize}px`;
                }
                if (s.lineSpacing && typeof lineSpacingSlider !== 'undefined' && lineSpacingSlider) {
                    lineSpacingSlider.value = s.lineSpacing;
                    currentLineSpacing = parseFloat(s.lineSpacing);
                    if (typeof lineSpacingValue !== 'undefined' && lineSpacingValue) lineSpacingValue.textContent = `${s.lineSpacing}x`;
                }
                if (typeof s.verticalOffset !== 'undefined' && typeof verticalOffsetSlider !== 'undefined' && verticalOffsetSlider) {
                    verticalOffsetSlider.value = s.verticalOffset;
                    currentVerticalOffset = parseInt(s.verticalOffset);
                    if (typeof verticalOffsetValue !== 'undefined' && verticalOffsetValue) verticalOffsetValue.textContent = `${s.verticalOffset}px`;
                }
                if (s.lyricTransition && typeof lyricTransitionSelect !== 'undefined' && lyricTransitionSelect) {
                    lyricTransitionSelect.value = s.lyricTransition;
                    currentLyricTransition = s.lyricTransition;
                }
                if (s.backingVocals && typeof backingVocalsSelect !== 'undefined' && backingVocalsSelect) {
                    backingVocalsSelect.value = s.backingVocals;
                }
                if (s.backingVocalsAlongside !== undefined && typeof backingVocalsAlongsideToggle !== 'undefined' && backingVocalsAlongsideToggle) {
                    backingVocalsAlongsideToggle.checked = s.backingVocalsAlongside;
                }
                if (s.bpmVisualizer && typeof bpmVisualizerSelect !== 'undefined' && bpmVisualizerSelect) {
                    bpmVisualizerSelect.value = s.bpmVisualizer;
                }
                if (s.animatePlainLyrics && typeof animatePlainLyricsSelect !== 'undefined' && animatePlainLyricsSelect) {
                    animatePlainLyricsSelect.value = s.animatePlainLyrics;
                }
                if (s.audioReactive && typeof audioReactiveSelect !== 'undefined' && audioReactiveSelect) {
                    audioReactiveSelect.value = s.audioReactive;
                    if (typeof currentAudioReactive !== 'undefined') currentAudioReactive = s.audioReactive;
                }
            }

            // Apply meta
            if (state.meta) {
                if (typeof songTitleInput !== 'undefined' && songTitleInput) songTitleInput.value = state.meta.songTitle || '';
                if (typeof songArtistInput !== 'undefined' && songArtistInput) songArtistInput.value = state.meta.songArtist || '';
                if (typeof songKeyInput !== 'undefined' && songKeyInput) songKeyInput.value = state.meta.songKey || '';
            }

            // Apply BPM
            if (state.bpm && Array.isArray(state.bpm)) {
                bpmMarkers = JSON.parse(JSON.stringify(state.bpm));
                if (typeof renderBpmList === 'function') renderBpmList();
            }

            // Sync studio if open
            if (typeof LyricStudio !== 'undefined' && LyricStudio.isOpen) {
                LyricStudio.loadFromLrc(lrcEditor.value);
            }

            // Save to localStorage & redraw preview
            if (typeof saveProgressToLocalStorage === 'function') {
                saveProgressToLocalStorage();
            }
            if (typeof drawFrame === 'function') {
                drawFrame(typeof pausedTime !== 'undefined' ? pausedTime : 0);
            }
        } finally {
            this.isApplyingState = false;
            this.updateButtons();
        }
    },

    undo() {
        if (this.undoStack.length <= 1) return false;
        // Pop current state onto redo stack
        const current = this.undoStack.pop();
        this.redoStack.push(current);

        // Previous state is now top of undoStack
        const previous = this.undoStack[this.undoStack.length - 1];
        this.applyState(previous);

        if (typeof statusMessage !== 'undefined' && statusMessage) {
            statusMessage.textContent = `↶ Undo: ${current.label || 'Reverted'}`;
            statusMessage.style.color = '#38bdf8';
        }
        return true;
    },

    redo() {
        if (this.redoStack.length === 0) return false;
        const next = this.redoStack.pop();
        this.undoStack.push(next);
        this.applyState(next);

        if (typeof statusMessage !== 'undefined' && statusMessage) {
            statusMessage.textContent = `↷ Redo: ${next.label || 'Reapplied'}`;
            statusMessage.style.color = '#38bdf8';
        }
        return true;
    },

    updateButtons() {
        const undoBtns = document.querySelectorAll('.action-undo-btn');
        const redoBtns = document.querySelectorAll('.action-redo-btn');

        const canUndo = this.undoStack.length > 1;
        const canRedo = this.redoStack.length > 0;

        undoBtns.forEach(btn => {
            btn.disabled = !canUndo;
            btn.style.opacity = canUndo ? '1' : '0.4';
            btn.style.cursor = canUndo ? 'pointer' : 'not-allowed';
        });

        redoBtns.forEach(btn => {
            btn.disabled = !canRedo;
            btn.style.opacity = canRedo ? '1' : '0.4';
            btn.style.cursor = canRedo ? 'pointer' : 'not-allowed';
        });
    }
};

window.HistoryManager = HistoryManager;

