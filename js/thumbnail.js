/* Thumbnail Generator & Post-Download Thumbnail Prompt */

const ThumbnailGenerator = {
    isOpen: false,
    promptOpen: false,
    settings: {
        layout: 'split',        // 'split', 'hero', 'quote', 'canvas'
        badgeText: 'LYRIC VIDEO',
        quoteIndex: -1,         // -1 = auto best line, -2 = custom quote, -3 = none, >=0 = lyric index
        customQuote: '',
        showSubText: true,
        showWatermark: false,
        vignette: 0.45,
        format: 'png',          // 'png' or 'jpeg'
        resolution: '1080p'     // '1080p' (1920x1080) or '720p' (1280x720)
    },

    init() {
        const openBtn = document.getElementById('openThumbnailBtn');
        if (openBtn) {
            openBtn.addEventListener('click', () => this.openGenerator());
        }

        // Post-download Prompt Modal buttons
        const promptYesBtn = document.getElementById('thumbPromptYesBtn');
        const promptQuickBtn = document.getElementById('thumbPromptQuickDownloadBtn');
        const promptNoBtn = document.getElementById('thumbPromptNoBtn');
        const promptModal = document.getElementById('thumbnailPromptModal');

        if (promptYesBtn) {
            promptYesBtn.addEventListener('click', () => {
                this.closePrompt();
                this.openGenerator();
            });
        }
        if (promptQuickBtn) {
            promptQuickBtn.addEventListener('click', () => {
                this.downloadThumbnail();
                this.closePrompt();
            });
        }
        if (promptNoBtn) {
            promptNoBtn.addEventListener('click', () => this.closePrompt());
        }
        if (promptModal) {
            promptModal.addEventListener('click', (e) => {
                if (e.target === promptModal) this.closePrompt();
            });
        }

        // Full Thumbnail Generator Modal controls
        const genModal = document.getElementById('thumbnailGeneratorModal');
        const closeGenBtn = document.getElementById('closeThumbnailGenBtn');
        const cancelGenBtn = document.getElementById('cancelThumbnailGenBtn');
        const downloadGenBtn = document.getElementById('downloadThumbnailBtn');

        if (closeGenBtn) closeGenBtn.addEventListener('click', () => this.closeGenerator());
        if (cancelGenBtn) cancelGenBtn.addEventListener('click', () => this.closeGenerator());
        if (downloadGenBtn) downloadGenBtn.addEventListener('click', () => this.downloadThumbnail());
        if (genModal) {
            genModal.addEventListener('click', (e) => {
                if (e.target === genModal) this.closeGenerator();
            });
        }

        // Layout pills
        const layoutBtns = document.querySelectorAll('[data-thumb-layout]');
        layoutBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const layout = btn.getAttribute('data-thumb-layout');
                this.setLayout(layout);
            });
        });

        // Inputs inside Generator Modal
        const badgeInput = document.getElementById('thumbBadgeInput');
        const quoteSelect = document.getElementById('thumbQuoteSelect');
        const includeQuoteCheckbox = document.getElementById('thumbIncludeQuoteCheckbox');
        const customQuoteInput = document.getElementById('thumbCustomQuoteInput');
        const customQuoteGroup = document.getElementById('thumbCustomQuoteGroup');
        const subTextCheck = document.getElementById('thumbShowSubText');
        const watermarkCheck = document.getElementById('thumbShowWatermark');
        const vignetteSlider = document.getElementById('thumbVignetteSlider');
        const vignetteVal = document.getElementById('thumbVignetteValue');
        const resSelect = document.getElementById('thumbResSelect');
        const formatSelect = document.getElementById('thumbFormatSelect');

        if (badgeInput) {
            badgeInput.addEventListener('input', (e) => {
                this.settings.badgeText = e.target.value;
                this.renderPreview();
            });
        }

        if (includeQuoteCheckbox) {
            includeQuoteCheckbox.addEventListener('change', (e) => {
                if (!e.target.checked) {
                    if (this.settings.quoteIndex !== -3) {
                        this._lastQuoteIndex = this.settings.quoteIndex;
                    }
                    this.settings.quoteIndex = -3;
                    if (quoteSelect) quoteSelect.value = '-3';
                    if (customQuoteGroup) customQuoteGroup.style.display = 'none';
                } else {
                    this.settings.quoteIndex = (typeof this._lastQuoteIndex === 'number' && this._lastQuoteIndex !== -3) ? this._lastQuoteIndex : -1;
                    if (quoteSelect) quoteSelect.value = String(this.settings.quoteIndex);
                    if (customQuoteGroup) {
                        customQuoteGroup.style.display = (this.settings.quoteIndex === -2) ? 'flex' : 'none';
                    }
                }
                this.renderPreview();
            });
        }

        if (quoteSelect) {
            quoteSelect.addEventListener('change', (e) => {
                const val = parseInt(e.target.value, 10);
                this.settings.quoteIndex = isNaN(val) ? -1 : val;
                if (includeQuoteCheckbox) {
                    includeQuoteCheckbox.checked = (this.settings.quoteIndex !== -3);
                }
                if (customQuoteGroup) {
                    customQuoteGroup.style.display = (this.settings.quoteIndex === -2) ? 'flex' : 'none';
                }
                this.renderPreview();
            });
        }

        if (customQuoteInput) {
            customQuoteInput.addEventListener('input', (e) => {
                this.settings.customQuote = e.target.value;
                this.renderPreview();
            });
        }

        if (subTextCheck) {
            subTextCheck.addEventListener('change', (e) => {
                this.settings.showSubText = e.target.checked;
                this.renderPreview();
            });
        }

        if (watermarkCheck) {
            watermarkCheck.addEventListener('change', (e) => {
                this.settings.showWatermark = e.target.checked;
                this.renderPreview();
            });
        }

        if (vignetteSlider) {
            vignetteSlider.addEventListener('input', (e) => {
                this.settings.vignette = parseFloat(e.target.value) || 0;
                if (vignetteVal) vignetteVal.textContent = `${Math.round(this.settings.vignette * 100)}%`;
                this.renderPreview();
            });
        }

        if (resSelect) {
            resSelect.addEventListener('change', (e) => {
                this.settings.resolution = e.target.value || '1080p';
            });
        }

        if (formatSelect) {
            formatSelect.addEventListener('change', (e) => {
                this.settings.format = e.target.value || 'png';
            });
        }
    },

    setLayout(layout) {
        this.settings.layout = layout || 'split';
        const layoutBtns = document.querySelectorAll('[data-thumb-layout]');
        layoutBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-thumb-layout') === this.settings.layout);
        });
        this.renderPreview();
    },

    /**
     * Picks the best default lyric line for a thumbnail quote (skips empty/instrumental lines).
     */
    getBestLyricQuote(lyricsList) {
        const list = Array.isArray(lyricsList) ? lyricsList : (typeof lyrics !== 'undefined' ? lyrics : []);
        if (!list || list.length === 0) return null;

        // Filter out instrumental/credit/very short lines
        const candidates = [];
        for (let i = 0; i < list.length; i++) {
            const line = list[i];
            const text = String(line && line.text ? line.text : '').trim();
            if (!text || text === '•••' || text === '...') continue;
            if (/^[\[(♪♫🎵🎶]+$/.test(text)) continue;
            candidates.push({ index: i, line, length: text.length });
        }

        if (candidates.length === 0) return { index: 0, line: list[0] };

        // Prefer a punchy line near 25%-60% of the song with medium length (12-55 chars)
        const sweetSpot = candidates.filter(c => c.length >= 10 && c.length <= 55);
        const pool = sweetSpot.length > 0 ? sweetSpot : candidates;
        const targetPos = Math.min(pool.length - 1, Math.floor(pool.length * 0.35));
        return pool[targetPos];
    },

    getSelectedQuoteObject(lyricsList) {
        const list = Array.isArray(lyricsList) ? lyricsList : (typeof lyrics !== 'undefined' ? lyrics : []);
        const idx = this.settings.quoteIndex;

        if (idx === -3) {
            return { text: '', subText: '', words: [] };
        }
        if (idx === -2) {
            return { text: (this.settings.customQuote || '').trim(), subText: '', words: [] };
        }
        if (idx >= 0 && idx < list.length && list[idx]) {
            const l = list[idx];
            return {
                text: String(l.text || '').trim(),
                subText: String(l.subText || l.translation || '').trim(),
                words: Array.isArray(l.words) ? l.words : []
            };
        }
        const best = this.getBestLyricQuote(list);
        if (best && best.line) {
            return {
                text: String(best.line.text || '').trim(),
                subText: String(best.line.subText || best.line.translation || '').trim(),
                words: Array.isArray(best.line.words) ? best.line.words : []
            };
        }
        return { text: '', subText: '', words: [] };
    },

    populateQuoteSelect() {
        const quoteSelect = document.getElementById('thumbQuoteSelect');
        if (!quoteSelect) return;

        const prevVal = this.settings.quoteIndex;
        quoteSelect.innerHTML = '';

        const optAuto = document.createElement('option');
        optAuto.value = '-1';
        optAuto.textContent = '✨ Auto-Pick Best Lyric Line';
        quoteSelect.appendChild(optAuto);

        const optCustom = document.createElement('option');
        optCustom.value = '-2';
        optCustom.textContent = '✍️ Custom Text / Hook...';
        quoteSelect.appendChild(optCustom);

        const optNone = document.createElement('option');
        optNone.value = '-3';
        optNone.textContent = '🚫 Hide Lyric Quote (Title & Art Only)';
        quoteSelect.appendChild(optNone);

        const list = (typeof lyrics !== 'undefined' && Array.isArray(lyrics)) ? lyrics : [];
        list.forEach((line, idx) => {
            const text = String(line && line.text ? line.text : '').trim();
            if (!text) return;
            const opt = document.createElement('option');
            opt.value = String(idx);
            const timeLabel = typeof formatDuration === 'function' ? formatDuration(line.time || 0) : `${Math.floor(line.time || 0)}s`;
            const previewText = text.length > 48 ? text.slice(0, 46) + '…' : text;
            opt.textContent = `[${timeLabel}] ${previewText}`;
            quoteSelect.appendChild(opt);
        });

        quoteSelect.value = String(prevVal);
        if (!quoteSelect.value) {
            this.settings.quoteIndex = -1;
            quoteSelect.value = '-1';
        }

        const includeQuoteCheckbox = document.getElementById('thumbIncludeQuoteCheckbox');
        if (includeQuoteCheckbox) {
            includeQuoteCheckbox.checked = (this.settings.quoteIndex !== -3);
        }
    },

    /**
     * Opens the post-download prompt asking the user if they want to generate a thumbnail.
     */
    promptAfterVideoDownload() {
        const promptModal = document.getElementById('thumbnailPromptModal');
        if (!promptModal) return;

        this.promptOpen = true;
        promptModal.classList.add('active');

        const promptCanvas = document.getElementById('thumbPromptPreviewCanvas');
        if (promptCanvas) {
            this.renderThumbnailToCanvas(promptCanvas);
        }
    },

    closePrompt() {
        const promptModal = document.getElementById('thumbnailPromptModal');
        if (promptModal) promptModal.classList.remove('active');
        this.promptOpen = false;
    },

    openGenerator() {
        const genModal = document.getElementById('thumbnailGeneratorModal');
        if (!genModal) return;

        this.populateQuoteSelect();
        this.isOpen = true;
        genModal.classList.add('active');
        this.renderPreview();
    },

    closeGenerator() {
        const genModal = document.getElementById('thumbnailGeneratorModal');
        if (genModal) genModal.classList.remove('active');
        this.isOpen = false;
    },

    renderPreview() {
        const previewCanvas = document.getElementById('thumbnailPreviewCanvas');
        if (previewCanvas) {
            this.renderThumbnailToCanvas(previewCanvas);
        }
        const promptCanvas = document.getElementById('thumbPromptPreviewCanvas');
        if (promptCanvas && this.promptOpen) {
            this.renderThumbnailToCanvas(promptCanvas);
        }
    },

    /**
     * Draws the background (using the user's current background image, album blur, Material You palette, or gradient).
     */
    drawThumbnailBackground(tCtx, W, H, accentColor) {
        if (typeof bgImage !== 'undefined' && bgImage) {
            const scale = Math.max(W / bgImage.width, H / bgImage.height);
            const x = (W / 2) - (bgImage.width / 2) * scale;
            const y = (H / 2) - (bgImage.height / 2) * scale;
            tCtx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);
        } else if (typeof albumImage !== 'undefined' && albumImage && (typeof currentBgStyle !== 'undefined' && currentBgStyle === 'albumBlur')) {
            const scale = Math.max(W / albumImage.width, H / albumImage.height);
            const x = (W / 2) - (albumImage.width / 2) * scale;
            const y = (H / 2) - (albumImage.height / 2) * scale;
            tCtx.save();
            tCtx.filter = 'blur(55px) brightness(0.42) saturate(1.25)';
            tCtx.drawImage(albumImage, x - 100, y - 100, (albumImage.width * scale) + 200, (albumImage.height * scale) + 200);
            tCtx.restore();
        } else if (typeof albumPalette !== 'undefined' && albumPalette && albumPalette.length >= 2) {
            const c0 = albumPalette[0];
            const c1 = albumPalette[1 % albumPalette.length];
            const c2 = albumPalette[2 % albumPalette.length];
            const darken = (c, f) => `rgb(${Math.round(c.r * f)}, ${Math.round(c.g * f)}, ${Math.round(c.b * f)})`;

            const radGrad = tCtx.createRadialGradient(W * 0.28, H * 0.48, 0, W * 0.5, H * 0.5, W * 0.85);
            radGrad.addColorStop(0, darken(c0, 0.55));
            radGrad.addColorStop(0.55, darken(c1, 0.34));
            radGrad.addColorStop(1, darken(c2, 0.16));
            tCtx.fillStyle = radGrad;
            tCtx.fillRect(0, 0, W, H);

            const orbs = [
                { x: W * 0.18, y: H * 0.28, r: 560, c: c0, a: 0.38 },
                { x: W * 0.78, y: H * 0.65, r: 640, c: c1, a: 0.32 },
                { x: W * 0.52, y: H * 0.15, r: 420, c: c2, a: 0.25 }
            ];
            for (const orb of orbs) {
                const orbGrad = tCtx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
                orbGrad.addColorStop(0, `rgba(${orb.c.r}, ${orb.c.g}, ${orb.c.b}, ${orb.a})`);
                orbGrad.addColorStop(1, `rgba(${orb.c.r}, ${orb.c.g}, ${orb.c.b}, 0)`);
                tCtx.fillStyle = orbGrad;
                tCtx.fillRect(0, 0, W, H);
            }
        } else if (typeof albumImage !== 'undefined' && albumImage) {
            const scale = Math.max(W / albumImage.width, H / albumImage.height);
            const x = (W / 2) - (albumImage.width / 2) * scale;
            const y = (H / 2) - (albumImage.height / 2) * scale;
            tCtx.save();
            tCtx.filter = 'blur(60px) brightness(0.4) saturate(1.2)';
            tCtx.drawImage(albumImage, x - 100, y - 100, (albumImage.width * scale) + 200, (albumImage.height * scale) + 200);
            tCtx.restore();
        } else {
            const grad = tCtx.createLinearGradient(0, 0, W, H);
            grad.addColorStop(0, '#131629');
            grad.addColorStop(0.5, '#1e1b4b');
            grad.addColorStop(1, '#0f101a');
            tCtx.fillStyle = grad;
            tCtx.fillRect(0, 0, W, H);

            // Ambient glow orb
            const orbGrad = tCtx.createRadialGradient(W * 0.7, H * 0.4, 0, W * 0.7, H * 0.4, 650);
            orbGrad.addColorStop(0, 'rgba(99, 102, 241, 0.28)');
            orbGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');
            tCtx.fillStyle = orbGrad;
            tCtx.fillRect(0, 0, W, H);
        }

        // Apply cinematic vignette & darkening overlay
        const vig = Math.max(0, Math.min(0.9, this.settings.vignette));
        if (vig > 0) {
            tCtx.fillStyle = `rgba(6, 8, 15, ${vig * 0.65})`;
            tCtx.fillRect(0, 0, W, H);

            const radVig = tCtx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.75);
            radVig.addColorStop(0, 'rgba(0, 0, 0, 0)');
            radVig.addColorStop(1, `rgba(0, 0, 0, ${vig * 0.85})`);
            tCtx.fillStyle = radVig;
            tCtx.fillRect(0, 0, W, H);
        }
    },

    /**
     * Wraps plain text into lines that fit within maxWidth.
     */
    wrapTextLines(tCtx, text, maxWidth) {
        if (!text) return [];
        const rawWords = text.split(/\s+/).filter(Boolean);
        // Handle CJK strings without spaces
        const tokens = [];
        for (const rw of rawWords) {
            if (rw.length > 8 && /[\u3000-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(rw)) {
                for (const ch of Array.from(rw)) tokens.push(ch);
            } else {
                tokens.push(rw + ' ');
            }
        }

        const lines = [];
        let current = '';
        for (let i = 0; i < tokens.length; i++) {
            const test = current + tokens[i];
            if (tCtx.measureText(test.trim()).width > maxWidth && current.trim().length > 0) {
                lines.push(current.trim());
                current = tokens[i];
            } else {
                current = test;
            }
        }
        if (current.trim().length > 0) {
            lines.push(current.trim());
        }
        return lines;
    },

    /**
     * Renders a pill badge (e.g. "LYRIC VIDEO") at (x, y).
     */
    drawBadgePill(tCtx, badgeText, x, y, align, accentColor, fontFamily) {
        const clean = String(badgeText || '').trim();
        if (!clean) return 0;

        tCtx.save();
        tCtx.font = `800 22px "${fontFamily}", sans-serif`;
        const textW = tCtx.measureText(clean.toUpperCase()).width;
        const padX = 24;
        const pillH = 46;
        const pillW = textW + padX * 2;
        const drawX = align === 'center' ? (x - pillW / 2) : (align === 'right' ? x - pillW : x);

        tCtx.beginPath();
        tCtx.roundRect(drawX, y, pillW, pillH, 23);
        tCtx.fillStyle = accentColor || '#6366f1';
        tCtx.shadowColor = accentColor || 'rgba(99, 102, 241, 0.6)';
        tCtx.shadowBlur = 22;
        tCtx.fill();

        tCtx.shadowBlur = 0;
        tCtx.fillStyle = '#ffffff';
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        tCtx.fillText(clean.toUpperCase(), drawX + pillW / 2, y + pillH / 2 + 1);
        tCtx.restore();

        return pillH;
    },

    /**
     * Renders the full 1920x1080 thumbnail scene onto targetCanvas.
     */
    renderThumbnailToCanvas(targetCanvas, customWidth, customHeight) {
        if (!targetCanvas) return;
        const tCtx = targetCanvas.getContext('2d');
        if (!tCtx) return;

        const renderW = 1920;
        const renderH = 1080;
        if (customWidth && customHeight) {
            targetCanvas.width = customWidth;
            targetCanvas.height = customHeight;
        }

        const scaleX = targetCanvas.width / renderW;
        const scaleY = targetCanvas.height / renderH;

        tCtx.save();
        tCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        if (scaleX !== 1 || scaleY !== 1) {
            tCtx.scale(scaleX, scaleY);
        }

        const fontFamily = (typeof currentFont !== 'undefined' && currentFont) ? currentFont : 'Outfit';
        const textColor = (typeof currentLyricColor !== 'undefined' && currentLyricColor) ? currentLyricColor : '#ffffff';
        let accentColor = (typeof currentGlowColor !== 'undefined' && currentGlowColor) ? currentGlowColor : '#6366f1';

        if (typeof albumPalette !== 'undefined' && albumPalette && albumPalette.length > 0 &&
            typeof dynamicGlowCheckbox !== 'undefined' && dynamicGlowCheckbox && dynamicGlowCheckbox.checked &&
            typeof adjustColorForReadability === 'function') {
            const c = albumPalette[0];
            const adj = adjustColorForReadability(c.r, c.g, c.b, 0.62, 0.92, 0.55);
            accentColor = `rgb(${adj.r}, ${adj.g}, ${adj.b})`;
        }

        const songTitle = (typeof songTitleInput !== 'undefined' && songTitleInput && songTitleInput.value.trim())
            ? songTitleInput.value.trim()
            : 'Untitled Song';
        const songArtist = (typeof songArtistInput !== 'undefined' && songArtistInput && songArtistInput.value.trim())
            ? songArtistInput.value.trim()
            : '';
        const hasAlbum = typeof albumImage !== 'undefined' && !!albumImage;
        const quoteObj = this.getSelectedQuoteObject();
        const layout = this.settings.layout || 'split';

        // If 'canvas' snapshot layout is selected, draw current live video canvas frame directly
        if (layout === 'canvas' && typeof canvas !== 'undefined' && canvas) {
            const playhead = typeof getPlayheadTime === 'function' ? getPlayheadTime() : (typeof pausedTime !== 'undefined' ? pausedTime : 0);
            if (typeof drawFrame === 'function') {
                drawFrame(playhead);
            }
            tCtx.drawImage(canvas, 0, 0, renderW, renderH);
            if (this.settings.badgeText && this.settings.badgeText.trim()) {
                this.drawBadgePill(tCtx, this.settings.badgeText, renderW - 70, 60, 'right', accentColor, fontFamily);
            }
            tCtx.restore();
            return;
        }

        // 1. Draw Background
        this.drawThumbnailBackground(tCtx, renderW, renderH, accentColor);

        // 2. Decorative Subtle Frame Border
        tCtx.save();
        tCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        tCtx.lineWidth = 2;
        tCtx.beginPath();
        tCtx.roundRect(36, 36, renderW - 72, renderH - 72, 28);
        tCtx.stroke();
        tCtx.restore();

        // 3. Layout-Specific Composition
        if (layout === 'split') {
            const artSize = 620;
            const artX = hasAlbum ? 140 : 0;
            const artY = (renderH - artSize) / 2;

            if (hasAlbum) {
                tCtx.save();
                tCtx.shadowColor = 'rgba(0, 0, 0, 0.65)';
                tCtx.shadowBlur = 55;
                tCtx.shadowOffsetY = 18;
                tCtx.beginPath();
                tCtx.roundRect(artX, artY, artSize, artSize, 36);
                tCtx.clip();
                tCtx.drawImage(albumImage, artX, artY, artSize, artSize);
                tCtx.restore();

                // Subtle glass border on artwork
                tCtx.save();
                tCtx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
                tCtx.lineWidth = 3;
                tCtx.beginPath();
                tCtx.roundRect(artX, artY, artSize, artSize, 36);
                tCtx.stroke();
                tCtx.restore();
            }

            const rightX = hasAlbum ? 840 : 160;
            const maxW = hasAlbum ? (renderW - rightX - 120) : (renderW - 320);

            // Pre-calculate vertical stack height to center nicely on the right
            tCtx.font = `800 84px "${fontFamily}", sans-serif`;
            const titleLines = this.wrapTextLines(tCtx, songTitle, maxW).slice(0, 3);
            const titleLineH = 96;

            tCtx.font = `700 46px "${fontFamily}", sans-serif`;
            const quoteTextFormatted = quoteObj.text ? `“${quoteObj.text}”` : '';
            const quoteLines = quoteTextFormatted ? this.wrapTextLines(tCtx, quoteTextFormatted, maxW - 36).slice(0, 3) : [];
            const quoteLineH = 60;

            let totalH = 0;
            if (this.settings.badgeText && this.settings.badgeText.trim()) totalH += 46 + 26;
            totalH += titleLines.length * titleLineH;
            if (songArtist) totalH += 16 + 52;
            if (quoteLines.length > 0) {
                totalH += 42 + (quoteLines.length * quoteLineH);
                if (this.settings.showSubText && quoteObj.subText) totalH += 44;
            }

            let curY = Math.max(110, (renderH - totalH) / 2);

            // Badge
            if (this.settings.badgeText && this.settings.badgeText.trim()) {
                this.drawBadgePill(tCtx, this.settings.badgeText, rightX, curY, 'left', accentColor, fontFamily);
                curY += 46 + 26;
            }

            // Song Title
            tCtx.save();
            tCtx.font = `800 84px "${fontFamily}", sans-serif`;
            tCtx.fillStyle = '#ffffff';
            tCtx.textAlign = 'left';
            tCtx.textBaseline = 'top';
            tCtx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            tCtx.shadowBlur = 24;
            for (const tLine of titleLines) {
                tCtx.fillText(tLine, rightX, curY, maxW);
                curY += titleLineH;
            }
            tCtx.restore();

            // Artist Name
            if (songArtist) {
                curY += 10;
                tCtx.save();
                tCtx.font = `600 44px "${fontFamily}", sans-serif`;
                tCtx.fillStyle = 'rgba(255, 255, 255, 0.78)';
                tCtx.textAlign = 'left';
                tCtx.textBaseline = 'top';
                tCtx.shadowColor = 'rgba(0, 0, 0, 0.6)';
                tCtx.shadowBlur = 14;
                tCtx.fillText(songArtist, rightX, curY, maxW);
                tCtx.restore();
                curY += 58;
            }

            // Lyric Quote Block with Accent Bar
            if (quoteLines.length > 0) {
                curY += 34;
                const blockH = (quoteLines.length * quoteLineH) + (this.settings.showSubText && quoteObj.subText ? 44 : 0) + 12;

                // Vertical accent bar
                tCtx.save();
                tCtx.fillStyle = accentColor;
                tCtx.shadowColor = accentColor;
                tCtx.shadowBlur = 18;
                tCtx.beginPath();
                tCtx.roundRect(rightX, curY - 4, 8, blockH, 4);
                tCtx.fill();
                tCtx.restore();

                tCtx.save();
                tCtx.font = `700 46px "${fontFamily}", sans-serif`;
                tCtx.fillStyle = textColor;
                tCtx.textAlign = 'left';
                tCtx.textBaseline = 'top';
                tCtx.shadowColor = accentColor;
                tCtx.shadowBlur = 20;
                for (const qLine of quoteLines) {
                    tCtx.fillText(qLine, rightX + 30, curY, maxW - 36);
                    curY += quoteLineH;
                }

                if (this.settings.showSubText && quoteObj.subText) {
                    curY += 6;
                    tCtx.font = `500 30px "${fontFamily}", sans-serif`;
                    tCtx.fillStyle = 'rgba(255, 255, 255, 0.68)';
                    tCtx.shadowBlur = 8;
                    tCtx.fillText(quoteObj.subText, rightX + 30, curY, maxW - 36);
                }
                tCtx.restore();
            }
        } else if (layout === 'hero') {
            // Centered Hero Card Layout - Vertically and horizontally centers all active elements dynamically
            const centerX = renderW / 2;
            const hasBadge = !!(this.settings.badgeText && this.settings.badgeText.trim());
            const hasQuote = !!(quoteObj && quoteObj.text && quoteObj.text.trim());

            // 1. Measure and wrap Title
            tCtx.save();
            tCtx.font = `800 82px "${fontFamily}", sans-serif`;
            const titleLines = this.wrapTextLines(tCtx, songTitle, 1500).slice(0, 2);
            tCtx.restore();

            // 2. Measure and wrap Quote if present
            let quoteLines = [];
            if (hasQuote) {
                tCtx.save();
                tCtx.font = `700 40px "${fontFamily}", sans-serif`;
                quoteLines = this.wrapTextLines(tCtx, `“${quoteObj.text}”`, 1500).slice(0, 2);
                tCtx.restore();
            }

            // 3. Compute accurate bounding heights for dynamic vertical centering
            const badgeH = hasBadge ? 46 : 0;
            const badgeGap = hasBadge ? 28 : 0;

            let artSize = 420;
            if (hasAlbum && !hasQuote && !songArtist) {
                // If only album art and title are present, give the artwork a bit more presence
                artSize = 480;
            }
            const artH = hasAlbum ? artSize : 0;
            const artGap = hasAlbum ? 34 : 0;

            const titleLineH = 92;
            const titleH = titleLines.length * titleLineH;
            const artistH = songArtist ? 52 : 0;
            const artistGap = songArtist ? 10 : 0;

            const quoteLineH = 50;
            const quoteH = hasQuote ? (quoteLines.length * quoteLineH) : 0;
            const quoteGap = hasQuote ? 22 : 0;

            const totalStackH = badgeH + badgeGap + artH + artGap + titleH + artistGap + artistH + quoteGap + quoteH;
            let curY = Math.max(60, (renderH - totalStackH) / 2);

            // Draw Badge
            if (hasBadge) {
                this.drawBadgePill(tCtx, this.settings.badgeText, centerX, curY, 'center', accentColor, fontFamily);
                curY += badgeH + badgeGap;
            }

            // Draw Album Art
            if (hasAlbum) {
                const artX = centerX - artSize / 2;
                tCtx.save();
                tCtx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                tCtx.shadowBlur = 50;
                tCtx.shadowOffsetY = 16;
                tCtx.beginPath();
                tCtx.roundRect(artX, curY, artSize, artSize, 32);
                tCtx.clip();
                tCtx.drawImage(albumImage, artX, curY, artSize, artSize);
                tCtx.restore();

                tCtx.save();
                tCtx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
                tCtx.lineWidth = 2.5;
                tCtx.beginPath();
                tCtx.roundRect(artX, curY, artSize, artSize, 32);
                tCtx.stroke();
                tCtx.restore();

                curY += artH + artGap;
            }

            // Draw Song Title Centered
            tCtx.save();
            tCtx.font = `800 82px "${fontFamily}", sans-serif`;
            tCtx.fillStyle = '#ffffff';
            tCtx.textAlign = 'center';
            tCtx.textBaseline = 'top';
            tCtx.shadowColor = 'rgba(0, 0, 0, 0.75)';
            tCtx.shadowBlur = 24;
            for (const tLine of titleLines) {
                tCtx.fillText(tLine, centerX, curY, 1500);
                curY += titleLineH;
            }
            tCtx.restore();

            // Draw Artist Name
            if (songArtist) {
                curY += artistGap;
                tCtx.save();
                tCtx.font = `600 42px "${fontFamily}", sans-serif`;
                tCtx.fillStyle = 'rgba(255, 255, 255, 0.78)';
                tCtx.textAlign = 'center';
                tCtx.textBaseline = 'top';
                tCtx.shadowColor = 'rgba(0, 0, 0, 0.6)';
                tCtx.shadowBlur = 14;
                tCtx.fillText(songArtist, centerX, curY, 1400);
                tCtx.restore();
                curY += artistH;
            }

            // Draw Quote if enabled
            if (hasQuote && quoteLines.length > 0) {
                curY += quoteGap;
                tCtx.save();
                tCtx.font = `700 40px "${fontFamily}", sans-serif`;
                tCtx.fillStyle = textColor;
                tCtx.textAlign = 'center';
                tCtx.textBaseline = 'top';
                tCtx.shadowColor = accentColor;
                tCtx.shadowBlur = 20;
                for (const qLine of quoteLines) {
                    tCtx.fillText(qLine, centerX, curY, 1500);
                    curY += quoteLineH;
                }
                tCtx.restore();
            }
        } else if (layout === 'quote') {
            // Lyric Quote Spotlight Layout (Big center quote + bottom metadata bar)
            const centerX = renderW / 2;
            const maxQuoteW = 1520;

            if (this.settings.badgeText && this.settings.badgeText.trim()) {
                this.drawBadgePill(tCtx, this.settings.badgeText, centerX, 95, 'center', accentColor, fontFamily);
            }

            const mainQuote = quoteObj.text || songTitle;
            tCtx.save();
            tCtx.font = `800 86px "${fontFamily}", sans-serif`;
            const qLines = this.wrapTextLines(tCtx, `“${mainQuote}”`, maxQuoteW).slice(0, 4);
            const qLineH = 104;
            const subH = (this.settings.showSubText && quoteObj.subText) ? 60 : 0;
            let quoteY = (renderH - 160 - (qLines.length * qLineH + subH)) / 2;
            quoteY = Math.max(175, quoteY);

            tCtx.fillStyle = textColor;
            tCtx.textAlign = 'center';
            tCtx.textBaseline = 'top';
            tCtx.shadowColor = accentColor;
            tCtx.shadowBlur = 32;
            for (const lineStr of qLines) {
                tCtx.fillText(lineStr, centerX, quoteY, maxQuoteW);
                quoteY += qLineH;
            }

            if (this.settings.showSubText && quoteObj.subText) {
                quoteY += 12;
                tCtx.font = `600 42px "${fontFamily}", sans-serif`;
                tCtx.fillStyle = 'rgba(255, 255, 255, 0.72)';
                tCtx.shadowBlur = 12;
                tCtx.fillText(quoteObj.subText, centerX, quoteY, maxQuoteW);
            }
            tCtx.restore();

            // Bottom Glass Pill Bar with mini artwork + title + artist
            const barY = renderH - 190;
            const barH = 116;
            const barX = 140;
            const barW = renderW - 280;

            tCtx.save();
            tCtx.fillStyle = 'rgba(15, 17, 28, 0.65)';
            tCtx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
            tCtx.lineWidth = 2;
            tCtx.beginPath();
            tCtx.roundRect(barX, barY, barW, barH, 28);
            tCtx.fill();
            tCtx.stroke();

            let metaX = barX + 32;
            if (hasAlbum) {
                const miniSize = 84;
                const miniY = barY + (barH - miniSize) / 2;
                tCtx.save();
                tCtx.beginPath();
                tCtx.roundRect(metaX, miniY, miniSize, miniSize, 16);
                tCtx.clip();
                tCtx.drawImage(albumImage, metaX, miniY, miniSize, miniSize);
                tCtx.restore();
                metaX += miniSize + 24;
            }

            tCtx.textAlign = 'left';
            tCtx.textBaseline = 'middle';
            tCtx.font = `800 38px "${fontFamily}", sans-serif`;
            tCtx.fillStyle = '#ffffff';
            tCtx.fillText(songTitle, metaX, songArtist ? (barY + 42) : (barY + barH / 2), barW - 240);

            if (songArtist) {
                tCtx.font = `600 26px "${fontFamily}", sans-serif`;
                tCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                tCtx.fillText(songArtist, metaX, barY + 80, barW - 240);
            }
            tCtx.restore();
        }

        // Optional subtle watermark
        if (this.settings.showWatermark) {
            tCtx.save();
            tCtx.textAlign = 'right';
            tCtx.textBaseline = 'bottom';
            tCtx.font = `600 22px "${fontFamily}", sans-serif`;
            tCtx.fillStyle = 'rgba(255, 255, 255, 0.42)';
            tCtx.fillText('zexerif.github.io/lyric-video-maker', renderW - 60, renderH - 52);
            tCtx.restore();
        }

        tCtx.restore();
    },

    getDownloadFilename() {
        const rawTitle = (typeof songTitleInput !== 'undefined' && songTitleInput && songTitleInput.value.trim())
            ? songTitleInput.value.trim()
            : 'lyric_video';
        const safeTitle = rawTitle.replace(/[^a-z0-9_\-\u3000-\u9fff]+/gi, '_').replace(/^_+|_+$/g, '') || 'lyric_video';
        const ext = this.settings.format === 'jpeg' ? 'jpg' : 'png';
        return `${safeTitle}_thumbnail.${ext}`;
    },

    downloadThumbnail() {
        const res = this.settings.resolution || '1080p';
        const targetW = res === '720p' ? 1280 : 1920;
        const targetH = res === '720p' ? 720 : 1080;

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = targetW;
        exportCanvas.height = targetH;

        this.renderThumbnailToCanvas(exportCanvas, targetW, targetH);

        const mimeType = this.settings.format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const quality = this.settings.format === 'jpeg' ? 0.95 : undefined;
        const filename = this.getDownloadFilename();

        if (typeof exportCanvas.toBlob === 'function') {
            exportCanvas.toBlob((blob) => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.setAttribute('download', filename);
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    if (a.parentNode) a.parentNode.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 3000);
            }, mimeType, quality);
        } else if (typeof exportCanvas.toDataURL === 'function') {
            const dataUrl = exportCanvas.toDataURL(mimeType, quality);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = dataUrl;
            a.setAttribute('download', filename);
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                if (a.parentNode) a.parentNode.removeChild(a);
            }, 3000);
        }

        if (typeof statusMessage !== 'undefined' && statusMessage) {
            statusMessage.textContent = (typeof t === 'function' && t('thumbnailDownloaded')) || `🖼️ Thumbnail downloaded (${filename})!`;
            statusMessage.style.color = '#4ade80';
        }
    }
};

window.ThumbnailGenerator = ThumbnailGenerator;

