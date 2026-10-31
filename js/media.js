/* Background / album-art loading and palette extraction. */

// Background processing function (Image or Video)
async function processBgFile(file) {
    if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        bgVideoUrl = url;
        bgVideo.src = url;
        
        // Wait for video to load metadata to ensure we can play it
        bgVideo.onloadedmetadata = () => {
            statusMessage.textContent = t('bgVideoLoaded') || 'Background video loaded.';
            removeBgBtn.style.display = 'block';

            if (bgUploadCard) {
                bgUploadCard.classList.add('has-preview');
                bgPreview.style.display = 'none'; // hide image preview
                bgVideoPreview.src = url;
                bgVideoPreview.style.display = 'block';
                bgSubtitle.textContent = `✅ ${file.name}`;
            }

            // If currently playing/recording, start video
            if (isPlaying || isRecording) {
                bgVideo.currentTime = (audioContext.currentTime - startTime + pausedTime) % bgVideo.duration;
                bgVideo.play();
            } else {
                bgVideo.currentTime = pausedTime % bgVideo.duration;
            }

            drawFrame(0); // initial draw
            saveProgressToLocalStorage();
        };
    } else {
        const reader = new FileReader();
        reader.onload = (e) => {
            bgImageBase64 = e.target.result;
            const img = new Image();
            img.onload = () => {
                bgImage = img;
                statusMessage.textContent = t('bgImgLoaded') || 'Background image loaded.';
                removeBgBtn.style.display = 'block';

                if (bgUploadCard) {
                    bgUploadCard.classList.add('has-preview');
                    bgVideoPreview.style.display = 'none'; // hide video preview
                    bgPreview.style.backgroundImage = `url(${bgImageBase64})`;
                    bgPreview.style.display = 'block';
                    bgSubtitle.textContent = `✅ ${file.name}`;
                }

                drawFrame(0); // initial draw
                saveProgressToLocalStorage();
            };
            img.src = bgImageBase64;
        };
        reader.readAsDataURL(file);
    }
}

// Album cover processing function
async function processAlbumFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        albumImageBase64 = e.target.result;
        if (albumUploadCard) {
            albumSubtitle.textContent = `✅ ${file.name}`;
            albumSubtitle.style.color = 'var(--text-success)';
        }
        loadAlbumFromUrl(albumImageBase64);
        saveProgressToLocalStorage();
    };
    reader.readAsDataURL(file);
}

function loadAlbumFromUrl(url) {
    statusMessage.textContent = t('loadingAlbum') || 'Loading album cover...';
    const img = new Image();
    img.crossOrigin = "anonymous";
    let attempts = 0;

    img.onload = () => {
        albumImage = img;
        albumPalette = extractAlbumPalette(img);
        updateBlurredAlbumCache();
        statusMessage.textContent = t('albumCoverLoaded') || 'Album cover loaded.';
        removeAlbumBtn.style.display = 'block';

        if (albumUploadCard) {
            albumUploadCard.classList.add('has-preview');
            albumPreview.style.backgroundImage = `url(${url})`;
            albumPreview.style.display = 'block';
            if (!albumSubtitle.textContent.startsWith('✅')) {
                albumSubtitle.style.color = 'var(--text-success)';
                albumSubtitle.textContent = t('albumArtLoaded') || '✅ Album Art Loaded';
            }
        }

        // Set dynamic background CSS variables on the document root
        if (albumPalette && albumPalette.length >= 2) {
            const c0Raw = albumPalette[0];
            const c1Raw = albumPalette[1];

            // Adjust colors for text/gradients (very bright, min 75% lightness for contrast on dark background)
            const c0Text = adjustColorForReadability(c0Raw.r, c0Raw.g, c0Raw.b, 0.75, 0.95, 0.6);
            const c1Text = adjustColorForReadability(c1Raw.r, c1Raw.g, c1Raw.b, 0.75, 0.95, 0.6);

            // Adjust colors for UI elements/buttons (vibrant, rich, lightness clamped between 25% and 55% for better visibility)
            const c0Element = adjustColorForReadability(c0Raw.r, c0Raw.g, c0Raw.b, 0.25, 0.55, 0.6);
            const c1Element = adjustColorForReadability(c1Raw.r, c1Raw.g, c1Raw.b, 0.25, 0.55, 0.6);

            // Adjust colors for hover states (slightly darker, let's clamp between 0.20 and 0.45)
            const c0Hover = adjustColorForReadability(c0Raw.r, c0Raw.g, c0Raw.b, 0.20, 0.45, 0.6);
            const c1Hover = adjustColorForReadability(c1Raw.r, c1Raw.g, c1Raw.b, 0.20, 0.45, 0.6);

            const root = document.documentElement;
            root.style.setProperty('--glow-c1', `rgba(${c0Element.r}, ${c0Element.g}, ${c0Element.b}, 0.15)`);
            root.style.setProperty('--glow-c2', `rgba(${c1Element.r}, ${c1Element.g}, ${c1Element.b}, 0.15)`);

            // Dynamic theme variables matching the album colors
            root.style.setProperty('--theme-primary', `rgb(${c0Element.r}, ${c0Element.g}, ${c0Element.b})`);
            root.style.setProperty('--theme-primary-hover', `rgb(${c0Hover.r}, ${c0Hover.g}, ${c0Hover.b})`);
            root.style.setProperty('--theme-secondary', `rgb(${c1Element.r}, ${c1Element.g}, ${c1Element.b})`);
            root.style.setProperty('--theme-secondary-hover', `rgb(${c1Hover.r}, ${c1Hover.g}, ${c1Hover.b})`);

            root.style.setProperty('--theme-primary-shadow', `rgba(${c0Element.r}, ${c0Element.g}, ${c0Element.b}, 0.4)`);
            root.style.setProperty('--theme-secondary-shadow', `rgba(${c1Element.r}, ${c1Element.g}, ${c1Element.b}, 0.15)`);

            root.style.setProperty('--theme-gradient-start', `rgb(${c0Text.r}, ${c0Text.g}, ${c0Text.b})`);
            root.style.setProperty('--theme-gradient-end', `rgb(${c1Text.r}, ${c1Text.g}, ${c1Text.b})`);

            root.style.setProperty('--theme-element-gradient-start', `rgb(${c0Element.r}, ${c0Element.g}, ${c0Element.b})`);
            root.style.setProperty('--theme-element-gradient-end', `rgb(${c1Element.r}, ${c1Element.g}, ${c1Element.b})`);
        }

        drawFrame(0); // initial draw
        generateWaveform();
        saveProgressToLocalStorage();
    };
    img.onerror = () => {
        if (attempts === 0 && url.startsWith('http')) {
            attempts++;
            console.warn('CORS loading failed, retrying without CORS credentials...');
            img.removeAttribute('crossOrigin');
            img.src = url; // load original url directly without cache-busting or CORS
        } else {
            statusMessage.textContent = t('errorImage') || 'Error loading image URL.';
            console.error('Load Error for:', url);
        }
    };
    if (url.startsWith('http')) {
        img.crossOrigin = "anonymous";
        img.src = url.includes('?') ? `${url}&cors` : `${url}?cors`;
    } else {
        img.src = url;
    }
}

/**
 * Extracts a Material You style palette from an image.
 * Samples pixels, clusters them by hue, and returns the most
 * vibrant/dominant colors.
 */
function extractAlbumPalette(img) {
    const offscreen = document.createElement('canvas');
    const size = 96;
    offscreen.width = size;
    offscreen.height = size;
    const offCtx = offscreen.getContext('2d');
    offCtx.drawImage(img, 0, 0, size, size);

    let imageData;
    try {
        imageData = offCtx.getImageData(0, 0, size, size).data;
    } catch (e) {
        console.warn('Could not extract palette (CORS):', e);
        return null;
    }

    // Divide 360° Hue spectrum into 24 distinct color hue families (15° width each)
    const hueBuckets = Array.from({ length: 24 }, () => ({ rSum: 0, gSum: 0, bSum: 0, count: 0, satSum: 0 }));

    for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const a = imageData[i + 3];

        if (a < 128) continue; // Skip transparent pixels

        const rN = r / 255, gN = g / 255, bN = b / 255;
        const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
        const delta = max - min;
        const l = (max + min) / 2;

        if (l < 0.12 || l > 0.94) continue; // Skip black shadows & blown out highlights
        if (delta < 0.08) continue; // Skip neutral greys/whites for color family extraction

        let s = 0;
        if (max > 0 && delta > 0) {
            s = delta / (1 - Math.abs(2 * l - 1));
        }

        let h = 0;
        if (max === rN) h = ((gN - bN) / delta) % 6;
        else if (max === gN) h = (bN - rN) / delta + 2;
        else h = (rN - gN) / delta + 4;
        h = (h * 60 + 360) % 360;

        const bucketIdx = Math.floor(h / 15) % 24;
        const bucket = hueBuckets[bucketIdx];
        bucket.rSum += r;
        bucket.gSum += g;
        bucket.bSum += b;
        bucket.count++;
        bucket.satSum += s;
    }

    // Sort hue buckets by pixel count (dominant background color family wins!)
    const sorted = hueBuckets
        .filter(b => b.count > 0)
        .map(b => ({
            r: Math.round(b.rSum / b.count),
            g: Math.round(b.gSum / b.count),
            b: Math.round(b.bSum / b.count),
            count: b.count
        }))
        .sort((a, b) => b.count - a.count);

    if (sorted.length === 0) {
        // No saturated colors found (black and white or grayscale image)
        // Calculate average luma to generate a monochrome palette
        let lumaSum = 0;
        let lumaCount = 0;
        for (let i = 0; i < imageData.length; i += 4) {
            if (imageData[i + 3] < 128) continue;
            lumaSum += (imageData[i] + imageData[i + 1] + imageData[i + 2]) / 3;
            lumaCount++;
        }
        const avg = lumaCount > 0 ? Math.round(lumaSum / lumaCount) : 128;
        return [
            { r: Math.min(255, avg + 20), g: Math.min(255, avg + 20), b: Math.min(255, avg + 20) },
            { r: Math.max(0, avg - 20), g: Math.max(0, avg - 20), b: Math.max(0, avg - 20) },
            { r: avg, g: avg, b: avg }
        ];
    }

    const palette = [];
    for (const col of sorted) {
        const isTooClose = palette.some(p => {
            const dr = p.r - col.r, dg = p.g - col.g, db = p.b - col.b;
            return (dr * dr + dg * dg + db * db) < 2500;
        });
        if (!isTooClose) {
            palette.push({ r: col.r, g: col.g, b: col.b });
            if (palette.length >= 4) break;
        }
    }

    if (palette.length === 1) {
        const c = palette[0];
        palette.push({
            r: Math.max(0, Math.min(255, c.r - 40)),
            g: Math.max(0, Math.min(255, c.g - 40)),
            b: Math.max(0, Math.min(255, c.b - 40))
        });
    }

    return palette;
}

removeBgBtn.addEventListener('click', () => {
    bgImage = null;
    bgImageBase64 = null;
    bgInput.value = '';
    removeBgBtn.style.display = 'none';

    if (bgUploadCard) {
        bgUploadCard.classList.remove('has-preview');
        bgPreview.style.backgroundImage = '';
        bgPreview.style.display = 'none';
        bgSubtitle.style.color = 'var(--text-muted)';
        bgSubtitle.textContent = t('bgSub') || 'Click to select or drag image here';
    }

    statusMessage.textContent = t('bgRemoved') || 'Background image removed.';
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
    saveProgressToLocalStorage();
});

removeAlbumBtn.addEventListener('click', () => {
    albumImage = null;
    albumImageBase64 = null;
    albumPalette = null;
    albumInput.value = '';
    albumUrlInput.value = '';
    removeAlbumBtn.style.display = 'none';

    if (albumUploadCard) {
        albumUploadCard.classList.remove('has-preview');
        albumPreview.style.backgroundImage = '';
        albumPreview.style.display = 'none';
        albumSubtitle.style.color = 'var(--text-muted)';
        albumSubtitle.textContent = t('albumSub') || 'Click to select or drag image here';
    }

    // Reset dynamic background glow variables to defaults
    const root = document.documentElement;
    root.style.removeProperty('--glow-c1');
    root.style.removeProperty('--glow-c2');
    root.style.removeProperty('--theme-primary');
    root.style.removeProperty('--theme-primary-hover');
    root.style.removeProperty('--theme-secondary');
    root.style.removeProperty('--theme-secondary-hover');
    root.style.removeProperty('--theme-primary-shadow');
    root.style.removeProperty('--theme-secondary-shadow');
    root.style.removeProperty('--theme-gradient-start');
    root.style.removeProperty('--theme-gradient-end');
    root.style.removeProperty('--theme-element-gradient-start');
    root.style.removeProperty('--theme-element-gradient-end');

    statusMessage.textContent = t('albumRemoved') || 'Album cover removed.';
    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
    generateWaveform();
    saveProgressToLocalStorage();
});
