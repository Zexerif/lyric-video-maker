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
    if (studioPlayPauseBtn && typeof LyricStudio !== 'undefined') {
        studioPlayPauseBtn.addEventListener('click', () => {
            LyricStudio.togglePlayback();
        });
    }
    if (studioRewindBtn && typeof LyricStudio !== 'undefined') {
        studioRewindBtn.addEventListener('click', () => {
            LyricStudio.seekRelative(-5);
        });
    }
    if (studioForwardBtn && typeof LyricStudio !== 'undefined') {
        studioForwardBtn.addEventListener('click', () => {
            LyricStudio.seekRelative(5);
        });
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

    // 9. Initialize Thumbnail Generator
    if (typeof ThumbnailGenerator !== 'undefined' && typeof ThumbnailGenerator.init === 'function') {
        ThumbnailGenerator.init();
    }

    // 10. Apply Translations & Draw Initial Frame
    if (typeof applyLanguage === 'function' && typeof currentLanguage !== 'undefined') {
        applyLanguage(currentLanguage);
    }
    if (typeof drawFrame === 'function') {
        drawFrame(0);
    }

    console.log('✨ Lyric Video Maker v2.1.1 initialized with Lyric Studio, Tap-to-Sync, Style Presets, Audio-Reactive Visuals, Overlapping Vocal Sync, and .ass Subtitle Support.');
});


// Wire Main App 'Auto-Put (Brackets) in Backing Space' button
document.addEventListener('DOMContentLoaded', () => {
    const mainBgBtn = document.getElementById('mainAutoBracketBgBtn');
    if (mainBgBtn) {
        mainBgBtn.addEventListener('click', () => {
            if (window.LyricStudio && typeof window.LyricStudio.autoMarkBracketBackingVocals === 'function') {
                window.LyricStudio.autoMarkBracketBackingVocals(true);
                window.LyricStudio.applyAndClose();
                if (window.showToast) window.showToast('🎤 Converted (brackets) to backing vocal space!');
            } else if (window.lyrics && Array.isArray(window.lyrics)) {
                let affected = 0;
                window.lyrics.forEach(line => {
                    const text = String(line.text || '').trim();
                    const isFullBracket = /^[([{（【][sS]*[)]}）】]$/.test(text);
                    if (isFullBracket) {
                        line.isBacking = true;
                        line.isBG = true;
                        affected++;
                    }
                    if (Array.isArray(line.words)) {
                        let inside = false;
                        line.words.forEach(w => {
                            const wt = String(w.text || '');
                            if (/[([{（【]/.test(wt)) inside = true;
                            if (inside || /[([{（【][sS]*[)]}）】]/.test(wt)) {
                                w.isBacking = true;
                                w.isBG = true;
                            }
                            if (/[)]}）】]/.test(wt)) inside = false;
                        });
                    }
                });
                if (typeof window.requestRender === 'function') window.requestRender();
                if (window.showToast) window.showToast('🎤 Converted (brackets) to backing vocal space!');
            }
        });
    }
});
