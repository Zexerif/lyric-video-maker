/* Application Entry Point & Module Orchestrator */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Keyboard Shortcuts
    if (typeof ShortcutsManager !== 'undefined') {
        ShortcutsManager.init();
    }

    // 2. Restore Progress from LocalStorage
    if (typeof restoreProgressFromLocalStorage === 'function') {
        restoreProgressFromLocalStorage();
    }

    // 3. Initialize Undo/Redo Baseline State
    if (typeof HistoryManager !== 'undefined') {
        setTimeout(() => {
            HistoryManager.pushState('Initial');
        }, 100);
    }

    // 4. Wire Global Undo & Redo UI Buttons
    const globalUndoBtn = document.getElementById('globalUndoBtn');
    const globalRedoBtn = document.getElementById('globalRedoBtn');
    if (globalUndoBtn && typeof HistoryManager !== 'undefined') {
        globalUndoBtn.addEventListener('click', () => HistoryManager.undo());
    }
    if (globalRedoBtn && typeof HistoryManager !== 'undefined') {
        globalRedoBtn.addEventListener('click', () => HistoryManager.redo());
    }

    // 5. Wire Keyboard Shortcuts Overlay Button & Close Buttons
    const shortcutsBtn = document.getElementById('shortcutsBtn');
    const closeShortcutsBtn = document.getElementById('closeShortcutsBtn');
    if (shortcutsBtn && typeof ShortcutsManager !== 'undefined') {
        shortcutsBtn.addEventListener('click', () => ShortcutsManager.toggleCheatSheet());
    }
    if (closeShortcutsBtn) {
        closeShortcutsBtn.addEventListener('click', () => {
            const m = document.getElementById('shortcutsModal');
            if (m) m.classList.remove('active');
        });
    }

    // 6. Wire Lyric Studio Buttons
    const openLyricStudioBtn = document.getElementById('openLyricStudioBtn');
    const openLyricStudioBanner = document.getElementById('openLyricStudioBanner');
    const closeLyricStudioBtn = document.getElementById('closeLyricStudioBtn');
    const saveLyricStudioBtn = document.getElementById('saveLyricStudioBtn');
    const studioTapSyncBtn = document.getElementById('studioTapSyncBtn');
    const studioPlayPauseBtn = document.getElementById('studioPlayPauseBtn');
    const studioRewindBtn = document.getElementById('studioRewindBtn');
    const studioForwardBtn = document.getElementById('studioForwardBtn');
    const studioUndoBtn = document.getElementById('studioUndoBtn');
    const studioRedoBtn = document.getElementById('studioRedoBtn');

    if (openLyricStudioBtn && typeof LyricStudio !== 'undefined') {
        openLyricStudioBtn.addEventListener('click', () => LyricStudio.open());
    }
    if (openLyricStudioBanner && typeof LyricStudio !== 'undefined') {
        openLyricStudioBanner.addEventListener('click', () => LyricStudio.open());
    }
    if (closeLyricStudioBtn && typeof LyricStudio !== 'undefined') {
        closeLyricStudioBtn.addEventListener('click', () => LyricStudio.close());
    }
    if (saveLyricStudioBtn && typeof LyricStudio !== 'undefined') {
        saveLyricStudioBtn.addEventListener('click', () => LyricStudio.saveToLrc());
    }
    if (studioTapSyncBtn && typeof LyricStudio !== 'undefined') {
        studioTapSyncBtn.addEventListener('click', () => LyricStudio.toggleTapToSync());
    }
    if (studioPlayPauseBtn) {
        studioPlayPauseBtn.addEventListener('click', () => {
            if (isPlaying && typeof stopPlayback === 'function') {
                stopPlayback();
                studioPlayPauseBtn.textContent = '▶ Play';
            } else if (typeof startPlayback === 'function') {
                startPlayback();
                studioPlayPauseBtn.textContent = '⏸ Pause';
            }
        });
    }
    if (studioRewindBtn) {
        studioRewindBtn.addEventListener('click', () => {
            if (typeof audioBuffer !== 'undefined' && audioBuffer) {
                const newTime = Math.max(0, pausedTime - 5);
                if (typeof syncPreviewToTime === 'function') syncPreviewToTime(newTime);
                if (isPlaying && typeof stopPlayback === 'function' && typeof startPlayback === 'function') {
                    stopPlayback();
                    pausedTime = newTime;
                    startPlayback();
                }
            }
        });
    }
    if (studioForwardBtn) {
        studioForwardBtn.addEventListener('click', () => {
            if (typeof audioBuffer !== 'undefined' && audioBuffer) {
                const newTime = Math.min(audioBuffer.duration, pausedTime + 5);
                if (typeof syncPreviewToTime === 'function') syncPreviewToTime(newTime);
                if (isPlaying && typeof stopPlayback === 'function' && typeof startPlayback === 'function') {
                    stopPlayback();
                    pausedTime = newTime;
                    startPlayback();
                }
            }
        });
    }
    if (studioUndoBtn && typeof HistoryManager !== 'undefined') {
        studioUndoBtn.addEventListener('click', () => HistoryManager.undo());
    }
    if (studioRedoBtn && typeof HistoryManager !== 'undefined') {
        studioRedoBtn.addEventListener('click', () => HistoryManager.redo());
    }

    // 7. Wire Style Preset Buttons
    const presetPills = document.querySelectorAll('.preset-pill');
    presetPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const presetKey = pill.getAttribute('data-preset');
            if (typeof StylePresets !== 'undefined') {
                StylePresets.applyPreset(presetKey);
            }
        });
    });

    const exportCustomPresetBtn = document.getElementById('exportCustomPresetBtn');
    const importCustomPresetBtn = document.getElementById('importCustomPresetBtn');
    const importCustomPresetFile = document.getElementById('importCustomPresetFile');

    if (exportCustomPresetBtn && typeof StylePresets !== 'undefined') {
        exportCustomPresetBtn.addEventListener('click', () => StylePresets.exportCustomPresetJson());
    }
    if (importCustomPresetBtn && importCustomPresetFile) {
        importCustomPresetBtn.addEventListener('click', () => importCustomPresetFile.click());
        importCustomPresetFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0] && typeof StylePresets !== 'undefined') {
                StylePresets.importCustomPresetJson(e.target.files[0]);
                importCustomPresetFile.value = '';
            }
        });
    }

    // 8. Wire Audio-Reactive Select and Sub-Lyric Select if present
    const audioReactiveSelect = document.getElementById('audioReactiveSelect');
    if (audioReactiveSelect) {
        audioReactiveSelect.addEventListener('change', (e) => {
            currentAudioReactive = e.target.value;
            if (typeof HistoryManager !== 'undefined') HistoryManager.pushState('Audio Reactive Mode');
            if (typeof drawFrame === 'function') drawFrame(pausedTime);
        });
    }

    const dualLanguageSelect = document.getElementById('dualLanguageSelect');
    if (dualLanguageSelect) {
        dualLanguageSelect.addEventListener('change', (e) => {
            currentDualLanguage = e.target.value;
            if (typeof updateLyricsFromEditor === 'function') updateLyricsFromEditor();
            if (typeof HistoryManager !== 'undefined') HistoryManager.pushState('Dual Language Option');
            if (typeof drawFrame === 'function') drawFrame(pausedTime);
        });
    }

    // 9. Apply Translations & Draw Initial Frame
    if (typeof applyLanguage === 'function' && typeof currentLanguage !== 'undefined') {
        applyLanguage(currentLanguage);
    }
    if (typeof drawFrame === 'function') {
        drawFrame(0);
    }

    console.log('✨ Lyric Video Maker v2.0.0 initialized with Lyric Studio, Tap-to-Sync, Style Presets, Audio-Reactive Visuals, and Overlapping Vocal Sync.');
});

