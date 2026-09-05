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
    const bpmList = document.getElementById('bpmList');
    const addBpmBtn = document.getElementById('addBpmBtn');
    let bpmMarkers = [{ time: 0, bpm: 0 }];
    const backingVocalsSelect = document.getElementById('backingVocalsSelect');
    const bpmVisualizerSelect = document.getElementById('bpmVisualizerSelect');
    const animatePlainLyricsSelect = document.getElementById('animatePlainLyricsSelect');
    
    // New UI Elements
    const lyricAlignmentSelect = document.getElementById('lyricAlignmentSelect');
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const lineSpacingSlider = document.getElementById('lineSpacingSlider');
    const lineSpacingValue = document.getElementById('lineSpacingValue');
    const verticalOffsetSlider = document.getElementById('verticalOffsetSlider');
    const verticalOffsetValue = document.getElementById('verticalOffsetValue');
    const lyricTransitionSelect = document.getElementById('lyricTransitionSelect');
    const renderEngineSelect = document.getElementById('renderEngineSelect');
    const renderEngineWarning = document.getElementById('renderEngineWarning');
    const bgVideoPreview = document.getElementById('bgVideoPreview');
    const waveformContainer = document.getElementById('waveformContainer');
    const waveformCanvas = document.getElementById('waveformCanvas');
    const scrubberHead = document.getElementById('scrubberHead');
    const scrubberTime = document.getElementById('scrubberTime');
    const resetStyleBtn = document.getElementById('resetStyleBtn');

    // i18n Localization
    let currentLanguage = localStorage.getItem('lyricAppLanguage') || 'en';
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
        langSelect.value = currentLanguage;
        langSelect.addEventListener('change', (e) => {
            currentLanguage = e.target.value;
            localStorage.setItem('lyricAppLanguage', currentLanguage);
            applyLanguage(currentLanguage);
        });
    }

    function t(key) {
        if (!window.translations || !window.translations[currentLanguage]) return null;
        return window.translations[currentLanguage][key] || null;
    }

    function setText(selector, key) {
        const el = document.querySelector(selector);
        if (el && t(key)) el.innerHTML = t(key);
    }

    function setPlaceholder(selector, key) {
        const el = document.querySelector(selector);
        if (el && t(key)) el.placeholder = t(key);
    }

    function setOptionText(selectSelector, value, key) {
        const opt = document.querySelector(`${selectSelector} option[value="${value}"]`);
        if (opt && t(key)) opt.textContent = t(key);
    }

    function applyLanguage(lang) {
        if (!window.translations || !window.translations[lang]) return;
        currentLanguage = lang;

        // Header
        setText('header h1', 'appTitle');
        setText('header > p', 'appDesc');
        setText('.github-star-badge span:not(.badge-star)', 'starGithub');

        // Drop overlay
        setText('.drop-message h2', 'dropFiles');
        setText('.drop-message p', 'dropFilesSub');

        // Tabs
        setText('button[data-tab="tab-files"]', 'tabFiles');
        setText('button[data-tab="tab-details"]', 'tabInfo');
        setText('button[data-tab="tab-style"]', 'tabStyle');
        setText('button[data-tab="tab-editor"]', 'tabLyrics');

        // Files Tab — Section Headers
        const sec1Header = document.querySelector('#tab-files .input-group:nth-of-type(1) > label');
        if (sec1Header && t('audioLabel')) sec1Header.textContent = t('audioLabel');

        const sec2Header = document.querySelector('#tab-files .input-group:nth-of-type(2) > label');
        if (sec2Header && t('lrcLabel')) sec2Header.textContent = t('lrcLabel');

        const sec3Header = document.querySelector('#tab-files .input-group:nth-of-type(3) label');
        if (sec3Header && t('bgLabel')) sec3Header.textContent = t('bgLabel');

        const sec4Header = document.querySelector('#tab-files .input-group:nth-of-type(4) label');
        if (sec4Header && t('albumLabel')) sec4Header.textContent = t('albumLabel');

        // Files Tab — Upload Card Titles (.upload-title)
        setText('#audioUploadCard .upload-title', 'audioTitle');
        setText('#lrcUploadCard .upload-title', 'lrcTitle');
        setText('#bgUploadCard .upload-title', 'bgTitle');
        setText('#albumUploadCard .upload-title', 'albumTitle');

        // Subtitles (only if not showing loaded state)
        const aSub = document.getElementById('audioSubtitle');
        if (aSub && !aSub.textContent.startsWith('✅') && !aSub.textContent.startsWith('⏳')) {
            aSub.textContent = t('audioSub') || 'Click to select or drag audio here';
        }
        const lSub = document.getElementById('lrcSubtitle');
        if (lSub && !lSub.textContent.startsWith('✅')) {
            lSub.textContent = t('lrcSub') || 'Click to select or drag lyrics here';
        }
        const bSub = document.getElementById('bgSubtitle');
        if (bSub && !bSub.textContent.startsWith('✅')) {
            bSub.textContent = t('bgSub') || 'Click to select or drag image here';
        }
        const alSub = document.getElementById('albumSubtitle');
        if (alSub && !alSub.textContent.startsWith('✅')) {
            alSub.textContent = t('albumSub') || 'Click to select or drag image here';
        }

        setText('#removeBgBtn', 'removeBtn');
        setText('#removeAlbumBtn', 'removeBtn');
        setText('label[for="albumUrl"]', 'albumUrlLabel');
        setPlaceholder('#albumUrl', 'pasteUrl');
        setText('#loadAlbumUrl', 'loadBtn');

        // Info Tab
        setText('label[for="itunesSearchInput"]', 'itunesSearchLabel');
        setPlaceholder('#itunesSearchInput', 'itunesSearchPlaceholder');
        setText('#itunesSearchBtn', 'searchBtn');
        setText('label[for="songTitleInput"]', 'songTitleLabel');
        setPlaceholder('#songTitleInput', 'songTitlePlaceholder');
        setText('label[for="songArtistInput"]', 'artistLabel');
        setPlaceholder('#songArtistInput', 'artistPlaceholder');
        setText('label[for="songKeyInput"]', 'songKeyLabel');
        setPlaceholder('#songKeyInput', 'songKeyPlaceholder');

        const bpmTimelineLabel = document.querySelector('#bpmList')?.parentElement?.querySelector('label');
        if (bpmTimelineLabel && t('bpmTimeline')) bpmTimelineLabel.textContent = t('bpmTimeline');

        setText('#addBpmBtn', 'atPlayhead');
        setText('.bpm-instructions', 'bpmHint');
        setText('#addCreditBtn', 'addCreditBtn');
        const creditsLabelEl = document.querySelector('#tab-details .input-group > label:not([for])');
        if (creditsLabelEl && t('creditsLabel')) creditsLabelEl.textContent = t('creditsLabel');

        // Style Tab
        setText('label[for="bgStyleSelect"]', 'bgStyleLabel');
        setOptionText('#bgStyleSelect', 'gradient', 'bgGradient');
        setOptionText('#bgStyleSelect', 'reactive', 'bgReactive');
        setOptionText('#bgStyleSelect', 'blur', 'bgBlur');
        setOptionText('#bgStyleSelect', 'material', 'bgMaterial');

        setText('label[for="bpmVisualizerSelect"]', 'bpmVisLabel');
        setOptionText('#bpmVisualizerSelect', 'ring-contract', 'bpmVisApproach');
        setOptionText('#bpmVisualizerSelect', 'sonar', 'bpmVisSonar');
        setOptionText('#bpmVisualizerSelect', 'flash', 'bpmVisFlash');
        setOptionText('#bpmVisualizerSelect', 'double-ring', 'bpmVisDouble');
        setOptionText('#bpmVisualizerSelect', 'off', 'bpmVisOff');
        const bpmVisHintEl = document.querySelector('#bpmVisualizerSelect')?.nextElementSibling;
        if (bpmVisHintEl && t('bpmVisHint')) bpmVisHintEl.textContent = t('bpmVisHint');

        setText('label[for="fontSelect"]', 'fontLabel');
        setText('label[for="lyricAlignmentSelect"]', 'textAlignLabel');
        setOptionText('#lyricAlignmentSelect', 'left', 'alignLeft');
        setOptionText('#lyricAlignmentSelect', 'center', 'alignCenter');
        setOptionText('#lyricAlignmentSelect', 'right', 'alignRight');

        setText('label[for="lyricColor"]', 'textColor');
        setText('label[for="glowColor"]', 'glowColor');
        setText('label[for="dynamicGlow"]', 'matchAlbum');

        setText('label[for="lyricTransitionSelect"]', 'transitionLabel');
        setOptionText('#lyricTransitionSelect', 'instant', 'transInstant');
        setOptionText('#lyricTransitionSelect', 'fade', 'transFade');
        setOptionText('#lyricTransitionSelect', 'slide', 'transSlide');
        setOptionText('#lyricTransitionSelect', 'blur', 'transBlur');

        setText('label[for="backingVocalsSelect"]', 'backingLabel');
        setOptionText('#backingVocalsSelect', 'styled', 'backingApple');
        setOptionText('#backingVocalsSelect', 'normal', 'backingNormal');
        setOptionText('#backingVocalsSelect', 'hide', 'backingHide');
        const backingHintEl = document.querySelector('#backingVocalsSelect')?.nextElementSibling;
        if (backingHintEl && t('backingHint')) backingHintEl.textContent = t('backingHint');

        setText('.advanced-styles-toggle span', 'advStyles');
        const advLabels = document.querySelectorAll('.advanced-styles-panel label');
        if (advLabels[0]) advLabels[0].textContent = t('fontSize') || advLabels[0].textContent;
        if (advLabels[1]) advLabels[1].textContent = t('lineSpacing') || advLabels[1].textContent;
        if (advLabels[2]) advLabels[2].textContent = t('vertOffset') || advLabels[2].textContent;
        setText('#resetStyleBtn', 'resetStyles');

        // Lyrics Tab
        setText('label[for="animatePlainLyricsSelect"]', 'karaokeLabel');
        setOptionText('#animatePlainLyricsSelect', 'default', 'karaokeDefault');
        setOptionText('#animatePlainLyricsSelect', 'on', 'karaokeOn');
        setOptionText('#animatePlainLyricsSelect', 'off', 'karaokeOff');
        
        const karaokeHintEl = document.getElementById('karaokeHint');
        if (karaokeHintEl && t('karaokeHint')) karaokeHintEl.textContent = t('karaokeHint');

        setText('label[for="lrcEditor"]', 'editorLabel');
        setPlaceholder('#lrcEditor', 'editorPlaceholder');
        setText('#fetchYoulyLyricsBtn', 'fetchLyricsBtn');
        setText('#exportProjectBtn', 'exportProj');
        setText('#importProjectBtn', 'importProj');

        // Actions
        setText('#playBtn', 'previewBtn');
        setText('#exportBtn', 'exportBtn');

        const volLabel = document.querySelector('.action-buttons .volume-control')?.parentElement?.querySelector('span');
        if (volLabel && t('previewVol')) volLabel.textContent = t('previewVol');

        // Misc sections
        setText('.star-panel h3', 'enjoyingTitle');
        setText('.star-panel p', 'enjoyingDesc');
        setText('.star-panel a', 'starGithubPanel');

        setText('.instructions h2', 'howToTitle');
        const stepTitles = document.querySelectorAll('.step-card h3');
        const stepDescs = document.querySelectorAll('.step-card p');
        if (stepTitles[0]) stepTitles[0].innerHTML = t('step1Title') || stepTitles[0].innerHTML;
        if (stepTitles[1]) stepTitles[1].innerHTML = t('step2Title') || stepTitles[1].innerHTML;
        if (stepTitles[2]) stepTitles[2].innerHTML = t('step3Title') || stepTitles[2].innerHTML;
        if (stepTitles[3]) stepTitles[3].innerHTML = t('step4Title') || stepTitles[3].innerHTML;
        if (stepDescs[0]) stepDescs[0].innerHTML = t('step1Desc') || stepDescs[0].innerHTML;
        if (stepDescs[1]) stepDescs[1].innerHTML = t('step2Desc') || stepDescs[1].innerHTML;
        if (stepDescs[2]) stepDescs[2].innerHTML = t('step3Desc') || stepDescs[2].innerHTML;
        if (stepDescs[3]) stepDescs[3].innerHTML = t('step4Desc') || stepDescs[3].innerHTML;

        // Export Modal
        setText('.modal-content h2', 'modalTitle');
        setText('.modal-subtitle', 'modalSub');
        const modalTitles = document.querySelectorAll('.modal-card-title');
        const modalDescs = document.querySelectorAll('.modal-card-desc');
        if (modalTitles[0]) modalTitles[0].textContent = t('stayTab') || modalTitles[0].textContent;
        if (modalDescs[0]) modalDescs[0].textContent = t('stayTabDesc') || modalDescs[0].textContent;
        if (modalTitles[1]) modalTitles[1].textContent = t('keepActive') || modalTitles[1].textContent;
        if (modalDescs[1]) modalDescs[1].textContent = t('keepActiveDesc') || modalDescs[1].textContent;
        if (modalTitles[2]) modalTitles[2].textContent = t('hwFps') || modalTitles[2].textContent;
        if (modalDescs[2]) modalDescs[2].textContent = t('hwFpsDesc') || modalDescs[2].textContent;
        if (modalTitles[3]) modalTitles[3].textContent = t('private') || modalTitles[3].textContent;
        if (modalDescs[3]) modalDescs[3].textContent = t('privateDesc') || modalDescs[3].textContent;
        setText('label[for="exportResSelect"]', 'modalRes');
        setOptionText('#exportResSelect', '1080p', 'res1080');
        setOptionText('#exportResSelect', '720p', 'res720');
        setOptionText('#exportResSelect', '1440p', 'res1440');
        setOptionText('#exportResSelect', '4k', 'res4k');

        setText('label[for="exportQualitySelect"]', 'modalQuality');
        setOptionText('#exportQualitySelect', 'high', 'qualHigh');
        setOptionText('#exportQualitySelect', 'standard', 'qualStandard');
        setOptionText('#exportQualitySelect', 'ultra', 'qualUltra');
        setOptionText('#exportQualitySelect', 'max', 'qualMax');

        setText('label[for="exportFpsSelect"]', 'modalFps');
        setOptionText('#exportFpsSelect', '30', 'fps30');
        setOptionText('#exportFpsSelect', '60', 'fps60');
        setText('#cancelExportBtn', 'cancelBtn');
        setText('#confirmExportBtn', 'startExportBtn');

        // FAQ Section
        setText('.faq-panel h2', 'faqTitle');
        const faqTitles = document.querySelectorAll('.faq-card h3');
        const faqDescs = document.querySelectorAll('.faq-card p');
        for (let i = 0; i < 9; i++) {
            if (faqTitles[i] && t('faq' + (i + 1) + 'Title')) faqTitles[i].textContent = t('faq' + (i + 1) + 'Title');
            if (faqDescs[i] && t('faq' + (i + 1) + 'Desc')) faqDescs[i].innerHTML = t('faq' + (i + 1) + 'Desc');
        }

        // Footer
        setText('footer .disclaimer', 'disclaimer');
        setText('footer .ai-disclaimer', 'aiDisclaimer');
        const footerLinks = document.querySelectorAll('footer .github-link a');
        const svg0 = footerLinks[0]?.querySelector('svg')?.outerHTML || '';
        if (footerLinks[0] && t('starFooter')) footerLinks[0].innerHTML = svg0 + t('starFooter');
        if (footerLinks[1] && t('viewGithub')) footerLinks[1].textContent = t('viewGithub');
    }



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

    let audioContext = null;
    let audioBuffer = null;
    let audioSource = null;
    let gainNode = null;
    let volume = 1.0;
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
    let currentLyricAlignment = 'left';
    let currentFontSize = 60;
    let currentLineSpacing = 1.3;
    let currentVerticalOffset = 0;
    let currentLyricTransition = 'slide';
    
    // Background Video State
    let bgVideoUrl = null;
    let bgVideo = document.createElement('video');
    bgVideo.muted = true;
    bgVideo.loop = true;
    bgVideo.playsInline = true;
    bgVideo.crossOrigin = "anonymous";

    // Material You palette extracted from album cover
    let albumPalette = null; // Array of {r,g,b} objects
    let bgImageBase64 = null;
    let albumImageBase64 = null;
    let cachedBlurredAlbumCanvas = null;
    let bgOffscreenCanvas = null;
    let isRestoring = false;

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
        bpmMarkers = [{ time: 0, bpm: 0 }];
        if (typeof renderBpmList === 'function') renderBpmList();

        bgImage = null;
        albumImage = null;
        bgImageBase64 = null;
        albumImageBase64 = null;
        albumPalette = null;
        bgVideoUrl = null;
        bgVideo.src = "";
        bgOffscreenCanvas = null;
        cachedBlurredAlbumCanvas = null;

        // Reset Card UI States
        if (audioUploadCard) {
            audioUploadCard.className = 'upload-card';
            audioSubtitle.textContent = t('audioSub') || 'Click to select or drag audio here';
            audioSpinner.style.display = 'none';
        }
        if (lrcUploadCard) {
            lrcUploadCard.className = 'upload-card';
            lrcSubtitle.textContent = t('lrcSub') || 'Click to select or drag lyrics here';
        }
        if (bgUploadCard) {
            bgUploadCard.className = 'upload-card image-upload-card';
            bgPreview.style.backgroundImage = '';
            bgPreview.style.display = 'none';
            bgVideoPreview.style.display = 'none';
            bgVideoPreview.src = "";
            bgSubtitle.textContent = t('bgSub') || 'Click to select or drag image here';
        }
        if (albumUploadCard) {
            albumUploadCard.className = 'upload-card image-upload-card';
            albumPreview.style.backgroundImage = '';
            albumPreview.style.display = 'none';
            albumSubtitle.textContent = t('albumSub') || 'Click to select or drag image here';
        }

        // Reset personalization controls to default state
        bgStyleSelect.value = 'gradient';
        fontSelect.value = 'Outfit';
        lyricAlignmentSelect.value = 'left';
        fontSizeSlider.value = 60;
        fontSizeValue.textContent = '60px';
        lineSpacingSlider.value = 1.3;
        lineSpacingValue.textContent = '1.3x';
        verticalOffsetSlider.value = 0;
        verticalOffsetValue.textContent = '0px';
        lyricTransitionSelect.value = 'slide';
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
            statusMessage.textContent = `${t('lyricsLoaded') || 'Lyrics loaded'} (${lyrics.length} ${t('lines') || 'lines'}). ${t('waitAudio') || 'Waiting for audio to finish decoding...'}`;
            statusMessage.style.color = "#ec4899"; // highlight waiting
        } else if (hasAudio && !hasLyrics) {
            statusMessage.textContent = t('audioReady') || "Audio ready. Please upload or type lyrics.";
            statusMessage.style.color = "#6366f1";
        } else if (hasAudio && hasLyrics) {
            statusMessage.textContent = `${t('sysReady') || 'System Ready!'} (${lyrics.length} ${t('linesLoaded') || 'lines loaded'})`;
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

        const newTime = updateScrubber(e.clientX);
        const wasPlaying = isPlaying || isRecording;
        
        if (wasPlaying) {
            stopPlayback();
        }
        
        pausedTime = newTime;
        drawFrame(pausedTime);
        
        const onMouseMove = (moveEvent) => {
            pausedTime = updateScrubber(moveEvent.clientX);
            drawFrame(pausedTime);
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
                if (next) {
                    current.duration = next.time - current.time;
                } else if (audioBuffer) {
                    current.duration = Math.max(3.0, audioBuffer.duration - current.time);
                } else {
                    current.duration = 5.0;
                }

                if (animSelect === 'off') {
                    current.words = null;
                } else if (animSelect === 'on') {
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

    lyricAlignmentSelect.addEventListener('change', (e) => {
        currentLyricAlignment = e.target.value;
        drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
    });

    fontSizeSlider.addEventListener('input', (e) => {
        currentFontSize = parseInt(e.target.value);
        fontSizeValue.textContent = `${currentFontSize}px`;
        drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
    });

    lineSpacingSlider.addEventListener('input', (e) => {
        currentLineSpacing = parseFloat(e.target.value);
        lineSpacingValue.textContent = `${currentLineSpacing.toFixed(1)}x`;
        drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
    });

    verticalOffsetSlider.addEventListener('input', (e) => {
        currentVerticalOffset = parseInt(e.target.value);
        verticalOffsetValue.textContent = `${currentVerticalOffset}px`;
        drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
    });

    lyricTransitionSelect.addEventListener('change', (e) => {
        currentLyricTransition = e.target.value;
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

    if (resetStyleBtn) {
        resetStyleBtn.addEventListener('click', () => {
            // Reset only advanced style state variables
            currentFontSize = 60;
            currentLineSpacing = 1.3;
            currentVerticalOffset = 0;

            // Reset only advanced style UI control values
            fontSizeSlider.value = 60;
            fontSizeValue.textContent = '60px';
            lineSpacingSlider.value = 1.3;
            lineSpacingValue.textContent = '1.3x';
            verticalOffsetSlider.value = 0;
            verticalOffsetValue.textContent = '0px';

            // Trigger redraw canvas and save progress
            drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
            saveProgressToLocalStorage();
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

    function renderBpmList() {
        if (!bpmList) return;
        bpmList.innerHTML = '';
        bpmMarkers.sort((a, b) => a.time - b.time);

        bpmMarkers.forEach((marker, index) => {
            const isFirst = index === 0;

            const row = document.createElement('div');
            row.className = 'bpm-row';

            // Time badge
            const timeBadge = document.createElement('div');
            timeBadge.className = 'bpm-time' + (isFirst ? ' is-start' : '');
            timeBadge.textContent = isFirst ? 'Start' : formatDuration(marker.time);

            // BPM input
            const bpmInput = document.createElement('input');
            bpmInput.type = 'number';
            bpmInput.min = '20';
            bpmInput.max = '300';
            bpmInput.className = 'bpm-input';
            bpmInput.placeholder = '120';
            bpmInput.value = marker.bpm > 0 ? marker.bpm : '';

            bpmInput.addEventListener('input', (e) => {
                marker.bpm = parseFloat(e.target.value) || 0;
                drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
                saveProgressToLocalStorage();
            });

            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'bpm-remove-btn';
            removeBtn.title = 'Remove this BPM marker';
            removeBtn.textContent = '✕';
            removeBtn.style.visibility = isFirst ? 'hidden' : 'visible';

            if (!isFirst) {
                removeBtn.addEventListener('click', () => {
                    bpmMarkers.splice(index, 1);
                    renderBpmList();
                    drawFrame(isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : 0);
                    saveProgressToLocalStorage();
                });
            }

            row.appendChild(timeBadge);
            row.appendChild(bpmInput);
            row.appendChild(removeBtn);
            bpmList.appendChild(row);
        });
    }

    if (addBpmBtn) {
        addBpmBtn.addEventListener('click', () => {
            const ct = isPlaying || isRecording ? audioContext.currentTime - startTime + pausedTime : pausedTime;
            const exists = bpmMarkers.find(m => Math.abs(m.time - ct) < 0.1);
            if (!exists) {
                const { bpm } = getBeatInfo(ct, bpmMarkers);
                bpmMarkers.push({ time: ct, bpm: bpm > 0 ? bpm : 120 });
                bpmMarkers.sort((a, b) => a.time - b.time);
                renderBpmList();
                saveProgressToLocalStorage();
                // Briefly flash the new row to draw attention
                const rows = bpmList.querySelectorAll('.bpm-row');
                const newIdx = bpmMarkers.findIndex(m => Math.abs(m.time - ct) < 0.1);
                const newRow = rows[newIdx];
                if (newRow) {
                    newRow.style.background = 'rgba(99,102,241,0.18)';
                    newRow.style.borderColor = 'rgba(99,102,241,0.4)';
                    setTimeout(() => {
                        newRow.style.background = 'rgba(255,255,255,0.04)';
                        newRow.style.borderColor = 'rgba(255,255,255,0.06)';
                    }, 600);
                }
            }
        });
    }

    function syncBpmFromDom() {
        if (!bpmList) return;
        const inputs = bpmList.querySelectorAll('.bpm-input');
        inputs.forEach((input, i) => {
            if (bpmMarkers[i] !== undefined) {
                bpmMarkers[i].bpm = parseFloat(input.value) || 0;
            }
        });
    }

    function getBeatInfo(time, markers) {
        if (!markers || markers.length === 0) return { bpm: 0, phase: 0 };
        let beats = 0;
        let currentBpm = markers[0].bpm;
        let lastTime = 0;

        for (let i = 0; i < markers.length; i++) {
            const marker = markers[i];
            if (time < marker.time) {
                break;
            }
            if (i > 0) {
                const duration = marker.time - lastTime;
                beats += duration * (currentBpm / 60);
            }
            currentBpm = marker.bpm;
            lastTime = marker.time;
        }

        const duration = Math.max(0, time - lastTime);
        beats += duration * (currentBpm / 60);

        return {
            bpm: currentBpm,
            phase: beats % 1
        };
    }

    renderBpmList();

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

    // Drag and Drop global handlers
    let dragCounter = 0;

    function isFileDrag(e) {
        return e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files');
    }

    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        if (!isFileDrag(e)) return;
        dragCounter++;
        dropOverlay.classList.add('active');
    });

    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!isFileDrag(e)) return;
        dropOverlay.classList.add('active');
    });

    window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (!isFileDrag(e)) return;
        dragCounter--;
        if (dragCounter === 0) {
            dropOverlay.classList.remove('active');
        }
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!isFileDrag(e)) return;
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
            statusMessage.textContent = `${t('unrecognizedFile') || 'Unrecognized file type'}: ${file.name}`;
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
        const parserErrors = xmlDoc.getElementsByTagName('parsererror');
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

        // Fallback for XML parsing errors or 0 paragraphs returned
        if (paragraphs.length === 0 || parserErrors.length > 0) {
            const pRegex = /<p\b([^>]*)>([\s\S]*?)(?=<\/p>|<p\b|<\/div>|<\/body>|$)/gi;
            let pMatch;
            while ((pMatch = pRegex.exec(ttmlText)) !== null) {
                const attrs = pMatch[1];
                let content = pMatch[2].replace(/<\/p>$/i, '').trim();
                if (!content) continue;

                const beginM = attrs.match(/begin="([^"]+)"/i);
                if (!beginM) continue;
                const time = parseTime(beginM[1]);

                const spans = [];
                const spanRegex = /<span\b([^>]*)>([\s\S]*?)<\/span>/gi;
                let sMatch;
                while ((sMatch = spanRegex.exec(content)) !== null) {
                    const sAttrs = sMatch[1];
                    const sText = cleanSpanText(sMatch[2].replace(/<[^>]+>/g, ''));
                    const sBeginM = sAttrs.match(/begin="([^"]+)"/i);
                    const sEndM = sAttrs.match(/end="([^"]+)"/i);
                    const wTime = sBeginM ? parseTime(sBeginM[1]) : time;
                    const wEndTime = sEndM ? parseTime(sEndM[1]) : wTime + 1;
                    if (sText) {
                        spans.push({ text: sText, time: wTime, endTime: wEndTime, isBacking: false });
                    }
                }

                const fullText = spans.length > 0 ? spans.map(s => s.text).join(' ') : content.replace(/<[^>]+>/g, '').trim();
                if (fullText) {
                    parsed.push({
                        time,
                        text: fullText,
                        words: spans.length > 0 ? spans : null,
                        isBacking: false
                    });
                }
            }
            if (parsed.length > 0) return parsed;
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
            const size = 600;
            const x = 200;
            const y = 180; // Shifted up slightly to give title & credits more room below

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
        ctx.fillText(`zexerif.github.io/lyric-video-maker/    :    v1.7.0`, 40, 40);
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

            context.restore();

            const result = { mainLines, backingLines };
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

            const mainLineHeight = currentFontSize * currentLineSpacing;
            const backingLineHeight = (useBackingStyle ? backingFontSize : currentFontSize) * currentLineSpacing;
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

                // Calculate alignment offset for active tracking/clipping
                const textWidth = context.measureText(lineText).width;
                let startX = x;
                if (currentLyricAlignment === 'center') startX = x - textWidth / 2;
                else if (currentLyricAlignment === 'right') startX = x - textWidth;

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
            const gapBetween = (wrapped.mainLines.length > 0 && wrapped.backingLines.length > 0) ? 15 : 0;

            heights[j] = wrapped.mainLines.length * mainLineHeight + wrapped.backingLines.length * backingLineHeight + gapBetween;
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
            bpmMarkers: bpmMarkers,
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
        
        if (project.bpmMarkers) {
            bpmMarkers = project.bpmMarkers;
        } else if (project.songBpm !== undefined) {
            bpmMarkers = [{ time: 0, bpm: parseFloat(project.songBpm) || 0 }];
        }
        renderBpmList();

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
                bgSubtitle.style.color = 'var(--text-muted)';
                bgSubtitle.textContent = t('bgSub') || 'Click to select or drag image here';
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
                albumSubtitle.style.color = 'var(--text-muted)';
                albumSubtitle.textContent = t('albumSub') || 'Click to select or drag image here';
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

    // Set up Session Save Code handlers
    const copySaveCodeBtn = document.getElementById('copySaveCodeBtn');
    const loadSaveCodeBtn = document.getElementById('loadSaveCodeBtn');
    const saveCodeInput = document.getElementById('saveCodeInput');

    if (copySaveCodeBtn && saveCodeInput) {
        copySaveCodeBtn.addEventListener('click', () => {
            const project = serializeProjectData(false); // exclude images to keep size small
            try {
                const jsonStr = JSON.stringify(project);
                // URI encode before base64 to handle unicode characters securely
                const base64 = btoa(encodeURIComponent(jsonStr));
                saveCodeInput.value = base64;
                saveCodeInput.select();
                document.execCommand('copy');
                statusMessage.textContent = 'Save code copied to clipboard!';
                statusMessage.style.color = '#4ade80';
            } catch (err) {
                console.error('Error creating save code:', err);
                statusMessage.textContent = 'Error generating save code.';
                statusMessage.style.color = '#ef4444';
            }
        });
    }

    if (loadSaveCodeBtn && saveCodeInput) {
        loadSaveCodeBtn.addEventListener('click', () => {
            const code = saveCodeInput.value.trim();
            if (!code) return;
            try {
                const jsonStr = decodeURIComponent(atob(code));
                const project = JSON.parse(jsonStr);
                isRestoring = true;
                applyProjectData(project);
                isRestoring = false;
                saveProgressToLocalStorage();
                statusMessage.textContent = 'Session loaded from save code.';
                statusMessage.style.color = '#4ade80';
                saveCodeInput.value = '';
            } catch (err) {
                console.error('Failed to parse save code:', err);
                statusMessage.textContent = 'Invalid save code.';
                statusMessage.style.color = '#ef4444';
            }
        });
    }

    // =============================================
    // LYRIC FIXER SYSTEM
    // =============================================

    /**
     * Diagnoses an LRC/TTML text for common issues.
     * Returns an array of issue objects: { id, label, description, severity, count, fixFn }
     * fixFn(text) => fixedText
     */
    function diagnoseLrc(text) {
        const issues = [];
        const log = [];

        log.push('[Lyric Fixer] Starting analysis...');
        log.push(`[Lyric Fixer] Input size: ${text.length} characters`);

        // Detect TTML/XML early so all sections can use it
        const isTtml = text.trim().startsWith('<tt') || text.includes('http://www.w3.org/ns/ttml');
        if (isTtml) log.push('[Lyric Fixer] Detected TTML/XML format.');

        // ─── 1. BOM / Invisible Characters ──────────────────────────────────
        const BOM_REGEX = /^\uFEFF/;
        const ZERO_WIDTH_REGEX = /[\u200B\u200C\u200D\u2060\uFEFF]/g;
        const hasBom = BOM_REGEX.test(text);
        const invisibleMatches = text.match(ZERO_WIDTH_REGEX) || [];
        if (hasBom || invisibleMatches.length > 0) {
            const count = (hasBom ? 1 : 0) + invisibleMatches.length;
            log.push(`[Issue] BOM/invisible chars: found ${count} occurrence(s)`);
            issues.push({
                id: 'invisible',
                label: 'BOM / Invisible Characters',
                description: `Found ${count} hidden character(s) (BOM, zero-width spaces) that can cause garbled text.`,
                severity: 'error',
                count,
                fixFn: (t) => t.replace(ZERO_WIDTH_REGEX, '').replace(BOM_REGEX, '')
            });
        } else {
            log.push('[OK] No BOM or invisible characters found.');
        }

        // ─── 2. Line Ending Normalization ────────────────────────────────────
        const crlfCount = (text.match(/\r\n/g) || []).length;
        const crCount = (text.match(/\r(?!\n)/g) || []).length;
        if (crlfCount > 0 || crCount > 0) {
            log.push(`[Issue] Line endings: ${crlfCount} CRLF, ${crCount} lone CR found`);
            issues.push({
                id: 'lineendings',
                label: 'Non-Standard Line Endings',
                description: `Found ${crlfCount + crCount} Windows/old Mac line ending(s) (CRLF/CR). These can cause lines to be doubled or misread.`,
                severity: 'warning',
                count: crlfCount + crCount,
                fixFn: (t) => t.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
            });
        } else {
            log.push('[OK] Line endings are standard LF.');
        }

        // ─── 3–6. LRC-only checks (skipped for TTML/XML files) ─────────────────
        const lines = text.split('\n');
        if (!isTtml) {
            // ─── 3. Timestamp Format Normalization ───────────────────────────
            const missingDecimalRegex = /\[\d{1,2}:\d{2}(?!\.\d)(?!:)\]/g;
            const singleDigitMinuteRegex = /\[(?<!\d\d)\d(?!\d):\d{2}[.]\d{2,3}\]/g;
            const isMetadataTag = (s) => /^\[(?:ti|ar|al|by|offset|length|re|ve|#):/i.test(s);
            const missingDecimals = (text.match(missingDecimalRegex) || []).filter(s => !isMetadataTag(s));
            const singleDigitMinutes = text.match(singleDigitMinuteRegex) || [];
            const totalBadTs = new Set([...missingDecimals, ...singleDigitMinutes]).size;

            if (totalBadTs > 0) {
                log.push(`[Issue] Timestamp format: ${totalBadTs} non-standard timestamp(s) found`);
                log.push(`  Missing decimals: ${missingDecimals.length}, Single-digit minutes: ${singleDigitMinutes.length}`);
                issues.push({
                    id: 'timestamps',
                    label: 'Non-Standard Timestamp Format',
                    description: `Found ${totalBadTs} timestamp(s) with missing decimals or single-digit minutes (e.g. [1:05] → [01:05.00]).`,
                    severity: 'warning',
                    count: totalBadTs,
                    fixFn: (t) => {
                        t = t.replace(/\[(\d):(\d{2})\.(\d{2,3})\]/g, '[0$1:$2.$3]');
                        t = t.replace(/\[(\d{2}):(\d{2})\](?!\d)/g, '[$1:$2.00]');
                        return t;
                    }
                });
            } else {
                log.push('[OK] All timestamps are properly formatted.');
            }

            // ─── 4. Duplicate Lines (same timestamp + same text) ─────────────
            const seen = new Set();
            const duplicates = [];
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (seen.has(trimmed)) {
                    duplicates.push(trimmed);
                } else {
                    seen.add(trimmed);
                }
            }
            if (duplicates.length > 0) {
                log.push(`[Issue] Duplicate lines: ${duplicates.length} exact duplicate line(s) found`);
                issues.push({
                    id: 'duplicates',
                    label: 'Duplicate Lines',
                    description: `Found ${duplicates.length} line(s) that appear more than once with the exact same timestamp and text.`,
                    severity: 'warning',
                    count: duplicates.length,
                    fixFn: (t) => {
                        const seenLines = new Set();
                        return t.split('\n').filter(line => {
                            const trimmed = line.trim();
                            if (!trimmed) return true;
                            if (seenLines.has(trimmed)) return false;
                            seenLines.add(trimmed);
                            return true;
                        }).join('\n');
                    }
                });
            } else {
                log.push('[OK] No duplicate lines found.');
            }

            // ─── 6. Split Words Across Consecutive Timestamps ────────────────
            const timestampedLines = lines
                .map(l => {
                    const match = l.trim().match(/^(\[\d{1,2}:\d{2}[.:]\d{2,3}\])(.*)$/);
                    if (!match) return null;
                    const tsMatch = match[1].match(/\[(\d{1,2}):(\d{2})[.:](\d{2,3})\]/);
                    if (!tsMatch) return null;
                    const secs = parseInt(tsMatch[1]) * 60 + parseInt(tsMatch[2]) + parseInt(tsMatch[3]) * (tsMatch[3].length === 2 ? 0.01 : 0.001);
                    return { ts: secs, text: match[2].trim(), raw: l.trim() };
                })
                .filter(Boolean);

            let splitWordGroups = [];
            let i = 0;
            while (i < timestampedLines.length) {
                const current = timestampedLines[i];
                const isFragment = (
                    current.text.length >= 1 &&
                    current.text.length <= 4 &&
                    !/\s/.test(current.text) &&
                    !/^\[/.test(current.text) &&
                    !/^(I|a|an|to|go|oh|ah|so|my|we|he|she|it|is|in|on|at|be|do|no|yes|the|and|but|for|are|was|not|you|all|can|how|now|her|his|its|our|out|has|had|did|got|get|put|let|may|old|new|few|too|two|own|off|why|who|use|say|try|ask|see|run|age|big|far|end|set|add)$/i.test(current.text)
                );
                if (isFragment && i + 1 < timestampedLines.length) {
                    const next = timestampedLines[i + 1];
                    const timeDiff = next.ts - current.ts;
                    if (timeDiff < 0.8 && timeDiff >= 0) {
                        const merged = current.text + next.text;
                        if (!/\s/.test(merged) && merged.length > 2 && merged.length <= 20) {
                            splitWordGroups.push({ start: i, end: i + 1, merged });
                            i += 2;
                            continue;
                        }
                    }
                }
                i++;
            }

            if (splitWordGroups.length > 0) {
                log.push(`[Issue] Split words: ${splitWordGroups.length} group(s) of likely split words detected`);
                splitWordGroups.slice(0, 3).forEach(g => log.push(`  Would merge: "${timestampedLines[g.start].text}" + "${timestampedLines[g.start+1].text}" → "${g.merged}"`));
                issues.push({
                    id: 'splitwords',
                    label: 'Words Split Across Lines',
                    description: `Found ${splitWordGroups.length} pair(s) of consecutive lines where the text fragments look like a single word that was split (e.g. "se" + "kund" → "sekund").`,
                    severity: 'error',
                    count: splitWordGroups.length,
                    fixFn: (t) => {
                        const fixLines = t.split('\n');
                        const parsedForFix = fixLines
                            .map((l, idx) => {
                                const m = l.trim().match(/^(\[\d{1,2}:\d{2}[.:]\d{2,3}\])(.*)$/);
                                if (!m) return null;
                                const tsM = m[1].match(/\[(\d{1,2}):(\d{2})[.:](\d{2,3})\]/);
                                if (!tsM) return null;
                                const secs = parseInt(tsM[1]) * 60 + parseInt(tsM[2]) + parseInt(tsM[3]) * (tsM[3].length === 2 ? 0.01 : 0.001);
                                return { ts: secs, text: m[2].trim(), timestamp: m[1], lineIdx: idx };
                            })
                            .filter(Boolean);

                        const skipIndices = new Set();
                        const replacements = {};

                        for (let j = 0; j < parsedForFix.length; j++) {
                            const cur = parsedForFix[j];
                            if (skipIndices.has(cur.lineIdx)) continue;
                            const isFrag = (cur.text.length <= 4 && !/\s/.test(cur.text) && cur.text.length > 0);
                            if (isFrag && j + 1 < parsedForFix.length) {
                                const nxt = parsedForFix[j + 1];
                                const diff = nxt.ts - cur.ts;
                                if (diff < 0.8 && diff >= 0) {
                                    const merged = cur.text + nxt.text;
                                    if (!/\s/.test(merged) && merged.length > 2 && merged.length <= 20) {
                                        replacements[cur.lineIdx] = `${cur.timestamp}${merged}`;
                                        skipIndices.add(nxt.lineIdx);
                                    }
                                }
                            }
                        }

                        return fixLines
                            .map((line, idx) => {
                                if (skipIndices.has(idx)) return null;
                                if (replacements[idx] !== undefined) return replacements[idx];
                                return line;
                            })
                            .filter(l => l !== null)
                            .join('\n');
                    }
                });
            } else {
                log.push('[OK] No split words detected.');
            }

        } else {
            log.push('[OK] Skipping LRC-specific checks (TTML file — timestamps/duplicates/split-words not applicable).');
        }

        // ─── 7. Word-Karaoke Tags in LRC (inline <word> tags or <timestamp> tags) ─
        const karaokeLrcTagRegex = /<\d{2}:\d{2}[.:]\d{2,3}>|<\/?[a-zA-Z][a-zA-Z0-9]*>/g;
        const kaorakeTags = text.match(karaokeLrcTagRegex) || [];
        // Only flag if not TTML (isTtml defined at top of function)
        if (!isTtml && kaorakeTags.length > 0) {
            log.push(`[Issue] Word-karaoke tags: ${kaorakeTags.length} inline karaoke tag(s) found in LRC`);
            issues.push({
                id: 'karaokeTags',
                label: 'Inline Karaoke Tags (LRC Enhanced)',
                description: `Found ${kaorakeTags.length} word-level timing tag(s) (e.g. <00:10.50>) embedded in plain LRC lines. These are "Enhanced LRC" karaoke tags. Strip them to get clean text, or keep them if you want word-by-word animation.`,
                severity: 'info',
                count: kaorakeTags.length,
                fixFn: (t) => t.replace(karaokeLrcTagRegex, '')
            });
        } else if (!isTtml) {
            log.push('[OK] No embedded karaoke tags found.');
        }

        // ─── 8. TTML-Specific Structural Checks ──────────────────────────────
        if (isTtml) {
            // Check DOMParser XML validity
            const xmlTestDoc = (new DOMParser()).parseFromString(text, 'text/xml');
            const parserErrorNodes = xmlTestDoc.getElementsByTagName('parsererror');
            
            // Count open vs close tags for <p>, <div>, <span>
            const openP  = (text.match(/<p\b[^>]*>/g)    || []).length;
            const closeP = (text.match(/<\/p>/g)          || []).length;
            const openDiv  = (text.match(/<div\b[^>]*>/g) || []).length;
            const closeDiv = (text.match(/<\/div>/g)       || []).length;
            const openSpan  = (text.match(/<span\b[^>]*>/g) || []).length;
            const closeSpan = (text.match(/<\/span>/g)       || []).length;

            log.push(`[TTML] <p>: ${openP} open, ${closeP} close | <div>: ${openDiv} open, ${closeDiv} close | <span>: ${openSpan} open, ${closeSpan} close`);

            const hasOrphanP = closeP > openP || (text.match(/(<div\b[^>]*>)\s*<\/p>/gi) !== null) || (text.match(/(<\/p>\s*)<\/p>/gi) !== null);
            const hasOrphanDiv = closeDiv > openDiv;

            // ── XML Syntax & Orphan Tag Check ────────────────────────────────
            if (parserErrorNodes.length > 0 || hasOrphanP || hasOrphanDiv) {
                const errCount = Math.max(1, parserErrorNodes.length, Math.abs(closeP - openP), Math.abs(closeDiv - openDiv));
                log.push(`[Issue] TTML: XML syntax error or orphan closing tag detected (${errCount} found)`);
                issues.push({
                    id: 'ttml_xml_syntax',
                    label: 'Malformed XML / Misplaced Tags',
                    description: `Found ${errCount} XML syntax error(s) or orphan tag(s) (such as misplaced </p> or </div> tags). This causes TTML parsing to fail completely.`,
                    severity: 'error',
                    count: errCount,
                    fixFn: (t) => {
                        // Remove orphan </p> immediately following <div...>
                        t = t.replace(/(<div\b[^>]*>)\s*<\/p>/gi, '$1');
                        // Remove consecutive redundant </p></p>
                        t = t.replace(/(<\/p>\s*)<\/p>/gi, '$1');
                        // Fix unclosed <p> tags
                        t = t.replace(/(<p\b[^>]*>[\s\S]*?)(?=<p\b|<\/div>|<\/body>|<\/tt>)/gi, (match) => {
                            if (match.includes('</p>')) return match;
                            return match.trimEnd() + '\n      </p>\n      ';
                        });
                        // Fix unclosed <div> tags
                        t = t.replace(/(<div\b[^>]*>[\s\S]*?)(?=<div\b|<\/body>|<\/tt>)/gi, (match) => {
                            if (match.includes('</div>')) return match;
                            return match.trimEnd() + '\n    </div>\n    ';
                        });
                        return t;
                    }
                });
            } else {
                log.push('[OK] TTML XML structure is valid.');
            }

            // ── Unclosed <p> tags ────────────────────────────────────────────
            const missingCloseP = openP - closeP;
            if (missingCloseP > 0) {
                log.push(`[Issue] TTML: ${missingCloseP} unclosed <p> tag(s) — missing </p>`);
                issues.push({
                    id: 'ttml_unclosed_p',
                    label: 'Unclosed <p> Tags',
                    description: `Found ${missingCloseP} <p> element(s) that are never closed with </p>. This breaks TTML parsing and may cause lyrics to display incorrectly or not at all.`,
                    severity: 'error',
                    count: missingCloseP,
                    fixFn: (t) => {
                        return t.replace(/(<p\b[^>]*>[\s\S]*?)(?=<p\b|<\/div>|<\/body>|<\/tt>)/gi, (match) => {
                            if (match.includes('</p>')) return match;
                            return match.trimEnd() + '\n      </p>\n      ';
                        });
                    }
                });
            } else {
                log.push('[OK] All <p> tags are properly closed.');
            }

            // ── Unclosed <div> tags ──────────────────────────────────────────
            const missingCloseDiv = openDiv - closeDiv;
            if (missingCloseDiv > 0) {
                log.push(`[Issue] TTML: ${missingCloseDiv} unclosed <div> tag(s) — missing </div>`);
                issues.push({
                    id: 'ttml_unclosed_div',
                    label: 'Unclosed <div> Tags',
                    description: `Found ${missingCloseDiv} <div> element(s) that are never closed with </div>. This is invalid XML and will cause TTML parsing errors.`,
                    severity: 'error',
                    count: missingCloseDiv,
                    fixFn: (t) => {
                        return t.replace(/(<div\b[^>]*>[\s\S]*?)(?=<div\b|<\/body>|<\/tt>)/gi, (match) => {
                            if (match.includes('</div>')) return match;
                            return match.trimEnd() + '\n    </div>\n    ';
                        });
                    }
                });
            } else {
                log.push('[OK] All <div> tags are properly closed.');
            }

            // ── Unclosed <span> tags ─────────────────────────────────────────
            const missingCloseSpan = openSpan - closeSpan;
            if (missingCloseSpan > 0) {
                log.push(`[Issue] TTML: ${missingCloseSpan} unclosed <span> tag(s) — missing </span>`);
                issues.push({
                    id: 'ttml_unclosed_span',
                    label: 'Unclosed <span> Tags',
                    description: `Found ${missingCloseSpan} <span> element(s) missing a closing </span>. This breaks the lyric text content for those lines.`,
                    severity: 'error',
                    count: missingCloseSpan,
                    fixFn: (t) => {
                        return t.replace(
                            /(<span\b[^>]*>)([\s\S]*?)(?=<\/p>)/gi,
                            (match, openTag, content) => {
                                if (content.includes('</span>')) return match;
                                return openTag + content + '</span>';
                            }
                        );
                    }
                });
            } else {
                log.push('[OK] All <span> tags are properly closed.');
            }

            // ── Overlapping / out-of-order timestamps ────────────────────────
            const ttmlTimestamps = [];
            const tsAttr = /begin="(\d{2}):(\d{2}):(\d{2})\.(\d+)"/g;
            let tsM;
            while ((tsM = tsAttr.exec(text)) !== null) {
                const secs = parseInt(tsM[1]) * 3600 + parseInt(tsM[2]) * 60 + parseInt(tsM[3]) + parseFloat('0.' + tsM[4]);
                ttmlTimestamps.push(secs);
            }
            let outOfOrder = 0;
            for (let idx = 1; idx < ttmlTimestamps.length; idx += 2) {
                // Check begin times only (every other: begin, end, begin, end...)
                if (idx + 1 < ttmlTimestamps.length && ttmlTimestamps[idx + 1] < ttmlTimestamps[idx - 1]) {
                    outOfOrder++;
                }
            }
            if (outOfOrder > 0) {
                log.push(`[Issue] TTML: ${outOfOrder} timestamp(s) appear out of chronological order`);
                issues.push({
                    id: 'ttml_out_of_order',
                    label: 'Out-of-Order Timestamps',
                    description: `Found ${outOfOrder} place(s) where a lyric line's begin time is before the previous line's begin time. This can cause lyrics to display out of sync. (Manual correction recommended.)`,
                    severity: 'warning',
                    count: outOfOrder,
                    fixFn: (t) => t // No auto-fix — user must correct timing manually
                });
            } else {
                log.push('[OK] All TTML timestamps are in chronological order.');
            }
        }

        log.push(`[Lyric Fixer] Analysis complete. Found ${issues.length} issue(s).`);

        return { issues, log };
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

    // Severity badge styling
    function getSeverityStyle(severity) {
        if (severity === 'error') return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', color: '#f87171', label: 'Critical' };
        if (severity === 'warning') return { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.4)', color: '#fde047', label: 'Warning' };
        return { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.4)', color: '#a5b4fc', label: 'Info' };
    }

    // ─── Fix Lyrics Modal Logic ──────────────────────────────────────────────

    const fixLyricsModal = document.getElementById('fixLyricsModal');
    const fixIssueList = document.getElementById('fixIssueList');
    const fixNoIssuesMsg = document.getElementById('fixNoIssuesMsg');
    const applyFixBtn = document.getElementById('applyFixBtn');
    const cancelFixBtn = document.getElementById('cancelFixBtn');
    const fixLyricsBtn = document.getElementById('fixLyricsBtn');
    const diagIssueList = document.getElementById('diagIssueList');
    const diagLog = document.getElementById('diagLog');
    const diagRunFixBtn = document.getElementById('diagRunFixBtn');
    const advancedModeToggle = document.getElementById('advancedModeToggle');
    const diagnosticsTabBtn = document.getElementById('diagnosticsTabBtn');

    let lastDiagnosisResult = null;
    let fixAnalysisTimeout = null;
    let fixProgressInterval = null;

    function calculateFixDelay(text) {
        if (!text || !text.trim()) return 600;
        const lineCount = text.split(/\r?\n/).filter(line => line.trim().length > 0).length;
        const delay = 600 + (lineCount * 12) + Math.floor(Math.random() * 150);
        return Math.min(3500, Math.max(700, delay));
    }

    function runDiagnosis() {
        const text = lrcEditor.value;
        if (!text.trim()) {
            return { issues: [], log: ['[Lyric Fixer] No lyric content loaded.'] };
        }
        return diagnoseLrc(text);
    }

    function openFixModal() {
        fixLyricsModal.classList.add('active');

        const text = lrcEditor.value || '';
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        const lineCount = lines.length;
        const totalDelay = calculateFixDelay(text);

        const fixScanningState = document.getElementById('fixScanningState');
        const fixScanningText = document.getElementById('fixScanningText');
        const fixScanningSubtext = document.getElementById('fixScanningSubtext');
        const fixProgressBar = document.getElementById('fixProgressBar');
        const fixModalSubtitle = document.getElementById('fixModalSubtitle');

        if (fixScanningState) fixScanningState.style.display = 'block';
        if (fixIssueList) fixIssueList.style.display = 'none';
        if (fixNoIssuesMsg) fixNoIssuesMsg.style.display = 'none';
        if (applyFixBtn) applyFixBtn.disabled = true;

        if (fixModalSubtitle) {
            fixModalSubtitle.textContent = lineCount > 0 
                ? `Analyzing ${lineCount} line${lineCount !== 1 ? 's' : ''} of lyric data for timing and formatting issues...`
                : 'Analyzing empty lyric file...';
        }

        const steps = [
            `Scanning ${lineCount} lines & parsing timestamps...`,
            `Detecting unintended line splits & line breaks...`,
            `Checking iTunes tags & TTML span markup...`,
            `Verifying timecode alignment & syntax...`,
            `Finalizing analysis results...`
        ];

        const startTime = Date.now();
        if (fixProgressInterval) clearInterval(fixProgressInterval);
        if (fixAnalysisTimeout) clearTimeout(fixAnalysisTimeout);

        if (fixProgressBar) fixProgressBar.style.width = '0%';

        fixProgressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(95, Math.round((elapsed / totalDelay) * 100));
            if (fixProgressBar) fixProgressBar.style.width = progress + '%';

            const stepIdx = Math.min(steps.length - 1, Math.floor((elapsed / totalDelay) * steps.length));
            if (fixScanningText) fixScanningText.textContent = `Analyzing lyrics (${progress}%)...`;
            if (fixScanningSubtext) fixScanningSubtext.textContent = steps[stepIdx];
        }, 60);

        fixAnalysisTimeout = setTimeout(() => {
            clearInterval(fixProgressInterval);
            if (fixProgressBar) fixProgressBar.style.width = '100%';

            setTimeout(() => {
                const result = runDiagnosis();
                lastDiagnosisResult = result;

                updateDiagnosticsPanel(result);

                if (fixScanningState) fixScanningState.style.display = 'none';
                if (fixModalSubtitle) {
                    fixModalSubtitle.textContent = result.issues.length > 0 
                        ? `The fixer analyzed ${lineCount} lines and found ${result.issues.length} issue(s). Select the fixes to apply:` 
                        : `Analysis complete for ${lineCount} lines of lyrics.`;
                }

                buildFixModal(result.issues);
            }, 120);
        }, totalDelay);
    }

    function buildFixModal(issues) {
        if (issues.length === 0) {
            fixIssueList.style.display = 'none';
            fixNoIssuesMsg.style.display = 'block';
            applyFixBtn.disabled = true;
            return;
        }

        fixIssueList.style.display = 'flex';
        fixNoIssuesMsg.style.display = 'none';
        fixIssueList.innerHTML = '';

        issues.forEach((issue, idx) => {
            const style = getSeverityStyle(issue.severity);
            const checkId = `fix-check-${idx}`;
            const row = document.createElement('label');
            row.htmlFor = checkId;
            row.style.cssText = `display: flex; gap: 0.75rem; align-items: flex-start; cursor: pointer; background: ${style.bg}; border: 1px solid ${style.border}; border-radius: 10px; padding: 0.75rem 1rem;`;

            row.innerHTML = `
                <input type="checkbox" id="${checkId}" data-fix-id="${issue.id}" checked
                    style="margin-top: 3px; cursor: pointer; flex-shrink: 0; width: auto; height: auto; accent-color: var(--theme-primary);">
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">${escapeHtml(issue.label)}</span>
                        <span style="font-size: 0.7rem; font-weight: 700; padding: 0.1rem 0.5rem; border-radius: 20px; background: ${style.bg}; border: 1px solid ${style.border}; color: ${style.color};">${style.label}</span>
                        <span style="font-size: 0.75rem; color: ${style.color}; font-family: monospace;">(${issue.count} found)</span>
                    </div>
                    <p style="margin: 0.3rem 0 0 0; font-size: 0.82rem; color: var(--text-muted); line-height: 1.5;">${escapeHtml(issue.description)}</p>
                </div>
            `;
            fixIssueList.appendChild(row);
        });

        applyFixBtn.disabled = false;
    }

    function updateDiagnosticsPanel(result) {
        if (!diagLog || !diagIssueList) return;

        // Update log
        diagLog.textContent = result.log.join('\n');
        diagLog.scrollTop = diagLog.scrollHeight;

        // Update issue list
        if (result.issues.length === 0) {
            diagIssueList.innerHTML = '<span style="color: #4ade80;">✅ No issues found. Your lyric file looks clean!</span>';
            return;
        }
        diagIssueList.innerHTML = '';
        result.issues.forEach(issue => {
            const style = getSeverityStyle(issue.severity);
            const item = document.createElement('div');
            item.style.cssText = `display: flex; gap: 0.5rem; align-items: center; padding: 0.4rem 0.6rem; background: ${style.bg}; border: 1px solid ${style.border}; border-radius: 8px; font-size: 0.82rem;`;
            item.innerHTML = `<span style="color: ${style.color}; font-weight: 700;">[${style.label}]</span> <span style="color: var(--text-main);">${escapeHtml(issue.label)}</span> <span style="color: var(--text-muted); font-family: monospace;">${issue.count} found</span>`;
            diagIssueList.appendChild(item);
        });
    }

    function applySelectedFixes() {
        if (!lastDiagnosisResult) return;

        const checkedIds = new Set();
        fixIssueList.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
            checkedIds.add(cb.dataset.fixId);
        });

        if (checkedIds.size === 0) {
            if (statusMessage) {
                statusMessage.textContent = 'No fixes selected.';
                statusMessage.style.color = '#fbbf24';
            }
            return;
        }

        let text = lrcEditor.value;
        const applied = [];

        lastDiagnosisResult.issues.forEach(issue => {
            if (checkedIds.has(issue.id)) {
                text = issue.fixFn(text);
                applied.push(issue.label);
            }
        });

        lrcEditor.value = text;
        updateLyricsFromEditor();

        // Re-run diagnosis to update diagnostics panel
        const newResult = runDiagnosis();
        lastDiagnosisResult = newResult;
        updateDiagnosticsPanel(newResult);
        buildFixModal(newResult.issues);

        if (statusMessage) {
            statusMessage.textContent = `✅ Applied ${applied.length} fix(es): ${applied.join(', ')}.`;
            statusMessage.style.color = '#4ade80';
        }

        // Show visual confirmation on button then close modal cleanly
        if (applyFixBtn) {
            applyFixBtn.textContent = '✅ Fixes Applied!';
            applyFixBtn.style.background = '#22c55e';
            applyFixBtn.disabled = true;
        }

        setTimeout(() => {
            if (fixLyricsModal) fixLyricsModal.classList.remove('active');
            if (applyFixBtn) {
                applyFixBtn.textContent = 'Apply Selected Fixes';
                applyFixBtn.style.background = '';
                applyFixBtn.disabled = false;
            }
        }, 400);
    }

    if (fixLyricsBtn) {
        fixLyricsBtn.addEventListener('click', openFixModal);
    }

    if (cancelFixBtn) {
        cancelFixBtn.addEventListener('click', () => {
            if (fixAnalysisTimeout) clearTimeout(fixAnalysisTimeout);
            if (fixProgressInterval) clearInterval(fixProgressInterval);
            fixLyricsModal.classList.remove('active');
        });
    }

    if (applyFixBtn) {
        applyFixBtn.addEventListener('click', applySelectedFixes);
    }

    // Close modal on backdrop click
    if (fixLyricsModal) {
        fixLyricsModal.addEventListener('click', (e) => {
            if (e.target === fixLyricsModal) {
                if (fixAnalysisTimeout) clearTimeout(fixAnalysisTimeout);
                if (fixProgressInterval) clearInterval(fixProgressInterval);
                fixLyricsModal.classList.remove('active');
            }
        });
    }

    // Advanced Mode toggle: show/hide Diagnostics tab
    if (advancedModeToggle && diagnosticsTabBtn) {
        // Synchronize initial state on page load
        diagnosticsTabBtn.style.display = advancedModeToggle.checked ? '' : 'none';

        advancedModeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                diagnosticsTabBtn.style.display = '';
            } else {
                // If on the diagnostics tab, switch to style
                if (document.getElementById('tab-diagnostics').classList.contains('active')) {
                    document.querySelector('.tab-btn[data-tab="tab-style"]').click();
                }
                diagnosticsTabBtn.style.display = 'none';
            }
        });
    }

    // Diagnostics panel "Run Fixer Now" button
    if (diagRunFixBtn) {
        diagRunFixBtn.addEventListener('click', () => {
            const originalText = diagRunFixBtn.textContent;
            diagRunFixBtn.disabled = true;
            diagRunFixBtn.textContent = '⏳ Analyzing...';

            const text = lrcEditor.value || '';
            const delay = calculateFixDelay(text);

            setTimeout(() => {
                const result = runDiagnosis();
                lastDiagnosisResult = result;
                updateDiagnosticsPanel(result);
                diagRunFixBtn.disabled = false;
                diagRunFixBtn.textContent = originalText;
            }, delay);
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
                const lineText = line.text || '';
                if (syllabus.length > 0) {
                    let charIndex = 0;
                    syllabus.forEach(w => {
                        const wStart = (w.time / 1000).toFixed(3);
                        const wEnd = ((w.time + (w.duration || 0)) / 1000).toFixed(3);
                        
                        let syllableText = w.text || '';
                        const cleanSyllable = syllableText.trim();
                        
                        if (cleanSyllable !== '') {
                            const pos = lineText.toLowerCase().indexOf(cleanSyllable.toLowerCase(), charIndex);
                            if (pos !== -1) {
                                charIndex = pos + cleanSyllable.length;
                                if (charIndex < lineText.length && /\s/.test(lineText[charIndex])) {
                                    if (!syllableText.endsWith(' ') && !syllableText.endsWith('\u00A0')) {
                                        syllableText += ' ';
                                    }
                                    charIndex++;
                                }
                            }
                        }
                        
                        const escapedText = syllableText
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

    function sanitizeSongTitle(title) {
        if (!title) return '';
        return title
            .replace(/\([^)]*(?:remaster|deluxe|version|edition|live|bonus|explicit|feat\.|ft\.)[^)]*\)/gi, '')
            .replace(/\[[^\]]*(?:remaster|deluxe|version|edition|live|bonus|explicit|feat\.|ft\.)[^\]]*\]/gi, '')
            .replace(/-\s*(?:remastered|remaster|deluxe|single|ep).*$/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async function fetchLyricsWithFallback(title, artist) {
        const rawTitle = (title || '').trim();
        const rawArtist = (artist || '').trim();

        const cleanTitle = sanitizeSongTitle(rawTitle) || rawTitle;
        const cleanArtist = sanitizeSongTitle(rawArtist) || rawArtist;

        const titleVariants = [cleanTitle];
        if (rawTitle !== cleanTitle) titleVariants.push(rawTitle);

        const artistVariants = [cleanArtist];
        if (rawArtist !== cleanArtist && cleanArtist !== '') artistVariants.push(rawArtist);
        if (!artistVariants.includes('')) artistVariants.push(''); // Also try title without artist requirement

        // 1. Primary: Try LRCLIB API (/api/get) with variants
        for (const t of titleVariants) {
            for (const a of artistVariants) {
                try {
                    const getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(t)}${a ? '&artist_name=' + encodeURIComponent(a) : ''}`;
                    console.log(`Trying LRCLIB get: ${getUrl}`);
                    const res = await fetch(getUrl);
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.syncedLyrics && data.syncedLyrics.trim()) {
                            return { text: data.syncedLyrics, source: 'LRCLIB' };
                        }
                    }
                } catch (err) {
                    console.warn('LRCLIB get fetch error:', err.message);
                }
            }
        }

        // 2. Primary fallback: Try LRCLIB Search API (/api/search) with search query
        for (const t of titleVariants) {
            for (const a of artistVariants) {
                try {
                    const query = `${a} ${t}`.trim();
                    if (!query) continue;
                    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
                    console.log(`Trying LRCLIB search: ${searchUrl}`);
                    const res = await fetch(searchUrl);
                    if (res.ok) {
                        const results = await res.json();
                        if (Array.isArray(results)) {
                            const match = results.find(item => item && item.syncedLyrics && item.syncedLyrics.trim());
                            if (match) {
                                return { text: match.syncedLyrics, source: 'LRCLIB' };
                            }
                        }
                    }
                } catch (err) {
                    console.warn('LRCLIB search fetch error:', err.message);
                }
            }
        }

        // 3. Secondary: Try YouLy+ / LyricsPlus backend instances
        for (const t of titleVariants) {
            for (const a of artistVariants) {
                const queryParams = `title=${encodeURIComponent(t)}&artist=${encodeURIComponent(a)}`;
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
                                const lyricsText = convertYoulyToText(data);
                                return { text: lyricsText, source: data.type === 'Word' ? 'YouLy+ (Word-synced TTML)' : 'YouLy+ (LRC)' };
                            }
                        } catch (err) {
                            console.warn(`Fetch error for ${url}:`, err.message);
                        }
                    }
                }
            }
        }

        throw new Error('No synced lyrics could be found on any available lyric databases (LRCLIB / YouLy+).');
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

        statusMessage.textContent = `Searching synced lyrics for "${title}"...`;
        statusMessage.style.color = '#6366f1';

        try {
            const { text, source } = await fetchLyricsWithFallback(title, artist);
            lrcEditor.value = text;
            updateLyricsFromEditor();
            saveProgressToLocalStorage();

            statusMessage.textContent = `✅ Successfully loaded synced lyrics from ${source}!`;
            statusMessage.style.color = '#4ade80';
        } catch (err) {
            console.warn('Synced Lyrics Fetch failed:', err);
            if (forceManual) {
                statusMessage.textContent = err.message || 'Failed to retrieve synced lyrics.';
                statusMessage.style.color = '#ef4444';
            } else {
                // Decoupled background fetch error does not discard iTunes metadata success status
                statusMessage.textContent = 'Song details and artwork loaded. (No synced lyrics found)';
                statusMessage.style.color = '#ec4899';
            }
        } finally {
            if (fetchYoulyLyricsBtn) {
                fetchYoulyLyricsBtn.disabled = false;
                if (typeof updateTranslations === 'function') {
                    setText('#fetchYoulyLyricsBtn', 'fetchLyricsBtn');
                } else {
                    fetchYoulyLyricsBtn.textContent = '🔍 Fetch Synced Lyrics';
                }
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

    if (renderEngineSelect) {
        renderEngineSelect.addEventListener('change', () => {
            if (renderEngineWarning) {
                renderEngineWarning.style.display = renderEngineSelect.value === 'native' ? 'block' : 'none';
            }
            drawFrame(0);
        });
    }

    // Apply language on load & draw initial canvas preview
    applyLanguage(currentLanguage);
    drawFrame(0);
});
