/* Test Suite for Lyric Video Generator Enhancements */
const fs = require('fs');
const assert = require('assert');

// Mock DOM & browser globals for testing
global.window = global;
global.document = {
    getElementById: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => ({
        getContext: () => ({
            clearRect: () => {},
            fillRect: () => {},
            fillText: () => {},
            measureText: (text) => ({ width: text.length * 10 }),
            save: () => {},
            restore: () => {},
            beginPath: () => {},
            roundRect: () => {},
            clip: () => {},
            scale: () => {},
            translate: () => {},
            drawImage: () => {}
        }),
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        setAttribute: () => {},
        addEventListener: () => {},
        style: {}
    }),
    body: { style: {} }
};
global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
};

// Load modules in global context
const vm = require('vm');
const appDir = 'c:/Users/quinn/.gemini/antigravity/scratch/lyric-video-generator';
const loadScript = (file) => vm.runInThisContext(fs.readFileSync(appDir + '/' + file, 'utf8'));

loadScript('translations.js');
loadScript('js/utils.js');
loadScript('js/state.js');
loadScript('js/parsers.js');
loadScript('js/presets.js');
loadScript('js/history.js');
loadScript('js/studio.js');

console.log('Testing Parsers...');
// Test 1: Standard LRC
const lrc1 = '[00:01.00]Hello World\n[00:03.50]Second Line';
const parsed1 = parseLrc(lrc1);
assert.strictEqual(parsed1.length, 2);
assert.strictEqual(parsed1[0].time, 1);
assert.strictEqual(parsed1[0].text, 'Hello World');
assert.strictEqual(parsed1[1].time, 3.5);

// Test 2: Dual-language with delimiter //
const lrcDual = '[00:05.00]君の名は // Your Name';
const parsedDual = parseLrc(lrcDual);
assert.strictEqual(parsedDual.length, 1);
assert.strictEqual(parsedDual[0].text, '君の名は');
assert.strictEqual(parsedDual[0].subText, 'Your Name');

// Test 3: Dual-language with identical timestamps
const lrcDual2 = '[00:10.00]Original Line\n[00:10.00]Translated Line';
const parsedDual2 = parseLrc(lrcDual2);
assert.strictEqual(parsedDual2.length, 1);
assert.strictEqual(parsedDual2[0].text, 'Original Line');
assert.strictEqual(parsedDual2[0].subText, 'Translated Line');


// Test 4: ASS Subtitle Detection and Parsing
const sampleAss = `[Script Info]
Title: Sample
ScriptType: v4.00+

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:03.29,0:00:04.35,Chorus,,0,0,0,,{\\k26}(It's {\\k18}all {\\k18}for {\\k19}the {\\k26}vibe)
Dialogue: 0,0:00:06.24,0:00:08.46,Default,,0,0,0,,{\\k19}Too {\\k25}much {\\k13}to {\\k19}say
Dialogue: 0,0:00:10.00,0:00:13.00,Default,,0,0,0,,君の名は\\NYour Name
`;

assert(isAssSubtitle(sampleAss), "isAssSubtitle correctly identifies ASS files");
const parsedAss = parseAss(sampleAss);
assert.strictEqual(parsedAss.length, 3, "Parsed 3 ASS lines");

// Line 1: Backing vocal with karaoke tags
assert.strictEqual(parsedAss[0].isBacking, true, "Line 1 is marked as backing vocal");
assert.strictEqual(parsedAss[0].words.length, 5, "Line 1 extracted 5 words");
assert.strictEqual(parsedAss[0].text, "(It's all for the vibe)");
assert.strictEqual(Math.round(parsedAss[0].time * 100) / 100, 3.29);

// Line 2: Main vocal with word-level timing
assert.strictEqual(parsedAss[1].isBacking, false, "Line 2 is main vocal");
assert.strictEqual(parsedAss[1].words.length, 4, "Line 2 extracted 4 words");
assert.strictEqual(parsedAss[1].text, "Too much to say");

// Line 3: Dual-language separated by \N
assert.strictEqual(parsedAss[2].text, "君の名は");
assert.strictEqual(parsedAss[2].subText, "Your Name");

console.log('Testing Style Presets...');
assert(StylePresets.presets.appleMusic, 'appleMusic preset exists');
assert(!StylePresets.presets.karaoke, 'karaoke preset was removed');
assert(StylePresets.presets.minimal, 'minimal preset exists');
assert(StylePresets.presets.spotify, 'spotify preset exists');
assert(!StylePresets.presets.retro, 'retro preset was removed');
assert.strictEqual(StylePresets.presets.appleMusic.config.font, 'Outfit');
assert.strictEqual(StylePresets.presets.minimal.config.font, 'Inter');

console.log('Testing HistoryManager...');
HistoryManager.undoStack = [];
HistoryManager.redoStack = [];
const dummyState1 = { label: 'Step 1', lyricsText: 'AAA', styles: {}, meta: {}, bpm: [] };
const dummyState2 = { label: 'Step 2', lyricsText: 'BBB', styles: {}, meta: {}, bpm: [] };
HistoryManager.undoStack.push(dummyState1);
HistoryManager.undoStack.push(dummyState2);
assert.strictEqual(HistoryManager.undoStack.length, 2);
HistoryManager.undo();
assert.strictEqual(HistoryManager.undoStack.length, 1);
assert.strictEqual(HistoryManager.redoStack.length, 1);
HistoryManager.redo();
assert.strictEqual(HistoryManager.undoStack.length, 2);
assert.strictEqual(HistoryManager.redoStack.length, 0);

console.log('Testing LyricStudio loader and parser...');
LyricStudio.loadFromLrc('[00:02.00]Hello // Hi\n[00:04.50]World');
assert.strictEqual(LyricStudio.lyricLines.length, 2);
assert.strictEqual(LyricStudio.lyricLines[0].time, 2);
assert.strictEqual(LyricStudio.lyricLines[0].text, 'Hello');
assert.strictEqual(LyricStudio.lyricLines[0].subText, 'Hi');
assert.strictEqual(LyricStudio.lyricLines[1].time, 4.5);
assert.strictEqual(LyricStudio.lyricLines[1].text, 'World');

console.log('✅ ALL TEST SUITE CHECKS PASSED SUCCESSFULLY!');
