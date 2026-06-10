document.addEventListener('DOMContentLoaded', () => {
    const audioInput = document.getElementById('audioInput');
    const itunesSearchInput = document.getElementById('itunesSearchInput');
    const itunesSearchBtn = document.getElementById('itunesSearchBtn');
    const itunesSearchResults = document.getElementById('itunesSearchResults');
    const fetchYoulyLyricsBtn = document.getElementById('fetchYoulyLyricsBtn');
    const lrcInput = document.getElementById('lrcInput');
    const bgInput = document.getElementById('bgInput');
    const playBtn = document.getElementById('playBtn');
    const exportBtn = document.getElementById('exportBtn');
    const canvas = document.getElementById('videoCanvas');
    const ctx = canvas.getContext('2d');
    const statusMessage = document.getElementById('statusMessage');
    const dropOverlay = document.getElementById('dropOverlay');
    const albumInput = document.getElementById('albumInput');
    const fontSelect = document.getElementById('fontSelect');
    const lyricColorInput = document.getElementById('lyricColor');
    const glowColorInput = document.getElementById('glowColor');
    const lrcEditor = document.getElementById('lrcEditor');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const albumUrlInput = document.getElementById('albumUrl');
    const loadAlbumUrlBtn = document.getElementById('loadAlbumUrl');
    const bgStyleSelect = document.getElementById('bgStyleSelect');
    const creditsList = document.getElementById('creditsList');
    const addCreditBtn = document.getElementById('addCreditBtn');
    const dynamicGlowCheckbox = document.getElementById('dynamicGlow');
    const removeBgBtn = document.getElementById('removeBgBtn');
    const removeAlbumBtn = document.getElementById('removeAlbumBtn');
    const songTitleInput = document.getElementById('songTitleInput');
    const songArtistInput = document.getElementById('songArtistInput');
    const songKeyInput = document.getElementById('songKeyInput');
    const songBpmInput = document.getElementById('songBpmInput');
    const backingVocalsSelect = document.getElementById('backingVocalsSelect');
    const bpmVisualizerSelect = document.getElementById('bpmVisualizerSelect');
    const animatePlainLyricsSelect = document.getElementById('animatePlainLyricsSelect');

    // DOM selectors for styled upload cards
    const audioUploadCard = document.getElementById('audioUploadCard');
    const audioSubtitle = document.getElementById('audioSubtitle');
    const audioSpinner = document.getElementById('audioSpinner');

    const lrcUploadCard = document.getElementById('lrcUploadCard');
    const lrcSubtitle = document.getElementById('lrcSubtitle');

    const bgUploadCard = document.getElementById('bgUploadCard');
    const bgPreview = document.getElementById('bgPreview');
    const bgSubtitle = document.getElementById('bgSubtitle');

    const albumUploadCard = document.getElementById('albumUploadCard');
    const albumPreview = document.getElementById('albumPreview');
    const albumSubtitle = document.getElementById('albumSubtitle');

    // Helper to ensure extracted album colors are adjusted properly for text or elements
    function adjustColorForReadability(r, g, b, minLightness = 0.7, maxLightness = 1.0, minSaturation = 0.5) {
        let rNorm = r / 255;
        let gNorm = g / 255;
        let bNorm = b / 255;

        let max = Math.max(rNorm, gNorm, bNorm);
        let min = Math.min(rNorm, gNorm, bNorm);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
                case gNorm: h = (bNorm - rNorm) / d + 2; break;
                case bNorm: h = (rNorm - gNorm) / d + 4; break;
            }
            h /= 6;
        }

        // Clamp lightness to the specified range
        if (l < minLightness) l = minLightness;
        if (l > maxLightness) l = maxLightness;
        // Keep saturation decent so colors remain vibrant
        if (s < minSaturation) s = minSaturation;

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

    let audioContext = null;
    let audioBuffer = null;
    let audioSource = null;
    let lyrics = [];
    let bgImage = null;
    let albumImage = null;
    let isPlaying = false;
    let isRecording = false;
    let startTime = 0;
    let pausedTime = 0;
    let animationFrameId = null;
    let smoothedIndex = 0;

    // Customization variables
    let currentFont = 'Outfit';
    let currentLyricColor = '#ffffff';
    let currentGlowColor = '#6366f1';
    let currentBgStyle = 'gradient';

    // Material You palette extracted from album cover
    let albumPalette = null; // Array of {r,g,b} objects
    let bgImageBase64 = null;
    let albumImageBase64 = null;
    let isRestoring = false;

    let mediaRecorder = null;
    let recordedChunks = [];
    let destination = null;

    // Reset Canvas
    ctx.fillStyle = '#0f111a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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
        songTitleInput.value = '';
        songArtistInput.value = '';
        songKeyInput.value = '';
        songBpmInput.value = '';

        bgImage = null;
        albumImage = null;
        bgImageBase64 = null;
        albumImageBase64 = null;
        albumPalette = null;

        // Reset Card UI States
        if (audioUploadCard) {
            audioUploadCard.className = 'upload-card';
            audioSubtitle.textContent = 'Click to select or drag audio here';
            audioSpinner.style.display = 'none';
        }
        if (lrcUploadCard) {
            lrcUploadCard.className = 'upload-card';
            lrcSubtitle.textContent = 'Click to select or drag lyrics here';
        }
        if (bgUploadCard) {
            bgUploadCard.className = 'upload-card image-upload-card';
            bgPreview.style.backgroundImage = '';
            bgPreview.style.display = 'none';
        }
        if (albumUploadCard) {
            albumUploadCard.className = 'upload-card image-upload-card';
            albumPreview.style.backgroundImage = '';
            albumPreview.style.display = 'none';
        }

        // Reset personalization controls to default state
        bgStyleSelect.value = 'gradient';
        fontSelect.value = 'Outfit';
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
    resetInputs();

    function updateButtons() {
        const hasAudio = !!audioBuffer;
        const hasLyrics = lyrics.length > 0;

        playBtn.disabled = !(hasAudio && hasLyrics);
        exportBtn.disabled = !(hasAudio && hasLyrics);

        if (!hasAudio && hasLyrics) {
            statusMessage.textContent = `Lyrics loaded (${lyrics.length} lines). Waiting for audio to finish decoding...`;
            statusMessage.style.color = "#ec4899"; // highlight waiting
        } else if (hasAudio && !hasLyrics) {
            statusMessage.textContent = "Audio ready. Please upload or type lyrics.";
            statusMessage.style.color = "#6366f1";
        } else if (hasAudio && hasLyrics) {
            statusMessage.textContent = `System Ready! (${lyrics.length} lyric lines loaded)`;
            statusMessage.style.color = "#4ade80"; // green for ready
        }
    }

    // Helper to format track durations nicely e.g. 3:45
    function formatDuration(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    // Audio processing function
    async function processAudioFile(file) {
        statusMessage.textContent = 'Loading audio...';
        if (audioUploadCard) {
            audioUploadCard.className = 'upload-card loading';
            audioSubtitle.textContent = '⏳ Decoding audio data...';
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
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const arrayBuffer = await file.arrayBuffer();
        try {
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            statusMessage.textContent = 'Audio loaded successfully.';

            if (audioUploadCard) {
                audioUploadCard.className = 'upload-card success';
                audioSubtitle.textContent = `✅ ${file.name} (${formatDuration(audioBuffer.duration)})`;
                audioSpinner.style.display = 'none';
            }

            updateLyricsFromEditor();
            updateButtons();
        } catch (err) {
            statusMessage.textContent = 'Error decoding audio file.';
            console.error(err);
            if (audioUploadCard) {
                audioUploadCard.className = 'upload-card';
                audioSubtitle.textContent = '❌ Error decoding audio. Try again.';
                audioSpinner.style.display = 'none';
            }
        }
    }

    // Lyrics processing function
    async function processLrcFile(file) {
        const text = await file.text();
        lrcEditor.value = text;

        if (lrcUploadCard) {
            lrcSubtitle.textContent = `✅ ${file.name}`;
        }

        updateLyricsFromEditor();
    }

    function updateLyricsFromEditor() {
        const text = lrcEditor.value.trim();
        if (text.startsWith('<tt') || text.startsWith('<?xml') || text.includes('http://www.w3.org/ns/ttml')) {
            lyrics = parseTtml(text);
        } else {
            lyrics = parseLrc(text);
        }

        if (lyrics.length > 0) {
            if (lyrics[0].time > 0) {
                lyrics.unshift({ time: 0, text: '• • •' });
            }

            // Calculate duration and auto-generate word-by-word highlights if missing
            const shouldAnimatePlain = animatePlainLyricsSelect && animatePlainLyricsSelect.value === 'on';
            for (let i = 0; i < lyrics.length; i++) {
                const current = lyrics[i];
                const next = lyrics[i + 1];
                if (next) {
                    current.duration = next.time - current.time;
                } else if (audioBuffer) {
                    current.duration = Math.max(3.0, audioBuffer.duration - current.time);
                } else {
                    current.duration = 5.0;
                }

                if (!current.words && shouldAnimatePlain) {
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

            statusMessage.textContent = `Loaded ${lyrics.length} lyric lines.`;
            if (lrcUploadCard) {
                lrcUploadCard.className = 'upload-card success';
                if (!lrcSubtitle.textContent.startsWith('✅')) {
                    lrcSubtitle.textContent = `✅ ${lyrics.length} lines loaded`;
                }
            }
        } else {
            statusMessage.textContent = 'Enter or upload lyrics to begin.';
            if (lrcUploadCard) {
                lrcUploadCard.className = 'upload-card';
                lrcSubtitle.textContent = 'Click to select or drag lyrics here';
            }
        }
        updateButtons();
        drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
        saveProgressToLocalStorage();
    }

    // Background processing function
    async function processBgFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            bgImageBase64 = e.target.result;
            const img = new Image();
            img.onload = () => {
                bgImage = img;
                statusMessage.textContent = 'Background image loaded.';
                removeBgBtn.style.display = 'block';

                if (bgUploadCard) {
                    bgUploadCard.classList.add('has-preview');
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

    // Album cover processing function
    async function processAlbumFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            albumImageBase64 = e.target.result;
            if (albumUploadCard) {
                albumSubtitle.textContent = `✅ ${file.name}`;
            }
            loadAlbumFromUrl(albumImageBase64);
            saveProgressToLocalStorage();
        };
        reader.readAsDataURL(file);
    }

    function loadAlbumFromUrl(url) {
        statusMessage.textContent = 'Loading album cover...';
        const img = new Image();
        let attempts = 0;

        img.onload = () => {
            albumImage = img;
            albumPalette = extractAlbumPalette(img);
            statusMessage.textContent = 'Album cover loaded.';
            removeAlbumBtn.style.display = 'block';

            if (albumUploadCard) {
                albumUploadCard.classList.add('has-preview');
                albumPreview.style.backgroundImage = `url(${url})`;
                albumPreview.style.display = 'block';
                if (!albumSubtitle.textContent.startsWith('✅')) {
                    albumSubtitle.textContent = '✅ Album Art Loaded';
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
            saveProgressToLocalStorage();
        };
        img.onerror = () => {
            if (attempts === 0 && url.startsWith('http')) {
                attempts++;
                console.warn('CORS loading failed, retrying without CORS credentials...');
                img.removeAttribute('crossOrigin');
                img.src = url; // load original url directly without cache-busting or CORS
            } else {
                statusMessage.textContent = 'Error loading image URL.';
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
        const size = 64; // sample at low resolution for speed
        offscreen.width = size;
        offscreen.height = size;
        const offCtx = offscreen.getContext('2d');
        offCtx.drawImage(img, 0, 0, size, size);

        let imageData;
        try {
            imageData = offCtx.getImageData(0, 0, size, size).data;
        } catch (e) {
            // CORS-tainted canvas — can't read pixel data
            console.warn('Could not extract palette (CORS):', e);
            return null;
        }

        // Bucket pixels by hue ranges to find dominant hues
        const buckets = Array.from({ length: 12 }, () => ({ r: 0, g: 0, b: 0, count: 0, satSum: 0 }));

        for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i] / 255;
            const g = imageData[i + 1] / 255;
            const b = imageData[i + 2] / 255;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const delta = max - min;
            const lightness = (max + min) / 2;

            // Skip near-black, near-white, and near-grey pixels
            if (delta < 0.15 || lightness < 0.1 || lightness > 0.92) continue;

            let hue = 0;
            if (delta > 0) {
                if (max === r) hue = ((g - b) / delta) % 6;
                else if (max === g) hue = (b - r) / delta + 2;
                else hue = (r - g) / delta + 4;
                hue = (hue * 60 + 360) % 360;
            }

            const saturation = delta / (1 - Math.abs(2 * lightness - 1));
            const bucketIndex = Math.floor(hue / 30) % 12;
            const bucket = buckets[bucketIndex];
            bucket.r += imageData[i];
            bucket.g += imageData[i + 1];
            bucket.b += imageData[i + 2];
            bucket.count++;
            bucket.satSum += saturation;
        }

        // Sort by (count * average saturation) to pick vivid dominant colors
        let sorted = buckets
            .filter(b => b.count > 0)
            .map(b => ({
                r: Math.round(b.r / b.count),
                g: Math.round(b.g / b.count),
                b: Math.round(b.b / b.count),
                score: b.count * (b.satSum / b.count)
            }))
            .sort((a, b) => b.score - a.score);

        // Fallback for greyscale or low saturation images
        if (sorted.length < 2) {
            const greyBuckets = Array.from({ length: 4 }, () => ({ r: 0, g: 0, b: 0, count: 0 }));
            for (let i = 0; i < imageData.length; i += 4) {
                const r = imageData[i];
                const g = imageData[i + 1];
                const b = imageData[i + 2];
                const avg = (r + g + b) / 3;

                const bucketIdx = Math.min(3, Math.floor(avg / 64));
                const bucket = greyBuckets[bucketIdx];
                bucket.r += r;
                bucket.g += g;
                bucket.b += b;
                bucket.count++;
            }

            const sortedGreys = greyBuckets
                .filter(b => b.count > 0)
                .map(b => ({
                    r: Math.round(b.r / b.count),
                    g: Math.round(b.g / b.count),
                    b: Math.round(b.b / b.count),
                    score: b.count
                }))
                .sort((a, b) => b.score - a.score);

            sorted = [...sorted, ...sortedGreys];
        }

        // Return top 4 colors for the palette
        return sorted.slice(0, 4).map(c => ({ r: c.r, g: c.g, b: c.b }));
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

    songBpmInput.addEventListener('input', () => {
        drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
    });

    removeBgBtn.addEventListener('click', () => {
        bgImage = null;
        bgImageBase64 = null;
        bgInput.value = '';
        removeBgBtn.style.display = 'none';

        if (bgUploadCard) {
            bgUploadCard.classList.remove('has-preview');
            bgPreview.style.backgroundImage = '';
            bgPreview.style.display = 'none';
            bgSubtitle.textContent = 'Click to select or drag image here';
        }

        statusMessage.textContent = 'Background image removed.';
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
            albumSubtitle.textContent = 'Click to select or drag image here';
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

        statusMessage.textContent = 'Album cover removed.';
        drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
        saveProgressToLocalStorage();
    });

    // Drag and Drop global handlers
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        dropOverlay.classList.add('active');
    });

    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropOverlay.classList.add('active');
    });

    window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            dropOverlay.classList.remove('active');
        }
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        dropOverlay.classList.remove('active');

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            Array.from(e.dataTransfer.files).forEach(handleDroppedFile);
        }
    });

    function handleDroppedFile(file) {
        const fileName = file.name.toLowerCase();
        const isAudio = file.type.startsWith('audio/') ||
            ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac'].some(ext => fileName.endsWith(ext));
        const isLrc = fileName.endsWith('.lrc') || fileName.endsWith('.ttml') || fileName.endsWith('.xml') || file.type === 'text/plain' || file.type === 'application/xml' || file.type === 'text/xml';
        const isImage = file.type.startsWith('image/') ||
            ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(ext => fileName.endsWith(ext));

        if (isAudio) {
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
            statusMessage.textContent = `Unrecognized file type: ${file.name}`;
        }
    }

    const CJK_REGEX = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf\uac00-\ud7a3]/;

    function tokenizeText(text) {
        const regex = /([\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf\uac00-\ud7a3]\s*)|([^\s\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf\uac00-\ud7a3]+\s*)|(\s+)/g;
        const tokens = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            tokens.push(match[0]);
        }
        return tokens;
    }

    function parseLrc(lrcText) {
        const lines = lrcText.split('\n');
        const parsed = [];
        const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
        const backingVocalsMode = backingVocalsSelect ? backingVocalsSelect.value : 'styled';

        lines.forEach(line => {
            let match;
            const lineLyrics = line.replace(timeReg, '').trim();
            if (!lineLyrics) return;

            const isBacking = lineLyrics.startsWith('(') && lineLyrics.endsWith(')');
            if (backingVocalsMode === 'hide' && isBacking) return;

            // Reset regex index
            timeReg.lastIndex = 0;
            while ((match = timeReg.exec(line)) !== null) {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const milliseconds = parseInt(match[3]) * (match[3].length === 2 ? 10 : 1);

                const time = minutes * 60 + seconds + milliseconds / 1000;
                parsed.push({ time, text: lineLyrics, isBacking });
            }
        });

        return parsed.sort((a, b) => a.time - b.time);
    }

    function cleanSpanText(text) {
        let cleaned = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
        const endsWithSpace = /\s$/.test(text);
        const startsWithSpace = /^\s/.test(text);
        cleaned = cleaned.trim();
        if (startsWithSpace) cleaned = ' ' + cleaned;
        if (endsWithSpace) cleaned = cleaned + ' ';
        return cleaned;
    }

    function parseTtml(ttmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(ttmlText, "text/xml");
        const paragraphs = xmlDoc.getElementsByTagName('p');
        const parsed = [];
        const backingVocalsMode = backingVocalsSelect ? backingVocalsSelect.value : 'styled';

        function parseTime(timeStr) {
            if (!timeStr) return 0;
            const parts = timeStr.split(':');
            if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
            if (parts.length === 2) return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
            return parseFloat(timeStr);
        }

        function checkIfBgElement(el) {
            if (!el || typeof el.getAttribute !== 'function') return false;
            const role = el.getAttribute('ttm:role') || el.getAttribute('role');
            if (role === 'x-bg' || role === 'background' || role === 'backing') {
                return true;
            }
            const className = el.className || '';
            if (/bg|background|backing|vocal/i.test(className)) {
                return true;
            }
            const text = el.textContent.trim();
            if (text.startsWith('(') && text.endsWith(')')) {
                return true;
            }
            return false;
        }

        for (let i = 0; i < paragraphs.length; i++) {
            const p = paragraphs[i];
            const isLineBacking = checkIfBgElement(p);
            if (backingVocalsMode === 'hide' && isLineBacking) continue;

            const rawText = p.textContent.trim();
            const lrcTimeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
            const lrcTimes = [];
            let match;

            while ((match = lrcTimeReg.exec(rawText)) !== null) {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const milliseconds = parseInt(match[3]) * (match[3].length === 2 ? 10 : 1);
                const parsedTime = minutes * 60 + seconds + milliseconds / 1000;
                lrcTimes.push(parsedTime);
            }

            if (lrcTimes.length > 0) {
                const cleanText = rawText.replace(lrcTimeReg, '').trim();
                if (cleanText) {
                    lrcTimes.forEach(parsedTime => {
                        parsed.push({
                            time: parsedTime,
                            text: cleanText,
                            words: null,
                            isBacking: isLineBacking
                        });
                    });
                }
                continue;
            }

            const begin = p.getAttribute('begin');
            if (begin) {
                const time = parseTime(begin);

                const spans = p.getElementsByTagName('span');
                const words = [];
                let textContent = '';

                if (spans.length > 0) {
                    let lastWord = null;

                    function traverse(node) {
                        if (node.nodeType === 1) { // Element node
                            const hasChildElements = Array.from(node.childNodes).some(n => n.nodeType === 1);
                            if (node.tagName.toLowerCase() === 'span' && !hasChildElements) {
                                const spanBegin = node.getAttribute('begin');
                                const spanEnd = node.getAttribute('end');
                                const wTime = spanBegin ? parseTime(spanBegin) : time;
                                const wEndTime = spanEnd ? parseTime(spanEnd) : wTime + 1;
                                const isBacking = checkIfBgElement(node) || checkIfBgElement(node.parentElement) || isLineBacking;

                                const wText = cleanSpanText(node.textContent);
                                if (wText !== '') {
                                    if (lastWord && 
                                        !lastWord.text.endsWith(' ') && 
                                        !lastWord.text.endsWith('\u00A0') &&
                                        !wText.startsWith(' ') &&
                                        !wText.startsWith('\u00A0') &&
                                        !CJK_REGEX.test(lastWord.text) &&
                                        !CJK_REGEX.test(wText)) {
                                        lastWord.text += ' ';
                                    }
                                    const wordObj = { text: wText, time: wTime, endTime: wEndTime, isBacking };
                                    words.push(wordObj);
                                    lastWord = wordObj;
                                }
                            } else {
                                Array.from(node.childNodes).forEach(traverse);
                            }
                        } else if (node.nodeType === 3) { // Text node
                            const text = node.textContent;
                            if (lastWord && /\s/.test(text)) {
                                if (!lastWord.text.endsWith(' ') &&
                                    !lastWord.text.endsWith('\u00A0') &&
                                    !CJK_REGEX.test(lastWord.text)) {
                                    lastWord.text += ' ';
                                }
                            }
                        }
                    }

                    Array.from(p.childNodes).forEach(traverse);

                    // Detect parenthetical backing vocals in the words sequence (second pass)
                    let insideParentheses = false;
                    for (let j = 0; j < words.length; j++) {
                        const w = words[j];
                        if (w.text.includes('(')) {
                            insideParentheses = true;
                        }
                        if (insideParentheses) {
                            w.isBacking = true;
                        }
                        if (w.text.includes(')')) {
                            insideParentheses = false;
                        }
                    }

                    if (backingVocalsMode === 'hide') {
                        const filteredWords = words.filter(w => !w.isBacking);
                        words.length = 0;
                        words.push(...filteredWords);
                    }

                    textContent = words.map(w => w.text).join('');
                } else {
                    textContent = p.textContent.trim();
                }

                if (textContent.trim()) {
                    parsed.push({
                        time,
                        text: textContent.trim(),
                        words: words.length > 0 ? words : null,
                        isBacking: isLineBacking || (words.length > 0 && words.every(w => w.isBacking))
                    });
                }
            }
        }
        return parsed.sort((a, b) => a.time - b.time);
    }

    function drawFrame(currentTime) {
        // Find current lyric index
        let currentIndex = 0;
        if (lyrics.length > 0) {
            for (let i = 0; i < lyrics.length; i++) {
                if (currentTime >= lyrics[i].time) currentIndex = i;
                else break;
            }
        }

        // Smooth the index transition for silky smooth UI and color shifts
        // Lower factor = slower, more atmospheric transitions
        const indexDiff = currentIndex - smoothedIndex;
        smoothedIndex += indexDiff * 0.04;

        // Calculate active glow color (either custom or dynamic based on album palette)
        let activeGlowColor = currentGlowColor;
        if (dynamicGlowCheckbox && dynamicGlowCheckbox.checked && albumPalette && albumPalette.length > 0) {
            const p = albumPalette;
            const t = smoothedIndex * 0.5;
            const c0 = p[Math.floor(t) % p.length];
            const c1 = p[(Math.floor(t) + 1) % p.length];
            const blend = t % 1;
            const mix = (a, b, f) => Math.round(a + (b - a) * f);
            const r = mix(c0.r, c1.r, blend);
            const g = mix(c0.g, c1.g, blend);
            const b = mix(c0.b, c1.b, blend);
            const glowAdjusted = adjustColorForReadability(r, g, b, 0.55); // vibrant glow
            activeGlowColor = `rgb(${glowAdjusted.r}, ${glowAdjusted.g}, ${glowAdjusted.b})`;

            // Sync the color picker input preview swatch with the dynamic color
            const toHex = (c) => c.toString(16).padStart(2, '0');
            glowColorInput.value = `#${toHex(glowAdjusted.r)}${toHex(glowAdjusted.g)}${toHex(glowAdjusted.b)}`;
        }

        // Clear background
        if (bgImage) {
            // Draw background covering the canvas
            const scale = Math.max(canvas.width / bgImage.width, canvas.height / bgImage.height);
            const x = (canvas.width / 2) - (bgImage.width / 2) * scale;
            const y = (canvas.height / 2) - (bgImage.height / 2) * scale;
            ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);

            // Dark overlay for readability
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (currentBgStyle === 'albumBlur' && albumImage) {
            const scale = Math.max(canvas.width / albumImage.width, canvas.height / albumImage.height);
            const x = (canvas.width / 2) - (albumImage.width / 2) * scale;
            const y = (canvas.height / 2) - (albumImage.height / 2) * scale;
            ctx.save();
            ctx.filter = 'blur(60px) brightness(0.4)';
            ctx.drawImage(albumImage, x - 100, y - 100, (albumImage.width * scale) + 200, (albumImage.height * scale) + 200);
            ctx.restore();
        } else if (currentBgStyle === 'materialYou' && albumPalette && albumPalette.length >= 2) {
            // --- Material You: Album color reactive background ---
            // Animate between palette colors based on lyric progress using smooth sine waves
            const p = albumPalette;
            const t = smoothedIndex * 0.5; // slow oscillation
            const pulse = (Math.sin(currentTime * 1.2) * 0.5 + 0.5); // 0..1 breathing pulse

            // Pick two colors to blend between, cycling through the palette
            const c0 = p[Math.floor(t) % p.length];
            const c1 = p[(Math.floor(t) + 1) % p.length];
            const c2 = p[(Math.floor(t) + 2) % p.length];
            const blend = t % 1;

            // Mix c0 -> c1 for gradient start, c1 -> c2 for end
            const mix = (a, b, f) => Math.round(a + (b - a) * f);
            const col0 = { r: mix(c0.r, c1.r, blend), g: mix(c0.g, c1.g, blend), b: mix(c0.b, c1.b, blend) };
            const col1 = { r: mix(c1.r, c2.r, blend), g: mix(c1.g, c2.g, blend), b: mix(c1.b, c2.b, blend) };

            // Tone down to dark Material You surface colors (keep hue, reduce lightness)
            const darken = (c, f) => `rgb(${Math.round(c.r * f)}, ${Math.round(c.g * f)}, ${Math.round(c.b * f)})`;

            // Radial gradient base – gives the "tonal surface" Material You feel
            const radGrad = ctx.createRadialGradient(
                canvas.width * 0.3, canvas.height * 0.5, 0,
                canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.8
            );
            radGrad.addColorStop(0, darken(col0, 0.25 + pulse * 0.08));
            radGrad.addColorStop(0.5, darken(col1, 0.12));
            radGrad.addColorStop(1, darken(c2, 0.06));
            ctx.fillStyle = radGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Accent orbs — soft blurred color blobs like Material You wallpaper
            const orbs = [
                { x: canvas.width * 0.15, y: canvas.height * 0.3, r: 500, c: col0, a: 0.18 + pulse * 0.06 },
                { x: canvas.width * 0.75, y: canvas.height * 0.6, r: 600, c: col1, a: 0.14 + (1 - pulse) * 0.06 },
                { x: canvas.width * 0.5, y: canvas.height * 0.1, r: 350, c: c2, a: 0.10 + pulse * 0.04 },
            ];
            for (const orb of orbs) {
                const orbGrad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
                orbGrad.addColorStop(0, `rgba(${orb.c.r}, ${orb.c.g}, ${orb.c.b}, ${orb.a})`);
                orbGrad.addColorStop(1, `rgba(${orb.c.r}, ${orb.c.g}, ${orb.c.b}, 0)`);
                ctx.fillStyle = orbGrad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        } else {
            // Default dynamic gradient background
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            let hue;

            if (currentBgStyle === 'reactive') {
                // Use a sine wave to oscillate through colors smoothly based on progress
                // This prevents the "cut" when hue wraps from 359 to 0
                hue = 220 + Math.sin(smoothedIndex * 0.4) * 60;
            } else {
                // Slowly shifting pulse
                hue = (currentTime * 10) % 360;
            }

            gradient.addColorStop(0, `hsl(${hue}, 40%, 15%)`);
            gradient.addColorStop(1, `hsl(${(hue + 80) % 360}, 50%, 10%)`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw Album Cover (Left Side)
        if (albumImage) {
            const size = 600;
            const x = 200;
            const y = 180; // Shifted up slightly to give title & credits more room below

            ctx.save();
            // Shadow
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 50;

            // Rounded corners for album cover
            ctx.beginPath();
            ctx.roundRect(x, y, size, size, 30);
            ctx.clip();
            ctx.drawImage(albumImage, x, y, size, size);
            ctx.restore();
        }

        // Draw Song Title and Artist Name (Left Side)
        const songTitle = songTitleInput.value.trim();
        const songArtist = songArtistInput.value.trim();

        // Calculate total height of metadata block to prevent it going off screen
        const creditRows = document.querySelectorAll('#creditsList .credits-row');
        let activeCreditsCount = 0;
        for (let i = 0; i < creditRows.length; i++) {
            if (creditRows[i].querySelector('.credits-name').value.trim()) {
                activeCreditsCount++;
            }
        }

        let totalMetadataHeight = 0;
        if (songTitle) totalMetadataHeight += 55;
        if (songArtist) totalMetadataHeight += 45;
        if ((songTitle || songArtist) && activeCreditsCount > 0) {
            totalMetadataHeight += 10; // gap before credits
        }
        totalMetadataHeight += activeCreditsCount * 34;

        let textY;
        if (albumImage) {
            // Align to bottom area, growing upwards if needed (bottom boundary at canvas.height - 50)
            textY = Math.min(830, canvas.height - 50 - totalMetadataHeight);
        } else {
            // Centered layout if there is no album cover
            textY = canvas.height / 2 - totalMetadataHeight / 2;
        }

        if (songTitle || songArtist) {
            ctx.save();
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 10;

            if (songTitle) {
                ctx.font = `800 42px "${currentFont}", sans-serif`;
                ctx.fillStyle = '#ffffff';
                ctx.fillText(songTitle, 200, textY, 600);
                textY += 55;
            }

            if (songArtist) {
                ctx.font = `600 28px "${currentFont}", sans-serif`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.fillText(songArtist, 200, textY, 600);
                textY += 45;
            }

            ctx.restore();
        }

        // Permanent App Credit
        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = `600 24px "${currentFont}", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;
        ctx.fillText(`zexerif.github.io/lyric-video-maker/    :    v1.3.0`, 40, 40);
        ctx.restore();

        // Draw Custom Credits (multiple rows flowing down from the artist)
        if ((songTitle || songArtist) && activeCreditsCount > 0) {
            textY += 10; // extra gap before credits
        }

        for (let i = 0; i < creditRows.length; i++) {
            const row = creditRows[i];
            const prefix = row.querySelector('.credits-prefix').value;
            const name = row.querySelector('.credits-name').value.trim();

            if (name) {
                ctx.save();
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.font = `600 24px "${currentFont}", sans-serif`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 10;
                ctx.fillText(`${prefix} ${name}`, 200, textY, 600);
                ctx.restore();

                textY += 34; // offset downward for the next credit line
            }
        }

        // Draw Song Key and BPM Glassmorphic Pill Badge (Top Right)
        const songKey = songKeyInput.value.trim();
        const songBpmVal = songBpmInput.value.trim();
        const bpm = parseFloat(songBpmVal);
        const hasBpm = !isNaN(bpm) && bpm > 0;
        const visStyle = bpmVisualizerSelect ? bpmVisualizerSelect.value : 'ring-contract';
        const showVis = hasBpm && visStyle !== 'none';

        if (songKey || hasBpm) {
            ctx.save();
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            let beforeText = '';
            let afterText = '';
            let beforeWidth = 0;
            let afterWidth = 0;
            let pillWidth = 0;
            let pillX = 0;
            const pillY = 40;
            const pillHeight = 40;

            let dotSpace = 50;
            let dotOffset = 25;

            ctx.font = `600 20px "${currentFont}", sans-serif`;

            if (showVis) {
                beforeText = songKey ? `Key: ${songKey}  |  ` : '';
                afterText = `${songBpmVal} BPM`;
                beforeWidth = beforeText ? ctx.measureText(beforeText).width : 0;
                afterWidth = ctx.measureText(afterText).width;

                if (!beforeText) {
                    dotSpace = 44;
                    dotOffset = 12;
                } else {
                    dotSpace = 50;
                    dotOffset = 25;
                }

                const contentWidth = beforeWidth + dotSpace + afterWidth;
                pillWidth = 20 + contentWidth + 20;
                pillX = canvas.width - 40 - pillWidth;
            } else {
                const badgeText = (songKey && hasBpm) ? `Key: ${songKey}  |  ${songBpmVal} BPM` : (songKey ? `Key: ${songKey}` : `${songBpmVal} BPM`);
                const textWidth = ctx.measureText(badgeText).width;
                pillWidth = 20 + textWidth + 20;
                pillX = canvas.width - 40 - pillWidth;
            }

            // Draw pill background (glassmorphic dark background)
            ctx.beginPath();
            ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 20);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fill();

            // Flash overlay if pill-flash is selected
            let pulseScale = 0;
            let beatPhase = 0;
            if (showVis) {
                const beatDuration = 60 / bpm;
                beatPhase = (currentTime / beatDuration) % 1;
                pulseScale = Math.exp(-beatPhase * 4);
            }

            if (showVis && visStyle === 'pill-flash') {
                ctx.save();
                ctx.globalAlpha = 0.45 * pulseScale;
                ctx.fillStyle = activeGlowColor;
                ctx.fill();
                ctx.restore();
            }

            // Draw border
            ctx.strokeStyle = (showVis && visStyle === 'pill-flash')
                ? `rgba(255, 255, 255, ${0.12 + pulseScale * 0.38})`
                : 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = (showVis && visStyle === 'pill-flash')
                ? 1.5 + pulseScale * 1.0
                : 1.5;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 10;
            ctx.stroke();

            // Draw BPM visualizer pulse dot inside the pill if active
            if (showVis) {
                const dotX = pillX + 20 + beforeWidth + dotOffset;
                const dotY = pillY + 20;

                ctx.save();

                if (visStyle === 'ring-contract') {
                    // Contracting Ring
                    const approachRadius = 10 + (1 - beatPhase) * 20;
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, approachRadius, 0, Math.PI * 2);
                    ctx.strokeStyle = activeGlowColor;
                    ctx.lineWidth = 2;
                    ctx.globalAlpha = 0.8 * (1 - beatPhase);
                    ctx.stroke();

                    // Pulsing Core
                    const coreRadius = 9 + pulseScale * 4;
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, coreRadius, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = activeGlowColor;
                    ctx.shadowBlur = 18 * pulseScale;
                    ctx.globalAlpha = 0.9 + pulseScale * 0.1;
                    ctx.fill();
                } else if (visStyle === 'ring-expand') {
                    // Expanding Ring
                    const expandRadius = 10 + beatPhase * 20;
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, expandRadius, 0, Math.PI * 2);
                    ctx.strokeStyle = activeGlowColor;
                    ctx.lineWidth = 2;
                    ctx.globalAlpha = 0.9 * (1 - beatPhase);
                    ctx.stroke();

                    // Core
                    const coreRadius = 9 + pulseScale * 3;
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, coreRadius, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = activeGlowColor;
                    ctx.shadowBlur = 15 * pulseScale;
                    ctx.globalAlpha = 0.9 + pulseScale * 0.1;
                    ctx.fill();
                } else if (visStyle === 'double-ring') {
                    // Contracting Ring
                    const approachRadius = 10 + (1 - beatPhase) * 16;
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, approachRadius, 0, Math.PI * 2);
                    ctx.strokeStyle = activeGlowColor;
                    ctx.lineWidth = 1.5;
                    ctx.globalAlpha = 0.7 * (1 - beatPhase);
                    ctx.stroke();

                    // Expanding Ring
                    const expandRadius = 10 + beatPhase * 16;
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, expandRadius, 0, Math.PI * 2);
                    ctx.strokeStyle = activeGlowColor;
                    ctx.lineWidth = 1.5;
                    ctx.globalAlpha = 0.7 * (1 - beatPhase);
                    ctx.stroke();

                    // Core
                    const coreRadius = 9 + pulseScale * 3;
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, coreRadius, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = activeGlowColor;
                    ctx.shadowBlur = 15 * pulseScale;
                    ctx.globalAlpha = 0.9 + pulseScale * 0.1;
                    ctx.fill();
                } else if (visStyle === 'pill-flash') {
                    // Core pulses in size too for extra visual punch
                    const coreRadius = 9 + pulseScale * 3;
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, coreRadius, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = activeGlowColor;
                    ctx.shadowBlur = 20 * pulseScale;
                    ctx.globalAlpha = 0.9 + pulseScale * 0.1;
                    ctx.fill();
                }

                ctx.restore();

                // Draw text elements
                ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                if (beforeText) {
                    ctx.fillText(beforeText, pillX + 20, pillY + 20);
                }
                ctx.fillText(afterText, pillX + 20 + beforeWidth + dotSpace, pillY + 20);
            } else {
                // Draw plain text inside the pill without visualizer
                const badgeText = (songKey && hasBpm) ? `Key: ${songKey}  |  ${songBpmVal} BPM` : (songKey ? `Key: ${songKey}` : `${songBpmVal} BPM`);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.fillText(badgeText, pillX + 20, pillY + 20);
            }

            ctx.restore();
        }



        if (lyrics.length === 0) return;

        // Draw Lyrics (Right Side, Left Aligned)
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const lyricX = 850; // Starting point for lyrics on the right
        const centerY = canvas.height / 2;

        function getWrappedLines(context, lyric, maxWidth, font) {
            const backingVocalsMode = backingVocalsSelect ? backingVocalsSelect.value : 'styled';
            if (lyric.cachedLines && lyric.cachedFont === font && lyric.cachedMaxWidth === maxWidth && lyric.cachedBackingMode === backingVocalsMode) {
                return lyric.cachedLines;
            }

            context.save();

            let items = [];
            const useWordTimings = !animatePlainLyricsSelect || animatePlainLyricsSelect.value !== 'off';
            if (lyric.words && lyric.words.length > 0 && useWordTimings) {
                const isWordByWord = lyric.words.length > 1;
                for (let i = 0; i < lyric.words.length; i++) {
                    const w = lyric.words[i];
                    const rawText = w.text;
                    const parts = isWordByWord ? rawText.trim().split(/\s+/) : tokenizeText(rawText);
                    if (parts.length > 0) {
                        const duration = w.endTime - w.time;
                        const partDuration = duration / parts.length;
                        const endsWithSpace = rawText.endsWith(' ') || rawText.endsWith('\u00A0');
                        for (let k = 0; k < parts.length; k++) {
                            const isLast = (k === parts.length - 1);
                            items.push({
                                text: parts[k] + (isWordByWord && (!isLast || endsWithSpace) ? ' ' : ''),
                                time: w.time + k * partDuration,
                                endTime: w.time + (k + 1) * partDuration,
                                isBacking: w.isBacking
                            });
                        }
                    }
                }
            } else {
                const tokens = tokenizeText(lyric.text);
                for (let i = 0; i < tokens.length; i++) {
                    items.push({
                        text: tokens[i],
                        time: lyric.time,
                        endTime: lyric.time + 1,
                        isBacking: lyric.isBacking
                    });
                }
            }

            // Detect parenthetical backing vocals in the items sequence (for both TTML and LRC!)
            let insideParentheses = false;
            for (let j = 0; j < items.length; j++) {
                const item = items[j];
                if (item.text.includes('(')) {
                    insideParentheses = true;
                }
                if (insideParentheses) {
                    item.isBacking = true;
                }
                if (item.text.includes(')')) {
                    insideParentheses = false;
                }
            }

            if (backingVocalsMode === 'hide') {
                items = items.filter(item => !item.isBacking);
            }

            // Split items into main and backing
            const mainItems = [];
            const backingItems = [];
            for (let j = 0; j < items.length; j++) {
                const item = items[j];
                if (item.isBacking) {
                    backingItems.push(item);
                } else {
                    mainItems.push(item);
                }
            }

            const defaultFont = font;
            const backingFont = font.includes('bold')
                ? font.replace('bold', '500').replace('60px', '44px')
                : font.replace('60px', '44px');

            const useBackingStyle = (backingVocalsMode === 'styled');
            const activeBackingFont = useBackingStyle ? backingFont : defaultFont;

            function wrapItems(itemsList, activeFont) {
                const lines = [];
                let currentLine = [];
                let currentLineWidth = 0;

                for (let n = 0; n < itemsList.length; n++) {
                    const item = itemsList[n];
                    context.font = activeFont;
                    const spaceWidth = context.measureText(' ').width;

                    let text = item.text;
                    let trailingSpaces = 0;
                    let leadingSpaces = 0;

                    while (text.endsWith(' ') || text.endsWith('\u00A0') || text.endsWith('\t') || text.endsWith('\n') || text.endsWith('\r')) {
                        trailingSpaces++;
                        text = text.slice(0, -1);
                    }
                    while (text.startsWith(' ') || text.startsWith('\u00A0') || text.startsWith('\t') || text.startsWith('\n') || text.startsWith('\r')) {
                        leadingSpaces++;
                        text = text.slice(1);
                    }

                    const cleanWidth = text.length > 0 ? context.measureText(text).width : 0;
                    const itemWidth = cleanWidth + (leadingSpaces + trailingSpaces) * spaceWidth;

                    item.renderText = text;
                    item.leadingSpaces = leadingSpaces;
                    item.trailingSpaces = trailingSpaces;
                    item.cleanWidth = cleanWidth;

                    if (currentLineWidth + itemWidth > maxWidth && currentLine.length > 0) {
                        lines.push({ width: currentLineWidth, items: currentLine });
                        currentLine = [item];
                        currentLineWidth = itemWidth;
                    } else {
                        currentLine.push(item);
                        currentLineWidth += itemWidth;
                    }
                }
                if (currentLine.length > 0) {
                    lines.push({ width: currentLineWidth, items: currentLine });
                }
                return lines;
            }

            const mainLines = wrapItems(mainItems, defaultFont);
            const backingLines = wrapItems(backingItems, activeBackingFont);

            context.restore();

            const result = { mainLines, backingLines };
            lyric.cachedLines = result;
            lyric.cachedFont = font;
            lyric.cachedMaxWidth = maxWidth;
            lyric.cachedBackingMode = backingVocalsMode;
            return result;
        }

        function drawWrappedLines(context, lyric, wrappedResult, x, y, isCurrent, currentTime, opacity) {
            const defaultFont = `bold 60px "${currentFont}", sans-serif`;
            const backingFont = defaultFont.includes('bold')
                ? defaultFont.replace('bold', '500').replace('60px', '44px')
                : defaultFont.replace('60px', '44px');

            const backingVocalsMode = backingVocalsSelect ? backingVocalsSelect.value : 'styled';
            const useBackingStyle = (backingVocalsMode === 'styled');

            const mainLines = wrappedResult.mainLines;
            const backingLines = wrappedResult.backingLines;

            const mainLineHeight = 60 * 1.3;
            const backingLineHeight = (useBackingStyle ? 44 : 60) * 1.3;
            const gapBetween = (mainLines.length > 0 && backingLines.length > 0) ? 15 : 0;

            const linesToDraw = [];
            for (let i = 0; i < mainLines.length; i++) {
                linesToDraw.push({
                    line: mainLines[i],
                    font: defaultFont,
                    lineHeight: mainLineHeight,
                    isBacking: false
                });
            }
            for (let i = 0; i < backingLines.length; i++) {
                linesToDraw.push({
                    line: backingLines[i],
                    font: useBackingStyle ? backingFont : defaultFont,
                    lineHeight: backingLineHeight,
                    isBacking: true
                });
            }

            let totalHeight = 0;
            for (let i = 0; i < linesToDraw.length; i++) {
                totalHeight += linesToDraw[i].lineHeight;
                if (i < linesToDraw.length - 1) {
                    if (!linesToDraw[i].isBacking && linesToDraw[i + 1].isBacking) {
                        totalHeight += gapBetween;
                    }
                }
            }

            let currentY = y - totalHeight / 2;

            for (let i = 0; i < linesToDraw.length; i++) {
                const drawItem = linesToDraw[i];
                const line = drawItem.line;
                const lineY = currentY + drawItem.lineHeight / 2;

                let currentX = x;
                context.font = drawItem.font;

                let lineText = '';
                for (let j = 0; j < line.items.length; j++) {
                    const item = line.items[j];
                    lineText += ' '.repeat(item.leadingSpaces) + item.renderText + ' '.repeat(item.trailingSpaces);
                }

                const isStyledBacking = drawItem.isBacking && useBackingStyle;

                if (isCurrent) {
                    // Base inactive line
                    context.fillStyle = isStyledBacking
                        ? `rgba(203, 213, 225, 0.25)`
                        : `rgba(203, 213, 225, 0.5)`;
                    context.shadowColor = 'transparent';
                    context.shadowBlur = 0;
                    context.fillText(lineText, x, lineY);

                    // Calculate active highlighted width
                    let activeWidth = 0;
                    let hasActive = false;
                    let lastItemProgress = 0;

                    for (let j = 0; j < line.items.length; j++) {
                        const item = line.items[j];
                        const spaceWidth = context.measureText(' ').width;
                        activeWidth += item.leadingSpaces * spaceWidth;

                        let progress = 0;
                        if (lyric.words && lyric.words.length > 0) {
                            const duration = item.endTime - item.time;
                            if (currentTime >= item.endTime || duration <= 0) {
                                progress = 1;
                            } else if (currentTime > item.time) {
                                progress = (currentTime - item.time) / duration;
                            }
                        } else {
                            progress = 1; // LRC active line fully highlights at once
                        }

                        if (progress > 0) {
                            hasActive = true;
                            activeWidth += item.cleanWidth * progress;
                        }

                        lastItemProgress = progress;

                        if (progress < 1) {
                            break;
                        }

                        activeWidth += item.trailingSpaces * spaceWidth;
                    }

                    if (hasActive) {
                        context.save();
                        const blurRadius = (isStyledBacking ? 8 : 20) * opacity;

                        // If the line is not fully active, apply clipping to the active sweep width
                        const isFullyActive = (lastItemProgress >= 1);
                        if (!isFullyActive) {
                            context.beginPath();
                            context.rect(x - blurRadius * 2, lineY - drawItem.lineHeight, activeWidth + blurRadius * 2, drawItem.lineHeight * 2);
                            context.clip();
                        }

                        context.font = drawItem.font;
                        context.fillStyle = currentLyricColor;
                        if (isStyledBacking) {
                            context.globalAlpha = 0.6;
                        }
                        context.shadowColor = activeGlowColor;
                        context.shadowBlur = blurRadius;
                        context.fillText(lineText, x, lineY);
                        context.restore();
                    }
                } else {
                    // Normal inactive line
                    context.fillStyle = isStyledBacking
                        ? `rgba(203, 213, 225, ${opacity * 0.25})`
                        : `rgba(203, 213, 225, ${opacity * 0.5})`;
                    context.shadowColor = 'transparent';
                    context.shadowBlur = 0;
                    context.fillText(lineText, x, lineY);
                }

                currentY += drawItem.lineHeight;
                if (i < linesToDraw.length - 1) {
                    if (!linesToDraw[i].isBacking && linesToDraw[i + 1].isBacking) {
                        currentY += gapBetween;
                    }
                }
            }
        }

        // Calculate dynamic Y positions for all lyrics to prevent any overlap
        const yPositions = new Array(lyrics.length);
        const heights = new Array(lyrics.length);
        const wrappedLinesArr = new Array(lyrics.length);

        // 1. Calculate height and wrap lines for all lyrics
        for (let j = 0; j < lyrics.length; j++) {
            const lyric = lyrics[j];

            // Wrap lines using a completely static font size (60px) to prevent layout/wrap jitter
            const font = `bold 60px "${currentFont}", sans-serif`;

            const wrapped = getWrappedLines(ctx, lyric, 870, font);
            wrappedLinesArr[j] = wrapped;

            const backingVocalsMode = backingVocalsSelect ? backingVocalsSelect.value : 'styled';
            const useBackingStyle = (backingVocalsMode === 'styled');
            const mainLineHeight = 60 * 1.3;
            const backingLineHeight = (useBackingStyle ? 44 : 60) * 1.3;
            const gapBetween = (wrapped.mainLines.length > 0 && wrapped.backingLines.length > 0) ? 15 : 0;

            heights[j] = wrapped.mainLines.length * mainLineHeight + wrapped.backingLines.length * backingLineHeight + gapBetween;
        }

        // 2. Sequential layout starting at y = 0
        yPositions[0] = 0;
        const gap = 60; // comfortable gap between lyric blocks
        for (let j = 1; j < lyrics.length; j++) {
            yPositions[j] = yPositions[j - 1] + heights[j - 1] / 2 + heights[j] / 2 + gap;
        }

        // 3. Find the y-coordinate of the smoothed index
        const idxFloor = Math.floor(smoothedIndex);
        const idxCeil = Math.ceil(smoothedIndex);
        const fract = smoothedIndex - idxFloor;

        let ySmooth = 0;
        if (idxFloor >= 0 && idxFloor < lyrics.length) {
            const yFloor = yPositions[idxFloor];
            const yCeil = (idxCeil >= 0 && idxCeil < lyrics.length) ? yPositions[idxCeil] : yFloor;
            ySmooth = yFloor + fract * (yCeil - yFloor);
        }

        // 4. Offset all positions so that ySmooth is at centerY
        const offset = centerY - ySmooth;
        for (let j = 0; j < lyrics.length; j++) {
            yPositions[j] += offset;
        }

        // 5. Draw visible lyrics
        const drawRange = 4;
        const smoothCurrentIndex = Math.round(smoothedIndex);
        for (let i = Math.max(0, smoothCurrentIndex - drawRange); i <= Math.min(lyrics.length - 1, smoothCurrentIndex + drawRange); i++) {
            const lyric = lyrics[i];
            const distance = i - smoothedIndex;
            const absDistance = Math.abs(distance);
            const opacity = Math.max(0, 1 - absDistance * 0.25);
            const scale = Math.max(0.7, 1 - absDistance * 0.1);
            const yPos = yPositions[i];

            if (opacity > 0) {
                ctx.save();
                ctx.translate(lyricX, yPos);
                ctx.scale(scale, scale);

                // Use the exact same static 60px font size so scaling is clean and matches wrapping
                ctx.font = `bold 60px "${currentFont}", sans-serif`;

                const weight = Math.max(0, 1 - absDistance);
                ctx.shadowBlur = 20 * opacity * weight;
                ctx.shadowColor = activeGlowColor;

                drawWrappedLines(ctx, lyric, wrappedLinesArr[i], 0, 0, i === currentIndex, currentTime, opacity);
                ctx.restore();
            }
        }
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

        // Setup nodes
        audioSource.connect(audioContext.destination);

        startTime = audioContext.currentTime;
        audioSource.start(0, pausedTime);
        isPlaying = true;
        playBtn.textContent = 'Stop Preview';

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
        playBtn.textContent = 'Preview Video';
        drawFrame(0);

        if (isRecording && mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            statusMessage.textContent = 'Processing video...';
        }
    }

    playBtn.addEventListener('click', () => {
        if (isPlaying) {
            stopPlayback();
        } else {
            startPlayback();
        }
    });

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
        confirmBtn.textContent = `Start Export (${timeLeft}s)`;

        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                confirmBtn.textContent = `Start Export (${timeLeft}s)`;
            } else {
                clearInterval(countdownInterval);
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Start Export';
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

        statusMessage.textContent = 'Recording video... Please wait until audio finishes.';
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
        audioSource.connect(audioContext.destination);

        // Get canvas visual stream with user-selected frame rate
        const fpsSelect = document.getElementById('exportFpsSelect');
        const targetFps = fpsSelect ? parseInt(fpsSelect.value) : 30;
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

            // Set high bitrate depending on frame rate to ensure pristine visual quality
            options.videoBitsPerSecond = targetFps === 60 ? 8500000 : 5000000; // 8.5Mbps vs 5Mbps
            options.audioBitsPerSecond = 256000; // 256kbps audio

            mediaRecorder = new MediaRecorder(combinedStream, options);

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    recordedChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                recordCtx.close(); // Close the isolated recording context
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
                statusMessage.textContent = 'Video generated and downloaded!';
            };

            // Start recording and playback
            mediaRecorder.start();
            startTime = audioContext.currentTime;
            recordSource.start(0);
            audioSource.start(0);
            renderLoop();

        } catch (e) {
            console.error('MediaRecorder error:', e);
            statusMessage.textContent = 'Error starting video recording.';
            isRecording = false;
            exportBtn.disabled = false;
            playBtn.disabled = false;
        }
    }

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
            songBpm: songBpmInput.value,
            credits: credits,
            bgStyle: bgStyleSelect.value,
            font: fontSelect.value,
            lyricColor: lyricColorInput.value,
            glowColor: glowColorInput.value,
            dynamicGlow: dynamicGlowCheckbox.checked,
            backingVocals: backingVocalsSelect ? backingVocalsSelect.value : 'styled',
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
        if (project.songBpm !== undefined) songBpmInput.value = project.songBpm;

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
                bgSubtitle.textContent = 'Click to select or drag image here';
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
                albumSubtitle.textContent = 'Click to select or drag image here';
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

    if (exportProjectBtn) {
        exportProjectBtn.addEventListener('click', () => {
            const project = serializeProjectData(true);
            const dataStr = JSON.stringify(project, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const title = (songTitleInput.value || 'untitled').trim().replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
            const a = document.createElement('a');
            a.href = url;
            a.download = `lyric_project_${title}.json`;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 5000);
        });
    }

    if (importProjectBtn && importProjectFile) {
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
                    isRestoring = true;
                    applyProjectData(project);
                    isRestoring = false;
                    saveProgressToLocalStorage();
                    statusMessage.textContent = 'Project imported successfully.';
                    statusMessage.style.color = '#4ade80';
                } catch (err) {
                    console.error('Failed to parse project file:', err);
                    statusMessage.textContent = 'Error parsing project file. Ensure it is a valid JSON export.';
                    statusMessage.style.color = '#ef4444';
                }
                importProjectFile.value = '';
            };
            reader.readAsText(file);
        });
    }

    // Set up iTunes Search click and keypress handlers
    function performItunesSearch() {
        const query = itunesSearchInput.value.trim();
        if (!query) {
            statusMessage.textContent = 'Please enter a search term.';
            statusMessage.style.color = '#ef4444';
            return;
        }

        statusMessage.textContent = 'Searching iTunes...';
        statusMessage.style.color = '#6366f1';
        itunesSearchResults.innerHTML = '<div style="padding: 0.75rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Searching...</div>';
        itunesSearchResults.style.display = 'block';

        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=5`;

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then(data => {
                itunesSearchResults.innerHTML = '';
                if (!data.results || data.results.length === 0) {
                    itunesSearchResults.innerHTML = '<div style="padding: 0.75rem; text-align: center; color: #ec4899; font-size: 0.85rem;">No results found.</div>';
                    statusMessage.textContent = 'No iTunes results found.';
                    statusMessage.style.color = '#ec4899';
                    return;
                }

                statusMessage.textContent = `Found ${data.results.length} results.`;
                statusMessage.style.color = '#4ade80';

                data.results.forEach(track => {
                    const row = document.createElement('div');
                    row.className = 'itunes-result-row';
                    row.style.display = 'flex';
                    row.style.alignItems = 'center';
                    row.style.gap = '0.75rem';
                    row.style.padding = '0.5rem';
                    row.style.cursor = 'pointer';
                    row.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
                    row.style.transition = 'background 0.2s ease';
                    row.style.boxSizing = 'border-box';
                    row.style.width = '100%';

                    row.addEventListener('mouseenter', () => {
                        row.style.background = 'rgba(99, 102, 241, 0.15)';
                    });
                    row.addEventListener('mouseleave', () => {
                        row.style.background = 'transparent';
                    });

                    // Artwork thumbnail (40x40px)
                    const thumbUrl = track.artworkUrl60 || track.artworkUrl100 || '';
                    const img = document.createElement('img');
                    img.src = thumbUrl;
                    img.style.width = '40px';
                    img.style.height = '40px';
                    img.style.borderRadius = '6px';
                    img.style.objectFit = 'cover';
                    row.appendChild(img);

                    // Details text container
                    const details = document.createElement('div');
                    details.style.flex = '1';
                    details.style.minWidth = '0';
                    details.style.display = 'flex';
                    details.style.flexDirection = 'column';
                    details.style.gap = '0.15rem';

                    // Track title
                    const titleEl = document.createElement('div');
                    titleEl.textContent = track.trackName;
                    titleEl.style.fontWeight = '600';
                    titleEl.style.fontSize = '0.85rem';
                    titleEl.style.color = 'var(--text-main)';
                    titleEl.style.whiteSpace = 'nowrap';
                    titleEl.style.overflow = 'hidden';
                    titleEl.style.textOverflow = 'ellipsis';
                    details.appendChild(titleEl);

                    // Artist & Album
                    const metaEl = document.createElement('div');
                    metaEl.textContent = `${track.artistName} • ${track.collectionName || 'Single'}`;
                    metaEl.style.fontSize = '0.75rem';
                    metaEl.style.color = 'var(--text-muted)';
                    metaEl.style.whiteSpace = 'nowrap';
                    metaEl.style.overflow = 'hidden';
                    metaEl.style.textOverflow = 'ellipsis';
                    details.appendChild(metaEl);

                    row.appendChild(details);

                    // Click handler
                    row.addEventListener('click', () => {
                        songTitleInput.value = track.trackName || '';
                        songArtistInput.value = track.artistName || '';

                        if (track.artworkUrl100) {
                            const highResArt = track.artworkUrl100.replace('100x100bb.jpg', '800x800bb.jpg');
                            albumUrlInput.value = highResArt;
                            albumImageBase64 = null; // Reset base64 since it's a URL
                            loadAlbumFromUrl(highResArt);
                        }

                        // Close results list
                        itunesSearchResults.innerHTML = '';
                        itunesSearchResults.style.display = 'none';

                        statusMessage.textContent = 'Song details and artwork populated from iTunes!';
                        statusMessage.style.color = '#4ade80';

                        saveProgressToLocalStorage();
                        drawFrame(0);

                        // Background fetch lyrics if editor is empty
                        if (!lrcEditor.value.trim()) {
                            fetchLyricsFromYouly(track.trackName, track.artistName, false);
                        }
                    });

                    itunesSearchResults.appendChild(row);
                });
            })
            .catch(err => {
                console.error('iTunes Search Error:', err);
                itunesSearchResults.innerHTML = '<div style="padding: 0.75rem; text-align: center; color: #ef4444; font-size: 0.85rem;">Failed to fetch results from iTunes. Ensure you are online.</div>';
                statusMessage.textContent = 'iTunes lookup failed. Check your internet connection.';
                statusMessage.style.color = '#ef4444';
            });
    }

    if (itunesSearchBtn && itunesSearchInput) {
        itunesSearchBtn.addEventListener('click', performItunesSearch);
        itunesSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performItunesSearch();
            }
        });
    }

    const LYRICS_PLUS_INSTANCES = [
        "https://lyricsplus.binimum.org",
        "https://lyricsplus.prjktla.workers.dev",
        "https://lyricsplus.atomix.one",
        "https://lyricsplus-seven.vercel.app",
        "https://lyrics-plus-backend.vercel.app"
    ];

    // === YouLy+ / LyricsPlus Lyrics Fetching and Parsing Logic ===
    function convertYoulyToText(data) {
        if (!data || !data.lyrics) return '';

        if (data.type === 'Word') {
            // Compile to TTML (V2 format)
            let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
            xml += `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata">\n`;
            xml += `  <body>\n    <div>\n`;

            data.lyrics.forEach(line => {
                const lineStartSec = (line.time / 1000).toFixed(3);
                const lineEndSec = ((line.time + (line.duration || 0)) / 1000).toFixed(3);
                xml += `      <p begin="${lineStartSec}" end="${lineEndSec}">\n`;
                const syllabus = line.syllabus || [];
                if (syllabus.length > 0) {
                    syllabus.forEach(w => {
                        const wStart = (w.time / 1000).toFixed(3);
                        const wEnd = ((w.time + (w.duration || 0)) / 1000).toFixed(3);
                        const escapedText = (w.text || '')
                            .replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;");
                        xml += `        <span begin="${wStart}" end="${wEnd}">${escapedText}</span>\n`;
                    });
                } else {
                    const escapedText = (line.text || '')
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;");
                    xml += `        <span begin="${lineStartSec}" end="${lineEndSec}">${escapedText}</span>\n`;
                }
                xml += `      </p>\n`;
            });

            xml += `    </div>\n  </body>\n</tt>\n`;
            return xml;
        } else if (data.type === 'syllable') {
            // Compile to TTML (V1 format)
            let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
            xml += `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata">\n`;
            xml += `  <body>\n    <div>\n`;

            // Group words into lines using `isLineEnding`
            let currentLineWords = [];
            const lines = [];

            data.lyrics.forEach(word => {
                currentLineWords.push(word);
                if (word.isLineEnding || word.isLineEnding === 1 || word.isLineEnding === true) {
                    lines.push(currentLineWords);
                    currentLineWords = [];
                }
            });

            // Add remaining words if any
            if (currentLineWords.length > 0) {
                lines.push(currentLineWords);
            }

            lines.forEach(lineWords => {
                if (lineWords.length === 0) return;
                const firstWord = lineWords[0];
                const lineStartSec = (firstWord.time / 1000).toFixed(3);
                const lastWord = lineWords[lineWords.length - 1];
                const lineEndSec = ((lastWord.time + (lastWord.duration || 0)) / 1000).toFixed(3);

                xml += `      <p begin="${lineStartSec}" end="${lineEndSec}">\n`;
                lineWords.forEach(w => {
                    const wStart = (w.time / 1000).toFixed(3);
                    const wEnd = ((w.time + (w.duration || 0)) / 1000).toFixed(3);
                    const escapedText = (w.text || '')
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;");
                    xml += `        <span begin="${wStart}" end="${wEnd}">${escapedText}</span>\n`;
                });
                xml += `      </p>\n`;
            });

            xml += `    </div>\n  </body>\n</tt>\n`;
            return xml;
        } else {
            // Line-by-line synced lyrics. Compile to LRC
            let lrc = '';
            data.lyrics.forEach(line => {
                const totalSeconds = line.time / 1000;
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = Math.floor(totalSeconds % 60);
                const hundredths = Math.floor((totalSeconds % 1) * 100);

                const mStr = String(minutes).padStart(2, '0');
                const sStr = String(seconds).padStart(2, '0');
                const hStr = String(hundredths).padStart(2, '0');

                lrc += `[${mStr}:${sStr}.${hStr}]${line.text || ''}\n`;
            });
            return lrc;
        }
    }

    async function fetchLyricsWithFallback(title, artist) {
        const queryParams = `title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist || '')}`;

        for (const base of LYRICS_PLUS_INSTANCES) {
            for (const ver of ["v2", "v1"]) {
                const url = `${base}/${ver}/lyrics/get?${queryParams}`;
                try {
                    console.log(`Trying YouLy+/LyricsPlus instance: ${url}`);
                    const res = await fetch(url);
                    if (!res.ok) {
                        console.warn(`Instance ${base} (${ver}) returned status ${res.status}`);
                        continue;
                    }
                    const data = await res.json();
                    if (data && data.lyrics && data.lyrics.length > 0) {
                        return { data, url };
                    } else {
                        console.warn(`Instance ${base} (${ver}) returned empty or missing lyrics array.`);
                    }
                } catch (err) {
                    console.warn(`Fetch error for ${url}:`, err.message);
                }
            }
        }
        throw new Error('No synced lyrics could be found on any YouLy+/LyricsPlus instances.');
    }

    async function fetchLyricsFromYouly(title, artist, forceManual) {
        if (!title) {
            statusMessage.textContent = 'Please enter a Song Title first.';
            statusMessage.style.color = '#ef4444';
            return;
        }

        // Overwrite Protection Check
        if (lrcEditor.value.trim()) {
            if (forceManual) {
                if (!confirm("This will overwrite the current lyrics in the editor. Are you sure you want to proceed?")) {
                    return;
                }
            } else {
                // Background fetch triggered by selecting iTunes result.
                // Do not overwrite existing lyrics automatically.
                return;
            }
        }

        if (forceManual && fetchYoulyLyricsBtn) {
            fetchYoulyLyricsBtn.disabled = true;
            fetchYoulyLyricsBtn.textContent = '⏳ Fetching Lyrics...';
        }

        statusMessage.textContent = `Searching synced lyrics for "${title}" on YouLy+/LyricsPlus...`;
        statusMessage.style.color = '#6366f1';

        try {
            const { data, url } = await fetchLyricsWithFallback(title, artist);
            const lyricsText = convertYoulyToText(data);
            lrcEditor.value = lyricsText;
            updateLyricsFromEditor();
            saveProgressToLocalStorage();

            statusMessage.textContent = `Successfully loaded ${data.type === 'Word' ? 'word-synced (TTML)' : 'line-synced (LRC)'} lyrics from YouLy+/LyricsPlus!`;
            statusMessage.style.color = '#4ade80';
        } catch (err) {
            console.warn('YouLy+/LyricsPlus Lyrics Fetch failed:', err);
            if (forceManual) {
                statusMessage.textContent = err.message || 'Failed to retrieve lyrics from YouLy+/LyricsPlus.';
                statusMessage.style.color = '#ef4444';
            } else {
                // Decoupled background fetch error does not discard iTunes metadata success status
                statusMessage.textContent = 'Song details and artwork loaded. (No synced lyrics found on YouLy+/LyricsPlus)';
                statusMessage.style.color = '#ec4899';
            }
        } finally {
            if (fetchYoulyLyricsBtn) {
                fetchYoulyLyricsBtn.disabled = false;
                fetchYoulyLyricsBtn.textContent = '🔍 Fetch Synced Lyrics from YouLy+';
            }
        }
    }

    if (fetchYoulyLyricsBtn) {
        fetchYoulyLyricsBtn.addEventListener('click', () => {
            fetchLyricsFromYouly(songTitleInput.value, songArtistInput.value, true);
        });
    }

    // Load auto-save project data if present
    restoreProgressFromLocalStorage();

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
});
