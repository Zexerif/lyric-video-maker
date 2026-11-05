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
                const thumbnailPromptModal = document.getElementById('thumbnailPromptModal');
                const thumbnailGeneratorModal = document.getElementById('thumbnailGeneratorModal');

                if (thumbnailPromptModal && thumbnailPromptModal.classList.contains('active')) {
                    if (typeof ThumbnailGenerator !== 'undefined') ThumbnailGenerator.closePrompt();
                    else thumbnailPromptModal.classList.remove('active');
                    e.preventDefault();
                    return;
                }
                if (thumbnailGeneratorModal && thumbnailGeneratorModal.classList.contains('active')) {
                    if (typeof ThumbnailGenerator !== 'undefined') ThumbnailGenerator.closeGenerator();
                    else thumbnailGeneratorModal.classList.remove('active');
                    e.preventDefault();
                    return;
                }
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

            // Delegate to LyricStudio when the full-viewport studio is open
            if (typeof LyricStudio !== 'undefined' && LyricStudio.isOpen) {
                if (typeof LyricStudio.handleKeyDown === 'function' && LyricStudio.handleKeyDown(e)) {
                    return;
                }
                if (e.key === 'Escape' && !isInput) {
                    LyricStudio.close();
                    e.preventDefault();
                    return;
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

        window.addEventListener('keyup', (e) => {
            if (typeof LyricStudio !== 'undefined' && LyricStudio.isOpen && typeof LyricStudio.handleKeyUp === 'function') {
                LyricStudio.handleKeyUp(e);
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

