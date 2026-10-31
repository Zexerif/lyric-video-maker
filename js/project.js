/* Project export/import, save codes and localStorage persistence. */

// === Project Export / Import and Persistence Logic ===
function serializeProjectData(includeImages) {
    const credits = Array.from(creditsList.querySelectorAll('.credits-row')).map(row => {
        const prefixSelect = row.querySelector('.credits-prefix');
        const nameInput = row.querySelector('.credits-name');
        return {
            prefix: prefixSelect ? prefixSelect.value : '',
            name: nameInput ? nameInput.value : ''
        };
    });

    const project = {
        songTitle: songTitleInput.value,
        songArtist: songArtistInput.value,
        songKey: songKeyInput.value,
        bpmMarkers: bpmMarkers,
        credits: credits,
        bgStyle: bgStyleSelect.value,
        font: fontSelect.value,
        lyricColor: lyricColorInput.value,
        glowColor: glowColorInput.value,
        dynamicGlow: dynamicGlowCheckbox.checked,
        backingVocals: backingVocalsSelect ? backingVocalsSelect.value : 'styled',
        backingVocalsAlongside: backingVocalsAlongsideToggle ? backingVocalsAlongsideToggle.checked : true,
        bpmVisualizer: bpmVisualizerSelect ? bpmVisualizerSelect.value : 'ring-contract',
        animatePlainLyrics: animatePlainLyricsSelect ? animatePlainLyricsSelect.value : 'default',
        lyricsText: lrcEditor.value,
        albumUrl: albumUrlInput.value
    };

    if (includeImages) {
        project.bgImageBase64 = bgImageBase64;
        project.albumImageBase64 = albumImageBase64;
    }

    return project;
}

function applyProjectData(project) {
    if (!project) return;

    if (project.songTitle !== undefined) songTitleInput.value = project.songTitle;
    if (project.songArtist !== undefined) songArtistInput.value = project.songArtist;
    if (project.songKey !== undefined) songKeyInput.value = project.songKey;
    
    if (project.bpmMarkers) {
        bpmMarkers = project.bpmMarkers;
    } else if (project.songBpm !== undefined) {
        bpmMarkers = [{ time: 0, bpm: parseFloat(project.songBpm) || 0 }];
    }
    renderBpmList();

    // Restore credits
    if (project.credits && Array.isArray(project.credits)) {
        creditsList.innerHTML = '';
        project.credits.forEach(credit => {
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
                <button type="button" class="btn small remove-credit-btn" style="flex: 0.3; padding: 0.8rem 0.5rem; margin: 0; background: rgba(239, 68, 68, 0.15); border: 1px solid rgb(239, 68, 68); color: rgb(239, 68, 68); display: none; font-size: 0.8rem; border-radius: 12px; justify-content: center; align-items: center; cursor: pointer; height: 100%;">✕</button>
            `;
            newRow.querySelector('.credits-prefix').value = credit.prefix || 'Lyric video by';
            newRow.querySelector('.credits-name').value = credit.name || '';
            creditsList.appendChild(newRow);
            attachCreditRowListeners(newRow);
        });
        updateRemoveButtonsVisibility();
    }

    if (project.bgStyle !== undefined) {
        bgStyleSelect.value = project.bgStyle;
        currentBgStyle = project.bgStyle;
    }
    if (project.font !== undefined) {
        fontSelect.value = project.font;
        currentFont = project.font;
        fontSelect.style.fontFamily = `"${currentFont}", sans-serif`;
    }
    if (project.lyricColor !== undefined) {
        lyricColorInput.value = project.lyricColor;
        currentLyricColor = project.lyricColor;
    }
    if (project.glowColor !== undefined) {
        glowColorInput.value = project.glowColor;
        currentGlowColor = project.glowColor;
    }
    if (project.dynamicGlow !== undefined) {
        dynamicGlowCheckbox.checked = project.dynamicGlow;
        glowColorInput.disabled = project.dynamicGlow;
    }
    if (backingVocalsSelect && project.backingVocals !== undefined) {
        backingVocalsSelect.value = project.backingVocals;
    }
    if (backingVocalsAlongsideToggle && project.backingVocalsAlongside !== undefined) {
        backingVocalsAlongsideToggle.checked = project.backingVocalsAlongside;
    }
    if (bpmVisualizerSelect && project.bpmVisualizer !== undefined) {
        bpmVisualizerSelect.value = project.bpmVisualizer;
    }
    if (animatePlainLyricsSelect && project.animatePlainLyrics !== undefined) {
        animatePlainLyricsSelect.value = project.animatePlainLyrics;
    }
    if (project.lyricsText !== undefined) {
        lrcEditor.value = project.lyricsText;
    }
    if (project.albumUrl !== undefined) {
        albumUrlInput.value = project.albumUrl;
    }

    // Restore images
    if (project.bgImageBase64) {
        bgImageBase64 = project.bgImageBase64;
        const img = new Image();
        img.onload = () => {
            bgImage = img;
            removeBgBtn.style.display = 'block';
            if (bgUploadCard) {
                bgUploadCard.classList.add('has-preview');
                bgPreview.style.backgroundImage = `url(${bgImageBase64})`;
                bgPreview.style.display = 'block';
                bgSubtitle.textContent = '✅ Background Image Restored';
            }
            drawFrame(0);
        };
        img.src = bgImageBase64;
    } else {
        bgImage = null;
        bgImageBase64 = null;
        removeBgBtn.style.display = 'none';
        if (bgUploadCard) {
            bgUploadCard.classList.remove('has-preview');
            bgPreview.style.backgroundImage = '';
            bgPreview.style.display = 'none';
            bgSubtitle.style.color = 'var(--text-muted)';
            bgSubtitle.textContent = t('bgSub') || 'Click to select or drag image here';
        }
    }

    if (project.albumImageBase64) {
        albumImageBase64 = project.albumImageBase64;
        loadAlbumFromUrl(albumImageBase64);
    } else if (project.albumUrl) {
        albumImageBase64 = null;
        loadAlbumFromUrl(project.albumUrl);
    } else {
        albumImage = null;
        albumImageBase64 = null;
        albumPalette = null;
        removeAlbumBtn.style.display = 'none';
        if (albumUploadCard) {
            albumUploadCard.classList.remove('has-preview');
            albumPreview.style.backgroundImage = '';
            albumPreview.style.display = 'none';
            albumSubtitle.style.color = 'var(--text-muted)';
            albumSubtitle.textContent = t('albumSub') || 'Click to select or drag image here';
        }
    }

    // Update parsed lyrics and redraw canvas
    updateLyricsFromEditor();
}

function saveProgressToLocalStorage() {
    if (isRestoring) return;
    const project = serializeProjectData(true); // Attempt to include images
    try {
        localStorage.setItem('lyric-video-maker_project', JSON.stringify(project));
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            console.warn('LocalStorage quota exceeded, trying to save project without base64 images.');
            const projectNoImages = serializeProjectData(false); // Exclude images
            try {
                localStorage.setItem('lyric-video-maker_project', JSON.stringify(projectNoImages));
            } catch (err) {
                console.error('Failed to save project to localStorage even without images:', err);
            }
        } else {
            console.error('Failed to save project to localStorage:', e);
        }
    }
}

function restoreProgressFromLocalStorage() {
    try {
        const saved = localStorage.getItem('lyric-video-maker_project');
        if (saved) {
            isRestoring = true;
            const project = JSON.parse(saved);
            applyProjectData(project);
            isRestoring = false;
        }
    } catch (e) {
        console.error('Failed to restore progress from localStorage:', e);
        isRestoring = false;
    }
}

// Set up delegated events on controls panel for auto-saving
const controlsPanel = document.querySelector('.controls-panel');
if (controlsPanel) {
    controlsPanel.addEventListener('input', () => {
        saveProgressToLocalStorage();
    });
    controlsPanel.addEventListener('change', () => {
        saveProgressToLocalStorage();
    });
}

// Set up manual export/import button click handlers
const exportProjectBtn = document.getElementById('exportProjectBtn');
const importProjectBtn = document.getElementById('importProjectBtn');
const importProjectFile = document.getElementById('importProjectFile');

function exportLvProjectFile() {
    const project = serializeProjectData(true);
    project.fileFormat = 'lvproj';
    project.version = '2.0';
    project.audioFileBase64 = audioFileBase64;
    project.audioFileName = audioFileName;

    const dataStr = JSON.stringify(project, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const title = (songTitleInput.value || 'lyric_project').trim().replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.lvproj`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 5000);

    if (typeof statusMessage !== 'undefined' && statusMessage) {
        statusMessage.textContent = '📦 Exported complete .lvproj project bundle with audio & media!';
        statusMessage.style.color = '#4ade80';
    }
}

function handleProjectImport(project) {
    isRestoring = true;
    applyProjectData(project);

    // If project contains bundled audio, restore it
    if (project.audioFileBase64 && typeof processAudioFile === 'function') {
        fetch(project.audioFileBase64)
            .then(res => res.blob())
            .then(blob => {
                const audioFile = new File([blob], project.audioFileName || 'restored_audio.mp3', { type: blob.type || 'audio/mpeg' });
                processAudioFile(audioFile);
            })
            .catch(err => console.warn('Audio bundle decode error:', err));
    }

    isRestoring = false;
    saveProgressToLocalStorage();
    if (typeof HistoryManager !== 'undefined') {
        HistoryManager.pushState('Import Project');
    }
    statusMessage.textContent = '✅ Project restored successfully!';
    statusMessage.style.color = '#4ade80';
}

if (exportProjectBtn) {
    exportProjectBtn.addEventListener('click', () => {
        exportLvProjectFile();
    });
}

if (importProjectBtn && importProjectFile) {
    importProjectFile.accept = '.json,.lvproj';
    importProjectBtn.addEventListener('click', () => {
        importProjectFile.click();
    });

    importProjectFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const project = JSON.parse(evt.target.result);
                handleProjectImport(project);
            } catch (err) {
                console.error('Failed to parse project file:', err);
                statusMessage.textContent = 'Error parsing project file. Ensure it is a valid .lvproj or .json export.';
                statusMessage.style.color = '#ef4444';
            }
            importProjectFile.value = '';
        };
        reader.readAsText(file);
    });
}

// Set up Session Save Code handlers
const copySaveCodeBtn = document.getElementById('copySaveCodeBtn');
const loadSaveCodeBtn = document.getElementById('loadSaveCodeBtn');
const saveCodeInput = document.getElementById('saveCodeInput');

if (copySaveCodeBtn && saveCodeInput) {
    copySaveCodeBtn.addEventListener('click', () => {
        const project = serializeProjectData(false); // exclude images to keep size small
        try {
            const jsonStr = JSON.stringify(project);
            // URI encode before base64 to handle unicode characters securely
            const base64 = btoa(encodeURIComponent(jsonStr));
            saveCodeInput.value = base64;
            saveCodeInput.select();
            document.execCommand('copy');
            statusMessage.textContent = 'Save code copied to clipboard!';
            statusMessage.style.color = '#4ade80';
        } catch (err) {
            console.error('Error creating save code:', err);
            statusMessage.textContent = 'Error generating save code.';
            statusMessage.style.color = '#ef4444';
        }
    });
}

if (loadSaveCodeBtn && saveCodeInput) {
    loadSaveCodeBtn.addEventListener('click', () => {
        const code = saveCodeInput.value.trim();
        if (!code) return;
        try {
            const jsonStr = decodeURIComponent(atob(code));
            const project = JSON.parse(jsonStr);
            isRestoring = true;
            applyProjectData(project);
            isRestoring = false;
            saveProgressToLocalStorage();
            statusMessage.textContent = 'Session loaded from save code.';
            statusMessage.style.color = '#4ade80';
            saveCodeInput.value = '';
        } catch (err) {
            console.error('Failed to parse save code:', err);
            statusMessage.textContent = 'Invalid save code.';
            statusMessage.style.color = '#ef4444';
        }
    });
}
