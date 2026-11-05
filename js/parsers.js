/* LRC and TTML parsers. */

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

function containsRubyMarkup(text) {
    if (!text || typeof text !== 'string') return false;
    return /<\s*ruby\b/i.test(text);
}

function stripRubyToBaseText(text) {
    if (!text || typeof text !== 'string') return '';
    if (!/<\s*(?:ruby|rt|rp|rb)\b/i.test(text)) return text;
    return text
        .replace(/<rp\b[^>]*>[\s\S]*?<\/rp>/gi, '')
        .replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi, '')
        .replace(/<\/?(?:ruby|rb)\b[^>]*>/gi, '');
}

/**
 * Extracts an array of `{ text, ruby }` segments from a string that may contain
 * `<ruby><rb>Kanji</rb><rt>reading</rt></ruby>` or `<ruby>Kanji<rt>reading</rt></ruby>` markup.
 * Plain text outside `<ruby>` is tokenized using `tokenizeText` so CJK characters and words
 * remain properly segmented alongside ruby-annotated tokens.
 */
function parseInlineRubyTokens(text) {
    if (!text || typeof text !== 'string') return [];
    if (!containsRubyMarkup(text)) {
        return tokenizeText(text).map(t => ({ text: t, ruby: '' }));
    }

    const segments = [];
    const rubyBlockReg = /<ruby\b[^>]*>([\s\S]*?)<\/ruby>(\s*)/gi;
    let lastIndex = 0;
    let match;

    while ((match = rubyBlockReg.exec(text)) !== null) {
        if (match.index > lastIndex) {
            const plainBefore = text.slice(lastIndex, match.index);
            const plainTokens = tokenizeText(plainBefore);
            for (let i = 0; i < plainTokens.length; i++) {
                if (/^\s+$/.test(plainTokens[i]) && segments.length > 0) {
                    segments[segments.length - 1].text += plainTokens[i];
                } else {
                    segments.push({ text: plainTokens[i], ruby: '' });
                }
            }
        }

        const innerRuby = match[1].replace(/<rp\b[^>]*>[\s\S]*?<\/rp>/gi, '');
        const trailingSpace = match[2] || '';

        // Support multiple <rb>/<rt> pairs inside a single <ruby> block (e.g., <ruby><rb>自</rb><rt>じ</rt><rb>分</rb><rt>ぶん</rt></ruby>)
        const pairReg = /(?:<rb\b[^>]*>([\s\S]*?)<\/rb>|([^<]+))\s*<rt\b[^>]*>([\s\S]*?)<\/rt>/gi;
        const pairs = [];
        let pMatch;
        let pairLastEnd = 0;
        let matchedAnyPair = false;

        while ((pMatch = pairReg.exec(innerRuby)) !== null) {
            matchedAnyPair = true;
            const rawBase = (pMatch[1] !== undefined ? pMatch[1] : pMatch[2]) || '';
            const rawRt = pMatch[3] || '';
            const baseClean = normalizeHomoglyphs(rawBase.replace(/<[^>]+>/g, '')).trim();
            const rtClean = rawRt.replace(/<[^>]+>/g, '').trim();
            if (baseClean) {
                pairs.push({ text: baseClean, ruby: rtClean });
            }
            pairLastEnd = pairReg.lastIndex;
        }

        if (matchedAnyPair && pairs.length > 0) {
            const leftover = innerRuby.slice(pairLastEnd).replace(/<[^>]+>/g, '');
            if (leftover) {
                pairs[pairs.length - 1].text += leftover;
            }
            pairs[pairs.length - 1].text += trailingSpace;
            segments.push(...pairs);
        } else {
            // Fallback: collect all <rt> and all non-<rt> base text
            const rtParts = [];
            const rtScan = /<rt\b[^>]*>([\s\S]*?)<\/rt>/gi;
            let rtM;
            while ((rtM = rtScan.exec(innerRuby)) !== null) {
                const r = rtM[1].replace(/<[^>]+>/g, '').trim();
                if (r) rtParts.push(r);
            }
            const baseText = normalizeHomoglyphs(
                innerRuby
                    .replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi, '')
                    .replace(/<\/?rb\b[^>]*>/gi, '')
                    .replace(/<[^>]+>/g, '')
            ).trim();
            if (baseText) {
                segments.push({ text: baseText + trailingSpace, ruby: rtParts.join('') });
            }
        }

        lastIndex = rubyBlockReg.lastIndex;
    }

    if (lastIndex < text.length) {
        const plainAfter = text.slice(lastIndex);
        const plainTokens = tokenizeText(plainAfter);
        for (let i = 0; i < plainTokens.length; i++) {
            if (/^\s+$/.test(plainTokens[i]) && segments.length > 0) {
                segments[segments.length - 1].text += plainTokens[i];
            } else {
                segments.push({ text: plainTokens[i], ruby: '' });
            }
        }
    }

    return segments;
}


function mergeOverlappingBackingVocals(parsedList) {
    if (!parsedList || parsedList.length <= 1) return parsedList;
    const alongsideMode = typeof backingVocalsAlongsideToggle !== 'undefined' && backingVocalsAlongsideToggle
        ? backingVocalsAlongsideToggle.checked
        : true;
    if (!alongsideMode) return parsedList;

    const result = [];
    let currentMain = null;

    for (let i = 0; i < parsedList.length; i++) {
        const item = parsedList[i];

        if (item.isBacking) {
            let canMerge = false;
            if (currentMain && currentMain.text !== '• • •' && currentMain.text.trim()) {
                // Strict Overlap Check: backing vocal must begin strictly WHILE currentMain is active
                if (typeof currentMain.endTime === 'number') {
                    // In TTML with explicit end times: item starts before currentMain finishes
                    if (item.time >= currentMain.time && item.time < currentMain.endTime - 0.2) {
                        canMerge = true;
                    }
                } else {
                    // In LRC without explicit end times: only merge if within tight 1.5s window
                    const timeDiff = item.time - currentMain.time;
                    if (timeDiff >= 0 && timeDiff <= 1.5) {
                        canMerge = true;
                    }
                }
            }

            if (canMerge) {
                let backingText = item.text.trim();
                if (!backingText.startsWith('(') && !backingText.endsWith(')')) {
                    backingText = '(' + backingText + ')';
                }
                currentMain.text = currentMain.text + ' ' + backingText;

                // Handle words highlight arrays
                if (item.words && item.words.length > 0) {
                    if (!currentMain.words) {
                        const mainClean = currentMain.text.replace(backingText, '').trim();
                        currentMain.words = tokenizeText(mainClean).map(w => ({
                            text: w,
                            time: currentMain.time,
                            endTime: item.time,
                            isBacking: false
                        }));
                    }
                    item.words.forEach(w => { w.isBacking = true; });
                    currentMain.words.push(...item.words);
                } else if (currentMain.words && currentMain.words.length > 0) {
                    const itemTokens = tokenizeText(backingText);
                    const dur = 0.4;
                    itemTokens.forEach((tok, idx) => {
                        currentMain.words.push({
                            text: tok,
                            time: item.time + idx * dur,
                            endTime: item.time + (idx + 1) * dur,
                            isBacking: true
                        });
                    });
                }

                if (item.subText) {
                    currentMain.subText = currentMain.subText
                        ? currentMain.subText + ' (' + item.subText + ')'
                        : '(' + item.subText + ')';
                }

                if (item.endTime && currentMain.endTime) {
                    currentMain.endTime = Math.max(currentMain.endTime, item.endTime);
                }
                continue;
            }
        }

        result.push(item);
        if (!item.isBacking && item.text !== '• • •' && item.text.trim()) {
            currentMain = item;
        }
    }

    return result;
}

function parseLrc(lrcText) {
    const lines = lrcText.split('\n');
    const rawParsed = [];
    const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
    const backingVocalsMode = typeof backingVocalsSelect !== 'undefined' && backingVocalsSelect ? backingVocalsSelect.value : 'styled';

    lines.forEach(line => {
        let match;
        let lineLyrics = line.replace(timeReg, '').trim();
        if (!lineLyrics) return;

        // Detect optional role prefixes: [bg], [v2], [duet]
        let isDuet = false;
        let isRoleBg = false;
        let workingLyrics = lineLyrics;
        while (/^\[(?:bg|v2|duet|v1)\]\s*/i.test(workingLyrics)) {
            const tagM = workingLyrics.match(/^\[(bg|v2|duet|v1)\]\s*/i);
            if (tagM) {
                const roleTag = tagM[1].toLowerCase();
                if (roleTag === 'bg') isRoleBg = true;
                if (roleTag === 'v2' || roleTag === 'duet') isDuet = true;
                workingLyrics = workingLyrics.slice(tagM[0].length).trim();
            } else {
                break;
            }
        }

        const strippedForBg = workingLyrics.replace(/<\d{1,2}:\d{2}[.:]\d{2,3}>/g, '').trim();
        const isBacking = isRoleBg || (strippedForBg.startsWith('(') && strippedForBg.endsWith(')'));
        if (backingVocalsMode === 'hide' && isBacking) return;

        let mainText = normalizeHomoglyphs(workingLyrics);
        let subText = null;
        let romanization = null;

        // Check for inline dual-language / romanization delimiters
        // If both // and /// exist: mainText // subText /// romanization
        if (mainText.includes('//') && mainText.includes('///')) {
            const rSplit = mainText.split(/\s*\/{3}\s*/);
            const leftPart = rSplit[0];
            romanization = rSplit.slice(1).join(' / ').trim() || null;
            if (/\s*\/{2}\s*/.test(leftPart)) {
                const tSplit = leftPart.split(/\s*\/{2}\s*/);
                mainText = tSplit[0].trim();
                subText = tSplit.slice(1).join(' / ').trim() || null;
            } else {
                mainText = leftPart.trim();
            }
        } else if (/\s*(?:\/{2,3}|\|)\s*/.test(mainText)) {
            const parts = mainText.split(/\s*(?:\/{2,3}|\|)\s*/);
            mainText = parts[0].trim();
            subText = parts.slice(1).join(' / ').trim();
        }

        // Parse Enhanced LRC word tags (<mm:ss.xx> or <mm:ss.xxx>) if present
        const wordTagCheck = /<(\d{1,2}):(\d{2})[.:](\d{2,3})>/;
        let parsedWordsTemplate = null;
        if (wordTagCheck.test(mainText)) {
            const wordTokens = [];
            const wordReg = /<(\d{1,2}):(\d{2})[.:](\d{2,3})>([\s\S]*?)(?=<\d{1,2}:\d{2}[.:]\d{2,3}>|$)/g;
            let wMatch;
            while ((wMatch = wordReg.exec(mainText)) !== null) {
                const wm = parseInt(wMatch[1], 10);
                const ws = parseInt(wMatch[2], 10);
                const wms = parseInt(wMatch[3], 10) * (wMatch[3].length === 2 ? 10 : 1);
                const wTime = wm * 60 + ws + wms / 1000;
                const wRaw = wMatch[4];
                if (wRaw !== '') {
                    const isWordBracket = isBacking || /[\(\[\{（【]/.test(wRaw) || /[\)\]\}）】]/.test(wRaw);
                    if (containsRubyMarkup(wRaw)) {
                        const rubySegs = parseInlineRubyTokens(wRaw);
                        const segDur = 0.4 / Math.max(1, rubySegs.length);
                        rubySegs.forEach((seg, sIdx) => {
                            wordTokens.push({
                                text: seg.text,
                                ruby: seg.ruby || '',
                                time: wTime + sIdx * segDur,
                                endTime: wTime + (sIdx + 1) * segDur,
                                isBacking: Boolean(isBacking || isWordBracket),
                                isBG: Boolean(isBacking || isWordBracket)
                            });
                        });
                    } else {
                        wordTokens.push({
                            text: wRaw,
                            ruby: '',
                            time: wTime,
                            endTime: wTime + 0.4,
                            isBacking: Boolean(isBacking || isWordBracket),
                            isBG: Boolean(isBacking || isWordBracket)
                        });
                    }
                }
            }
            for (let k = 0; k < wordTokens.length; k++) {
                if (k < wordTokens.length - 1 && wordTokens[k + 1].time > wordTokens[k].time) {
                    wordTokens[k].endTime = wordTokens[k + 1].time;
                }
            }
            if (wordTokens.length > 0) {
                let inBracket = false;
                for (let bi = 0; bi < wordTokens.length; bi++) {
                    const wt = wordTokens[bi].text;
                    if (/[\(\[\{（【]/.test(wt)) inBracket = true;
                    if (inBracket || wordTokens[bi].isBacking) {
                        wordTokens[bi].isBacking = true;
                        wordTokens[bi].isBG = true;
                    }
                    if (/[\)\]\}）】]/.test(wt)) inBracket = false;
                }
                parsedWordsTemplate = wordTokens;
                mainText = wordTokens.map(w => w.text).join('').trim();
            } else {
                mainText = stripRubyToBaseText(mainText.replace(/<\d{1,2}:\d{2}[.:]\d{2,3}>/g, '')).trim();
            }
        } else if (containsRubyMarkup(mainText)) {
            const rubySegs = parseInlineRubyTokens(mainText);
            if (rubySegs.length > 0) {
                parsedWordsTemplate = rubySegs.map(seg => ({
                    text: seg.text,
                    ruby: seg.ruby || '',
                    time: 0,
                    endTime: 0.4,
                    isBacking: Boolean(isBacking),
                    isBG: Boolean(isBacking),
                    _needsLineTiming: true
                }));
                mainText = rubySegs.map(s => s.text).join('').trim();
            } else {
                mainText = stripRubyToBaseText(mainText).trim();
            }
        }

        // Reset regex index
        timeReg.lastIndex = 0;
        while ((match = timeReg.exec(line)) !== null) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const milliseconds = parseInt(match[3]) * (match[3].length === 2 ? 10 : 1);

            const time = minutes * 60 + seconds + milliseconds / 1000;
            const entry = { time, text: mainText, subText, translation: subText || '', isBacking, isBG: isBacking };
            if (isDuet) entry.isDuet = true;
            if (romanization) entry.romanization = romanization;
            if (parsedWordsTemplate) {
                const dur = 3.0;
                const step = dur / Math.max(1, parsedWordsTemplate.length);
                entry.words = parsedWordsTemplate.map((w, idx) => {
                    if (w._needsLineTiming) {
                        const copy = { ...w, time: time + idx * step, endTime: time + (idx + 1) * step };
                        delete copy._needsLineTiming;
                        return copy;
                    }
                    return { ...w };
                });
                entry.endTime = entry.words[entry.words.length - 1].endTime;
            }
            rawParsed.push(entry);
        }
    });

    rawParsed.sort((a, b) => a.time - b.time);

    // Merge consecutive identical timestamp lines into dual-language (mainText + subText)
    const parsed = [];
    for (let i = 0; i < rawParsed.length; i++) {
        const curr = rawParsed[i];
        if (i < rawParsed.length - 1) {
            const next = rawParsed[i + 1];
            if (Math.abs(curr.time - next.time) < 0.15 && !curr.subText && !next.subText && !curr.isBacking && !next.isBacking) {
                curr.subText = next.text;
                parsed.push(curr);
                i++; // Skip paired line
                continue;
            }
        }
        parsed.push(curr);
    }

    return mergeOverlappingBackingVocals(parsed);
}


function normalizeHomoglyphs(text) {
    if (!text) return '';
    return text
        .replace(/\u0435/g, 'e') // Cyrillic small ie
        .replace(/\u0430/g, 'a') // Cyrillic small a
        .replace(/\u043E/g, 'o') // Cyrillic small o
        .replace(/\u0440/g, 'p') // Cyrillic small er
        .replace(/\u0441/g, 'c') // Cyrillic small es
        .replace(/\u0443/g, 'y') // Cyrillic small u
        .replace(/\u0445/g, 'x') // Cyrillic small ha
        .replace(/\u0456/g, 'i') // Cyrillic small i
        .replace(/\u0458/g, 'j') // Cyrillic small je
        .replace(/\u0455/g, 's') // Cyrillic small dze
        .replace(/\u0415/g, 'E') // Cyrillic capital IE
        .replace(/\u0410/g, 'A') // Cyrillic capital A
        .replace(/\u041E/g, 'O') // Cyrillic capital O
        .replace(/\u0420/g, 'P') // Cyrillic capital ER
        .replace(/\u0421/g, 'C') // Cyrillic capital ES
        .replace(/\u0422/g, 'T') // Cyrillic capital TE
        .replace(/\u041C/g, 'M') // Cyrillic capital EM
        .replace(/\u0412/g, 'B') // Cyrillic capital VE
        .replace(/\u041D/g, 'H'); // Cyrillic capital EN
}

function cleanSpanText(text) {
    text = normalizeHomoglyphs(text);
    let cleaned = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
    const endsWithSpace = /\s$/.test(text);
    const startsWithSpace = /^\s/.test(text);
    cleaned = cleaned.trim();
    if (startsWithSpace) cleaned = ' ' + cleaned;
    if (endsWithSpace) cleaned = cleaned + ' ';
    return cleaned;
}

function parseTime(timeStr) {
    if (!timeStr) return 0;
    if (typeof timeStr === 'number') return timeStr;
    timeStr = String(timeStr).trim();
    if (timeStr.endsWith('ms')) {
        return (parseFloat(timeStr.slice(0, -2)) || 0) / 1000;
    }
    if (timeStr.endsWith('s')) {
        timeStr = timeStr.slice(0, -1);
    }
    const parts = timeStr.split(':');
    if (parts.length === 3) return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + (parseFloat(parts[2]) || 0);
    if (parts.length === 2) return parseInt(parts[0], 10) * 60 + (parseFloat(parts[1]) || 0);
    return parseFloat(timeStr) || 0;
}

function parseTtml(ttmlText) {
    let xmlDoc = null;
    let paragraphs = [];
    let parserErrors = [];
    if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        xmlDoc = parser.parseFromString(ttmlText, "text/xml");
        paragraphs = xmlDoc.getElementsByTagName('p');
        parserErrors = xmlDoc.getElementsByTagName('parsererror');
    }
    const parsed = [];
    const backingVocalsMode = typeof backingVocalsSelect !== 'undefined' && backingVocalsSelect ? backingVocalsSelect.value : 'styled';

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
        const text = el.textContent ? el.textContent.trim() : '';
        if (text.startsWith('(') && text.endsWith(')')) {
            return true;
        }
        return false;
    }

    function getRubyRole(el) {
        if (!el || typeof el.getAttribute !== 'function') return '';
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'ruby') return 'container';
        if (tag === 'rb') return 'base';
        if (tag === 'rt') return 'text';
        if (tag === 'rp') return 'delimiter';
        const ttsRuby = (el.getAttribute('tts:ruby') || el.getAttribute('ruby') || '').toLowerCase();
        if (ttsRuby === 'container' || ttsRuby === 'base' || ttsRuby === 'text' || ttsRuby === 'textcontainer' || ttsRuby === 'delimiter') {
            return ttsRuby;
        }
        const role = (el.getAttribute('ttm:role') || el.getAttribute('role') || '').toLowerCase();
        if (role === 'x-ruby' || role === 'ruby-text' || role === 'rt') return 'text';
        return '';
    }

    function extractNodeBaseAndRubyPairs(rootEl) {
        const pairs = [];
        let pendingBase = '';
        let pendingRt = '';

        function flushPair() {
            const b = cleanSpanText(pendingBase);
            const r = pendingRt.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
            if (b) {
                pairs.push({ text: b, ruby: r });
            }
            pendingBase = '';
            pendingRt = '';
        }

        function walkRuby(n) {
            if (n.nodeType === 3) {
                if (pendingRt && pendingBase) {
                    flushPair();
                }
                pendingBase += n.textContent || '';
                return;
            }
            if (n.nodeType !== 1) return;
            const rRole = getRubyRole(n);
            if (rRole === 'delimiter') return;
            if (rRole === 'text') {
                pendingRt += n.textContent || '';
                return;
            }
            if (rRole === 'base') {
                if (pendingRt && pendingBase) {
                    flushPair();
                }
                pendingBase += n.textContent || '';
                return;
            }
            Array.from(n.childNodes || []).forEach(walkRuby);
        }

        Array.from(rootEl.childNodes || []).forEach(walkRuby);
        if (pendingBase) flushPair();
        return pairs;
    }

    function extractCleanTextFromDomNode(node) {
        if (!node) return '';
        if (node.nodeType === 3) return node.textContent || '';
        if (node.nodeType !== 1) return '';
        const roleAttr = (node.getAttribute('ttm:role') || node.getAttribute('role') || '').toLowerCase();
        if (roleAttr === 'x-translation' || roleAttr === 'translation' || roleAttr === 'x-roman' || roleAttr === 'romanization' || roleAttr === 'pronunciation') {
            return '';
        }
        const rRole = getRubyRole(node);
        if (rRole === 'text' || rRole === 'delimiter') return '';
        let out = '';
        Array.from(node.childNodes || []).forEach(ch => {
            out += extractCleanTextFromDomNode(ch);
        });
        return out;
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
            const endM = attrs.match(/end="([^"]+)"/i);
            const durM = attrs.match(/dur="([^"]+)"/i);
            let pEndTime = null;
            if (endM) {
                pEndTime = parseTime(endM[1]);
            } else if (durM) {
                pEndTime = time + parseTime(durM[1]);
            }

            let metaTrans = null;
            let metaRom = null;
            // Extract translation / romanization spans first so they aren't mixed into words
            content = content.replace(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi, (fullSpan, sAttrs, sBody) => {
                const roleM = sAttrs.match(/(?:ttm:)?role="([^"]+)"/i);
                if (roleM) {
                    const roleVal = roleM[1].toLowerCase();
                    if (roleVal === 'x-translation' || roleVal === 'translation') {
                        const tr = cleanSpanText(stripRubyToBaseText(sBody).replace(/<[^>]+>/g, '')).trim();
                        if (tr) metaTrans = metaTrans ? `${metaTrans} ${tr}` : tr;
                        return '';
                    }
                    if (roleVal === 'x-roman' || roleVal === 'romanization' || roleVal === 'pronunciation') {
                        const rm = cleanSpanText(stripRubyToBaseText(sBody).replace(/<[^>]+>/g, '')).trim();
                        if (rm) metaRom = metaRom ? `${metaRom} ${rm}` : rm;
                        return '';
                    }
                }
                return fullSpan;
            });

            const spans = [];
            const spanRegex = /<span\b([^>]*)>([\s\S]*?)<\/span>(\s*)/gi;
            let sMatch;
            while ((sMatch = spanRegex.exec(content)) !== null) {
                const sAttrs = sMatch[1];
                const sBody = sMatch[2];
                const afterSpace = sMatch[3] || '';
                const sBeginM = sAttrs.match(/begin="([^"]+)"/i);
                const sEndM = sAttrs.match(/end="([^"]+)"/i);
                const sDurM = sAttrs.match(/dur="([^"]+)"/i);
                const wTime = sBeginM ? parseTime(sBeginM[1]) : time;
                let wEndTime;
                if (sEndM) {
                    wEndTime = parseTime(sEndM[1]);
                } else if (sDurM) {
                    wEndTime = wTime + parseTime(sDurM[1]);
                } else if (pEndTime) {
                    wEndTime = pEndTime;
                } else {
                    wEndTime = wTime + 1;
                }
                const isSpanBg = /(?:ttm:)?role="(?:x-bg|background|backing)"/i.test(sAttrs);

                if (containsRubyMarkup(sBody)) {
                    const rubySegs = parseInlineRubyTokens(sBody);
                    const segDur = Math.max(0.05, wEndTime - wTime) / Math.max(1, rubySegs.length);
                    rubySegs.forEach((seg, sIdx) => {
                        let tokText = seg.text;
                        if (sIdx === rubySegs.length - 1 && /\s/.test(afterSpace) && !CJK_REGEX.test(tokText) && !tokText.endsWith(' ')) {
                            tokText += ' ';
                        }
                        spans.push({
                            text: tokText,
                            ruby: seg.ruby || '',
                            time: wTime + sIdx * segDur,
                            endTime: wTime + (sIdx + 1) * segDur,
                            isBacking: isSpanBg
                        });
                    });
                } else {
                    let sText = cleanSpanText(stripRubyToBaseText(sBody).replace(/<[^>]+>/g, ''));
                    if (sText) {
                        if (/\s/.test(afterSpace) && !CJK_REGEX.test(sText) && !sText.endsWith(' ')) {
                            sText += ' ';
                        }
                        spans.push({ text: sText, ruby: '', time: wTime, endTime: wEndTime, isBacking: isSpanBg });
                    }
                }
            }

            if (spans.length === 0 && containsRubyMarkup(content)) {
                const rubySegs = parseInlineRubyTokens(content);
                const totalDur = (pEndTime && pEndTime > time) ? (pEndTime - time) : 3.0;
                const segDur = totalDur / Math.max(1, rubySegs.length);
                rubySegs.forEach((seg, sIdx) => {
                    spans.push({
                        text: seg.text,
                        ruby: seg.ruby || '',
                        time: time + sIdx * segDur,
                        endTime: time + (sIdx + 1) * segDur,
                        isBacking: false
                    });
                });
            }

            const fullText = spans.length > 0
                ? spans.map(s => s.text).join('').trim()
                : stripRubyToBaseText(content).replace(/<[^>]+>/g, '').trim();
            if (fullText) {
                const entry = {
                    time,
                    endTime: pEndTime || (spans.length > 0 ? spans[spans.length - 1].endTime : null),
                    text: fullText,
                    subText: metaTrans || null,
                    words: spans.length > 0 ? spans : null,
                    isBacking: false
                };
                if (metaRom) entry.romanization = metaRom;
                parsed.push(entry);
            }
        }
        if (parsed.length > 0) return mergeOverlappingBackingVocals(parsed);
    }

    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const isLineBacking = checkIfBgElement(p);
        if (backingVocalsMode === 'hide' && isLineBacking) continue;
        const pAgent = p.getAttribute('ttm:agent') || p.getAttribute('agent') || '';
        const isLineDuet = (pAgent === 'v2' || /duet|secondary|v2/i.test(pAgent));

        const rawText = extractCleanTextFromDomNode(p).trim();
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
                    const entry = {
                        time: parsedTime,
                        text: cleanText,
                        words: null,
                        isBacking: isLineBacking
                    };
                    if (isLineDuet) entry.isDuet = true;
                    parsed.push(entry);
                });
            }
            continue;
        }

        const begin = p.getAttribute('begin');
        const end = p.getAttribute('end');
        const dur = p.getAttribute('dur');
        if (begin) {
            const time = parseTime(begin);
            let pEndTime = null;
            if (end) {
                pEndTime = parseTime(end);
            } else if (dur) {
                pEndTime = time + parseTime(dur);
            }

            const spans = p.getElementsByTagName('span');
            const rubies = p.getElementsByTagName('ruby');
            const words = [];
            let textContent = '';
            let metaTranslation = null;
            let metaRomanization = null;

            if (spans.length > 0 || rubies.length > 0) {
                let lastWord = null;

                function resolveNodeTiming(el, fallbackStart, fallbackEnd) {
                    const sBegin = el && typeof el.getAttribute === 'function' ? el.getAttribute('begin') : null;
                    const sEnd = el && typeof el.getAttribute === 'function' ? el.getAttribute('end') : null;
                    const sDur = el && typeof el.getAttribute === 'function' ? el.getAttribute('dur') : null;
                    const wTime = sBegin ? parseTime(sBegin) : fallbackStart;
                    let wEndTime;
                    if (sEnd) {
                        wEndTime = parseTime(sEnd);
                    } else if (sDur) {
                        wEndTime = wTime + parseTime(sDur);
                    } else if (fallbackEnd) {
                        wEndTime = fallbackEnd;
                    } else if (pEndTime) {
                        wEndTime = pEndTime;
                    } else {
                        wEndTime = wTime + 1;
                    }
                    return { wTime, wEndTime };
                }

                function pushRubyContainerElement(el, inheritedStart, inheritedEnd, inheritedBacking) {
                    const { wTime, wEndTime } = resolveNodeTiming(el, inheritedStart, inheritedEnd);
                    const isBacking = checkIfBgElement(el) || inheritedBacking || isLineBacking;
                    const pairs = extractNodeBaseAndRubyPairs(el);
                    if (pairs.length > 0) {
                        const totalDur = Math.max(0.05, wEndTime - wTime);
                        const stepDur = totalDur / pairs.length;
                        pairs.forEach((pair, pIdx) => {
                            const wordObj = {
                                text: pair.text,
                                ruby: pair.ruby || '',
                                time: wTime + pIdx * stepDur,
                                endTime: wTime + (pIdx + 1) * stepDur,
                                isBacking
                            };
                            words.push(wordObj);
                            lastWord = wordObj;
                        });
                    }
                }

                function traverse(node, inheritedStart = time, inheritedEnd = pEndTime, inheritedBacking = isLineBacking) {
                    if (node.nodeType === 1) { // Element node
                        const roleAttr = (node.getAttribute('ttm:role') || node.getAttribute('role') || '').toLowerCase();
                        if (roleAttr === 'x-translation' || roleAttr === 'translation') {
                            const trText = cleanSpanText(extractCleanTextFromDomNode(node) || node.textContent).trim();
                            if (trText) metaTranslation = metaTranslation ? `${metaTranslation} ${trText}` : trText;
                            return;
                        }
                        if (roleAttr === 'x-roman' || roleAttr === 'romanization' || roleAttr === 'pronunciation') {
                            const rmText = cleanSpanText(extractCleanTextFromDomNode(node) || node.textContent).trim();
                            if (rmText) metaRomanization = metaRomanization ? `${metaRomanization} ${rmText}` : rmText;
                            return;
                        }

                        const rRole = getRubyRole(node);
                        if (rRole === 'delimiter' || rRole === 'text') {
                            // Never emit <rt> or <rp> as standalone base lyric words!
                            return;
                        }
                        if (rRole === 'container') {
                            pushRubyContainerElement(node, inheritedStart, inheritedEnd, inheritedBacking);
                            return;
                        }

                        const { wTime, wEndTime } = resolveNodeTiming(node, inheritedStart, inheritedEnd);
                        const isBacking = checkIfBgElement(node) || checkIfBgElement(node.parentElement) || inheritedBacking || isLineBacking;
                        const childElements = Array.from(node.childNodes).filter(n => n.nodeType === 1);
                        const hasChildElements = childElements.length > 0;

                        // Check if this span directly wraps ruby markup (e.g., <span begin="..." end="..."><ruby>全<rt>すべ</rt></ruby>ては</span> or <span ...>全<rt>すべ</rt></span>)
                        const hasNestedTimedSpan = childElements.some(ch => ch.tagName && ch.tagName.toLowerCase() === 'span' && ch.getAttribute('begin') && !getRubyRole(ch));
                        const hasRubyChild = childElements.some(ch => {
                            const cr = getRubyRole(ch);
                            return cr === 'container' || cr === 'text' || cr === 'base';
                        });

                        if (node.tagName.toLowerCase() === 'span' && hasRubyChild && !hasNestedTimedSpan) {
                            const pairs = extractNodeBaseAndRubyPairs(node);
                            if (pairs.length > 0) {
                                const totalDur = Math.max(0.05, wEndTime - wTime);
                                const stepDur = totalDur / pairs.length;
                                pairs.forEach((pair, pIdx) => {
                                    const wordObj = {
                                        text: pair.text,
                                        ruby: pair.ruby || '',
                                        time: wTime + pIdx * stepDur,
                                        endTime: wTime + (pIdx + 1) * stepDur,
                                        isBacking
                                    };
                                    words.push(wordObj);
                                    lastWord = wordObj;
                                });
                            }
                            return;
                        }

                        if (node.tagName.toLowerCase() === 'span' && !hasChildElements) {
                            const wText = cleanSpanText(node.textContent);
                            if (wText !== '') {
                                const wordObj = { text: wText, ruby: '', time: wTime, endTime: wEndTime, isBacking };
                                words.push(wordObj);
                                lastWord = wordObj;
                            }
                        } else {
                            Array.from(node.childNodes).forEach(ch => traverse(ch, wTime, wEndTime, isBacking));
                        }
                    } else if (node.nodeType === 3) { // Text node
                        const text = node.textContent;
                        if (text && text.trim()) {
                            // Unwrapped text node directly inside <p> alongside <ruby> or <span>
                            const cleanT = cleanSpanText(text);
                            if (cleanT) {
                                const wordObj = {
                                    text: cleanT,
                                    ruby: '',
                                    time: lastWord ? lastWord.endTime : inheritedStart,
                                    endTime: inheritedEnd || ((lastWord ? lastWord.endTime : inheritedStart) + 0.5),
                                    isBacking: inheritedBacking
                                };
                                words.push(wordObj);
                                lastWord = wordObj;
                            }
                        } else if (lastWord && /\s/.test(text)) {
                            if (!lastWord.text.endsWith(' ') &&
                                !lastWord.text.endsWith('\u00A0') &&
                                !CJK_REGEX.test(lastWord.text)) {
                                lastWord.text += ' ';
                            }
                        }
                    }
                }

                Array.from(p.childNodes).forEach(ch => traverse(ch, time, pEndTime, isLineBacking));

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
                textContent = extractCleanTextFromDomNode(p).trim();
            }

            if (textContent.trim()) {
                let mainText = textContent.trim();
                let subText = metaTranslation || null;
                if (!subText && /\s*(?:\/{2,3}|\|)\s*/.test(mainText)) {
                    const parts = mainText.split(/\s*(?:\/{2,3}|\|)\s*/);
                    mainText = parts[0].trim();
                    subText = parts.slice(1).join(' / ').trim();
                }

                const entry = {
                    time,
                    endTime: pEndTime || (words.length > 0 ? words[words.length - 1].endTime : null),
                    text: mainText,
                    subText,
                    words: words.length > 0 ? words : null,
                    isBacking: isLineBacking || (words.length > 0 && words.every(w => w.isBacking))
                };
                if (isLineDuet) entry.isDuet = true;
                if (metaRomanization) entry.romanization = metaRomanization;
                parsed.push(entry);
            }
        }
    }

    parsed.sort((a, b) => a.time - b.time);

    // Merge consecutive identical timestamp paragraphs if applicable
    const merged = [];
    for (let i = 0; i < parsed.length; i++) {
        const curr = parsed[i];
        if (i < parsed.length - 1) {
            const next = parsed[i + 1];
            if (Math.abs(curr.time - next.time) < 0.15 && !curr.subText && !next.subText && !curr.isBacking && !next.isBacking) {
                curr.subText = next.text;
                merged.push(curr);
                i++;
                continue;
            }
        }
        merged.push(curr);
    }
    return mergeOverlappingBackingVocals(merged);
}


function isAssSubtitle(text) {
    if (!text || typeof text !== "string") return false;
    const trimmed = text.trim();
    return /^\s*\[Script Info\]/i.test(trimmed) ||
           /^\s*\[V4\+? Styles\]/i.test(trimmed) ||
           /^\s*\[Events\]/i.test(trimmed) ||
           /(?:^|\n)\s*Dialogue\s*:\s*[^,]+,/i.test(trimmed);
}

function parseAss(assText) {
    if (!assText) return [];
    const lines = assText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const rawParsed = [];
    const backingVocalsMode = typeof backingVocalsSelect !== "undefined" && backingVocalsSelect ? backingVocalsSelect.value : "styled";

    let inEvents = false;
    let formatColumns = ["layer", "start", "end", "style", "name", "marginl", "marginr", "marginv", "effect", "text"];
    let startIndex = 1;
    let endIndex = 2;
    let styleIndex = 3;
    let effectIndex = 8;
    let textIndex = 9;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith(";")) continue;

        if (line.startsWith("[")) {
            inEvents = /^\[Events\]/i.test(line);
            continue;
        }

        if (inEvents && /^Format\s*:/i.test(line)) {
            const formatStr = line.replace(/^Format\s*:\s*/i, "");
            formatColumns = formatStr.split(",").map(c => c.trim().toLowerCase());
            startIndex = formatColumns.indexOf("start");
            endIndex = formatColumns.indexOf("end");
            styleIndex = formatColumns.indexOf("style");
            effectIndex = formatColumns.indexOf("effect");
            textIndex = formatColumns.indexOf("text");

            if (startIndex === -1) startIndex = 1;
            if (endIndex === -1) endIndex = 2;
            if (textIndex === -1) textIndex = formatColumns.length - 1;
            continue;
        }

        if (/^Dialogue\s*:/i.test(line)) {
            const colonIdx = line.indexOf(":");
            const payload = line.slice(colonIdx + 1).trim();

            const numCols = Math.max(formatColumns.length, textIndex + 1);
            const parts = [];
            let lastIdx = 0;
            for (let c = 0; c < numCols - 1; c++) {
                const commaIdx = payload.indexOf(",", lastIdx);
                if (commaIdx === -1) break;
                parts.push(payload.slice(lastIdx, commaIdx).trim());
                lastIdx = commaIdx + 1;
            }
            parts.push(payload.slice(lastIdx));

            if (parts.length <= Math.max(startIndex, endIndex)) continue;

            const startStr = parts[startIndex];
            const endStr = parts[endIndex];
            const time = parseTime(startStr);
            let endTime = parseTime(endStr);
            if (endTime <= time) {
                endTime = time + 3.0;
            }

            const styleStr = styleIndex !== -1 && parts[styleIndex] ? parts[styleIndex] : "";
            const effectStr = effectIndex !== -1 && parts[effectIndex] ? parts[effectIndex] : "";
            const rawText = (textIndex !== -1 && parts[textIndex] !== undefined) ? parts[textIndex] : parts[parts.length - 1];

            const isStyleBacking = /bg|background|backing|vocal|chorus/i.test(styleStr) || /bg|background|backing|vocal|chorus/i.test(effectStr);
            const trimmedRaw = rawText.replace(/\{[^}]*\}/g, "").trim();
            const isParenthesesBacking = trimmedRaw.startsWith("(") && trimmedRaw.endsWith(")");
            const isBacking = isStyleBacking || isParenthesesBacking;

            if (backingVocalsMode === "hide" && isBacking) continue;

            const hasKaraoke = /\\(?:k|K|kf|ko)\d+/i.test(rawText);
            let words = null;
            let mainText = "";
            let subText = null;

            if (hasKaraoke) {
                words = [];
                let curTime = time;
                const tagRegex = /\{([^}]*)\}|([^{]+)/g;
                let m;
                let pendingDuration = 0;

                while ((m = tagRegex.exec(rawText)) !== null) {
                    if (m[1] !== undefined) {
                        const tagContent = m[1];
                        const kMatches = tagContent.match(/\\(?:k|K|kf|ko)(\d+)/gi);
                        if (kMatches) {
                            for (const km of kMatches) {
                                const num = parseInt(km.replace(/\\(?:k|K|kf|ko)/i, ""), 10);
                                if (!isNaN(num)) {
                                    pendingDuration += num / 100;
                                }
                            }
                        }
                    } else if (m[2] !== undefined) {
                        let chunk = m[2].replace(/\\N/gi, " ").replace(/\\h/gi, " ");
                        chunk = cleanSpanText(chunk);
                        if (chunk) {
                            const wDuration = pendingDuration > 0 ? pendingDuration : Math.max(0.05, (endTime - curTime) / 4);
                            const wEndTime = curTime + wDuration;
                            words.push({
                                text: chunk,
                                time: curTime,
                                endTime: wEndTime,
                                isBacking: isBacking
                            });
                            curTime = wEndTime;
                            pendingDuration = 0;
                        }
                    }
                }
                if (words.length > 0) {
                    mainText = words.map(w => w.text).join("").trim();
                    if (endTime < curTime) endTime = curTime;
                } else {
                    words = null;
                }
            }

            if (!words) {
                let clean = rawText.replace(/\{[^}]*\}/g, "").replace(/\\h/gi, " ").trim();
                if (clean.includes("\\N") || clean.includes("\\n")) {
                    const splitParts = clean.split(/\\N|\\n/);
                    mainText = cleanSpanText(splitParts[0]);
                    subText = cleanSpanText(splitParts.slice(1).join(" / "));
                } else {
                    mainText = cleanSpanText(clean);
                }

                if (!subText && /\s*(?:\/{2,3}|\|)\s*/.test(mainText)) {
                    const splitParts = mainText.split(/\s*(?:\/{2,3}|\|)\s*/);
                    mainText = splitParts[0].trim();
                    subText = splitParts.slice(1).join(" / ").trim();
                }
            }

            mainText = normalizeHomoglyphs(mainText);
            if (subText) subText = normalizeHomoglyphs(subText);

            if (mainText) {
                rawParsed.push({
                    time,
                    endTime,
                    text: mainText,
                    subText,
                    words,
                    isBacking
                });
            }
        }
    }

    rawParsed.sort((a, b) => a.time - b.time);

    const merged = [];
    for (let i = 0; i < rawParsed.length; i++) {
        const curr = rawParsed[i];
        if (i < rawParsed.length - 1) {
            const next = rawParsed[i + 1];
            if (Math.abs(curr.time - next.time) < 0.15 && !curr.subText && !next.subText && !curr.isBacking && !next.isBacking) {
                curr.subText = next.text;
                merged.push(curr);
                i++;
                continue;
            }
        }
        merged.push(curr);
    }

    return mergeOverlappingBackingVocals(merged);
}
