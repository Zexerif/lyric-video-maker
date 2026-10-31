/* Lyric text -> parsed lyric lines (updateLyricsFromEditor). */

// Lyrics processing function
async function processLrcFile(file) {
    const text = await file.text();
    lrcEditor.value = text;

    if (lrcUploadCard) {
        lrcSubtitle.textContent = `✅ ${file.name}`;
        lrcSubtitle.style.color = 'var(--text-success)';
    }

    updateLyricsFromEditor();
}

function updateLyricsFromEditor() {
    const text = lrcEditor.value.trim();
    if (text.startsWith('<tt') || text.startsWith('<?xml') || text.includes('http://www.w3.org/ns/ttml')) {
        lyrics = parseTtml(text);
    } else if (typeof isAssSubtitle === 'function' && isAssSubtitle(text)) {
        lyrics = parseAss(text);
    } else {
        lyrics = parseLrc(text);
    }

    if (lyrics.length > 0) {
        if (lyrics[0].time > 0) {
            lyrics.unshift({ time: 0, text: '• • •' });
        }

        // Calculate duration and auto-generate word-by-word highlights if missing
        const animSelect = animatePlainLyricsSelect ? animatePlainLyricsSelect.value : 'default';
        for (let i = 0; i < lyrics.length; i++) {
            const current = lyrics[i];
            const next = lyrics[i + 1];
            if (typeof current.endTime === 'number' && current.endTime > current.time) {
                current.duration = current.endTime - current.time;
            } else if (next) {
                current.duration = next.time - current.time;
            } else if (audioBuffer) {
                current.duration = Math.max(3.0, audioBuffer.duration - current.time);
            } else {
                current.duration = 5.0;
            }

            if (animSelect === 'off') {
                current.words = null;
            } else if (animSelect === 'on' && (!current.words || current.words.length === 0)) {
                // Synthesize word timings only for plain lyrics that don't already have word-level timestamps
                const tokens = tokenizeText(current.text);
                const partDuration = current.duration / tokens.length;
                current.words = [];
                for (let k = 0; k < tokens.length; k++) {
                    current.words.push({
                        text: tokens[k],
                        time: current.time + k * partDuration,
                        endTime: current.time + (k + 1) * partDuration,
                        isBacking: current.isBacking
                    });
                }
            }
        }

        statusMessage.textContent = `${t('loaded')} ${lyrics.length} ${t('lyricLines') || 'lyric lines.'}`;
        if (lrcUploadCard) {
            lrcUploadCard.className = 'upload-card success';
            if (!lrcSubtitle.textContent.startsWith('✅')) {
                lrcSubtitle.style.color = 'var(--text-success)';
                lrcSubtitle.textContent = `✅ ${lyrics.length} ${t('linesLoaded') || 'lines loaded'}`;
            }
        }
    } else {
        statusMessage.textContent = t('enterLyrics') || 'Enter or upload lyrics to begin.';
        if (lrcUploadCard) {
            lrcUploadCard.className = 'upload-card';
            lrcSubtitle.style.color = 'var(--text-muted)';
            lrcSubtitle.textContent = t('lrcSub') || 'Click to select or drag lyrics here';
        }
    }
    updateButtons();
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
    saveProgressToLocalStorage();
}
