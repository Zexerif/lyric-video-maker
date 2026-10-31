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
