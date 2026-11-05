/* Small pure helpers: colour maths, time formatting, HTML escaping. */

// Helper to ensure extracted album colors are adjusted properly for text or elements
function adjustColorForReadability(r, g, b, minLightness = 0.7, maxLightness = 1.0, minSaturation = 0.5) {
    let rNorm = r / 255;
    let gNorm = g / 255;
    let bNorm = b / 255;

    let max = Math.max(rNorm, gNorm, bNorm);
    let min = Math.min(rNorm, gNorm, bNorm);
    let h, s, l = (max + min) / 2;

    if (max === min || (max - min) < 0.05) {
        h = 0;
        s = 0; // Neutral colors have no hue/saturation
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
            case gNorm: h = (bNorm - rNorm) / d + 2; break;
            case bNorm: h = (rNorm - gNorm) / d + 4; break;
        }
        h /= 6;

        // Only enforce minSaturation if the original color actually HAD saturation (> 0.08)
        if (s > 0.08 && s < minSaturation) {
            s = minSaturation;
        }
    }

    // Clamp lightness to the specified range
    if (l < minLightness) l = minLightness;
    if (l > maxLightness) l = maxLightness;

    if (s === 0) {
        // Neutral greyscale/white color — return clean grey/white without false hue shifts
        const val = Math.round(l * 255);
        return { r: val, g: val, b: val };
    }

    let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    let p = 2 * l - q;

    const hue2rgb = (t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    return {
        r: Math.round(hue2rgb(h + 1 / 3) * 255),
        g: Math.round(hue2rgb(h) * 255),
        b: Math.round(hue2rgb(h - 1 / 3) * 255)
    };
}

function formatDuration(secs) {
    const s = Math.max(0, secs);
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
}

function formatTime(secs) {
    const s = Math.max(0, secs);
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    const t = Math.floor((s % 1) * 10);
    return `${m}:${ss}.${t}`;
}
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Finds the currently active lyric line index and word index for a given timestamp.
 * Returns { lineIndex, wordIndex, line, word, lineProgress, wordProgress }
 */
function getActiveLyricPosition(lyricsArray, currentTime) {
    if (!Array.isArray(lyricsArray) || lyricsArray.length === 0) {
        return { lineIndex: -1, wordIndex: -1, line: null, word: null, lineProgress: 0, wordProgress: 0 };
    }

    let lineIndex = -1;
    for (let i = 0; i < lyricsArray.length; i++) {
        const item = lyricsArray[i];
        if (typeof item.time === 'number' && !isNaN(item.time) && currentTime >= item.time) {
            lineIndex = i;
        } else if (typeof item.time === 'number' && !isNaN(item.time) && currentTime < item.time) {
            break;
        }
    }

    if (lineIndex === -1) {
        return { lineIndex: -1, wordIndex: -1, line: null, word: null, lineProgress: 0, wordProgress: 0 };
    }

    const line = lyricsArray[lineIndex];
    let lineProgress = 0;
    if (line) {
        const lEnd = (typeof line.endTime === 'number' && line.endTime > line.time)
            ? line.endTime
            : (lineIndex + 1 < lyricsArray.length && typeof lyricsArray[lineIndex + 1].time === 'number'
                ? lyricsArray[lineIndex + 1].time
                : (line.time || 0) + 3.0);
        const lDuration = Math.max(0.1, lEnd - (line.time || 0));
        lineProgress = Math.max(0, Math.min(1, (currentTime - (line.time || 0)) / lDuration));
    }

    let wordIndex = -1;
    let word = null;
    let wordProgress = 0;

    if (line && Array.isArray(line.words) && line.words.length > 0) {
        for (let w = 0; w < line.words.length; w++) {
            const wObj = line.words[w];
            const wStart = typeof wObj.time === 'number' ? wObj.time : wObj.start;
            if (typeof wStart === 'number' && !isNaN(wStart) && currentTime >= wStart) {
                wordIndex = w;
                word = wObj;
            } else if (typeof wStart === 'number' && !isNaN(wStart) && currentTime < wStart) {
                break;
            }
        }
        if (word) {
            const wStart = typeof word.time === 'number' ? word.time : (word.start || 0);
            const wEndRaw = typeof word.endTime === 'number' ? word.endTime : word.end;
            const wEnd = (typeof wEndRaw === 'number' && wEndRaw > wStart) ? wEndRaw : (wStart + 0.35);
            const wDur = Math.max(0.05, wEnd - wStart);
            wordProgress = Math.max(0, Math.min(1, (currentTime - wStart) / wDur));
        }
    }

    return { lineIndex, wordIndex, line, word, lineProgress, wordProgress };
}

function updateMainLyricEditorPosition(currentTime) {
    const badge = document.getElementById('lrcEditorPositionBadge');
    if (!badge) return;
    const pos = getActiveLyricPosition(typeof lyrics !== 'undefined' ? lyrics : [], currentTime);
    if (pos.lineIndex >= 0 && pos.line) {
        const lineNum = pos.lineIndex + 1;
        const totalLines = (typeof lyrics !== 'undefined' && lyrics) ? lyrics.length : 0;
        const lineText = (pos.line.text || '').trim();
        const shortLine = lineText.length > 20 ? (lineText.slice(0, 18) + '…') : lineText;
        const words = pos.line.words || [];
        let wordStr = '--';
        if (pos.wordIndex >= 0 && pos.word) {
            const cleanW = (pos.word.text || '').trim();
            wordStr = `#${pos.wordIndex + 1}/${words.length} "${cleanW}"`;
        } else if (words.length > 0) {
            wordStr = `${words.length} words`;
        }
        badge.textContent = `Line #${lineNum}/${totalLines} (${shortLine}) • Word: ${wordStr}`;
        badge.style.color = '#38bdf8';
        badge.style.borderColor = 'rgba(56, 189, 248, 0.4)';
        badge.style.background = 'rgba(56, 189, 248, 0.12)';
    } else {
        badge.textContent = 'Line: -- | Word: --';
        badge.style.color = '#a5b4fc';
        badge.style.borderColor = 'rgba(99, 102, 241, 0.3)';
        badge.style.background = 'rgba(99, 102, 241, 0.15)';
    }
}
