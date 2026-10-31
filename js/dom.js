/* DOM element references shared by every module. */

const audioInput = document.getElementById('audioInput');
const itunesSearchInput = document.getElementById('itunesSearchInput');
const itunesSearchBtn = document.getElementById('itunesSearchBtn');
const itunesSearchResults = document.getElementById('itunesSearchResults');
const itunesAutoLyricsToggle = document.getElementById('itunesAutoLyricsToggle');
const lyricsSearchInput = document.getElementById('lyricsSearchInput');
const lyricsSearchBtn = document.getElementById('lyricsSearchBtn');
const lyricsSearchResults = document.getElementById('lyricsSearchResults');
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

const backingVocalsAlongsideToggle = document.getElementById('backingVocalsAlongside');
const whatsNewBtn = document.getElementById('whatsNewBtn');
const whatsNewModal = document.getElementById('whatsNewModal');
const closeWhatsNewBtn = document.getElementById('closeWhatsNewBtn');
const closeWhatsNewBtn2 = document.getElementById('closeWhatsNewBtn2');
