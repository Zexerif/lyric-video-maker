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
                const timeDiff = item.time - currentMain.time;
                // Maximum overlap window: if currentMain has endTime use that + 2.0s, else 12s
                const maxWindow = currentMain.endTime 
                    ? Math.max(currentMain.endTime - currentMain.time + 1.5, 3.0)
                    : 12.0;

                // Check that item occurs before the next non-backing main vocal starts
                let nextMainTime = Infinity;
                for (let k = i + 1; k < parsedList.length; k++) {
                    if (!parsedList[k].isBacking) {
                        nextMainTime = parsedList[k].time;
                        break;
                    }
                }

                if (timeDiff >= 0 && timeDiff <= maxWindow && item.time < nextMainTime) {
                    canMerge = true;
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

        const isBacking = lineLyrics.startsWith('(') && lineLyrics.endsWith(')');
        if (backingVocalsMode === 'hide' && isBacking) return;

        let mainText = lineLyrics;
        let subText = null;

        // Check for inline dual-language delimiters: //, ///, |
        if (/\s*(?:\/{2,3}|\|)\s*/.test(mainText)) {
            const parts = mainText.split(/\s*(?:\/{2,3}|\|)\s*/);
            mainText = parts[0].trim();
            subText = parts.slice(1).join(' / ').trim();
        }

        // Reset regex index
        timeReg.lastIndex = 0;
        while ((match = timeReg.exec(line)) !== null) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const milliseconds = parseInt(match[3]) * (match[3].length === 2 ? 10 : 1);

            const time = minutes * 60 + seconds + milliseconds / 1000;
            rawParsed.push({ time, text: mainText, subText, isBacking });
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
    const backingVocalsMode = typeof backingVocalsSelect !== 'undefined' && backingVocalsSelect ? backingVocalsSelect.value : 'styled';

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
        if (parsed.length > 0) return mergeOverlappingBackingVocals(parsed);
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
                let mainText = textContent.trim();
                let subText = null;
                if (/\s*(?:\/{2,3}|\|)\s*/.test(mainText)) {
                    const parts = mainText.split(/\s*(?:\/{2,3}|\|)\s*/);
                    mainText = parts[0].trim();
                    subText = parts.slice(1).join(' / ').trim();
                }

                parsed.push({
                    time,
                    text: mainText,
                    subText,
                    words: words.length > 0 ? words : null,
                    isBacking: isLineBacking || (words.length > 0 && words.every(w => w.isBacking))
                });
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
