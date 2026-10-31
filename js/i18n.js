/* Localisation helpers (t, applyLanguage). */

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
    setText('#itunesAutoLyricsLabel', 'itunesAutoLyricsLabel');
    setText('#lyricsSearchLabel', 'lyricsSearchLabel');
    setPlaceholder('#lyricsSearchInput', 'lyricsSearchPlaceholder');
    setText('#lyricsSearchBtn', 'searchBtn');
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
    setText('#backingVocalsAlongsideLabel', 'backingAlongsideLabel');
    setText('#backingVocalsAlongsideHint', 'backingAlongsideHint');

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
