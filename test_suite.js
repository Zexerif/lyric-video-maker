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
loadScript('js/LyricStudio/model.js');
loadScript('js/LyricStudio/header.js');
loadScript('js/LyricStudio/editMode.js');
loadScript('js/LyricStudio/syncMode.js');
loadScript('js/LyricStudio/previewMode.js');
loadScript('js/LyricStudio/inspector.js');
loadScript('js/LyricStudio/audioDock.js');
loadScript('js/studio.js');
loadScript('js/thumbnail.js');

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

console.log('Testing LyricStudioModel syllable splitting, merging, and multi-format export...');
const testLine = LyricStudioModel.normalizeLine({
    time: 10.0,
    endTime: 13.0,
    text: 'forever young',
    isBG: true,
    isDuet: true,
    translation: '永遠に若い',
    romanization: 'fōebā yangu'
});
assert.strictEqual(testLine.words.length, 2);
assert.strictEqual(testLine.isBG, true);
assert.strictEqual(testLine.isBacking, true);
assert.strictEqual(testLine.isDuet, true);
assert.strictEqual(testLine.translation, '永遠に若い');
assert.strictEqual(testLine.subText, '永遠に若い');
assert.strictEqual(testLine.romanization, 'fōebā yangu');

// Split "forever" into ["for", "ev", "er "]
LyricStudioModel.splitWordIntoSyllables(testLine, 0, ['for', 'ev', 'er']);
assert.strictEqual(testLine.words.length, 4, 'forever split into 3 syllables + young = 4 tokens');
assert.strictEqual(testLine.words[0].text, 'for', 'First syllable has no trailing space');
assert.strictEqual(testLine.words[1].text, 'ev', 'Middle syllable has no trailing space');
assert.strictEqual(testLine.words[2].text, 'er ', 'Final syllable of word preserves trailing space');
assert.strictEqual(testLine.text, 'forever young', 'Line text remains "forever young" without extra spaces');

// Merge "for" + "ev" back into "forev"
LyricStudioModel.mergeAdjacentWords(testLine, 0);
assert.strictEqual(testLine.words.length, 3);
assert.strictEqual(testLine.words[0].text, 'forev');

// Export to TTML and re-parse
const exportedTtml = LyricStudioModel.exportToTtml([testLine]);
assert(exportedTtml.includes('ttm:agent="v2"'), 'TTML includes duet agent v2');
assert(exportedTtml.includes('ttm:role="x-translation"'), 'TTML includes translation span');
assert(exportedTtml.includes('ttm:role="x-roman"'), 'TTML includes romanization span');

// Export to Enhanced LRC and re-parse
const exportedEnhLrc = LyricStudioModel.exportToLrc([testLine], { enhanced: true, includeMetadata: true });
const reparsedEnh = parseLrc(exportedEnhLrc);
assert.strictEqual(reparsedEnh.length, 1);
assert.strictEqual(reparsedEnh[0].isBG, true);
assert.strictEqual(reparsedEnh[0].isDuet, true);
assert.strictEqual(reparsedEnh[0].translation, '永遠に若い');
assert.strictEqual(reparsedEnh[0].romanization, 'fōebā yangu');
assert.strictEqual(reparsedEnh[0].words.length, 3);

// Studio Undo / Redo test
LyricStudio.loadFromLrc('[00:01.00]Line One\n[00:02.00]Line Two');
LyricStudio.pushUndoState();
LyricStudio.lyricLines[0].text = 'Modified Line One';
assert.strictEqual(LyricStudio.lyricLines[0].text, 'Modified Line One');
LyricStudio.undo();
assert.strictEqual(LyricStudio.lyricLines[0].text, 'Line One');
LyricStudio.redo();
assert.strictEqual(LyricStudio.lyricLines[0].text, 'Modified Line One');

console.log('Testing Ruby / Furigana Transliteration Support...');
const rubyTtml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata">
  <body>
    <div>
      <p begin="00:00:05.000" end="00:00:09.000">
        <span begin="00:00:05.000" end="00:00:06.000"><ruby><rb>全</rb><rt>すべ</rt></ruby>ては</span>
        <span begin="00:00:06.000" end="00:00:07.500"><ruby><rb>自</rb><rt>じ</rt><rb>分</rb><rt>ぶん</rt></ruby>の</span>
        <span begin="00:00:07.500" end="00:00:09.000"><ruby>心<rp>(</rp><rt>こころ</rt><rp>)</rp></ruby>だと</span>
      </p>
    </div>
  </body>
</tt>`;
const parsedRubyTtml = parseTtml(rubyTtml);
assert.strictEqual(parsedRubyTtml.length, 1);
assert.strictEqual(parsedRubyTtml[0].text, '全ては自分の心だと', 'TTML base text must not flatten <rt> readings inline');
assert(Array.isArray(parsedRubyTtml[0].words), 'TTML ruby line has words array');
const rubyMap = {};
parsedRubyTtml[0].words.forEach(w => {
    if (w.ruby) rubyMap[w.text.trim()] = w.ruby;
});
assert.strictEqual(rubyMap['全'], 'すべ');
assert.strictEqual(rubyMap['自'], 'じ');
assert.strictEqual(rubyMap['分'], 'ぶん');
assert.strictEqual(rubyMap['心'], 'こころ');

const rubyLrc = '[00:12.00]<ruby>全<rt>すべ</rt></ruby>ては<ruby>自<rt>じ</rt></ruby><ruby>分<rt>ぶん</rt></ruby>の<ruby>心<rt>こころ</rt></ruby>だと';
const parsedRubyLrc = parseLrc(rubyLrc);
assert.strictEqual(parsedRubyLrc.length, 1);
assert.strictEqual(parsedRubyLrc[0].text, '全ては自分の心だと', 'LRC base text must not flatten <rt> readings inline');
assert(parsedRubyLrc[0].words.some(w => w.text.trim() === '全' && w.ruby === 'すべ'), 'LRC parsed 全 with ruby すべ');
assert(parsedRubyLrc[0].words.some(w => w.text.trim() === '心' && w.ruby === 'こころ'), 'LRC parsed 心 with ruby こころ');

const studioParsedRuby = LyricStudioModel.parseAnyFormat(rubyLrc);
assert.strictEqual(studioParsedRuby.lines.length, 1);
assert.strictEqual(studioParsedRuby.lines[0].text, '全ては自分の心だと');
const exportedRubyTtml = LyricStudioModel.exportToTtml(studioParsedRuby.lines);
assert(exportedRubyTtml.includes('<ruby><rb>全</rb><rt>すべ</rt></ruby>'), 'Exported TTML preserves <ruby><rb>全</rb><rt>すべ</rt></ruby>');
assert(exportedRubyTtml.includes('<ruby><rb>心</rb><rt>こころ</rt></ruby>'), 'Exported TTML preserves <ruby><rb>心</rb><rt>こころ</rt></ruby>');

const exportedRubyLrc = LyricStudioModel.exportToLrc(studioParsedRuby.lines, { enhanced: true });
assert(exportedRubyLrc.includes('<ruby>全<rt>すべ</rt></ruby>'), 'Exported Enhanced LRC preserves inline <ruby> tags');
const reparsedRubyLrc = parseLrc(exportedRubyLrc);
assert.strictEqual(reparsedRubyLrc[0].text, '全ては自分の心だと', 'Re-parsed Enhanced LRC keeps clean base text');
assert(reparsedRubyLrc[0].words.some(w => w.text.trim() === '心' && w.ruby === 'こころ'), 'Re-parsed Enhanced LRC preserves ruby');

const rendererLyrics = LyricStudioModel.toRendererLyrics(studioParsedRuby.lines);
assert(rendererLyrics[0].words.some(w => w.text.trim() === '全' && w.ruby === 'すべ'), 'toRendererLyrics passes ruby to canvas renderer');

// Test DOMParser path in parseTtml for <ruby>, <rb>, <rt>, <rp>, and tts:ruby attributes
function makeMockDomElement(tagName, attrs = {}, children = []) {
    return {
        nodeType: 1,
        tagName,
        className: attrs.class || '',
        getAttribute(name) { return attrs[name] !== undefined ? attrs[name] : null; },
        get childNodes() { return children; },
        get textContent() { return children.map(c => c.textContent || '').join(''); },
        getElementsByTagName(t) {
            const res = [];
            const target = t.toLowerCase();
            function search(nodes) {
                for (const n of nodes) {
                    if (n.nodeType === 1) {
                        if (n.tagName.toLowerCase() === target) res.push(n);
                        search(n.childNodes || []);
                    }
                }
            }
            search(children);
            return res;
        }
    };
}
function makeMockTextNode(str) {
    return { nodeType: 3, textContent: str };
}

global.DOMParser = class {
    parseFromString(str) {
        if (!str.includes('mock-dom-ruby-test')) {
            return { getElementsByTagName: () => [] };
        }
        // Build DOM tree for: <p begin="00:00:05.000" end="00:00:09.000"><span begin="00:00:05.000" end="00:00:06.500"><ruby><rb>全</rb><rt>すべ</rt></ruby>ては</span><span begin="00:00:06.500" end="00:00:09.000" tts:ruby="container"><span tts:ruby="base">心</span><span tts:ruby="text">こころ</span></span></p>
        const rb1 = makeMockDomElement('rb', {}, [makeMockTextNode('全')]);
        const rt1 = makeMockDomElement('rt', {}, [makeMockTextNode('すべ')]);
        const ruby1 = makeMockDomElement('ruby', {}, [rb1, rt1]);
        const span1 = makeMockDomElement('span', { begin: '00:00:05.000', end: '00:00:06.500' }, [ruby1, makeMockTextNode('ては')]);

        const ttsBase = makeMockDomElement('span', { 'tts:ruby': 'base' }, [makeMockTextNode('心')]);
        const ttsText = makeMockDomElement('span', { 'tts:ruby': 'text' }, [makeMockTextNode('こころ')]);
        const span2 = makeMockDomElement('span', { begin: '00:00:06.500', end: '00:00:09.000', 'tts:ruby': 'container' }, [ttsBase, ttsText]);

        const pEl = makeMockDomElement('p', { begin: '00:00:05.000', end: '00:00:09.000' }, [span1, span2]);
        return {
            getElementsByTagName(tag) {
                if (tag === 'p') return [pEl];
                if (tag === 'parsererror') return [];
                return [];
            }
        };
    }
};

const domParsedTtml = parseTtml('<tt id="mock-dom-ruby-test"></tt>');
assert.strictEqual(domParsedTtml.length, 1);
assert.strictEqual(domParsedTtml[0].text, '全ては心', 'DOMParser TTML path extracts base text without flattening <rt> or tts:ruby="text"');
assert.strictEqual(domParsedTtml[0].words.length, 3);
assert.strictEqual(domParsedTtml[0].words[0].text, '全');
assert.strictEqual(domParsedTtml[0].words[0].ruby, 'すべ');
assert.strictEqual(domParsedTtml[0].words[1].text, 'ては');
assert.strictEqual(domParsedTtml[0].words[1].ruby, '');
assert.strictEqual(domParsedTtml[0].words[2].text, '心');
assert.strictEqual(domParsedTtml[0].words[2].ruby, 'こころ');

console.log('Testing ThumbnailGenerator...');
assert(typeof ThumbnailGenerator === 'object', 'ThumbnailGenerator exists');
const sampleLyricsForThumb = [
    { time: 0, text: '•••' },
    { time: 3, text: 'Short' },
    { time: 8, text: 'Running through the neon midnight city lights', subText: '真夜中のネオン街を駆け抜けて' },
    { time: 15, text: 'Another line in the song' }
];
const bestQuote = ThumbnailGenerator.getBestLyricQuote(sampleLyricsForThumb);
assert(bestQuote && bestQuote.line, 'getBestLyricQuote returns a valid line');
assert.strictEqual(bestQuote.line.text, 'Running through the neon midnight city lights', 'getBestLyricQuote skips instrumental/short lines and picks a punchy lyric');

ThumbnailGenerator.settings.quoteIndex = -1;
const selectedAuto = ThumbnailGenerator.getSelectedQuoteObject(sampleLyricsForThumb);
assert.strictEqual(selectedAuto.text, 'Running through the neon midnight city lights');
assert.strictEqual(selectedAuto.subText, '真夜中のネオン街を駆け抜けて');

ThumbnailGenerator.settings.quoteIndex = -2;
ThumbnailGenerator.settings.customQuote = 'Custom Hook Line!';
const selectedCustom = ThumbnailGenerator.getSelectedQuoteObject(sampleLyricsForThumb);
assert.strictEqual(selectedCustom.text, 'Custom Hook Line!');

ThumbnailGenerator.settings.quoteIndex = -3;
const selectedNone = ThumbnailGenerator.getSelectedQuoteObject(sampleLyricsForThumb);
assert.strictEqual(selectedNone.text, '');

ThumbnailGenerator.settings.format = 'png';
assert(ThumbnailGenerator.getDownloadFilename().endsWith('_thumbnail.png'), 'Filename ends with _thumbnail.png');
ThumbnailGenerator.settings.format = 'jpeg';
assert(ThumbnailGenerator.getDownloadFilename().endsWith('_thumbnail.jpg'), 'Filename ends with _thumbnail.jpg');

console.log('✅ ALL TEST SUITE CHECKS PASSED SUCCESSFULLY!');
