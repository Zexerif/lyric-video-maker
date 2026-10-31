/* Canvas renderer: backgrounds, metadata, lyric layout and drawFrame(). */

function updateBlurredAlbumCache() {
    if (!albumImage) {
        cachedBlurredAlbumCanvas = null;
        return;
    }
    try {
        const offscreen = document.createElement('canvas');
        offscreen.width = 1920;
        offscreen.height = 1080;
        const oCtx = offscreen.getContext('2d');
        const scale = Math.max(offscreen.width / albumImage.width, offscreen.height / albumImage.height);
        const x = (offscreen.width / 2) - (albumImage.width / 2) * scale;
        const y = (offscreen.height / 2) - (albumImage.height / 2) * scale;
        oCtx.filter = 'blur(60px) brightness(0.4)';
        oCtx.drawImage(albumImage, x - 100, y - 100, (albumImage.width * scale) + 200, (albumImage.height * scale) + 200);
        cachedBlurredAlbumCanvas = offscreen;
    } catch (e) {
        console.warn('Offscreen album blur failed:', e);
        cachedBlurredAlbumCanvas = null;
    }
}
function drawFrame(currentTime) {
    ctx.save();
    const renderW = 1920;
    const renderH = 1080;
    const scaleX = canvas.width / renderW;
    const scaleY = canvas.height / renderH;
    if (scaleX !== 1 || scaleY !== 1) {
        ctx.scale(scaleX, scaleY);
    }

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
    if (currentLyricTransition === 'instant') {
        smoothedIndex = currentIndex;
    } else {
        smoothedIndex += indexDiff * 0.04;
    }

    // Compute live primary background color
    let liveBgColor = null;
    if (albumPalette && albumPalette.length > 0) {
        const p = albumPalette;
        const t = smoothedIndex * 0.5;
        const c0 = p[Math.floor(t) % p.length];
        const c1 = p[(Math.floor(t) + 1) % p.length];
        const blend = t % 1;
        const mix = (a, b, f) => Math.round(a + (b - a) * f);
        liveBgColor = {
            r: mix(c0.r, c1.r, blend),
            g: mix(c0.g, c1.g, blend),
            b: mix(c0.b, c1.b, blend)
        };
    }

    // Calculate active glow color (synced 1:1 with live background gradient color)
    let activeGlowColor = currentGlowColor;
    if (dynamicGlowCheckbox && dynamicGlowCheckbox.checked && liveBgColor) {
        const glowAdjusted = adjustColorForReadability(liveBgColor.r, liveBgColor.g, liveBgColor.b, 0.70, 0.98, 0.5);
        activeGlowColor = `rgb(${glowAdjusted.r}, ${glowAdjusted.g}, ${glowAdjusted.b})`;

        // Sync color picker swatch with live synchronized glow color
        const toHex = (c) => c.toString(16).padStart(2, '0');
        glowColorInput.value = `#${toHex(glowAdjusted.r)}${toHex(glowAdjusted.g)}${toHex(glowAdjusted.b)}`;
    }

    const isNativeMode = renderEngineSelect && renderEngineSelect.value === 'native';

    // Clear background
    if (bgImage) {
        // Draw background covering the canvas
        const scale = Math.max(renderW / bgImage.width, renderH / bgImage.height);
        const x = (renderW / 2) - (bgImage.width / 2) * scale;
        const y = (renderH / 2) - (bgImage.height / 2) * scale;
        ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);

        // Dark overlay for readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, renderW, renderH);
    } else if (currentBgStyle === 'albumBlur' && albumImage) {
        if (isNativeMode) {
            // Native heavy 60px Gaussian blur on target canvas resolution
            const scale = Math.max(renderW / albumImage.width, renderH / albumImage.height);
            const x = (renderW / 2) - (albumImage.width / 2) * scale;
            const y = (renderH / 2) - (albumImage.height / 2) * scale;
            ctx.save();
            ctx.filter = 'blur(60px) brightness(0.4)';
            ctx.drawImage(albumImage, x - 100, y - 100, (albumImage.width * scale) + 200, (albumImage.height * scale) + 200);
            ctx.restore();
        } else {
            if (!cachedBlurredAlbumCanvas) updateBlurredAlbumCache();
            if (cachedBlurredAlbumCanvas) {
                ctx.drawImage(cachedBlurredAlbumCanvas, 0, 0, renderW, renderH);
            } else {
                const scale = Math.max(renderW / albumImage.width, renderH / albumImage.height);
                const x = (renderW / 2) - (albumImage.width / 2) * scale;
                const y = (renderH / 2) - (albumImage.height / 2) * scale;
                ctx.drawImage(albumImage, x, y, albumImage.width * scale, albumImage.height * scale);
            }
        }
    } else if (isNativeMode) {
        // Native full-res 4K radial gradients directly on main canvas
        if (currentBgStyle === 'materialYou' && (albumPalette && albumPalette.length >= 2 || albumImage)) {
            let p = albumPalette || [{ r: 230, g: 150, b: 60 }, { r: 60, g: 140, b: 220 }, { r: 210, g: 70, b: 110 }];
            const t = smoothedIndex * 0.5;
            const pulse = (Math.sin(currentTime * 1.2) * 0.5 + 0.5);

            const c0 = p[Math.floor(t) % p.length];
            const c1 = p[(Math.floor(t) + 1) % p.length];
            const c2 = p[(Math.floor(t) + 2) % p.length];
            const blend = t % 1;

            const mix = (a, b, f) => Math.round(a + (b - a) * f);
            const col0 = { r: mix(c0.r, c1.r, blend), g: mix(c0.g, c1.g, blend), b: mix(c0.b, c1.b, blend) };
            const col1 = { r: mix(c1.r, c2.r, blend), g: mix(c1.g, c2.g, blend), b: mix(c1.b, c2.b, blend) };
            const darken = (c, f) => `rgb(${Math.round(c.r * f)}, ${Math.round(c.g * f)}, ${Math.round(c.b * f)})`;

            const radGrad = ctx.createRadialGradient(
                renderW * 0.3, renderH * 0.5, 0,
                renderW * 0.5, renderH * 0.5, renderW * 0.8
            );
            radGrad.addColorStop(0, darken(col0, 0.45 + pulse * 0.1));
            radGrad.addColorStop(0.5, darken(col1, 0.30));
            radGrad.addColorStop(1, darken(c2, 0.18));
            ctx.fillStyle = radGrad;
            ctx.fillRect(0, 0, renderW, renderH);

            const orbs = [
                { x: renderW * 0.15, y: renderH * 0.3, r: 500, c: col0, a: 0.32 + pulse * 0.08 },
                { x: renderW * 0.75, y: renderH * 0.6, r: 600, c: col1, a: 0.26 + (1 - pulse) * 0.08 },
                { x: renderW * 0.5, y: renderH * 0.1, r: 350, c: c2, a: 0.20 + pulse * 0.06 },
            ];
            for (const orb of orbs) {
                const orbGrad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
                orbGrad.addColorStop(0, `rgba(${orb.c.r}, ${orb.c.g}, ${orb.c.b}, ${orb.a})`);
                orbGrad.addColorStop(1, `rgba(${orb.c.r}, ${orb.c.g}, ${orb.c.b}, 0)`);
                ctx.fillStyle = orbGrad;
                ctx.fillRect(0, 0, renderW, renderH);
            }
        } else {
            const gradient = ctx.createLinearGradient(0, 0, renderW, renderH);
            let hue = currentBgStyle === 'reactive' ? 220 + Math.sin(smoothedIndex * 0.4) * 60 : (currentTime * 10) % 360;
            gradient.addColorStop(0, `hsl(${hue}, 40%, 15%)`);
            gradient.addColorStop(1, `hsl(${(hue + 80) % 360}, 50%, 10%)`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, renderW, renderH);
        }
    } else {
        // Use offscreen gradient buffer (960x540) to render gradient & accent orbs 10x faster
        if (!bgOffscreenCanvas) {
            bgOffscreenCanvas = document.createElement('canvas');
            bgOffscreenCanvas.width = 960;
            bgOffscreenCanvas.height = 540;
        }
        const bW = 960;
        const bH = 540;
        const bCtx = bgOffscreenCanvas.getContext('2d');

        if (currentBgStyle === 'materialYou' && (albumPalette && albumPalette.length >= 2 || albumImage)) {
            let p = albumPalette;
            if (!p || p.length < 2) {
                p = [
                    { r: 230, g: 150, b: 60 },
                    { r: 60, g: 140, b: 220 },
                    { r: 210, g: 70, b: 110 }
                ];
            }
            const t = smoothedIndex * 0.5;
            const pulse = (Math.sin(currentTime * 1.2) * 0.5 + 0.5);

            const c0 = p[Math.floor(t) % p.length];
            const c1 = p[(Math.floor(t) + 1) % p.length];
            const c2 = p[(Math.floor(t) + 2) % p.length];
            const blend = t % 1;

            const mix = (a, b, f) => Math.round(a + (b - a) * f);
            const col0 = { r: mix(c0.r, c1.r, blend), g: mix(c0.g, c1.g, blend), b: mix(c0.b, c1.b, blend) };
            const col1 = { r: mix(c1.r, c2.r, blend), g: mix(c1.g, c2.g, blend), b: mix(c1.b, c2.b, blend) };
            const darken = (c, f) => `rgb(${Math.round(c.r * f)}, ${Math.round(c.g * f)}, ${Math.round(c.b * f)})`;

            const radGrad = bCtx.createRadialGradient(
                bW * 0.3, bH * 0.5, 0,
                bW * 0.5, bH * 0.5, bW * 0.8
            );
            radGrad.addColorStop(0, darken(col0, 0.45 + pulse * 0.1));
            radGrad.addColorStop(0.5, darken(col1, 0.30));
            radGrad.addColorStop(1, darken(c2, 0.18));
            bCtx.fillStyle = radGrad;
            bCtx.fillRect(0, 0, bW, bH);

            const orbs = [
                { x: bW * 0.15, y: bH * 0.3, r: 280, c: col0, a: 0.32 + pulse * 0.08 },
                { x: bW * 0.75, y: bH * 0.6, r: 340, c: col1, a: 0.26 + (1 - pulse) * 0.08 },
                { x: bW * 0.5, y: bH * 0.1, r: 200, c: c2, a: 0.20 + pulse * 0.06 },
            ];
            for (const orb of orbs) {
                const orbGrad = bCtx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
                orbGrad.addColorStop(0, `rgba(${orb.c.r}, ${orb.c.g}, ${orb.c.b}, ${orb.a})`);
                orbGrad.addColorStop(1, `rgba(${orb.c.r}, ${orb.c.g}, ${orb.c.b}, 0)`);
                bCtx.fillStyle = orbGrad;
                bCtx.fillRect(0, 0, bW, bH);
            }
        } else {
            const gradient = bCtx.createLinearGradient(0, 0, bW, bH);
            let hue;
            if (currentBgStyle === 'reactive') {
                hue = 220 + Math.sin(smoothedIndex * 0.4) * 60;
            } else {
                hue = (currentTime * 10) % 360;
            }
            gradient.addColorStop(0, `hsl(${hue}, 40%, 15%)`);
            gradient.addColorStop(1, `hsl(${(hue + 80) % 360}, 50%, 10%)`);
            bCtx.fillStyle = gradient;
            bCtx.fillRect(0, 0, bW, bH);
        }

        ctx.drawImage(bgOffscreenCanvas, 0, 0, renderW, renderH);
    }

    // Draw Album Cover (Left Side)
    if (albumImage) {
        let size = 600;
        let x = 200;
        let y = 180; // Shifted up slightly to give title & credits more room below

        const energy = (typeof getAudioEnergy === 'function') ? getAudioEnergy() : { bass: 0, overall: 0, raw: null };

        // Audio-reactive artwork pulse
        if (currentAudioReactive === 'pulseArtwork' && isPlaying) {
            const pulse = 1.0 + (energy.bass || 0) * 0.05;
            const newSize = size * pulse;
            x = x - (newSize - size) / 2;
            y = y - (newSize - size) / 2;
            size = newSize;
        }

        ctx.save();
        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = isNativeMode ? 50 : 20;

        // Rounded corners for album cover
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, 30);
        ctx.clip();
        ctx.drawImage(albumImage, x, y, size, size);
        ctx.restore();

        // Audio-reactive Spectrum Bars
        if (currentAudioReactive === 'spectrum' && isPlaying && energy.raw) {
            ctx.save();
            const barCount = 20;
            const barGap = 6;
            const barW = (size - (barCount - 1) * barGap) / barCount;
            const barMaxH = 65;
            const barBaseY = y + size + 20;

            for (let b = 0; b < barCount; b++) {
                const rawVal = energy.raw[b * 2] || 0;
                const barH = Math.max(4, (rawVal / 255) * barMaxH);
                const barX = x + b * (barW + barGap);
                const barY = barBaseY - barH;

                ctx.fillStyle = activeGlowColor || 'rgba(99, 102, 241, 0.85)';
                ctx.beginPath();
                ctx.roundRect(barX, barY, barW, barH, 3);
                ctx.fill();
            }
            ctx.restore();
        }
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
        // Align to bottom area, growing upwards if needed (bottom boundary at renderH - 50)
        textY = Math.min(830, renderH - 50 - totalMetadataHeight);
    } else {
        // Centered layout if there is no album cover
        textY = renderH / 2 - totalMetadataHeight / 2;
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
    ctx.fillText(`zexerif.github.io/lyric-video-maker/    :    v2.0.1`, 40, 40);
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
    syncBpmFromDom();
    const beatInfo = getBeatInfo(currentTime, bpmMarkers);
    const bpm = beatInfo.bpm;
    const hasBpm = !isNaN(bpm) && bpm > 0;
    const songBpmVal = hasBpm ? Math.round(bpm).toString() : '';

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
            beforeText = songKey ? `Key: ${songKey}` : '';
            afterText = `${songBpmVal} BPM`;
            beforeWidth = beforeText ? ctx.measureText(beforeText).width : 0;
            afterWidth = ctx.measureText(afterText).width;

            if (!beforeText) {
                dotSpace = 36;
                dotOffset = 14;
            } else {
                dotSpace = 54;
                dotOffset = 27;
            }

            const contentWidth = beforeWidth + dotSpace + afterWidth;
            pillWidth = 20 + contentWidth + 20;
            pillX = renderW - 40 - pillWidth;
        } else {
            const badgeText = (songKey && hasBpm) ? `Key: ${songKey}  |  ${songBpmVal} BPM` : (songKey ? `Key: ${songKey}` : `${songBpmVal} BPM`);
            const textWidth = ctx.measureText(badgeText).width;
            pillWidth = 20 + textWidth + 20;
            pillX = renderW - 40 - pillWidth;
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
            beatPhase = beatInfo.phase;
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

    if (lyrics.length === 0) {
        ctx.restore();
        return;
    }

    // Draw Lyrics Setup
    ctx.textAlign = currentLyricAlignment;
    ctx.textBaseline = 'middle';
    
    let lyricX = 850; 
    let layoutWidth = renderW - 850;
    if (!albumImage && currentBgStyle !== 'albumBlur' && currentBgStyle !== 'materialYou') {
        layoutWidth = renderW - 100;
        lyricX = 50;
    }
    
    if (currentLyricAlignment === 'center') {
        lyricX = lyricX + layoutWidth / 2;
    } else if (currentLyricAlignment === 'right') {
        lyricX = lyricX + layoutWidth - 50;
    }
    
    const centerY = renderH / 2 + currentVerticalOffset;

    function getWrappedLines(context, lyric, maxWidth, font) {
        const backingVocalsMode = backingVocalsSelect ? backingVocalsSelect.value : 'styled';
        if (lyric.cachedLines && lyric.cachedFont === font && lyric.cachedMaxWidth === maxWidth && lyric.cachedBackingMode === backingVocalsMode) {
            return lyric.cachedLines;
        }

        context.save();

        let items = [];
        if (lyric.words && lyric.words.length > 0) {
            const isWordByWord = lyric.words.length > 1;
            for (let i = 0; i < lyric.words.length; i++) {
                const w = lyric.words[i];
                const rawText = w.text;
                if (isWordByWord) {
                    const startsWithSpace = /^\s/.test(rawText);
                    const endsWithSpace = /\s$/.test(rawText);
                    const parts = rawText.trim().split(/\s+/);
                    if (parts.length > 0 && parts[0] !== '') {
                        const duration = w.endTime - w.time;
                        const partDuration = duration / parts.length;
                        for (let k = 0; k < parts.length; k++) {
                            const isFirst = (k === 0);
                            const isLast = (k === parts.length - 1);
                            let itemText = parts[k];
                            if (isFirst && startsWithSpace) {
                                itemText = ' ' + itemText;
                            }
                            if (!isLast || endsWithSpace) {
                                itemText = itemText + ' ';
                            }
                            items.push({
                                text: itemText,
                                time: w.time + k * partDuration,
                                endTime: w.time + (k + 1) * partDuration,
                                isBacking: w.isBacking
                            });
                        }
                    }
                } else {
                    const parts = tokenizeText(rawText);
                    if (parts.length > 0) {
                        const duration = w.endTime - w.time;
                        const partDuration = duration / parts.length;
                        for (let k = 0; k < parts.length; k++) {
                            items.push({
                                text: parts[k],
                                time: w.time + k * partDuration,
                                endTime: w.time + (k + 1) * partDuration,
                                isBacking: w.isBacking
                            });
                        }
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
            if (insideParentheses || item.isBacking) {
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
        const backingFontSize = Math.round(currentFontSize * 0.73);
        const backingFont = font.includes('bold')
            ? font.replace('bold', '500').replace(`${currentFontSize}px`, `${backingFontSize}px`)
            : font.replace(`${currentFontSize}px`, `${backingFontSize}px`);

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

        let subLines = [];
        if (lyric.subText && currentDualLanguage !== 'hide') {
            const subTokens = tokenizeText(lyric.subText);
            const subItems = [];
            for (let i = 0; i < subTokens.length; i++) {
                subItems.push({
                    text: subTokens[i],
                    time: lyric.time,
                    endTime: lyric.time + 1,
                    isBacking: false
                });
            }
            const subFontSize = Math.round(currentFontSize * 0.62);
            const subFont = `italic 500 ${subFontSize}px "${currentFont}", sans-serif`;
            subLines = wrapItems(subItems, subFont);
        }

        context.restore();

        const result = { mainLines, backingLines, subLines };
        lyric.cachedLines = result;
        lyric.cachedFont = font;
        lyric.cachedMaxWidth = maxWidth;
        lyric.cachedBackingMode = backingVocalsMode;
        return result;
    }

    function drawWrappedLines(context, lyric, wrappedResult, x, y, isCurrent, currentTime, opacity) {
        const defaultFont = `bold ${currentFontSize}px "${currentFont}", sans-serif`;
        const backingFontSize = Math.round(currentFontSize * 0.73);
        const backingFont = defaultFont.includes('bold')
            ? defaultFont.replace('bold', '500').replace(`${currentFontSize}px`, `${backingFontSize}px`)
            : defaultFont.replace(`${currentFontSize}px`, `${backingFontSize}px`);

        const backingVocalsMode = backingVocalsSelect ? backingVocalsSelect.value : 'styled';
        const useBackingStyle = (backingVocalsMode === 'styled');

        const mainLines = wrappedResult.mainLines;
        const backingLines = wrappedResult.backingLines;
        const subLines = wrappedResult.subLines || [];

        const mainLineHeight = currentFontSize * currentLineSpacing;
        const backingLineHeight = (useBackingStyle ? backingFontSize : currentFontSize) * currentLineSpacing;
        const subFontSize = Math.round(currentFontSize * 0.62);
        const subFont = `italic 500 ${subFontSize}px "${currentFont}", sans-serif`;
        const subLineHeight = Math.round(subFontSize * currentLineSpacing);
        const gapBetween = (mainLines.length > 0 && backingLines.length > 0) ? 15 : 0;

        const linesToDraw = [];
        for (let i = 0; i < mainLines.length; i++) {
            linesToDraw.push({
                line: mainLines[i],
                font: defaultFont,
                lineHeight: mainLineHeight,
                isBacking: false,
                isSub: false
            });
        }
        for (let i = 0; i < subLines.length; i++) {
            linesToDraw.push({
                line: subLines[i],
                font: subFont,
                lineHeight: subLineHeight,
                isBacking: false,
                isSub: true
            });
        }
        for (let i = 0; i < backingLines.length; i++) {
            linesToDraw.push({
                line: backingLines[i],
                font: useBackingStyle ? backingFont : defaultFont,
                lineHeight: backingLineHeight,
                isBacking: true,
                isSub: false
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

            // Calculate alignment offset for active tracking/clipping
            const textWidth = context.measureText(lineText).width;
            let startX = x;
            if (currentLyricAlignment === 'center') startX = x - textWidth / 2;
            else if (currentLyricAlignment === 'right') startX = x - textWidth;

            const isStyledBacking = drawItem.isBacking && useBackingStyle;

            if (drawItem.isSub) {
                context.fillStyle = isCurrent
                    ? `rgba(226, 232, 240, ${opacity * 0.85})`
                    : `rgba(203, 213, 225, ${opacity * 0.4})`;
                context.shadowColor = isCurrent ? activeGlowColor : 'transparent';
                context.shadowBlur = isCurrent ? 8 * opacity : 0;
                context.fillText(lineText, x, lineY);
                currentY += drawItem.lineHeight;
                continue;
            }

            if (isCurrent) {
                if (currentLyricTransition === 'typewriter') {
                    let lineDuration = 3;
                    if (lyric.words && lyric.words.length > 0) {
                        lineDuration = Math.max(0.5, lyric.words[lyric.words.length - 1].endTime - lyric.words[0].time);
                    }
                    const elapsed = Math.max(0, currentTime - lyric.time);
                    const typeProgress = Math.max(0, Math.min(1, elapsed / lineDuration));
                    const visibleChars = Math.floor(lineText.length * typeProgress);
                    const typedText = lineText.substring(0, visibleChars);
                    const showCursor = Math.floor(currentTime * 4) % 2 === 0 && typeProgress < 1;

                    context.save();
                    context.font = drawItem.font;
                    context.fillStyle = currentLyricColor;
                    context.shadowColor = activeGlowColor;
                    context.shadowBlur = 15 * opacity;
                    context.fillText(typedText + (showCursor ? '▍' : ''), x, lineY);
                    context.restore();
                    currentY += drawItem.lineHeight;
                    continue;
                }

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
                        context.rect(startX - blurRadius * 2, lineY - drawItem.lineHeight, activeWidth + blurRadius * 2, drawItem.lineHeight * 2);
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
    const lyricFont = `bold ${currentFontSize}px "${currentFont}", sans-serif`;
    const backingFontSize = Math.round(currentFontSize * 0.73);

    for (let j = 0; j < lyrics.length; j++) {
        const lyric = lyrics[j];

        const wrapped = getWrappedLines(ctx, lyric, layoutWidth - 40, lyricFont);
        wrappedLinesArr[j] = wrapped;

        const backingVocalsMode = backingVocalsSelect ? backingVocalsSelect.value : 'styled';
        const useBackingStyle = (backingVocalsMode === 'styled');
        const mainLineHeight = currentFontSize * currentLineSpacing;
        const backingLineHeight = (useBackingStyle ? backingFontSize : currentFontSize) * currentLineSpacing;
        const subLines = wrapped.subLines || [];
        const subFontSize = Math.round(currentFontSize * 0.62);
        const subLineHeight = Math.round(subFontSize * currentLineSpacing);
        const gapBetween = (wrapped.mainLines.length > 0 && (wrapped.backingLines.length > 0 || subLines.length > 0)) ? 15 : 0;

        heights[j] = wrapped.mainLines.length * mainLineHeight + subLines.length * subLineHeight + wrapped.backingLines.length * backingLineHeight + gapBetween;
    }

    // 2. Sequential layout starting at y = 0
    yPositions[0] = 0;
    const gap = currentFontSize * 1.5; // comfortable gap between lyric blocks
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
    const drawRange = 5;
    const smoothCurrentIndex = Math.round(smoothedIndex);
    for (let i = Math.max(0, smoothCurrentIndex - drawRange); i <= Math.min(lyrics.length - 1, smoothCurrentIndex + drawRange); i++) {
        const lyric = lyrics[i];
        const distance = i - smoothedIndex;
        const absDistance = Math.abs(distance);
        
        // Apply Transition Effects
        let opacity = Math.max(0, 1 - absDistance * 0.25);
        let scale = 1;
        let drawY = yPositions[i];
        let blurEffect = 0;

        if (currentLyricTransition === 'slide') {
            scale = Math.max(0.7, 1 - absDistance * 0.1);
            // In slide transition, earlier items slide up
            if (distance > 0) drawY += distance * 50; // Upcoming slide from below
            else drawY -= absDistance * 20; // Past slide up
        } else if (currentLyricTransition === 'blur') {
            opacity = Math.max(0, 1 - absDistance * 0.35);
            blurEffect = absDistance * 10;
        } else if (currentLyricTransition === 'fade') {
            opacity = Math.max(0, 1 - absDistance * 0.4);
        } else if (currentLyricTransition === 'bounce') {
            const beatProgress = Math.max(0, Math.min(1, (currentTime - lyric.time) / 0.4));
            let bounceScale = 1;
            if (i === currentIndex && currentTime >= lyric.time && beatProgress < 1) {
                const p = beatProgress;
                bounceScale = 1 + Math.sin(p * Math.PI) * 0.14 * Math.exp(-p * 3);
            }
            scale = Math.max(0.72, (1 - absDistance * 0.14) * bounceScale);
            opacity = Math.max(0, 1 - absDistance * 0.3);
        } else if (currentLyricTransition === 'glowBeat') {
            const beatInfo = (typeof getBeatInfo === 'function') ? getBeatInfo(currentTime) : { isBeat: false, beatFraction: 0 };
            const pulse = (i === currentIndex) ? Math.sin(beatInfo.beatFraction * Math.PI) * 0.08 : 0;
            scale = Math.max(0.7, (1 - absDistance * 0.12) * (1 + pulse));
            opacity = Math.max(0, 1 - absDistance * 0.3);
        } else if (currentLyricTransition === 'typewriter') {
            scale = 1;
            opacity = Math.max(0, 1 - absDistance * 0.35);
        } else if (currentLyricTransition === 'zoomDrift') {
            const lineDuration = (lyrics[i + 1] ? lyrics[i + 1].time - lyric.time : 4);
            const lineT = Math.max(0, Math.min(1, (currentTime - lyric.time) / Math.max(0.8, lineDuration)));
            const drift = (i === currentIndex) ? 1.0 + lineT * 0.06 : 1.0;
            scale = Math.max(0.7, (1 - absDistance * 0.1) * drift);
            opacity = Math.max(0, 1 - absDistance * 0.3);
        } else {
            // instant
            opacity = absDistance < 0.5 ? 1 : 0;
        }

        if (opacity > 0) {
            ctx.save();
            ctx.translate(lyricX, drawY);
            ctx.scale(scale, scale);

            if (blurEffect > 0) {
                ctx.filter = `blur(${blurEffect}px)`;
            }

            ctx.font = lyricFont;

            const weight = Math.max(0, 1 - absDistance);
            ctx.shadowBlur = 20 * opacity * weight;
            ctx.shadowColor = activeGlowColor;

            drawWrappedLines(ctx, lyric, wrappedLinesArr[i], 0, 0, i === currentIndex, currentTime, opacity);
            ctx.restore();
        }
    }

    ctx.restore();
}
