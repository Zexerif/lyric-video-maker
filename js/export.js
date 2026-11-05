/* Video export (MediaRecorder). */

let countdownInterval = null;

exportBtn.addEventListener('click', () => {
    if (isRecording) return;

    // Stop preview if running
    if (isPlaying) stopPlayback();

    const modal = document.getElementById('exportModal');
    const confirmBtn = document.getElementById('confirmExportBtn');

    modal.classList.add('active');
    confirmBtn.disabled = true;

    let timeLeft = 5;
    confirmBtn.textContent = `${t('startExport') || 'Start Export'} (${timeLeft}s)`;

    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
            confirmBtn.textContent = `${t('startExport') || 'Start Export'} (${timeLeft}s)`;
        } else {
            clearInterval(countdownInterval);
            confirmBtn.disabled = false;
            confirmBtn.textContent = t('startExport') || 'Start Export';
        }
    }, 1000);
});

document.getElementById('cancelExportBtn').addEventListener('click', () => {
    const modal = document.getElementById('exportModal');
    modal.classList.remove('active');
    if (countdownInterval) clearInterval(countdownInterval);
});

document.getElementById('confirmExportBtn').addEventListener('click', () => {
    const modal = document.getElementById('exportModal');
    modal.classList.remove('active');
    if (countdownInterval) clearInterval(countdownInterval);

    statusMessage.textContent = t('recordingVideo') || 'Recording video... Please wait until audio finishes.';
    exportBtn.disabled = true;
    playBtn.disabled = true;

    // Show progress bar
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';

    startRecording();
});

function startRecording() {
    isRecording = true;
    recordedChunks = [];

    // Create a completely isolated AudioContext for recording only
    // This ensures NO other audio sources (like mic or system alerts) can bleed in
    const recordCtx = new (window.AudioContext || window.webkitAudioContext)();
    const recordDestination = recordCtx.createMediaStreamDestination();
    const recordSource = recordCtx.createBufferSource();
    recordSource.buffer = audioBuffer;

    // Connect ONLY the song to the recording destination
    recordSource.connect(recordDestination);

    // Also connect the original audioSource to the original audioContext so the user can hear it while it records
    audioSource = audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;
    gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    audioSource.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Get canvas visual stream with user-selected frame rate & resolution
    const fpsSelect = document.getElementById('exportFpsSelect');
    const targetFps = fpsSelect ? parseInt(fpsSelect.value) : 30;

    const resSelect = document.getElementById('exportResSelect');
    const targetRes = resSelect ? resSelect.value : '1080p';

    // Save original canvas resolution and set target resolution for rendering
    const originalW = canvas.width;
    const originalH = canvas.height;
    let targetW = 1920;
    let targetH = 1080;
    if (targetRes === '720p') { targetW = 1280; targetH = 720; }
    else if (targetRes === '1440p') { targetW = 2560; targetH = 1440; }
    else if (targetRes === '4k') { targetW = 3840; targetH = 2160; }

    canvas.width = targetW;
    canvas.height = targetH;

    const canvasStream = canvas.captureStream(targetFps);

    // Combine isolated audio and video tracks
    const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...recordDestination.stream.getAudioTracks()
    ]);

    try {
        // Priority list of mime types
        const mimeTypes = [
            'video/mp4',
            'video/webm; codecs=h264',
            'video/webm; codecs=vp9',
            'video/webm'
        ];

        let options = {};
        for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                options = { mimeType };
                break;
            }
        }

        // Calculate video bitrate based on user selection
        const qualSelect = document.getElementById('exportQualitySelect');
        const targetQual = qualSelect ? qualSelect.value : 'high';

        let videoBitrate = 16000000; // Default High (16 Mbps)
        if (targetQual === 'standard') videoBitrate = 6000000;      // 6 Mbps
        else if (targetQual === 'high') videoBitrate = 16000000;    // 16 Mbps
        else if (targetQual === 'ultra') videoBitrate = 30000000;   // 30 Mbps
        else if (targetQual === 'max') videoBitrate = 50000000;     // 50 Mbps

        // Scale bitrate for 60FPS or higher resolutions
        if (targetFps === 60) videoBitrate = Math.round(videoBitrate * 1.3);
        if (targetRes === '1440p') videoBitrate = Math.round(videoBitrate * 1.4);
        if (targetRes === '4k') videoBitrate = Math.round(videoBitrate * 2.2);

        options.videoBitsPerSecond = videoBitrate;
        options.audioBitsPerSecond = 320000; // 320kbps audio

        mediaRecorder = new MediaRecorder(combinedStream, options);

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            recordCtx.close(); // Close the isolated recording context
            // Restore original canvas resolution
            canvas.width = originalW;
            canvas.height = originalH;
            drawFrame(0);
            const mimeType = mediaRecorder.mimeType || 'video/mp4';
            const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const filename = `lyric_video.${extension}`;

            const file = new File(recordedChunks, filename, { type: mimeType });
            const url = URL.createObjectURL(file);

            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.setAttribute('download', filename);
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 5000);

            isRecording = false;
            exportBtn.disabled = false;
            playBtn.disabled = false;
            progressContainer.style.display = 'none';
            statusMessage.innerHTML = t('videoGenerated') || 'Video generated and downloaded! 🎉 If you like this app, please <a href="https://github.com/Zexerif/lyric-video-maker" target="_blank" rel="noopener" style="color: var(--theme-secondary); text-decoration: underline; font-weight: bold;">star it on GitHub</a>!';

            // Prompt the user if they would also like a thumbnail after the video download triggers
            if (typeof ThumbnailGenerator !== 'undefined' && typeof ThumbnailGenerator.promptAfterVideoDownload === 'function') {
                setTimeout(() => {
                    ThumbnailGenerator.promptAfterVideoDownload();
                }, 400);
            }
        };

        // Start recording and playback
        mediaRecorder.start();
        startTime = audioContext.currentTime;
        recordSource.start(0);
        audioSource.start(0);
        renderLoop();

    } catch (e) {
        console.error('MediaRecorder error:', e);
        statusMessage.textContent = t('errorRecording') || 'Error starting video recording.';
        isRecording = false;
        exportBtn.disabled = false;
        playBtn.disabled = false;
    }
}
