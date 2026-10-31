/* Style Presets and Templates Manager */

const StylePresets = {
    presets: {
        appleMusic: {
            name: "Apple Music",
            icon: "🍎",
            desc: "Fluid typography with atmospheric dynamic album glow",
            config: {
                font: "Outfit",
                lyricAlignment: "left",
                bgStyle: "albumBlur",
                dynamicGlow: true,
                lyricColor: "#ffffff",
                glowColor: "#6366f1",
                lyricTransition: "slide",
                backingVocals: "styled",
                fontSize: 60,
                lineSpacing: 1.3,
                verticalOffset: 0,
                bpmVisualizer: "ring-contract",
                animatePlainLyrics: "default",
                audioReactive: "pulseArtwork"
            }
        },
        karaoke: {
            name: "Karaoke Party",
            icon: "🎤",
            desc: "Centered bold typography with bouncing neon word highlights",
            config: {
                font: "Impact",
                lyricAlignment: "center",
                bgStyle: "reactive",
                dynamicGlow: false,
                lyricColor: "#ffffff",
                glowColor: "#ec4899",
                lyricTransition: "bounce",
                backingVocals: "normal",
                fontSize: 68,
                lineSpacing: 1.2,
                verticalOffset: 0,
                bpmVisualizer: "double-ring",
                animatePlainLyrics: "on",
                audioReactive: "spectrum"
            }
        },
        minimal: {
            name: "Minimalist Modern",
            icon: "✨",
            desc: "Clean editorial layout, pure white text and gentle fades",
            config: {
                font: "Inter",
                lyricAlignment: "left",
                bgStyle: "gradient",
                dynamicGlow: false,
                lyricColor: "#f8fafc",
                glowColor: "#38bdf8",
                lyricTransition: "fade",
                backingVocals: "normal",
                fontSize: 52,
                lineSpacing: 1.4,
                verticalOffset: 0,
                bpmVisualizer: "none",
                animatePlainLyrics: "off",
                audioReactive: "none"
            }
        },
        spotify: {
            name: "Spotify Canvas",
            icon: "🟢",
            desc: "Moody blurred artwork backdrop with bold Spotify aesthetics",
            config: {
                font: "Montserrat",
                lyricAlignment: "left",
                bgStyle: "albumBlur",
                dynamicGlow: false,
                lyricColor: "#ffffff",
                glowColor: "#1ed760",
                lyricTransition: "slide",
                backingVocals: "styled",
                fontSize: 58,
                lineSpacing: 1.3,
                verticalOffset: 0,
                bpmVisualizer: "pill-flash",
                animatePlainLyrics: "default",
                audioReactive: "ambientBreathe"
            }
        },
        retro: {
            name: "Retro Synthwave",
            icon: "🌆",
            desc: "Neon script typography, purple aura and sonar visualizer",
            config: {
                font: "Pacifico",
                lyricAlignment: "center",
                bgStyle: "reactive",
                dynamicGlow: false,
                lyricColor: "#fef08a",
                glowColor: "#a855f7",
                lyricTransition: "glowBeat",
                backingVocals: "styled",
                fontSize: 62,
                lineSpacing: 1.3,
                verticalOffset: 0,
                bpmVisualizer: "ring-expand",
                animatePlainLyrics: "on",
                audioReactive: "spectrum"
            }
        }
    },

    applyPreset(presetKey, recordHistory = true) {
        const preset = this.presets[presetKey];
        if (!preset) return;

        const c = preset.config;
        if (c.font && typeof fontSelect !== 'undefined' && fontSelect) {
            fontSelect.value = c.font;
            currentFont = c.font;
        }
        if (c.lyricAlignment && typeof lyricAlignmentSelect !== 'undefined' && lyricAlignmentSelect) {
            lyricAlignmentSelect.value = c.lyricAlignment;
            currentLyricAlignment = c.lyricAlignment;
        }
        if (c.bgStyle && typeof bgStyleSelect !== 'undefined' && bgStyleSelect) {
            bgStyleSelect.value = c.bgStyle;
            currentBgStyle = c.bgStyle;
        }
        if (typeof c.dynamicGlow !== 'undefined' && typeof dynamicGlowCheckbox !== 'undefined' && dynamicGlowCheckbox) {
            dynamicGlowCheckbox.checked = c.dynamicGlow;
        }
        if (c.lyricColor && typeof lyricColorInput !== 'undefined' && lyricColorInput) {
            lyricColorInput.value = c.lyricColor;
            currentLyricColor = c.lyricColor;
        }
        if (c.glowColor && typeof glowColorInput !== 'undefined' && glowColorInput) {
            glowColorInput.value = c.glowColor;
            currentGlowColor = c.glowColor;
        }
        if (c.lyricTransition && typeof lyricTransitionSelect !== 'undefined' && lyricTransitionSelect) {
            lyricTransitionSelect.value = c.lyricTransition;
            currentLyricTransition = c.lyricTransition;
        }
        if (c.backingVocals && typeof backingVocalsSelect !== 'undefined' && backingVocalsSelect) {
            backingVocalsSelect.value = c.backingVocals;
        }
        if (c.fontSize && typeof fontSizeSlider !== 'undefined' && fontSizeSlider) {
            fontSizeSlider.value = c.fontSize;
            currentFontSize = parseInt(c.fontSize);
            if (typeof fontSizeValue !== 'undefined' && fontSizeValue) fontSizeValue.textContent = `${c.fontSize}px`;
        }
        if (c.lineSpacing && typeof lineSpacingSlider !== 'undefined' && lineSpacingSlider) {
            lineSpacingSlider.value = c.lineSpacing;
            currentLineSpacing = parseFloat(c.lineSpacing);
            if (typeof lineSpacingValue !== 'undefined' && lineSpacingValue) lineSpacingValue.textContent = `${c.lineSpacing}x`;
        }
        if (typeof c.verticalOffset !== 'undefined' && typeof verticalOffsetSlider !== 'undefined' && verticalOffsetSlider) {
            verticalOffsetSlider.value = c.verticalOffset;
            currentVerticalOffset = parseInt(c.verticalOffset);
            if (typeof verticalOffsetValue !== 'undefined' && verticalOffsetValue) verticalOffsetValue.textContent = `${c.verticalOffset}px`;
        }
        if (c.bpmVisualizer && typeof bpmVisualizerSelect !== 'undefined' && bpmVisualizerSelect) {
            bpmVisualizerSelect.value = c.bpmVisualizer;
        }
        if (c.animatePlainLyrics && typeof animatePlainLyricsSelect !== 'undefined' && animatePlainLyricsSelect) {
            animatePlainLyricsSelect.value = c.animatePlainLyrics;
        }
        if (c.audioReactive && typeof audioReactiveSelect !== 'undefined' && audioReactiveSelect) {
            audioReactiveSelect.value = c.audioReactive;
            if (typeof currentAudioReactive !== 'undefined') currentAudioReactive = c.audioReactive;
        }

        // Highlight active preset button in UI
        const pills = document.querySelectorAll('.preset-pill');
        pills.forEach(pill => {
            if (pill.getAttribute('data-preset') === presetKey) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });

        if (recordHistory && typeof HistoryManager !== 'undefined') {
            HistoryManager.pushState(`Preset: ${preset.name}`);
        }

        if (typeof saveProgressToLocalStorage === 'function') {
            saveProgressToLocalStorage();
        }
        if (typeof drawFrame === 'function') {
            drawFrame(typeof pausedTime !== 'undefined' ? pausedTime : 0);
        }

        if (typeof statusMessage !== 'undefined' && statusMessage) {
            statusMessage.textContent = `Applied style preset: ${preset.name}`;
            statusMessage.style.color = '#4ade80';
        }
    },

    exportCustomPresetJson() {
        const config = {
            font: typeof fontSelect !== 'undefined' && fontSelect ? fontSelect.value : currentFont,
            lyricAlignment: typeof lyricAlignmentSelect !== 'undefined' && lyricAlignmentSelect ? lyricAlignmentSelect.value : currentLyricAlignment,
            bgStyle: typeof bgStyleSelect !== 'undefined' && bgStyleSelect ? bgStyleSelect.value : currentBgStyle,
            dynamicGlow: typeof dynamicGlowCheckbox !== 'undefined' && dynamicGlowCheckbox ? dynamicGlowCheckbox.checked : false,
            lyricColor: typeof lyricColorInput !== 'undefined' && lyricColorInput ? lyricColorInput.value : currentLyricColor,
            glowColor: typeof glowColorInput !== 'undefined' && glowColorInput ? glowColorInput.value : currentGlowColor,
            lyricTransition: typeof lyricTransitionSelect !== 'undefined' && lyricTransitionSelect ? lyricTransitionSelect.value : currentLyricTransition,
            backingVocals: typeof backingVocalsSelect !== 'undefined' && backingVocalsSelect ? backingVocalsSelect.value : 'styled',
            fontSize: typeof fontSizeSlider !== 'undefined' && fontSizeSlider ? parseInt(fontSizeSlider.value) : currentFontSize,
            lineSpacing: typeof lineSpacingSlider !== 'undefined' && lineSpacingSlider ? parseFloat(lineSpacingSlider.value) : currentLineSpacing,
            verticalOffset: typeof verticalOffsetSlider !== 'undefined' && verticalOffsetSlider ? parseInt(verticalOffsetSlider.value) : currentVerticalOffset,
            bpmVisualizer: typeof bpmVisualizerSelect !== 'undefined' && bpmVisualizerSelect ? bpmVisualizerSelect.value : 'ring-contract',
            animatePlainLyrics: typeof animatePlainLyricsSelect !== 'undefined' && animatePlainLyricsSelect ? animatePlainLyricsSelect.value : 'default',
            audioReactive: typeof audioReactiveSelect !== 'undefined' && audioReactiveSelect ? audioReactiveSelect.value : 'none'
        };

        const presetData = {
            version: "1.0",
            name: "Custom Preset",
            exportedAt: new Date().toISOString(),
            config
        };

        const blob = new Blob([JSON.stringify(presetData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `style-preset-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    importCustomPresetJson(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const c = data.config || data;
                this.presets['customLoaded'] = {
                    name: data.name || "Loaded Custom Preset",
                    icon: "🎨",
                    desc: "Custom imported preset configuration",
                    config: c
                };
                this.applyPreset('customLoaded');
                if (typeof statusMessage !== 'undefined' && statusMessage) {
                    statusMessage.textContent = `✅ Successfully imported custom preset: ${data.name || 'Preset'}`;
                    statusMessage.style.color = '#4ade80';
                }
            } catch (err) {
                console.error("Failed to import preset:", err);
                if (typeof statusMessage !== 'undefined' && statusMessage) {
                    statusMessage.textContent = 'Failed to parse preset JSON file.';
                    statusMessage.style.color = '#ef4444';
                }
            }
        };
        reader.readAsText(file);
    }
};

window.StylePresets = StylePresets;

