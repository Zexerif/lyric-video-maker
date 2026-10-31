/* Lyric Fixer: diagnosis, fix modal and diagnostics tab. */

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
