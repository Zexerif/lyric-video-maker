/* Waveform, audio decoding, playback loop and volume. */

function generateWaveform() {
    if (!audioBuffer) return;
    waveformContainer.style.display = 'block';
    
    const width = waveformContainer.clientWidth || 1000;
    const height = waveformContainer.clientHeight || 60;
    waveformCanvas.width = width;
    waveformCanvas.height = height;
    
    const wCtx = waveformCanvas.getContext('2d');
    const channelData = audioBuffer.getChannelData(0);
    const step = Math.ceil(channelData.length / width);
    const amp = height / 2;
    
    wCtx.clearRect(0, 0, width, height);
    
    // Grab current accent color from root styles
    let accentColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim();
    if (!accentColor) {
        accentColor = 'rgba(99, 102, 241, 0.7)';
    } else {
        if (accentColor.startsWith('rgb(')) {
            accentColor = accentColor.replace('rgb(', 'rgba(').replace(')', ', 0.7)');
        }
    }
    wCtx.fillStyle = accentColor;
    
    for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = channelData[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        wCtx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
    }
}

function syncPreviewToTime(time) {
    pausedTime = time;
    if (!isPlaying && lyrics && lyrics.length > 0) {
        let targetIdx = 0;
        for (let i = 0; i < lyrics.length; i++) {
            if (time >= lyrics[i].time) targetIdx = i;
            else break;
        }
        smoothedIndex = targetIdx;
    }
    if (bgVideoUrl && bgVideo && bgVideo.duration) {
        try {
            bgVideo.currentTime = time % bgVideo.duration;
        } catch (_) {}
    }
    if (typeof drawFrame === 'function') {
        drawFrame(time);
    }
}

function getAudioEnergy() {
    if (!audioAnalyser || !audioDataArray || !isPlaying) {
        return { bass: 0, mid: 0, treble: 0, overall: 0, raw: null };
    }
    audioAnalyser.getByteFrequencyData(audioDataArray);
    let bassSum = 0, bassCount = 0;
    let midSum = 0, midCount = 0;
    let trebleSum = 0, trebleCount = 0;
    const len = audioDataArray.length;

    for (let i = 0; i < len; i++) {
        const val = audioDataArray[i] / 255;
        if (i < 4) {
            bassSum += val;
            bassCount++;
        } else if (i < 16) {
            midSum += val;
            midCount++;
        } else {
            trebleSum += val;
            trebleCount++;
        }
    }
    const bass = bassCount ? bassSum / bassCount : 0;
    const mid = midCount ? midSum / midCount : 0;
    const treble = trebleCount ? trebleSum / trebleCount : 0;
    const overall = (bass * 0.5 + mid * 0.3 + treble * 0.2);
    return { bass, mid, treble, overall, raw: audioDataArray };
}

waveformContainer.addEventListener('mousedown', (e) => {
    if (!audioBuffer) return;
    const rect = waveformContainer.getBoundingClientRect();
    
    const updateScrubber = (clientX) => {
        const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const progress = clickX / rect.width;
        const time = progress * audioBuffer.duration;
        scrubberHead.style.left = `${progress * 100}%`;
        if (scrubberTime) {
            scrubberTime.textContent = formatTime(time);
            // Flip label to left side when near the right edge
            scrubberTime.style.left = progress > 0.85 ? 'auto' : '50%';
            scrubberTime.style.right = progress > 0.85 ? '4px' : 'auto';
            scrubberTime.style.transform = progress > 0.85 ? 'none' : 'translateX(-50%)';
        }
        return time;
    };

    const wasPlaying = isPlaying || isRecording;
    if (wasPlaying) {
        stopPlayback();
    }

    const newTime = updateScrubber(e.clientX);
    syncPreviewToTime(newTime);
    
    const onMouseMove = (moveEvent) => {
        const scrubTime = updateScrubber(moveEvent.clientX);
        syncPreviewToTime(scrubTime);
    };
    
    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        if (wasPlaying) {
            startPlayback();
        }
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
});

// Audio processing function
async function processAudioFile(file) {
    statusMessage.textContent = t('loadingAudio') || 'Loading audio...';
    if (audioUploadCard) {
        audioUploadCard.className = 'upload-card loading';
        audioSubtitle.textContent = t('decodingAudio') || '⏳ Decoding audio data...';
        audioSpinner.style.display = 'block';
    }

    if (itunesSearchInput) {
        let cleanName = file.name.replace(/\.[^/.]+$/, "");
        const stripped = cleanName.replace(/^[0-9\s.\-_]+/g, "").replace(/[_\-]+/g, " ").trim();
        if (stripped.length > 0) {
            cleanName = stripped;
        } else {
            cleanName = cleanName.replace(/[_\-]+/g, " ").trim();
        }
        itunesSearchInput.value = cleanName;
    }
    if (lyricsSearchInput && !lyricsSearchInput.value.trim()) {
        let cleanName = file.name.replace(/\.[^/.]+$/, "");
        const stripped = cleanName.replace(/^[0-9\s.\-_]+/g, "").replace(/[\-_]+/g, " ").trim();
        lyricsSearchInput.value = stripped.length > 0 ? stripped : cleanName.replace(/[\-_]+/g, " ").trim();
    }
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }

    const arrayBuffer = await file.arrayBuffer();
    try {
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
        statusMessage.textContent = t('audioLoaded') || 'Audio loaded successfully.';

        // Cache base64 data for .lvproj project export
        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                audioFileBase64 = e.target.result;
                audioFileName = file.name || 'audio.mp3';
            };
            reader.readAsDataURL(file);
        } catch (_) {}

        if (audioUploadCard) {
            audioUploadCard.className = 'upload-card success';
            audioSubtitle.textContent = `✅ ${file.name} (${formatDuration(audioBuffer.duration)})`;
            audioSpinner.style.display = 'none';
        }
    } catch (err) {
        statusMessage.textContent = t('errorDecoding') || 'Error decoding audio file.';
        console.error('Audio decoding error:', err);
        if (audioUploadCard) {
            audioUploadCard.className = 'upload-card';
            audioSubtitle.textContent = t('errorDecoding') || '❌ Error decoding audio. Try again.';
            audioSpinner.style.display = 'none';
        }
        return;
    }

    try {
        generateWaveform();
        updateLyricsFromEditor();
        updateButtons();
        drawFrame(0);
    } catch (uiErr) {
        console.error('Post-audio UI render error:', uiErr);
    }
}

// Volume control slider handler
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
        volume = parseFloat(e.target.value);
        if (volumeValue) {
            volumeValue.textContent = Math.round(volume * 100) + '%';
        }
        if (gainNode && audioContext) {
            gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        }
    });
}
function renderLoop() {
    if (!isPlaying && !isRecording) return;

    let currentTime;
    if (isRecording) {
        currentTime = audioContext.currentTime - startTime;
    } else {
        currentTime = audioContext.currentTime - startTime + pausedTime;
    }

    drawFrame(currentTime);

    // Update progress bar
    if (isRecording && audioBuffer) {
        const progress = (currentTime / audioBuffer.duration) * 100;
        progressBar.style.width = `${Math.min(100, progress)}%`;
    }

    // Update waveform scrubber
    if (audioBuffer && !isRestoring) {
        const progress = (currentTime / audioBuffer.duration) * 100;
        const clampedProgress = Math.min(100, progress);
        scrubberHead.style.left = `${clampedProgress}%`;
        if (scrubberTime) {
            scrubberTime.textContent = formatTime(currentTime);
            scrubberTime.style.left = clampedProgress > 85 ? 'auto' : '50%';
            scrubberTime.style.right = clampedProgress > 85 ? '4px' : 'auto';
            scrubberTime.style.transform = clampedProgress > 85 ? 'none' : 'translateX(-50%)';
        }
    }

    if (currentTime >= audioBuffer.duration) {
        stopPlayback();
    } else {
        animationFrameId = requestAnimationFrame(renderLoop);
    }
}

function startPlayback() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    audioSource = audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;

    // Setup nodes with volume control
    gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    audioSource.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Audio-reactive visualizer connection
    try {
        if (!audioAnalyser && audioContext) {
            audioAnalyser = audioContext.createAnalyser();
            audioAnalyser.fftSize = 64;
            audioDataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
        }
        if (audioAnalyser) {
            gainNode.connect(audioAnalyser);
        }
    } catch (e) {
        console.warn('AudioAnalyser connect error:', e);
    }

    startTime = audioContext.currentTime;
    audioSource.start(0, pausedTime);
    isPlaying = true;
    playBtn.textContent = t('stopPreview') || 'Stop Preview';

    renderLoop();
}

function stopPlayback() {
    if (audioSource) {
        audioSource.stop();
        audioSource.disconnect();
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    isPlaying = false;
    pausedTime = 0;
    smoothedIndex = 0;
    playBtn.textContent = t('previewVideo') || 'Preview Video';
    drawFrame(0);

    if (isRecording && mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        statusMessage.textContent = t('processingVideo') || 'Processing video...';
    }
}

playBtn.addEventListener('click', () => {
    if (isPlaying) {
        stopPlayback();
    } else {
        startPlayback();
    }
});
