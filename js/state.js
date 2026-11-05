/* Shared mutable application state. */

let audioContext = null;
let audioBuffer = null;
let audioSource = null;
let gainNode = null;
let volume = 1.0;
let audioFileBase64 = null;
let audioFileName = '';
let lyrics = [];
let bgImage = null;
let albumImage = null;
let isPlaying = false;
let isRecording = false;
let startTime = 0;
let pausedTime = 0;
let playbackRate = 1.0;
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
let currentAudioReactive = 'none'; // 'none', 'spectrum', 'pulseArtwork', 'ambientBreathe'
let currentDualLanguage = 'auto'; // 'auto', 'hide'
let currentSubLyricScale = 0.65;

// Audio analyser state for reactive visuals
let audioAnalyser = null;
let audioDataArray = null;

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

let mediaRecorder = null;
let recordedChunks = [];
let destination = null;
