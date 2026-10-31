/* Form wiring: reset, inputs, credits, drag & drop, tabs. */

function resetInputs() {
    audioInput.value = '';
    lrcInput.value = '';
    bgInput.value = '';
    albumInput.value = '';
    lrcEditor.value = '';
    removeBgBtn.style.display = 'none';
    removeAlbumBtn.style.display = 'none';
    if (itunesSearchInput) itunesSearchInput.value = '';
    if (itunesSearchResults) {
        itunesSearchResults.innerHTML = '';
        itunesSearchResults.style.display = 'none';
    }
    if (lyricsSearchInput) lyricsSearchInput.value = '';
    if (lyricsSearchResults) {
        lyricsSearchResults.innerHTML = '';
        lyricsSearchResults.style.display = 'none';
    }
    songTitleInput.value = '';
    songArtistInput.value = '';
    songKeyInput.value = '';
    bpmMarkers = [{ time: 0, bpm: 0 }];
    if (typeof renderBpmList === 'function') renderBpmList();

    bgImage = null;
    albumImage = null;
    bgImageBase64 = null;
    albumImageBase64 = null;
    albumPalette = null;
    bgVideoUrl = null;
    bgVideo.src = "";
    bgOffscreenCanvas = null;
    cachedBlurredAlbumCanvas = null;

    // Reset Card UI States
    if (audioUploadCard) {
        audioUploadCard.className = 'upload-card';
        audioSubtitle.textContent = t('audioSub') || 'Click to select or drag audio here';
        audioSpinner.style.display = 'none';
    }
    if (lrcUploadCard) {
        lrcUploadCard.className = 'upload-card';
        lrcSubtitle.textContent = t('lrcSub') || 'Click to select or drag lyrics here';
    }
    if (bgUploadCard) {
        bgUploadCard.className = 'upload-card image-upload-card';
        bgPreview.style.backgroundImage = '';
        bgPreview.style.display = 'none';
        bgVideoPreview.style.display = 'none';
        bgVideoPreview.src = "";
        bgSubtitle.textContent = t('bgSub') || 'Click to select or drag image here';
    }
    if (albumUploadCard) {
        albumUploadCard.className = 'upload-card image-upload-card';
        albumPreview.style.backgroundImage = '';
        albumPreview.style.display = 'none';
        albumSubtitle.textContent = t('albumSub') || 'Click to select or drag image here';
    }

    // Reset personalization controls to default state
    bgStyleSelect.value = 'gradient';
    fontSelect.value = 'Outfit';
    lyricAlignmentSelect.value = 'left';
    fontSizeSlider.value = 60;
    fontSizeValue.textContent = '60px';
    lineSpacingSlider.value = 1.3;
    lineSpacingValue.textContent = '1.3x';
    verticalOffsetSlider.value = 0;
    verticalOffsetValue.textContent = '0px';
    lyricTransitionSelect.value = 'slide';
    lyricColorInput.value = '#ffffff';
    glowColorInput.value = '#6366f1';
    dynamicGlowCheckbox.checked = false;
    glowColorInput.disabled = false;
    if (backingVocalsSelect) backingVocalsSelect.value = 'styled';
    if (bpmVisualizerSelect) bpmVisualizerSelect.value = 'ring-contract';
    if (animatePlainLyricsSelect) animatePlainLyricsSelect.value = 'default';

    // Reset credits to default single empty row
    creditsList.innerHTML = `
        <div class="credits-row" style="display: flex; gap: 0.5rem; align-items: center;">
            <select class="credits-prefix" style="flex: 1.2; margin: 0; min-width: 0;">
                <option value="Lyric video by">Lyric video by</option>
                <option value="Mix by">Mix by</option>
                <option value="Remix by">Remix by</option>
                <option value="Music by">Music by</option>
                <option value="Video by">Video by</option>
                <option value="Presented by">Presented by</option>
                <option value="Created for">Created for</option>
            </select>
            <input type="text" class="credits-name" placeholder="e.g. DJ Awesome" style="flex: 2; margin: 0; min-width: 0;">
            <button type="button" class="btn small remove-credit-btn" style="flex: 0.3; padding: 0.8rem 0.5rem; margin: 0; background: rgba(239, 68, 68, 0.15); border: 1px solid rgb(239, 68, 68); color: rgb(239, 68, 68); display: none; font-size: 0.8rem; border-radius: 12px; justify-content: center; align-items: center; cursor: pointer; height: 100%;">✕</button>
        </div>
    `;
    attachCreditRowListeners(creditsList.querySelector('.credits-row'));
}

function updateButtons() {
    const hasAudio = !!audioBuffer;
    const hasLyrics = lyrics.length > 0;

    playBtn.disabled = !(hasAudio && hasLyrics);
    exportBtn.disabled = !(hasAudio && hasLyrics);

    if (!hasAudio && hasLyrics) {
        statusMessage.textContent = `${t('lyricsLoaded') || 'Lyrics loaded'} (${lyrics.length} ${t('lines') || 'lines'}). ${t('waitAudio') || 'Waiting for audio to finish decoding...'}`;
        statusMessage.style.color = "#ec4899"; // highlight waiting
    } else if (hasAudio && !hasLyrics) {
        statusMessage.textContent = t('audioReady') || "Audio ready. Please upload or type lyrics.";
        statusMessage.style.color = "#6366f1";
    } else if (hasAudio && hasLyrics) {
        statusMessage.textContent = `${t('sysReady') || 'System Ready!'} (${lyrics.length} ${t('linesLoaded') || 'lines loaded'})`;
        statusMessage.style.color = "#4ade80"; // green for ready
    }
}

// Input event listeners
audioInput.addEventListener('change', (e) => {
    if (e.target.files[0]) processAudioFile(e.target.files[0]);
});

lrcInput.addEventListener('change', (e) => {
    if (e.target.files[0]) processLrcFile(e.target.files[0]);
});

bgInput.addEventListener('change', (e) => {
    if (e.target.files[0]) processBgFile(e.target.files[0]);
});

albumInput.addEventListener('change', (e) => {
    if (e.target.files[0]) processAlbumFile(e.target.files[0]);
});

loadAlbumUrlBtn.addEventListener('click', () => {
    const url = albumUrlInput.value.trim();
    if (url) {
        albumImageBase64 = null;
        loadAlbumFromUrl(url);
        saveProgressToLocalStorage();
    }
});

lrcEditor.addEventListener('input', updateLyricsFromEditor);

fontSelect.addEventListener('change', (e) => {
    currentFont = e.target.value;
    fontSelect.style.fontFamily = `"${currentFont}", sans-serif`;
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
});

lyricAlignmentSelect.addEventListener('change', (e) => {
    currentLyricAlignment = e.target.value;
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
});

fontSizeSlider.addEventListener('input', (e) => {
    currentFontSize = parseInt(e.target.value);
    fontSizeValue.textContent = `${currentFontSize}px`;
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
});

lineSpacingSlider.addEventListener('input', (e) => {
    currentLineSpacing = parseFloat(e.target.value);
    lineSpacingValue.textContent = `${currentLineSpacing.toFixed(1)}x`;
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
});

verticalOffsetSlider.addEventListener('input', (e) => {
    currentVerticalOffset = parseInt(e.target.value);
    verticalOffsetValue.textContent = `${currentVerticalOffset}px`;
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
});

lyricTransitionSelect.addEventListener('change', (e) => {
    currentLyricTransition = e.target.value;
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
});

lyricColorInput.addEventListener('input', (e) => {
    currentLyricColor = e.target.value;
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
});

glowColorInput.addEventListener('input', (e) => {
    currentGlowColor = e.target.value;
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
});

dynamicGlowCheckbox.addEventListener('change', (e) => {
    glowColorInput.disabled = e.target.checked;
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
});

bgStyleSelect.addEventListener('change', (e) => {
    currentBgStyle = e.target.value;
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
});

document.fonts.ready.then(() => {
    lyrics.forEach(lyric => {
        delete lyric.cachedLines;
    });
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
});

if (backingVocalsSelect) {
    backingVocalsSelect.addEventListener('change', () => {
        updateLyricsFromEditor();
    });
}

if (animatePlainLyricsSelect) {
    animatePlainLyricsSelect.addEventListener('change', () => {
        updateLyricsFromEditor();
    });
}

if (bpmVisualizerSelect) {
    bpmVisualizerSelect.addEventListener('change', () => {
        drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
    });
}

if (resetStyleBtn) {
    resetStyleBtn.addEventListener('click', () => {
        // Reset only advanced style state variables
        currentFontSize = 60;
        currentLineSpacing = 1.3;
        currentVerticalOffset = 0;

        // Reset only advanced style UI control values
        fontSizeSlider.value = 60;
        fontSizeValue.textContent = '60px';
        lineSpacingSlider.value = 1.3;
        lineSpacingValue.textContent = '1.3x';
        verticalOffsetSlider.value = 0;
        verticalOffsetValue.textContent = '0px';

        // Trigger redraw canvas and save progress
        drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
        saveProgressToLocalStorage();
    });
}

function attachCreditRowListeners(row) {
    row.querySelector('.credits-prefix').addEventListener('change', () => {
        drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
        saveProgressToLocalStorage();
    });
    row.querySelector('.credits-name').addEventListener('input', () => {
        drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
        saveProgressToLocalStorage();
    });
    row.querySelector('.remove-credit-btn').addEventListener('click', () => {
        row.remove();
        updateRemoveButtonsVisibility();
        drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
        saveProgressToLocalStorage();
    });
}

function updateRemoveButtonsVisibility() {
    const rows = creditsList.querySelectorAll('.credits-row');
    const removeBtns = creditsList.querySelectorAll('.remove-credit-btn');
    if (rows.length > 1) {
        removeBtns.forEach(btn => btn.style.display = 'flex');
    } else {
        removeBtns.forEach(btn => btn.style.display = 'none');
    }
}

addCreditBtn.addEventListener('click', () => {
    const newRow = document.createElement('div');
    newRow.className = 'credits-row';
    newRow.style.display = 'flex';
    newRow.style.gap = '0.5rem';
    newRow.style.alignItems = 'center';
    newRow.innerHTML = `
        <select class="credits-prefix" style="flex: 1.2; margin: 0; min-width: 0;">
            <option value="Lyric video by">Lyric video by</option>
            <option value="Mix by">Mix by</option>
            <option value="Remix by">Remix by</option>
            <option value="Music by">Music by</option>
            <option value="Video by">Video by</option>
            <option value="Presented by">Presented by</option>
            <option value="Created for">Created for</option>
        </select>
        <input type="text" class="credits-name" placeholder="e.g. DJ Awesome" style="flex: 2; margin: 0; min-width: 0;">
        <button type="button" class="btn small remove-credit-btn" style="flex: 0.3; padding: 0.8rem 0.5rem; margin: 0; background: rgba(239, 68, 68, 0.15); border: 1px solid rgb(239, 68, 68); color: rgb(239, 68, 68); display: flex; font-size: 0.8rem; border-radius: 12px; justify-content: center; align-items: center; cursor: pointer; height: 100%;">✕</button>
    `;
    creditsList.appendChild(newRow);
    attachCreditRowListeners(newRow);
    updateRemoveButtonsVisibility();
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
    saveProgressToLocalStorage();
});

songTitleInput.addEventListener('input', () => {
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
});

songArtistInput.addEventListener('input', () => {
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
});

songKeyInput.addEventListener('input', () => {
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
});

// Drag and Drop global handlers
let dragCounter = 0;

function isFileDrag(e) {
    return e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files');
}

window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (!isFileDrag(e)) return;
    dragCounter++;
    dropOverlay.classList.add('active');
});

window.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!isFileDrag(e)) return;
    dropOverlay.classList.add('active');
});

window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    if (!isFileDrag(e)) return;
    dragCounter--;
    if (dragCounter === 0) {
        dropOverlay.classList.remove('active');
    }
});

window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!isFileDrag(e)) return;
    dragCounter = 0;
    dropOverlay.classList.remove('active');

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        Array.from(e.dataTransfer.files).forEach(handleDroppedFile);
    }
});

function handleDroppedFile(file) {
    const fileName = file.name.toLowerCase();
    const isProject = fileName.endsWith('.lvproj') || (fileName.endsWith('.json') && !fileName.includes('package'));
    const isAudio = file.type.startsWith('audio/') ||
        ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac'].some(ext => fileName.endsWith(ext));
    const isLrc = fileName.endsWith('.lrc') || fileName.endsWith('.ttml') || fileName.endsWith('.xml') || file.type === 'text/plain' || file.type === 'application/xml' || file.type === 'text/xml';
    const isImage = file.type.startsWith('image/') ||
        ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(ext => fileName.endsWith(ext));

    if (isProject) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const project = JSON.parse(evt.target.result);
                if (typeof handleProjectImport === 'function') {
                    handleProjectImport(project);
                } else if (typeof applyProjectData === 'function') {
                    applyProjectData(project);
                }
            } catch (err) {
                console.error('Failed to parse dropped project:', err);
            }
        };
        reader.readAsText(file);
    } else if (isAudio) {
        processAudioFile(file);
    } else if (isLrc) {
        processLrcFile(file);
    } else if (isImage) {
        // Heuristic: if it looks like an album cover (squareish) or user dropped 2nd image
        if (bgImage && !albumImage) {
            processAlbumFile(file);
        } else {
            processBgFile(file);
        }
    } else {
        statusMessage.textContent = `${t('unrecognizedFile') || 'Unrecognized file type'}: ${file.name}`;
    }
}

// Tab switcher logic
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');

        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(target).classList.add('active');
    });
});

if (renderEngineSelect) {
    renderEngineSelect.addEventListener('change', () => {
        if (renderEngineWarning) {
            renderEngineWarning.style.display = renderEngineSelect.value === 'native' ? 'block' : 'none';
        }
        drawFrame(0);
    });
}

// Backing Vocals Alongside Toggle
if (typeof backingVocalsAlongsideToggle !== 'undefined' && backingVocalsAlongsideToggle) {
    backingVocalsAlongsideToggle.addEventListener('change', () => {
        if (typeof updateLyricsFromEditor === 'function') updateLyricsFromEditor();
        if (typeof HistoryManager !== 'undefined') HistoryManager.pushState('Toggle Backing Vocals Overlap');
    });
}

// What's New in v2.0.0 Modal
if (typeof whatsNewBtn !== 'undefined' && whatsNewBtn && typeof whatsNewModal !== 'undefined' && whatsNewModal) {
    whatsNewBtn.addEventListener('click', () => {
        whatsNewModal.classList.add('active');
    });
    if (typeof closeWhatsNewBtn !== 'undefined' && closeWhatsNewBtn) {
        closeWhatsNewBtn.addEventListener('click', () => {
            whatsNewModal.classList.remove('active');
        });
    }
    if (typeof closeWhatsNewBtn2 !== 'undefined' && closeWhatsNewBtn2) {
        closeWhatsNewBtn2.addEventListener('click', () => {
            whatsNewModal.classList.remove('active');
        });
    }
    whatsNewModal.addEventListener('click', (e) => {
        if (e.target === whatsNewModal) {
            whatsNewModal.classList.remove('active');
        }
    });
}
