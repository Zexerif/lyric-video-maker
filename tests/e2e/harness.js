/* tests/e2e/harness.js
 * Comprehensive E2E Testing Harness for Lyric Studio Overhaul
 * Provides browser/DOM (JSDOM), Web Audio API, and Canvas 2D simulation mocks,
 * script sandboxing, and deterministic assertion utilities.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const ROOT_DIR = path.resolve(__dirname, '../..');

// Test Suite Global Registry
const testRegistry = [];

function registerTest(tier, featureId, title, testFn, meta = {}) {
    testRegistry.push({
        tier,
        featureId,
        title,
        testFn,
        milestone: meta.milestone || 'M1',
        description: meta.description || title
    });
}

// Fluent Assertion Library
class NegativeExpectation {
    constructor(actual) {
        this.actual = actual;
    }

    toBe(expected) {
        if (this.actual === expected) {
            throw new Error(`Expected ${JSON.stringify(this.actual)} NOT to be ${JSON.stringify(expected)}`);
        }
    }

    toEqual(expected) {
        if (JSON.stringify(this.actual) === JSON.stringify(expected)) {
            throw new Error(`Expected values NOT to be deeply equal`);
        }
    }

    toContain(item) {
        if (typeof this.actual === 'string' && this.actual.includes(item)) {
            throw new Error(`Expected string "${this.actual}" NOT to contain "${item}"`);
        }
        if (Array.isArray(this.actual) && this.actual.includes(item)) {
            throw new Error(`Expected array NOT to contain "${item}"`);
        }
    }

    toThrow(expectedPattern) {
        let threw = false;
        let thrownError = null;
        try {
            if (typeof this.actual === 'function') {
                this.actual();
            }
        } catch (err) {
            threw = true;
            thrownError = err;
        }

        if (threw) {
            throw new Error(`Expected function NOT to throw, but it threw: ${thrownError ? (thrownError.message || thrownError) : 'error'}`);
        }
    }
}

class Expectation {
    constructor(actual) {
        this.actual = actual;
    }

    get not() {
        return new NegativeExpectation(this.actual);
    }

    toBe(expected) {
        if (this.actual !== expected) {
            throw new Error(`Expected ${JSON.stringify(this.actual)} to be ${JSON.stringify(expected)}`);
        }
    }

    toEqual(expected) {
        const a = JSON.stringify(this.actual);
        const b = JSON.stringify(expected);
        if (a !== b) {
            throw new Error(`Expected deep equality:\nActual:   ${a}\nExpected: ${b}`);
        }
    }

    toBeCloseTo(expected, delta = 0.05) {
        if (typeof this.actual !== 'number' || typeof expected !== 'number') {
            throw new Error(`toBeCloseTo requires numeric operands. Actual: ${this.actual}, Expected: ${expected}`);
        }
        if (Math.abs(this.actual - expected) > delta) {
            throw new Error(`Expected ${this.actual} to be close to ${expected} within +/-${delta}`);
        }
    }

    toBeGreaterThan(expected) {
        if (!(this.actual > expected)) {
            throw new Error(`Expected ${this.actual} to be greater than ${expected}`);
        }
    }

    toBeGreaterThanOrEqual(expected) {
        if (!(this.actual >= expected)) {
            throw new Error(`Expected ${this.actual} to be greater than or equal to ${expected}`);
        }
    }

    toBeLessThan(expected) {
        if (!(this.actual < expected)) {
            throw new Error(`Expected ${this.actual} to be less than ${expected}`);
        }
    }

    toBeLessThanOrEqual(expected) {
        if (!(this.actual <= expected)) {
            throw new Error(`Expected ${this.actual} to be less than or equal to ${expected}`);
        }
    }

    toBeTruthy() {
        if (!this.actual) {
            throw new Error(`Expected truthy value, but got ${JSON.stringify(this.actual)}`);
        }
    }

    toBeFalsy() {
        if (this.actual) {
            throw new Error(`Expected falsy value, but got ${JSON.stringify(this.actual)}`);
        }
    }

    toContain(item) {
        if (typeof this.actual === 'string') {
            if (!this.actual.includes(item)) {
                throw new Error(`Expected string "${this.actual}" to contain "${item}"`);
            }
        } else if (Array.isArray(this.actual)) {
            if (!this.actual.includes(item)) {
                throw new Error(`Expected array to contain "${item}"`);
            }
        } else {
            throw new Error(`toContain requires string or array target`);
        }
    }

    toThrow(expectedPattern) {
        let threw = false;
        let thrownError = null;
        try {
            if (typeof this.actual === 'function') {
                this.actual();
            } else {
                throw new Error(`toThrow requires a function`);
            }
        } catch (err) {
            threw = true;
            thrownError = err;
        }

        if (!threw) {
            throw new Error(`Expected function to throw, but it returned normally`);
        }
        if (expectedPattern && thrownError) {
            const msg = thrownError.message || String(thrownError);
            if (expectedPattern instanceof RegExp) {
                if (!expectedPattern.test(msg)) {
                    throw new Error(`Expected thrown error "${msg}" to match pattern ${expectedPattern}`);
                }
            } else if (typeof expectedPattern === 'string') {
                if (!msg.includes(expectedPattern)) {
                    throw new Error(`Expected thrown error "${msg}" to contain "${expectedPattern}"`);
                }
            }
        }
    }
}

function expect(actual) {
    return new Expectation(actual);
}

// Synthetic AudioBuffer Factory
function createMockAudioBuffer(durationSec = 180, sampleRate = 44100, generateWave = true) {
    const totalSamples = Math.floor(durationSec * sampleRate);
    const channel0 = new Float32Array(totalSamples);
    if (generateWave) {
        // Generate a synthetic musical waveform (chords + transients)
        for (let i = 0; i < totalSamples; i++) {
            const t = i / sampleRate;
            const baseTone = Math.sin(2 * Math.PI * 440 * t) * 0.4;
            const subTone = Math.sin(2 * Math.PI * 110 * t) * 0.3;
            const beat = (t % 1.0 < 0.05) ? 0.3 : 0.0;
            channel0[i] = Math.max(-1.0, Math.min(1.0, baseTone + subTone + beat));
        }
    }

    return {
        duration: durationSec,
        sampleRate: sampleRate,
        numberOfChannels: 1,
        length: totalSamples,
        getChannelData: (ch) => channel0
    };
}

// Canvas 2D Mock Context
function createMockCanvasContext(canvas) {
    const drawCalls = [];
    return {
        canvas,
        drawCalls,
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 1,
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        globalAlpha: 1.0,

        clearRect: function (x, y, w, h) {
            drawCalls.push({ type: 'clearRect', x, y, w, h });
        },
        fillRect: function (x, y, w, h) {
            drawCalls.push({ type: 'fillRect', x, y, w, h, fillStyle: this.fillStyle });
        },
        strokeRect: function (x, y, w, h) {
            drawCalls.push({ type: 'strokeRect', x, y, w, h, strokeStyle: this.strokeStyle });
        },
        fillText: function (text, x, y, maxWidth) {
            drawCalls.push({ type: 'fillText', text, x, y, maxWidth, fillStyle: this.fillStyle });
        },
        measureText: function (text) {
            return { width: (text ? String(text).length : 0) * 8 };
        },
        beginPath: function () {
            drawCalls.push({ type: 'beginPath' });
        },
        closePath: function () {
            drawCalls.push({ type: 'closePath' });
        },
        moveTo: function (x, y) {
            drawCalls.push({ type: 'moveTo', x, y });
        },
        lineTo: function (x, y) {
            drawCalls.push({ type: 'lineTo', x, y });
        },
        arc: function (x, y, r, sa, ea) {
            drawCalls.push({ type: 'arc', x, y, r, sa, ea });
        },
        fill: function () {
            drawCalls.push({ type: 'fill', fillStyle: this.fillStyle });
        },
        stroke: function () {
            drawCalls.push({ type: 'stroke', strokeStyle: this.strokeStyle });
        },
        save: function () { },
        restore: function () { },
        scale: function (x, y) { },
        translate: function (x, y) { },
        drawImage: function (img, sx, sy, sw, sh, dx, dy, dw, dh) {
            drawCalls.push({ type: 'drawImage', img });
        }
    };
}

// Environment Bootstrapper
function setupEnvironment() {
    const htmlContent = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
    const dom = new JSDOM(htmlContent, {
        url: 'http://localhost:8080/',
        runScripts: 'outside-only',
        pretendToBeVisual: true
    });

    const win = dom.window;
    const doc = win.document;

    // Polyfill JSDOM missing browser methods
    win.HTMLElement.prototype.scrollIntoView = function () { };
    win.alert = function () { };

    // Enhance Canvas elements with mock 2D contexts
    const originalCreateElement = doc.createElement.bind(doc);
    doc.createElement = function (tagName, options) {
        const el = originalCreateElement(tagName, options);
        if (tagName.toLowerCase() === 'canvas') {
            const ctx = createMockCanvasContext(el);
            el.getContext = function (type) {
                if (type === '2d') return ctx;
                return null;
            };
        }
        return el;
    };

    // Attach mock 2D context to existing canvases in DOM
    const canvases = doc.querySelectorAll('canvas');
    canvases.forEach(cvs => {
        const ctx = createMockCanvasContext(cvs);
        cvs.getContext = function (type) {
            if (type === '2d') return ctx;
            return null;
        };
    });

    // Provide Web Audio API Mocks
    class MockGainNode {
        constructor() {
            this.gain = {
                value: 1.0,
                setValueAtTime: (val, time) => { this.gain.value = val; },
                linearRampToValueAtTime: (val, time) => { this.gain.value = val; }
            };
        }
        connect(target) { }
        disconnect() { }
    }

    class MockBufferSourceNode {
        constructor(ctx) {
            this.ctx = ctx;
            this.buffer = null;
            this.playbackRate = { value: 1.0 };
            this._started = false;
            this._stopped = false;
        }
        connect(target) { }
        disconnect() { }
        start(when = 0, offset = 0) {
            this._started = true;
            this.startOffset = offset;
            this.startTime = this.ctx.currentTime;
        }
        stop() {
            this._stopped = true;
        }
    }

    class MockAudioContext {
        constructor() {
            this.currentTime = 0;
            this.state = 'running';
            this.sampleRate = 44100;
        }
        createGain() {
            return new MockGainNode();
        }
        createBufferSource() {
            return new MockBufferSourceNode(this);
        }
        createAnalyser() {
            return {
                fftSize: 64,
                frequencyBinCount: 32,
                getByteFrequencyData: (arr) => arr.fill(128),
                connect: () => { },
                disconnect: () => { }
            };
        }
        decodeAudioData(arrayBuffer) {
            return Promise.resolve(createMockAudioBuffer(180, 44100));
        }
        resume() {
            this.state = 'running';
            return Promise.resolve();
        }
        suspend() {
            this.state = 'suspended';
            return Promise.resolve();
        }
    }

    win.AudioContext = MockAudioContext;
    win.webkitAudioContext = MockAudioContext;

    // Performance & Animation Frame
    let animIdCounter = 1;
    win.requestAnimationFrame = function (cb) {
        return animIdCounter++;
    };
    win.cancelAnimationFrame = function (id) { };
    win.performance = {
        now: () => Date.now()
    };

    win.window = win;
    win.global = win;

    // Sandboxed script loader
    const context = vm.createContext(win);

    function loadScript(relPath) {
        const absPath = path.join(ROOT_DIR, relPath);
        if (fs.existsSync(absPath)) {
            let code = fs.readFileSync(absPath, 'utf8');
            // Ensure state and dom top-level declarations bind to global window
            if (relPath === 'js/state.js' || relPath === 'js/dom.js') {
                code = code.replace(/^(let|const)\s+([a-zA-Z0-9_$]+)\s*=/gm, 'var $2 =');
            }
            vm.runInContext(code, context, { filename: relPath });
            return true;
        }
        return false;
    }

    // Load core application scripts in order
    loadScript('translations.js');
    loadScript('js/i18n.js');
    loadScript('js/utils.js');
    loadScript('js/state.js');
    loadScript('js/dom.js');
    loadScript('js/parsers.js');
    loadScript('js/presets.js');
    loadScript('js/history.js');
    loadScript('js/lyrics.js');
    loadScript('js/audio.js');
    loadScript('js/shortcuts.js');
    loadScript('js/LyricStudio/model.js');
    loadScript('js/LyricStudio/header.js');
    loadScript('js/LyricStudio/editMode.js');
    loadScript('js/LyricStudio/syncMode.js');
    loadScript('js/LyricStudio/previewMode.js');
    loadScript('js/LyricStudio/inspector.js');
    loadScript('js/LyricStudio/audioDock.js');
    loadScript('js/studio.js');

    // Attempt loading newly added modules if they exist
    loadScript('js/waveform_cache.js');
    loadScript('js/timeline.js');
    loadScript('js/sync_engine.js');

    // Wire up studio modal close button
    const closeBtn = doc.getElementById('closeLyricStudioBtn');
    if (closeBtn && win.LyricStudio) {
        closeBtn.addEventListener('click', () => win.LyricStudio.close());
    }

    // Initialize ShortcutsManager listeners
    if (win.ShortcutsManager && typeof win.ShortcutsManager.init === 'function') {
        win.ShortcutsManager.init();
    }

    // Initialize mock audio graph
    win.audioContext = new MockAudioContext();
    win.gainNode = win.audioContext.createGain();

    return {
        window: win,
        document: doc,
        context,
        loadScript,
        createMockAudioBuffer
    };
}

module.exports = {
    registerTest,
    testRegistry,
    expect,
    createMockAudioBuffer,
    createMockCanvasContext,
    setupEnvironment,
    ROOT_DIR
};
