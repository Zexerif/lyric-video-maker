/* js/LyricStudio/model.js
 * Core Data Model, Tokenization, Syllable Split/Merge, Serializers (LRC, TTML, ASS, JSON, Raw),
 * and Studio Undo/Redo Stack for Lyric Studio.
 */

(function (global) {
    'use strict';

    let _uidCounter = 1;
    function nextUid(prefix = 'id') {
        return `${prefix}_${Date.now().toString(36)}_${(_uidCounter++).toString(36)}`;
    }

    const CJK_CHAR_REGEX = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf\uac00-\ud7a3]/;

    // ─── Time Formatting & Parsing Helpers ───────────────────────────────
    function formatTimeMs(seconds) {
        if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
            return '--:--.---';
        }
        const totalMs = Math.round(seconds * 1000);
        const mins = Math.floor(totalMs / 60000);
        const secs = Math.floor((totalMs % 60000) / 1000);
        const ms = totalMs % 1000;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }

    function formatTimeShort(seconds) {
        if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
            return '--:--.-';
        }
        if (typeof global.formatTime === 'function') {
            return global.formatTime(seconds);
        }
        const s = Math.max(0, seconds);
        const m = Math.floor(s / 60);
        const ss = Math.floor(s % 60).toString().padStart(2, '0');
        const t = Math.floor((s % 1) * 10);
        return `${m}:${ss}.${t}`;
    }

    function formatTimeLrcTag(seconds) {
        const s = (typeof seconds === 'number' && !isNaN(seconds) && seconds >= 0) ? seconds : 0;
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = Math.floor(s % 60).toString().padStart(2, '0');
        const cs = Math.floor(Math.round((s % 1) * 100) % 100).toString().padStart(2, '0');
        return `${m}:${sec}.${cs}`;
    }

    function formatTimeTtmlAttr(seconds) {
        const s = (typeof seconds === 'number' && !isNaN(seconds) && seconds >= 0) ? seconds : 0;
        const totalMs = Math.round(s * 1000);
        const hrs = Math.floor(totalMs / 3600000);
        const mins = Math.floor((totalMs % 3600000) / 60000);
        const secs = Math.floor((totalMs % 60000) / 1000);
        const ms = totalMs % 1000;
        if (hrs > 0) {
            return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
        }
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }

    function parseTimeInput(input) {
        if (input === null || input === undefined) return null;
        if (typeof input === 'number') {
            return isNaN(input) ? null : Math.max(0, input);
        }
        let str = String(input).trim();
        if (!str || str === '--:--.---' || str === '--:--.-' || str === '--:--') return null;
        str = str.replace(/^\[|\]$/g, '').replace(/^<|>$/g, '').trim();
        if (str.endsWith('ms')) {
            const v = parseFloat(str.slice(0, -2));
            return isNaN(v) ? null : Math.max(0, v / 1000);
        }
        if (str.endsWith('s')) {
            str = str.slice(0, -1).trim();
        }
        const parts = str.split(':');
        if (parts.length === 3) {
            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const s = parseFloat(parts[2]);
            if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
            return Math.max(0, h * 3600 + m * 60 + s);
        }
        if (parts.length === 2) {
            const m = parseInt(parts[0], 10);
            const s = parseFloat(parts[1]);
            if (isNaN(m) || isNaN(s)) return null;
            return Math.max(0, m * 60 + s);
        }
        const num = parseFloat(str);
        return isNaN(num) ? null : Math.max(0, num);
    }

    // ─── Word & Syllable Tokenization ────────────────────────────────────
    function rawTokenizeText(text) {
        if (!text || !text.trim()) return [];
        const regex = /([\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf\uac00-\ud7a3]\s*)|([^\s\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf\uac00-\ud7a3]+\s*)|(\s+)/g;
        const raw = [];
        let m;
        while ((m = regex.exec(text)) !== null) {
            raw.push(m[0]);
        }
        const merged = [];
        for (let i = 0; i < raw.length; i++) {
            const tok = raw[i];
            if (/^\s+$/.test(tok)) {
                if (merged.length > 0) {
                    merged[merged.length - 1] += tok;
                }
            } else {
                merged.push(tok);
            }
        }
        return merged;
    }

    function createWord(partial = {}) {
        const isBg = Boolean(partial.isBG !== undefined ? partial.isBG : partial.isBacking);
        const rawT = partial.time !== undefined ? partial.time : partial.start;
        const rawE = partial.endTime !== undefined ? partial.endTime : partial.end;
        const time = (typeof rawT === 'number' && !isNaN(rawT)) ? Math.max(0, rawT) : null;
        const endTime = (typeof rawE === 'number' && !isNaN(rawE)) ? Math.max(0, rawE) : null;
        let textVal = partial.text !== undefined && partial.text !== null ? String(partial.text) : '';
        let rubyVal = partial.ruby !== undefined && partial.ruby !== null ? String(partial.ruby).trim() : '';

        if (!rubyVal && typeof global.containsRubyMarkup === 'function' && global.containsRubyMarkup(textVal)) {
            const segs = typeof global.parseInlineRubyTokens === 'function' ? global.parseInlineRubyTokens(textVal) : [];
            if (segs.length > 0) {
                textVal = segs.map(s => s.text).join('');
                rubyVal = segs.map(s => s.ruby || '').filter(Boolean).join('');
            }
        }
        return {
            id: partial.id || nextUid('w'),
            text: textVal,
            ruby: rubyVal,
            time,
            endTime,
            start: time,
            end: endTime,
            isBacking: isBg,
            isBG: isBg
        };
    }

    function tokenizeIntoWords(text, lineTime = null, lineEndTime = null, isBacking = false, assignTimings = false) {
        const rawStr = text || '';
        const hasRuby = typeof global.containsRubyMarkup === 'function' && global.containsRubyMarkup(rawStr);
        const tokenObjs = hasRuby && typeof global.parseInlineRubyTokens === 'function'
            ? global.parseInlineRubyTokens(rawStr)
            : rawTokenizeText(rawStr).map(t => ({ text: t, ruby: '' }));

        if (tokenObjs.length === 0) {
            return [];
        }
        const hasRange = assignTimings && typeof lineTime === 'number' && !isNaN(lineTime);
        const start = hasRange ? lineTime : null;
        const end = hasRange ? ((typeof lineEndTime === 'number' && lineEndTime > lineTime) ? lineEndTime : lineTime + 3.0) : null;
        const dur = hasRange ? Math.max(0.1, end - start) : 0;
        const step = hasRange ? dur / tokenObjs.length : 0;

        return tokenObjs.map((tokObj, i) => createWord({
            text: tokObj.text,
            ruby: tokObj.ruby || '',
            time: hasRange ? Number((start + i * step).toFixed(3)) : null,
            endTime: hasRange ? Number((start + (i + 1) * step).toFixed(3)) : null,
            isBacking,
            isBG: isBacking
        }));
    }

    function reconstructLineText(words) {
        if (!Array.isArray(words) || words.length === 0) return '';
        let out = '';
        for (let i = 0; i < words.length; i++) {
            const wText = words[i].text || '';
            out += wText;
        }
        return out.trim();
    }

    function normalizeLine(rawLine = {}, nextLineTime = null) {
        const isBg = Boolean(rawLine.isBG !== undefined ? rawLine.isBG : (rawLine.isBacking || false));
        const isDuet = Boolean(rawLine.isDuet || false);
        const translation = (rawLine.translation !== undefined && rawLine.translation !== null)
            ? String(rawLine.translation)
            : (rawLine.subText !== undefined && rawLine.subText !== null ? String(rawLine.subText) : '');
        const romanization = (rawLine.romanization !== undefined && rawLine.romanization !== null)
            ? String(rawLine.romanization)
            : '';

        const time = (typeof rawLine.time === 'number' && !isNaN(rawLine.time)) ? Math.max(0, rawLine.time) : null;
        let endTime = (typeof rawLine.endTime === 'number' && !isNaN(rawLine.endTime)) ? Math.max(0, rawLine.endTime) : null;

        let words = [];
        let hasWordTiming = Boolean(rawLine.hasWordTiming);

        if (Array.isArray(rawLine.words) && rawLine.words.length > 0) {
            words = rawLine.words.map((w, idx) => {
                const nw = createWord({
                    ...w,
                    isBacking: w.isBG !== undefined ? w.isBG : (w.isBacking !== undefined ? w.isBacking : isBg)
                });
                if (typeof nw.time === 'number') hasWordTiming = true;
                return nw;
            });
            // Ensure space conventions on imported words if none of the words have spaces and not CJK
            const anySpace = words.some(w => /\s/.test(w.text));
            const anyCjk = words.some(w => CJK_CHAR_REGEX.test(w.text));
            if (!anySpace && !anyCjk && words.length > 1 && rawLine.text && /\s/.test(rawLine.text.trim())) {
                // Re-align trailing spaces from rawLine.text where words match space-separated boundaries
                let cursor = 0;
                const full = rawLine.text.trim();
                for (let i = 0; i < words.length; i++) {
                    const cleanW = words[i].text.trim();
                    const pos = full.indexOf(cleanW, cursor);
                    if (pos !== -1) {
                        cursor = pos + cleanW.length;
                        if (cursor < full.length && /\s/.test(full[cursor])) {
                            words[i].text = cleanW + ' ';
                            while (cursor < full.length && /\s/.test(full[cursor])) cursor++;
                        } else {
                            words[i].text = cleanW;
                        }
                    }
                }
            }
        } else {
            const rawText = rawLine.text !== undefined && rawLine.text !== null ? String(rawLine.text) : '';
            words = tokenizeIntoWords(rawText, time, endTime, isBg, false);
        }

        if (endTime === null && typeof time === 'number') {
            const lastTimedWord = [...words].reverse().find(w => typeof w.endTime === 'number');
            if (lastTimedWord) {
                endTime = Math.max(time + 0.1, lastTimedWord.endTime);
            } else if (typeof nextLineTime === 'number' && nextLineTime > time) {
                endTime = Number(Math.min(time + 5.0, nextLineTime).toFixed(3));
            } else {
                endTime = Number((time + 3.0).toFixed(3));
            }
        }

        const textFromWords = reconstructLineText(words);
        const finalText = (rawLine.text !== undefined && rawLine.text !== null && String(rawLine.text).trim() !== '' && words.length === 0)
            ? String(rawLine.text).trim()
            : (textFromWords || (rawLine.text ? String(rawLine.text).trim() : ''));

        return {
            id: rawLine.id || nextUid('line'),
            time,
            endTime,
            text: finalText,
            subText: translation,
            translation,
            romanization,
            isBacking: isBg,
            isBG: isBg,
            isDuet,
            hasWordTiming,
            words
        };
    }

    function syncLineFromWords(line) {
        if (!line) return line;
        if (!Array.isArray(line.words)) line.words = [];
        line.text = reconstructLineText(line.words);
        const timedWords = line.words.filter(w => typeof w.time === 'number' && !isNaN(w.time));
        if (timedWords.length > 0) {
            line.hasWordTiming = true;
            const firstTime = timedWords[0].time;
            if (line.time === null || line.time > firstTime) {
                line.time = firstTime;
            }
            const lastWord = timedWords[timedWords.length - 1];
            const lastEnd = typeof lastWord.endTime === 'number' ? lastWord.endTime : (lastWord.time + 0.4);
            if (line.endTime === null || line.endTime < lastEnd) {
                line.endTime = lastEnd;
            }
        }
        return line;
    }

    function syncWordsFromLineText(line, newText) {
        if (!line) return line;
        const hasRubyMarkup = typeof global.containsRubyMarkup === 'function' && global.containsRubyMarkup(newText);
        if (hasRubyMarkup && typeof global.parseInlineRubyTokens === 'function') {
            const rubyTokens = global.parseInlineRubyTokens(newText);
            const oldWords = Array.isArray(line.words) ? line.words : [];
            const hasAnyTiming = oldWords.some(w => typeof w.time === 'number');
            const startT = typeof line.time === 'number' ? line.time : null;
            const endT = (typeof line.endTime === 'number' && startT !== null && line.endTime > startT)
                ? line.endTime
                : (startT !== null ? startT + 3.0 : null);

            line.words = rubyTokens.map((tokObj, idx) => {
                const existing = oldWords[idx];
                if (existing && hasAnyTiming) {
                    return createWord({
                        id: existing.id,
                        text: tokObj.text,
                        ruby: tokObj.ruby || '',
                        time: existing.time,
                        endTime: existing.endTime,
                        isBacking: existing.isBacking
                    });
                }
                if (hasAnyTiming && startT !== null && endT !== null) {
                    const step = (endT - startT) / Math.max(1, rubyTokens.length);
                    return createWord({
                        text: tokObj.text,
                        ruby: tokObj.ruby || '',
                        time: Number((startT + idx * step).toFixed(3)),
                        endTime: Number((startT + (idx + 1) * step).toFixed(3)),
                        isBacking: line.isBacking
                    });
                }
                return createWord({
                    text: tokObj.text,
                    ruby: tokObj.ruby || '',
                    time: null,
                    endTime: null,
                    isBacking: line.isBacking
                });
            });
            line.text = reconstructLineText(line.words);
            return line;
        }

        line.text = newText;
        const newRawTokens = rawTokenizeText(newText);
        const oldWords = Array.isArray(line.words) ? line.words : [];

        if (newRawTokens.length === 0) {
            line.words = [];
            return line;
        }

        if (newRawTokens.length === oldWords.length) {
            for (let i = 0; i < newRawTokens.length; i++) {
                oldWords[i].text = newRawTokens[i];
            }
            line.words = oldWords;
            return line;
        }

        // Preserve timings and ruby where tokens match or interpolate across line range
        const hasAnyTiming = oldWords.some(w => typeof w.time === 'number');
        const startT = typeof line.time === 'number' ? line.time : null;
        const endT = (typeof line.endTime === 'number' && startT !== null && line.endTime > startT)
            ? line.endTime
            : (startT !== null ? startT + 3.0 : null);

        line.words = newRawTokens.map((tok, idx) => {
            const existing = oldWords[idx];
            const preservedRuby = (existing && existing.ruby && existing.text.trim() === tok.trim()) ? existing.ruby : '';
            if (existing && hasAnyTiming) {
                return createWord({
                    id: existing.id,
                    text: tok,
                    ruby: preservedRuby,
                    time: existing.time,
                    endTime: existing.endTime,
                    isBacking: existing.isBacking
                });
            }
            if (hasAnyTiming && startT !== null && endT !== null) {
                const step = (endT - startT) / newRawTokens.length;
                return createWord({
                    text: tok,
                    ruby: preservedRuby,
                    time: Number((startT + idx * step).toFixed(3)),
                    endTime: Number((startT + (idx + 1) * step).toFixed(3)),
                    isBacking: line.isBacking
                });
            }
            return createWord({
                text: tok,
                ruby: preservedRuby,
                time: null,
                endTime: null,
                isBacking: line.isBacking
            });
        });

        return line;
    }

    // ─── Auto-Syllabify & Syllable Split / Merge Operations ──────────────
    function autoMarkBracketBackingVocals(line) {
        if (!line) return line;
        const text = String(line.text || '').trim();
        const isFullLineBracket = /^[\(\[\{（【][\s\S]*[\)\]\}）】]$/.test(text);

        if (isFullLineBracket) {
            line.isBacking = true;
            line.isBG = true;
            if (Array.isArray(line.words)) {
                line.words.forEach(w => {
                    w.isBacking = true;
                    w.isBG = true;
                });
            }
            return line;
        }

        // Inline bracket detection for word tokens
        if (Array.isArray(line.words) && line.words.length > 0) {
            let insideBracket = false;
            let hasAnyBgWord = false;
            for (let i = 0; i < line.words.length; i++) {
                const w = line.words[i];
                const wText = String(w.text || '');
                if (/[\(\[\{（【]/.test(wText)) {
                    insideBracket = true;
                }
                if (insideBracket || /[\(\[\{（【][\s\S]*[\)\]\}）】]/.test(wText)) {
                    w.isBacking = true;
                    w.isBG = true;
                    hasAnyBgWord = true;
                }
                if (/[\)\]\}）】]/.test(wText)) {
                    insideBracket = false;
                }
            }
        }
        return line;
    }

    function autoSyllabifyWord(rawText) {
        if (!rawText) return [];
        const trailingSpace = /\s+$/.exec(rawText)?.[0] || '';
        const clean = rawText.trim();
        if (clean.length <= 1) return [rawText];

        // If user already typed hyphens or slashes inside the word, split on those
        if (/[-/·|]/.test(clean)) {
            const parts = clean.split(/[-/·|]+/).filter(Boolean);
            if (parts.length > 1) {
                parts[parts.length - 1] += trailingSpace;
                return parts;
            }
        }

        // If CJK characters exist, split each CJK character into its own syllable
        if (CJK_CHAR_REGEX.test(clean)) {
            const chars = Array.from(clean);
            if (chars.length > 1) {
                chars[chars.length - 1] += trailingSpace;
                return chars;
            }
        }

        // English / Latin vowel-cluster syllable heuristic
        if (clean.length <= 3) return [rawText];

        const syllables = [];
        // Match onset consonants + vowel nucleus + optional coda before next syllable onset
        const vowelRegex = /[aeiouyAEIOUY]+/g;
        const vowelMatches = [];
        let m;
        while ((m = vowelRegex.exec(clean)) !== null) {
            vowelMatches.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
        }

        // Ignore silent trailing 'e' if there is an earlier vowel group
        if (vowelMatches.length > 1) {
            const lastV = vowelMatches[vowelMatches.length - 1];
            if (lastV.text.toLowerCase() === 'e' && lastV.end === clean.length && !/le$/i.test(clean)) {
                vowelMatches.pop();
            }
        }

        if (vowelMatches.length <= 1) {
            return [rawText];
        }

        let sliceStart = 0;
        for (let i = 0; i < vowelMatches.length - 1; i++) {
            const currV = vowelMatches[i];
            const nextV = vowelMatches[i + 1];
            const consonantGap = nextV.start - currV.end;
            let splitPos;
            if (consonantGap <= 0) {
                splitPos = currV.end;
            } else if (consonantGap === 1) {
                // Single consonant between vowels: usually starts next syllable (V-CV), except after short prefix like "for-ev-er"
                const prefix = clean.slice(sliceStart, currV.end + 1).toLowerCase();
                if (prefix === 'for' || prefix === 'nev' || prefix === 'ev' || prefix === 'ov') {
                    splitPos = currV.end + 1;
                } else {
                    splitPos = currV.end;
                }
            } else {
                // Multiple consonants between vowels: split between consonants (VC-CV)
                splitPos = currV.end + Math.floor(consonantGap / 2);
            }
            if (splitPos > sliceStart && splitPos < clean.length) {
                syllables.push(clean.slice(sliceStart, splitPos));
                sliceStart = splitPos;
            }
        }
        syllables.push(clean.slice(sliceStart) + trailingSpace);
        return syllables.filter(Boolean);
    }

    function splitWordIntoSyllables(line, wordIndex, partsInput) {
        if (!line || !Array.isArray(line.words) || wordIndex < 0 || wordIndex >= line.words.length) {
            return false;
        }
        const targetWord = line.words[wordIndex];
        const origText = targetWord.text || '';
        const hasTrailingSpace = /\s+$/.test(origText);
        const trailingSpace = hasTrailingSpace ? ' ' : '';

        let rawParts = [];
        if (partsInput === 'auto') {
            rawParts = autoSyllabifyWord(origText);
        } else if (Array.isArray(partsInput)) {
            rawParts = partsInput.map(p => String(p)).filter(p => p.length > 0);
        } else if (typeof partsInput === 'string') {
            const trimmed = partsInput.trim();
            if (/[-/|·\s]/.test(trimmed)) {
                rawParts = trimmed.split(/[-/|·\s]+/).filter(Boolean);
            } else if (trimmed.length > 1) {
                rawParts = autoSyllabifyWord(trimmed);
            }
        }

        if (rawParts.length <= 1) return false;

        // Normalize spaces on syllables: intra-word syllables have NO trailing space;
        // only the last syllable inherits the original word's trailing space!
        const cleanParts = rawParts.map((p, idx) => {
            const stripped = p.trim();
            return (idx === rawParts.length - 1) ? (stripped + trailingSpace) : stripped;
        });

        const totalChars = cleanParts.reduce((acc, p) => acc + Math.max(1, p.trim().length), 0);
        const hasTiming = typeof targetWord.time === 'number' && !isNaN(targetWord.time);
        const wStart = hasTiming ? targetWord.time : null;
        const wEnd = hasTiming
            ? ((typeof targetWord.endTime === 'number' && targetWord.endTime > wStart) ? targetWord.endTime : wStart + 0.5)
            : null;
        const wDur = hasTiming ? Math.max(0.05, wEnd - wStart) : 0;

        let accumChars = 0;
        const newTokens = cleanParts.map((partText, idx) => {
            const charWeight = Math.max(1, partText.trim().length);
            let tStart = null;
            let tEnd = null;
            if (hasTiming) {
                tStart = Number((wStart + (accumChars / totalChars) * wDur).toFixed(3));
                accumChars += charWeight;
                tEnd = (idx === cleanParts.length - 1)
                    ? Number(wEnd.toFixed(3))
                    : Number((wStart + (accumChars / totalChars) * wDur).toFixed(3));
            }
            return createWord({
                text: partText,
                time: tStart,
                endTime: tEnd,
                isBacking: targetWord.isBacking
            });
        });

        line.words.splice(wordIndex, 1, ...newTokens);
        syncLineFromWords(line);
        return newTokens.length;
    }

    function splitWordAtChar(line, wordIndex, charOffset) {
        if (!line || !Array.isArray(line.words) || wordIndex < 0 || wordIndex >= line.words.length) {
            return false;
        }
        const targetWord = line.words[wordIndex];
        const clean = (targetWord.text || '').trim();
        if (charOffset <= 0 || charOffset >= clean.length) return false;
        const part1 = clean.slice(0, charOffset);
        const part2 = clean.slice(charOffset);
        return splitWordIntoSyllables(line, wordIndex, [part1, part2]);
    }

    function mergeAdjacentWords(line, firstIndex, secondIndex = firstIndex + 1) {
        if (!line || !Array.isArray(line.words)) return false;
        const idxA = Math.min(firstIndex, secondIndex);
        const idxB = Math.max(firstIndex, secondIndex);
        if (idxA < 0 || idxB >= line.words.length || idxB - idxA !== 1) return false;

        const wA = line.words[idxA];
        const wB = line.words[idxB];
        const mergedStart = (typeof wA.time === 'number') ? wA.time : wB.time;
        const mergedEnd = (typeof wB.endTime === 'number') ? wB.endTime : wA.endTime;

        const mergedWord = createWord({
            id: wA.id,
            text: (wA.text || '') + (wB.text || ''),
            ruby: ((wA.ruby || '') + (wB.ruby || '')).trim(),
            time: mergedStart,
            endTime: mergedEnd,
            isBacking: wA.isBacking && wB.isBacking
        });

        line.words.splice(idxA, 2, mergedWord);
        syncLineFromWords(line);
        return true;
    }

    function distributeWordTimings(line) {
        if (!line || !Array.isArray(line.words) || line.words.length === 0) return false;
        const start = typeof line.time === 'number' ? line.time : 0;
        const end = (typeof line.endTime === 'number' && line.endTime > start) ? line.endTime : start + Math.max(1.5, line.words.length * 0.45);
        line.time = start;
        line.endTime = end;
        const dur = end - start;
        const totalChars = line.words.reduce((acc, w) => acc + Math.max(1, (w.text || '').trim().length), 0);
        let accum = 0;
        line.words.forEach((w, idx) => {
            const weight = Math.max(1, (w.text || '').trim().length);
            w.time = Number((start + (accum / totalChars) * dur).toFixed(3));
            accum += weight;
            w.endTime = (idx === line.words.length - 1)
                ? Number(end.toFixed(3))
                : Number((start + (accum / totalChars) * dur).toFixed(3));
        });
        line.hasWordTiming = true;
        return true;
    }

    // ─── Parsers & Serializers ───────────────────────────────────────────
    function parseAnyFormat(rawText) {
        if (!rawText || !String(rawText).trim()) {
            return {
                format: 'lrc',
                lines: [normalizeLine({ time: 0, endTime: 3, text: 'First lyric line', subText: '', isBacking: false })]
            };
        }

        const trimmed = String(rawText).trim();

        // 1. Check JSON format
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
                const parsedJson = JSON.parse(trimmed);
                const arr = Array.isArray(parsedJson) ? parsedJson : (Array.isArray(parsedJson.lines) ? parsedJson.lines : (Array.isArray(parsedJson.lyrics) ? parsedJson.lyrics : null));
                if (arr && arr.length > 0) {
                    const norm = arr.map((item, idx) => normalizeLine(item, arr[idx + 1]?.time ?? null));
                    return { format: 'json', lines: norm };
                }
            } catch (_) {}
        }

        // 2. Check TTML / XML format
        if (trimmed.startsWith('<tt') || trimmed.startsWith('<?xml') || trimmed.includes('http://www.w3.org/ns/ttml')) {
            const parsed = (typeof global.parseTtml === 'function') ? global.parseTtml(rawText) : [];
            const filtered = parsed.filter(l => l.text !== '• • •');
            const norm = filtered.map((l, idx) => normalizeLine({
                ...l,
                hasWordTiming: Array.isArray(l.words) && l.words.length > 0
            }, filtered[idx + 1]?.time ?? null));
            return {
                format: 'ttml',
                rawXml: rawText,
                lines: norm.length > 0 ? norm : [normalizeLine({ time: 0, endTime: 3, text: 'First lyric line' })]
            };
        }

        // 3. Check ASS / SSA format
        if (typeof global.isAssSubtitle === 'function' && global.isAssSubtitle(trimmed)) {
            const parsed = (typeof global.parseAss === 'function') ? global.parseAss(rawText) : [];
            const filtered = parsed.filter(l => l.text !== '• • •');
            const norm = filtered.map((l, idx) => normalizeLine({
                ...l,
                hasWordTiming: Array.isArray(l.words) && l.words.length > 0
            }, filtered[idx + 1]?.time ?? null));
            return {
                format: 'ass',
                rawAss: rawText,
                lines: norm.length > 0 ? norm : [normalizeLine({ time: 0, endTime: 3, text: 'First lyric line' })]
            };
        }

        // 4. LRC or Plain Multiline Text
        const rawLines = rawText.split(/\r?\n/);
        const timeReg = /\[(\d{1,2}):(\d{2})[.:](\d{2,3})\]/g;
        const wordTagReg = /<(\d{1,2}):(\d{2})[.:](\d{2,3})>([\s\S]*?)(?=<\d{1,2}:\d{2}[.:]\d{2,3}>|$)/g;
        const parsedItems = [];

        rawLines.forEach(rawLine => {
            const tr = rawLine.trim();
            if (!tr) return;
            // Skip LRC metadata tags like [ti:...], [ar:...], [al:...], [by:...]
            if (/^\[(?:ti|ar|al|by|offset|length|re|ve|#):/i.test(tr)) return;

            let lineText = tr.replace(timeReg, '').trim();
            if (!lineText && !timeReg.test(tr)) return;

            // Detect role prefixes [bg], [v2], [duet]
            let isDuet = false;
            let isRoleBg = false;
            while (/^\[(?:bg|v2|duet|v1)\]\s*/i.test(lineText)) {
                const tagM = lineText.match(/^\[(bg|v2|duet|v1)\]\s*/i);
                if (tagM) {
                    const roleTag = tagM[1].toLowerCase();
                    if (roleTag === 'bg') isRoleBg = true;
                    if (roleTag === 'v2' || roleTag === 'duet') isDuet = true;
                    lineText = lineText.slice(tagM[0].length).trim();
                } else {
                    break;
                }
            }

            let subText = '';
            let romanization = '';
            if (lineText.includes('//') && lineText.includes('///')) {
                const rSplit = lineText.split(/\s*\/{3}\s*/);
                const leftPart = rSplit[0];
                romanization = rSplit.slice(1).join(' / ').trim();
                if (/\s*\/{2}\s*/.test(leftPart)) {
                    const tSplit = leftPart.split(/\s*\/{2}\s*/);
                    lineText = tSplit[0].trim();
                    subText = tSplit.slice(1).join(' / ').trim();
                } else {
                    lineText = leftPart.trim();
                }
            } else if (/\s*(?:\/{2,3}|\|)\s*/.test(lineText)) {
                const parts = lineText.split(/\s*(?:\/{2,3}|\|)\s*/);
                lineText = parts[0].trim();
                subText = parts.slice(1).join(' / ').trim();
            }

            const strippedForBg = lineText.replace(/<\d{1,2}:\d{2}[.:]\d{2,3}>/g, '').trim();
            const isBacking = isRoleBg || (strippedForBg.startsWith('(') && strippedForBg.endsWith(')'));

            // Check for Enhanced LRC inline word timestamps
            let inlineWords = null;
            if (/<\d{1,2}:\d{2}[.:]\d{2,3}>/.test(lineText)) {
                inlineWords = [];
                wordTagReg.lastIndex = 0;
                let wm;
                while ((wm = wordTagReg.exec(lineText)) !== null) {
                    const wMin = parseInt(wm[1], 10);
                    const wSec = parseInt(wm[2], 10);
                    const wMs = parseInt(wm[3], 10) * (wm[3].length === 2 ? 10 : 1);
                    const wTime = wMin * 60 + wSec + wMs / 1000;
                    const wText = wm[4];
                    if (wText !== '') {
                        if (typeof global.containsRubyMarkup === 'function' && global.containsRubyMarkup(wText)) {
                            const rubySegs = global.parseInlineRubyTokens(wText);
                            const segDur = 0.4 / Math.max(1, rubySegs.length);
                            rubySegs.forEach((seg, sIdx) => {
                                inlineWords.push(createWord({
                                    text: seg.text,
                                    ruby: seg.ruby || '',
                                    time: Number((wTime + sIdx * segDur).toFixed(3)),
                                    endTime: Number((wTime + (sIdx + 1) * segDur).toFixed(3)),
                                    isBacking
                                }));
                            });
                        } else {
                            inlineWords.push(createWord({
                                text: wText,
                                time: wTime,
                                endTime: Number((wTime + 0.4).toFixed(3)),
                                isBacking
                            }));
                        }
                    }
                }
                for (let k = 0; k < inlineWords.length - 1; k++) {
                    if (inlineWords[k + 1].time > inlineWords[k].time) {
                        inlineWords[k].endTime = inlineWords[k + 1].time;
                    }
                }
                lineText = inlineWords.map(w => w.text).join('').trim();
            } else if (typeof global.containsRubyMarkup === 'function' && global.containsRubyMarkup(lineText)) {
                const rubySegs = global.parseInlineRubyTokens(lineText);
                if (rubySegs.length > 0) {
                    inlineWords = rubySegs.map(seg => createWord({
                        text: seg.text,
                        ruby: seg.ruby || '',
                        time: null,
                        endTime: null,
                        isBacking
                    }));
                    lineText = inlineWords.map(w => w.text).join('').trim();
                }
            }

            timeReg.lastIndex = 0;
            const match = timeReg.exec(tr);
            if (match) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                const milliseconds = parseInt(match[3], 10) * (match[3].length === 2 ? 10 : 1);
                const time = minutes * 60 + seconds + milliseconds / 1000;
                parsedItems.push({
                    time,
                    text: lineText,
                    subText,
                    translation: subText,
                    romanization,
                    isBacking,
                    isBG: isBacking,
                    isDuet,
                    hasWordTiming: Boolean(inlineWords && inlineWords.some(w => typeof w.time === 'number')),
                    words: inlineWords
                });
            } else {
                parsedItems.push({
                    time: null,
                    text: lineText,
                    subText,
                    translation: subText,
                    romanization,
                    isBacking,
                    isBG: isBacking,
                    isDuet,
                    hasWordTiming: Boolean(inlineWords && inlineWords.some(w => typeof w.time === 'number')),
                    words: inlineWords
                });
            }
        });

        const normalized = parsedItems.length > 0
            ? parsedItems.map((item, idx) => normalizeLine(item, parsedItems[idx + 1]?.time ?? null))
            : [normalizeLine({ time: 0, endTime: 3, text: 'First lyric line', subText: '', isBacking: false })];

        return {
            format: 'lrc',
            lines: normalized
        };
    }

    function formatWordWithRubyForLrc(w) {
        const rawText = w.text || '';
        const ruby = (w.ruby || '').trim();
        if (!ruby) return rawText;
        const leadM = rawText.match(/^\s+/);
        const trailM = rawText.match(/\s+$/);
        const lead = leadM ? leadM[0] : '';
        const trail = trailM ? trailM[0] : '';
        const base = rawText.trim();
        if (!base) return rawText;
        return `${lead}<ruby>${base}<rt>${ruby}</rt></ruby>${trail}`;
    }

    function exportToLrc(lines, options = {}) {
        const includeWordTags = Boolean(options.includeWordTags || options.enhanced);
        const outputLines = [];

        (lines || []).forEach(item => {
            const time = typeof item.time === 'number' && !isNaN(item.time) ? item.time : 0;
            const timeStr = `[${formatTimeLrcTag(time)}]`;

            const hasAnyTimedWord = Array.isArray(item.words) && item.words.some(w => typeof w.time === 'number' && !isNaN(w.time));
            const hasAnyRubyWord = Array.isArray(item.words) && item.words.some(w => w.ruby && String(w.ruby).trim());
            const hasWordTimings = Array.isArray(item.words) && item.words.length > 0 &&
                (hasAnyTimedWord || (includeWordTags && item.words.length > 1));

            let lineContent = '';
            if (item.isDuet) {
                lineContent += '[v2] ';
            }
            if ((item.isBG || item.isBacking) && !(item.text || '').trim().startsWith('(')) {
                lineContent += '[bg] ';
            }

            let mainBody = '';
            if (hasWordTimings) {
                const end = (typeof item.endTime === 'number' && item.endTime > time) ? item.endTime : (time + 3.0);
                const stepDur = (end - time) / Math.max(1, item.words.length);
                mainBody = item.words.map((w, idx) => {
                    const wt = (typeof w.time === 'number' && !isNaN(w.time)) ? w.time : (time + idx * stepDur);
                    return `<${formatTimeLrcTag(wt)}>${formatWordWithRubyForLrc(w)}`;
                }).join('');
            } else if (hasAnyRubyWord) {
                mainBody = item.words.map(w => formatWordWithRubyForLrc(w)).join('');
            } else {
                mainBody = item.text || '';
            }

            lineContent += mainBody.trim();

            const trans = (item.translation !== undefined && item.translation !== '') ? item.translation : (item.subText || '');
            const roman = item.romanization || '';

            if (trans) {
                lineContent += ` // ${trans}`;
            }
            if (roman) {
                lineContent += ` /// ${roman}`;
            }

            outputLines.push(`${timeStr} ${lineContent}`.trim());
        });

        return outputLines.join('\n');
    }

    function toRendererLyrics(lines) {
        return (lines || []).map((item, idx) => {
            const norm = normalizeLine(item, lines[idx + 1]?.time ?? null);
            const start = typeof norm.time === 'number' && !isNaN(norm.time) ? norm.time : 0;
            const end = (typeof norm.endTime === 'number' && !isNaN(norm.endTime) && norm.endTime > start)
                ? norm.endTime
                : start + 3.0;
            const totalW = Math.max(1, (norm.words || []).length);
            const step = (end - start) / totalW;

            const words = (norm.words || []).map((w, wIdx) => {
                const wt = (typeof w.time === 'number' && !isNaN(w.time))
                    ? w.time
                    : (typeof w.start === 'number' && !isNaN(w.start) ? w.start : Number((start + wIdx * step).toFixed(3)));
                const we = (typeof w.endTime === 'number' && !isNaN(w.endTime) && w.endTime > wt)
                    ? w.endTime
                    : (typeof w.end === 'number' && !isNaN(w.end) && w.end > wt ? w.end : Number((wt + step).toFixed(3)));
                return {
                    text: w.text,
                    ruby: w.ruby || '',
                    time: wt,
                    endTime: we,
                    start: wt,
                    end: we,
                    isBacking: Boolean(w.isBG || w.isBacking || norm.isBG || norm.isBacking),
                    isBG: Boolean(w.isBG || w.isBacking || norm.isBG || norm.isBacking)
                };
            });

            return {
                time: start,
                endTime: end,
                text: norm.text || '',
                subText: norm.translation || norm.subText || '',
                translation: norm.translation || norm.subText || '',
                romanization: norm.romanization || '',
                isBacking: Boolean(norm.isBG || norm.isBacking),
                isBG: Boolean(norm.isBG || norm.isBacking),
                isDuet: Boolean(norm.isDuet),
                words: words.length > 0 ? words : undefined,
                cachedLines: null
            };
        });
    }

    function escapeXml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function exportToTtml(lines, meta = {}) {
        const lang = meta.lang || 'en';
        let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
        xml += `<tt xml:lang="${escapeXml(lang)}" xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:amll="http://www.example.com/ns/amll">\n`;
        xml += `  <head>\n    <metadata>\n`;
        xml += `      <ttm:agent type="person" xml:id="v1"/>\n`;
        xml += `      <ttm:agent type="other" xml:id="v2"/>\n`;
        if (meta.title) {
            xml += `      <amll:meta key="musicName" value="${escapeXml(meta.title)}"/>\n`;
        }
        if (meta.artist) {
            xml += `      <amll:meta key="artists" value="${escapeXml(meta.artist)}"/>\n`;
        }
        xml += `    </metadata>\n  </head>\n`;
        xml += `  <body>\n    <div>\n`;

        (lines || []).forEach((line, idx) => {
            const start = typeof line.time === 'number' && !isNaN(line.time) ? line.time : 0;
            const nextStart = (lines[idx + 1] && typeof lines[idx + 1].time === 'number') ? lines[idx + 1].time : (start + 3.0);
            const end = (typeof line.endTime === 'number' && line.endTime > start) ? line.endTime : Math.max(start + 0.5, nextStart);

            const agentAttr = line.isDuet ? ` ttm:agent="v2"` : ` ttm:agent="v1"`;
            const roleAttr = (line.isBG || line.isBacking) ? ` ttm:role="x-bg"` : '';
            xml += `      <p begin="${formatTimeTtmlAttr(start)}" end="${formatTimeTtmlAttr(end)}"${agentAttr}${roleAttr}>`;

            const words = Array.isArray(line.words) && line.words.length > 0
                ? line.words
                : tokenizeIntoWords(line.text || '', start, end, line.isBG || line.isBacking, true);

            const totalW = Math.max(1, words.length);
            const stepDur = (end - start) / totalW;

            words.forEach((w, wIdx) => {
                const wStart = (typeof w.time === 'number' && !isNaN(w.time)) ? w.time : (start + wIdx * stepDur);
                const wEnd = (typeof w.endTime === 'number' && !isNaN(w.endTime) && w.endTime > wStart)
                    ? w.endTime
                    : (wStart + stepDur);
                const wBgAttr = ((w.isBG || w.isBacking) && !(line.isBG || line.isBacking)) ? ` ttm:role="x-bg"` : '';
                const hasTrailingSpace = /\s+$/.test(w.text || '');
                const cleanToken = (w.text || '').trim();
                const rubyVal = (w.ruby || '').trim();
                if (cleanToken) {
                    const innerXml = rubyVal
                        ? `<ruby><rb>${escapeXml(cleanToken)}</rb><rt>${escapeXml(rubyVal)}</rt></ruby>`
                        : escapeXml(cleanToken);
                    xml += `<span begin="${formatTimeTtmlAttr(wStart)}" end="${formatTimeTtmlAttr(wEnd)}"${wBgAttr}>${innerXml}</span>`;
                    if (hasTrailingSpace && wIdx < words.length - 1) {
                        xml += ` `;
                    }
                }
            });

            const trans = (line.translation !== undefined && line.translation !== '') ? line.translation : (line.subText || '');
            if (trans && trans.trim()) {
                xml += `<span ttm:role="x-translation">${escapeXml(trans.trim())}</span>`;
            }
            if (line.romanization && line.romanization.trim()) {
                xml += `<span ttm:role="x-roman">${escapeXml(line.romanization.trim())}</span>`;
            }

            xml += `</p>\n`;
        });

        xml += `    </div>\n  </body>\n</tt>`;
        return xml;
    }

    function exportToJson(lines, meta = {}) {
        const payload = {
            format: 'lyric-studio-json',
            version: '2.1',
            metadata: {
                title: meta.title || '',
                artist: meta.artist || '',
                exportedAt: new Date().toISOString()
            },
            lines: (lines || []).map(l => ({
                time: l.time,
                endTime: l.endTime,
                text: l.text,
                translation: l.translation || l.subText || '',
                subText: l.subText || l.translation || '',
                romanization: l.romanization || '',
                isBG: Boolean(l.isBG || l.isBacking),
                isBacking: Boolean(l.isBG || l.isBacking),
                isDuet: Boolean(l.isDuet),
                hasWordTiming: Boolean(l.hasWordTiming),
                words: (l.words || []).map(w => ({
                    text: w.text,
                    ruby: w.ruby || '',
                    time: w.time,
                    endTime: w.endTime,
                    isBG: Boolean(w.isBG || w.isBacking),
                    isBacking: Boolean(w.isBG || w.isBacking)
                }))
            }))
        };
        return JSON.stringify(payload, null, 2);
    }

    function exportToRawText(lines, includeSubLyrics = false) {
        return (lines || []).map(l => {
            let s = l.text || '';
            if (includeSubLyrics) {
                const trans = l.translation || l.subText || '';
                if (trans) s += ` // ${trans}`;
                if (l.romanization) s += ` /// ${l.romanization}`;
            }
            return s;
        }).join('\n');
    }

    function batchSplitRawText(rawText, options = {}) {
        const autoSyllabify = Boolean(options.autoSyllabify);
        const autoBracketBg = options.autoBracketBg !== false;
        const defaultDuration = parseFloat(options.defaultDuration) || 3.0;
        const assignSequentialTime = Boolean(options.assignSequentialTime);

        const rawLines = String(rawText || '').split(/\r?\n/);
        const result = [];
        let runningTime = 0;

        rawLines.forEach(raw => {
            const tr = raw.trim();
            if (!tr) return;

            // If line already has timestamps, parse it via parseAnyFormat
            if (/^\[\d{1,2}:\d{2}[.:]\d{2,3}\]/.test(tr)) {
                const singleParsed = parseAnyFormat(tr);
                if (singleParsed.lines && singleParsed.lines.length > 0) {
                    const pl = singleParsed.lines[0];
                    if (autoSyllabify && Array.isArray(pl.words)) {
                        for (let wi = pl.words.length - 1; wi >= 0; wi--) {
                            splitWordIntoSyllables(pl, wi, 'auto');
                        }
                    }
                    result.push(pl);
                    if (typeof pl.endTime === 'number') runningTime = pl.endTime;
                    return;
                }
            }

            let mainText = tr;
            let translation = '';
            let romanization = '';

            if (mainText.includes('//') && mainText.includes('///')) {
                const rSplit = mainText.split(/\s*\/{3}\s*/);
                const leftPart = rSplit[0];
                romanization = rSplit.slice(1).join(' / ').trim();
                if (/\s*\/{2}\s*/.test(leftPart)) {
                    const tSplit = leftPart.split(/\s*\/{2}\s*/);
                    mainText = tSplit[0].trim();
                    translation = tSplit.slice(1).join(' / ').trim();
                } else {
                    mainText = leftPart.trim();
                }
            } else if (/\s*(?:\/{2,3}|\|)\s*/.test(mainText)) {
                const parts = mainText.split(/\s*(?:\/{2,3}|\|)\s*/);
                mainText = parts[0].trim();
                translation = parts.slice(1).join(' / ').trim();
            }

            const isBacking = mainText.startsWith('(') && mainText.endsWith(')');
            const lineStart = assignSequentialTime ? runningTime : null;
            const lineEnd = assignSequentialTime ? Number((runningTime + defaultDuration).toFixed(3)) : null;
            if (assignSequentialTime) runningTime = lineEnd;

            const lineObj = normalizeLine({
                time: lineStart,
                endTime: lineEnd,
                text: mainText,
                subText: translation,
                translation,
                romanization,
                isBacking,
                isBG: isBacking,
                isDuet: false
            });

            if (autoSyllabify && Array.isArray(lineObj.words)) {
                for (let wi = lineObj.words.length - 1; wi >= 0; wi--) {
                    splitWordIntoSyllables(lineObj, wi, 'auto');
                }
            }

            if (autoBracketBg) {
                autoMarkBracketBackingVocals(lineObj);
            }
            result.push(lineObj);
        });

        return result;
    }

    const LyricStudioModel = {
        nextUid,
        formatTimeMs,
        formatTimeShort,
        formatTimeLrcTag,
        formatTimeTtmlAttr,
        parseTimeInput,
        rawTokenizeText,
        createWord,
        tokenizeIntoWords,
        reconstructLineText,
        normalizeLine,
        syncLineFromWords,
        syncWordsFromLineText,
        autoMarkBracketBackingVocals,
        autoSyllabifyWord,
        splitWordIntoSyllables,
        splitWordAtChar,
        mergeAdjacentWords,
        distributeWordTimings,
        parseAnyFormat,
        exportToLrc,
        toRendererLyrics,
        exportToTtml,
        exportToJson,
        exportToRawText,
        batchSplitRawText
    };

    global.LyricStudioModel = LyricStudioModel;
})(typeof window !== 'undefined' ? window : global);
