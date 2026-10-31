/* Keyboard Shortcuts and Help Modal Manager */

const ShortcutsManager = {
    init() {
        window.addEventListener('keydown', (e) => {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            const isInput = activeTag === 'input' || activeTag === 'textarea' || document.activeElement.isContentEditable;

            // Escape closes open modals regardless of focus
            if (e.key === 'Escape') {
                const studioModal = document.getElementById('lyricStudioModal');
                const shortcutsModal = document.getElementById('shortcutsModal');
                const fixModal = document.getElementById('fixModal');
                const customExportModal = document.getElementById('customExportModal');

                if (shortcutsModal && shortcutsModal.classList.contains('active')) {
                    shortcutsModal.classList.remove('active');
                    e.preventDefault();
                    return;
                }
                if (studioModal && studioModal.classList.contains('active')) {
                    if (typeof LyricStudio !== 'undefined') LyricStudio.close();
                    e.preventDefault();
                    return;
                }
                if (fixModal && fixModal.classList.contains('active')) {
                    fixModal.classList.remove('active');
                    e.preventDefault();
                    return;
                }
                if (customExportModal && customExportModal.classList.contains('active')) {
                    customExportModal.classList.remove('active');
                    e.preventDefault();
                    return;
                }
            }

            // Studio-specific shortcut handling for Tap-to-Sync
            if (typeof LyricStudio !== 'undefined' && LyricStudio.isOpen) {
                if (LyricStudio.isTapToSync) {
                    if (e.code === 'Space') {
                        e.preventDefault();
                        LyricStudio.stampCurrentLine();
                        return;
                    }
                    if (e.key === 'Backspace' && !isInput) {
                        e.preventDefault();
                        LyricStudio.undoLastStamp();
                        return;
                    }
                }
            }

            // Undo: Ctrl+Z / Cmd+Z
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                if (!isInput && typeof HistoryManager !== 'undefined') {
                    e.preventDefault();
                    HistoryManager.undo();
                    return;
                }
            }

            // Redo: Ctrl+Y or Ctrl+Shift+Z
            if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
                ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
                if (!isInput && typeof HistoryManager !== 'undefined') {
                    e.preventDefault();
                    HistoryManager.redo();
                    return;
                }
            }

            // Ctrl+E: Open/Close Lyric Studio
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
                e.preventDefault();
                if (typeof LyricStudio !== 'undefined') {
                    if (LyricStudio.isOpen) LyricStudio.close();
                    else LyricStudio.open();
                }
                return;
            }

            // Global Shortcuts when NOT typing in an input
            if (!isInput) {
                // Space: Toggle Play / Pause
                if (e.code === 'Space') {
                    e.preventDefault();
                    if (typeof isPlaying !== 'undefined' && typeof audioBuffer !== 'undefined' && audioBuffer) {
                        if (isPlaying) {
                            if (typeof stopPlayback === 'function') stopPlayback();
                        } else {
                            if (typeof startPlayback === 'function') startPlayback();
                        }
                    }
                    return;
                }

                // Left Arrow: Seek backward
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    if (typeof audioBuffer !== 'undefined' && audioBuffer) {
                        const delta = e.shiftKey ? 1 : 5;
                        const newTime = Math.max(0, pausedTime - delta);
                        if (typeof syncPreviewToTime === 'function') syncPreviewToTime(newTime);
                        if (isPlaying && typeof stopPlayback === 'function' && typeof startPlayback === 'function') {
                            stopPlayback();
                            pausedTime = newTime;
                            startPlayback();
                        }
                    }
                    return;
                }

                // Right Arrow: Seek forward
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    if (typeof audioBuffer !== 'undefined' && audioBuffer) {
                        const delta = e.shiftKey ? 1 : 5;
                        const newTime = Math.min(audioBuffer.duration, pausedTime + delta);
                        if (typeof syncPreviewToTime === 'function') syncPreviewToTime(newTime);
                        if (isPlaying && typeof stopPlayback === 'function' && typeof startPlayback === 'function') {
                            stopPlayback();
                            pausedTime = newTime;
                            startPlayback();
                        }
                    }
                    return;
                }

                // ?: Open Keyboard Shortcuts cheat-sheet
                if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                    e.preventDefault();
                    ShortcutsManager.toggleCheatSheet();
                    return;
                }
            }
        });
    },

    toggleCheatSheet() {
        const modal = document.getElementById('shortcutsModal');
        if (!modal) return;
        if (modal.classList.contains('active')) {
            modal.classList.remove('active');
        } else {
            modal.classList.add('active');
        }
    }
};

window.ShortcutsManager = ShortcutsManager;

