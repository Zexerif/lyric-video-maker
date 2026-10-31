/* iTunes search and online synced-lyrics search / fetch. */

// Set up iTunes Search click and keypress handlers
function performItunesSearch() {
    const query = itunesSearchInput.value.trim();
    if (!query) {
        statusMessage.textContent = 'Please enter a search term.';
        statusMessage.style.color = '#ef4444';
        return;
    }

    statusMessage.textContent = 'Searching iTunes...';
    statusMessage.style.color = '#6366f1';
    itunesSearchResults.innerHTML = '<div style="padding: 0.75rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Searching...</div>';
    itunesSearchResults.style.display = 'block';

    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=5`;

    fetch(url)
        .then(res => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        })
        .then(data => {
            itunesSearchResults.innerHTML = '';
            if (!data.results || data.results.length === 0) {
                itunesSearchResults.innerHTML = '<div style="padding: 0.75rem; text-align: center; color: #ec4899; font-size: 0.85rem;">No results found.</div>';
                statusMessage.textContent = 'No iTunes results found.';
                statusMessage.style.color = '#ec4899';
                return;
            }

            statusMessage.textContent = `Found ${data.results.length} results.`;
            statusMessage.style.color = '#4ade80';

            data.results.forEach(track => {
                const row = document.createElement('div');
                row.className = 'itunes-result-row';
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.gap = '0.75rem';
                row.style.padding = '0.5rem';
                row.style.cursor = 'pointer';
                row.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
                row.style.transition = 'background 0.2s ease';
                row.style.boxSizing = 'border-box';
                row.style.width = '100%';

                row.addEventListener('mouseenter', () => {
                    row.style.background = 'rgba(99, 102, 241, 0.15)';
                });
                row.addEventListener('mouseleave', () => {
                    row.style.background = 'transparent';
                });

                // Artwork thumbnail (40x40px)
                const thumbUrl = track.artworkUrl60 || track.artworkUrl100 || '';
                const img = document.createElement('img');
                img.src = thumbUrl;
                img.style.width = '40px';
                img.style.height = '40px';
                img.style.borderRadius = '6px';
                img.style.objectFit = 'cover';
                row.appendChild(img);

                // Details text container
                const details = document.createElement('div');
                details.style.flex = '1';
                details.style.minWidth = '0';
                details.style.display = 'flex';
                details.style.flexDirection = 'column';
                details.style.gap = '0.15rem';

                // Track title
                const titleEl = document.createElement('div');
                titleEl.textContent = track.trackName;
                titleEl.style.fontWeight = '600';
                titleEl.style.fontSize = '0.85rem';
                titleEl.style.color = 'var(--text-main)';
                titleEl.style.whiteSpace = 'nowrap';
                titleEl.style.overflow = 'hidden';
                titleEl.style.textOverflow = 'ellipsis';
                details.appendChild(titleEl);

                // Artist & Album
                const metaEl = document.createElement('div');
                metaEl.textContent = `${track.artistName} • ${track.collectionName || 'Single'}`;
                metaEl.style.fontSize = '0.75rem';
                metaEl.style.color = 'var(--text-muted)';
                metaEl.style.whiteSpace = 'nowrap';
                metaEl.style.overflow = 'hidden';
                metaEl.style.textOverflow = 'ellipsis';
                details.appendChild(metaEl);

                row.appendChild(details);

                // Click handler
                row.addEventListener('click', () => {
                    songTitleInput.value = track.trackName || '';
                    songArtistInput.value = track.artistName || '';

                    if (track.artworkUrl100) {
                        const highResArt = track.artworkUrl100.replace('100x100bb.jpg', '800x800bb.jpg');
                        albumUrlInput.value = highResArt;
                        albumImageBase64 = null; // Reset base64 since it's a URL
                        loadAlbumFromUrl(highResArt);
                    }

                    // Close results list
                    itunesSearchResults.innerHTML = '';
                    itunesSearchResults.style.display = 'none';

                    statusMessage.textContent = 'Song details and artwork populated from iTunes!';
                    statusMessage.style.color = '#4ade80';

                    saveProgressToLocalStorage();
                    drawFrame(0);

                    // Prefill lyrics search input with track name and artist
                    if (lyricsSearchInput) {
                        lyricsSearchInput.value = `${track.trackName} ${track.artistName || ''}`.trim();
                    }

                    // Background fetch lyrics only if toggle is enabled and editor is empty
                    const shouldAutoFetchLyrics = itunesAutoLyricsToggle ? itunesAutoLyricsToggle.checked : true;
                    if (shouldAutoFetchLyrics && !lrcEditor.value.trim()) {
                        fetchLyricsFromYouly(track.trackName, track.artistName, false);
                    }
                });

                itunesSearchResults.appendChild(row);
            });
        })
        .catch(err => {
            console.error('iTunes Search Error:', err);
            itunesSearchResults.innerHTML = '<div style="padding: 0.75rem; text-align: center; color: #ef4444; font-size: 0.85rem;">Failed to fetch results from iTunes. Ensure you are online.</div>';
            statusMessage.textContent = 'iTunes lookup failed. Check your internet connection.';
            statusMessage.style.color = '#ef4444';
        });
}

if (itunesSearchBtn && itunesSearchInput) {
    itunesSearchBtn.addEventListener('click', performItunesSearch);
    itunesSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performItunesSearch();
        }
    });
}

const LYRICS_PLUS_INSTANCES = [
    "https://lyricsplus.binimum.org",
    "https://lyricsplus.prjktla.workers.dev",
    "https://lyricsplus.atomix.one",
    "https://lyricsplus-seven.vercel.app",
    "https://lyrics-plus-backend.vercel.app"
];

// === YouLy+ / LyricsPlus Lyrics Fetching and Parsing Logic ===
function convertYoulyToText(data) {
    if (!data || !data.lyrics) return '';

    if (data.type === 'Word') {
        // Compile to TTML (V2 format)
        let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
        xml += `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata">\n`;
        xml += `  <body>\n    <div>\n`;

        data.lyrics.forEach(line => {
            const lineStartSec = (line.time / 1000).toFixed(3);
            const lineEndSec = ((line.time + (line.duration || 0)) / 1000).toFixed(3);
            xml += `      <p begin="${lineStartSec}" end="${lineEndSec}">\n`;
            const syllabus = line.syllabus || [];
            const lineText = line.text || '';
            if (syllabus.length > 0) {
                let charIndex = 0;
                syllabus.forEach(w => {
                    const wStart = (w.time / 1000).toFixed(3);
                    const wEnd = ((w.time + (w.duration || 0)) / 1000).toFixed(3);
                    
                    let syllableText = w.text || '';
                    const cleanSyllable = syllableText.trim();
                    
                    if (cleanSyllable !== '') {
                        const pos = lineText.toLowerCase().indexOf(cleanSyllable.toLowerCase(), charIndex);
                        if (pos !== -1) {
                            charIndex = pos + cleanSyllable.length;
                            if (charIndex < lineText.length && /\s/.test(lineText[charIndex])) {
                                if (!syllableText.endsWith(' ') && !syllableText.endsWith('\u00A0')) {
                                    syllableText += ' ';
                                }
                                charIndex++;
                            }
                        }
                    }
                    
                    const escapedText = syllableText
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;");
                    xml += `        <span begin="${wStart}" end="${wEnd}">${escapedText}</span>\n`;
                });
            } else {
                const escapedText = (line.text || '')
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
                xml += `        <span begin="${lineStartSec}" end="${lineEndSec}">${escapedText}</span>\n`;
            }
            xml += `      </p>\n`;
        });

        xml += `    </div>\n  </body>\n</tt>\n`;
        return xml;
    } else if (data.type === 'syllable') {
        // Compile to TTML (V1 format)
        let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
        xml += `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata">\n`;
        xml += `  <body>\n    <div>\n`;

        // Group words into lines using `isLineEnding`
        let currentLineWords = [];
        const lines = [];

        data.lyrics.forEach(word => {
            currentLineWords.push(word);
            if (word.isLineEnding || word.isLineEnding === 1 || word.isLineEnding === true) {
                lines.push(currentLineWords);
                currentLineWords = [];
            }
        });

        // Add remaining words if any
        if (currentLineWords.length > 0) {
            lines.push(currentLineWords);
        }

        lines.forEach(lineWords => {
            if (lineWords.length === 0) return;
            const firstWord = lineWords[0];
            const lineStartSec = (firstWord.time / 1000).toFixed(3);
            const lastWord = lineWords[lineWords.length - 1];
            const lineEndSec = ((lastWord.time + (lastWord.duration || 0)) / 1000).toFixed(3);

            xml += `      <p begin="${lineStartSec}" end="${lineEndSec}">\n`;
            lineWords.forEach(w => {
                const wStart = (w.time / 1000).toFixed(3);
                const wEnd = ((w.time + (w.duration || 0)) / 1000).toFixed(3);
                const escapedText = (w.text || '')
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
                xml += `        <span begin="${wStart}" end="${wEnd}">${escapedText}</span>\n`;
            });
            xml += `      </p>\n`;
        });

        xml += `    </div>\n  </body>\n</tt>\n`;
        return xml;
    } else {
        // Line-by-line synced lyrics. Compile to LRC
        let lrc = '';
        data.lyrics.forEach(line => {
            const totalSeconds = line.time / 1000;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = Math.floor(totalSeconds % 60);
            const hundredths = Math.floor((totalSeconds % 1) * 100);

            const mStr = String(minutes).padStart(2, '0');
            const sStr = String(seconds).padStart(2, '0');
            const hStr = String(hundredths).padStart(2, '0');

            lrc += `[${mStr}:${sStr}.${hStr}]${line.text || ''}\n`;
        });
        return lrc;
    }
}

function sanitizeSongTitle(title) {
    if (!title) return '';
    return title
        .replace(/\([^)]*(?:remaster|deluxe|version|edition|live|bonus|explicit|feat\.|ft\.)[^)]*\)/gi, '')
        .replace(/\[[^\]]*(?:remaster|deluxe|version|edition|live|bonus|explicit|feat\.|ft\.)[^\]]*\]/gi, '')
        .replace(/-\s*(?:remastered|remaster|deluxe|single|ep).*$/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function fetchLyricsWithFallback(title, artist) {
    const rawTitle = (title || '').trim();
    const rawArtist = (artist || '').trim();

    const cleanTitle = sanitizeSongTitle(rawTitle) || rawTitle;
    const cleanArtist = sanitizeSongTitle(rawArtist) || rawArtist;

    const titleVariants = [cleanTitle];
    if (rawTitle !== cleanTitle) titleVariants.push(rawTitle);

    const artistVariants = [cleanArtist];
    if (rawArtist !== cleanArtist && cleanArtist !== '') artistVariants.push(rawArtist);
    if (!artistVariants.includes('')) artistVariants.push(''); // Also try title without artist requirement

    // 1. Primary: Try LRCLIB API (/api/get) with variants
    for (const t of titleVariants) {
        for (const a of artistVariants) {
            try {
                const getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(t)}${a ? '&artist_name=' + encodeURIComponent(a) : ''}`;
                console.log(`Trying LRCLIB get: ${getUrl}`);
                const res = await fetch(getUrl);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.syncedLyrics && data.syncedLyrics.trim()) {
                        return { text: data.syncedLyrics, source: 'LRCLIB' };
                    }
                }
            } catch (err) {
                console.warn('LRCLIB get fetch error:', err.message);
            }
        }
    }

    // 2. Primary fallback: Try LRCLIB Search API (/api/search) with search query
    for (const t of titleVariants) {
        for (const a of artistVariants) {
            try {
                const query = `${a} ${t}`.trim();
                if (!query) continue;
                const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
                console.log(`Trying LRCLIB search: ${searchUrl}`);
                const res = await fetch(searchUrl);
                if (res.ok) {
                    const results = await res.json();
                    if (Array.isArray(results)) {
                        const match = results.find(item => item && item.syncedLyrics && item.syncedLyrics.trim());
                        if (match) {
                            return { text: match.syncedLyrics, source: 'LRCLIB' };
                        }
                    }
                }
            } catch (err) {
                console.warn('LRCLIB search fetch error:', err.message);
            }
        }
    }

    // 3. Secondary: Try YouLy+ / LyricsPlus backend instances
    for (const t of titleVariants) {
        for (const a of artistVariants) {
            const queryParams = `title=${encodeURIComponent(t)}&artist=${encodeURIComponent(a)}`;
            for (const base of LYRICS_PLUS_INSTANCES) {
                for (const ver of ["v2", "v1"]) {
                    const url = `${base}/${ver}/lyrics/get?${queryParams}`;
                    try {
                        console.log(`Trying YouLy+/LyricsPlus instance: ${url}`);
                        const res = await fetch(url);
                        if (!res.ok) {
                            console.warn(`Instance ${base} (${ver}) returned status ${res.status}`);
                            continue;
                        }
                        const data = await res.json();
                        if (data && data.lyrics && data.lyrics.length > 0) {
                            const lyricsText = convertYoulyToText(data);
                            return { text: lyricsText, source: data.type === 'Word' ? 'YouLy+ (Word-synced TTML)' : 'YouLy+ (LRC)' };
                        }
                    } catch (err) {
                        console.warn(`Fetch error for ${url}:`, err.message);
                    }
                }
            }
        }
    }

    throw new Error('No synced lyrics could be found on any available lyric databases (LRCLIB / YouLy+).');
}

async function fetchLyricsFromYouly(title, artist, forceManual) {
    if (!title) {
        statusMessage.textContent = 'Please enter a Song Title first.';
        statusMessage.style.color = '#ef4444';
        return;
    }

    // Overwrite Protection Check
    if (lrcEditor.value.trim()) {
        if (forceManual) {
            if (!confirm("This will overwrite the current lyrics in the editor. Are you sure you want to proceed?")) {
                return;
            }
        } else {
            // Background fetch triggered by selecting iTunes result.
            // Do not overwrite existing lyrics automatically.
            return;
        }
    }

    if (forceManual && fetchYoulyLyricsBtn) {
        fetchYoulyLyricsBtn.disabled = true;
        fetchYoulyLyricsBtn.textContent = '⏳ Fetching Lyrics...';
    }

    statusMessage.textContent = `Searching synced lyrics for "${title}"...`;
    statusMessage.style.color = '#6366f1';

    try {
        const { text, source } = await fetchLyricsWithFallback(title, artist);
        lrcEditor.value = text;
        updateLyricsFromEditor();
        saveProgressToLocalStorage();

        statusMessage.textContent = `✅ Successfully loaded synced lyrics from ${source}!`;
        statusMessage.style.color = '#4ade80';
    } catch (err) {
        console.warn('Synced Lyrics Fetch failed:', err);
        if (forceManual) {
            statusMessage.textContent = err.message || 'Failed to retrieve synced lyrics.';
            statusMessage.style.color = '#ef4444';
        } else {
            // Decoupled background fetch error does not discard iTunes metadata success status
            statusMessage.textContent = 'Song details and artwork loaded. (No synced lyrics found)';
            statusMessage.style.color = '#ec4899';
        }
    } finally {
        if (fetchYoulyLyricsBtn) {
            fetchYoulyLyricsBtn.disabled = false;
            if (typeof updateTranslations === 'function') {
                setText('#fetchYoulyLyricsBtn', 'fetchLyricsBtn');
            } else {
                fetchYoulyLyricsBtn.textContent = '🔍 Fetch Synced Lyrics';
            }
        }
    }
}

// === Standalone Synced Lyrics Search ===
async function performLyricsSearch() {
    if (!lyricsSearchInput || !lyricsSearchResults) return;
    const query = lyricsSearchInput.value.trim();
    if (!query) {
        statusMessage.textContent = 'Please enter a song or artist name to search for lyrics.';
        statusMessage.style.color = '#ef4444';
        return;
    }

    statusMessage.textContent = `Searching lyrics for "${query}"...`;
    statusMessage.style.color = '#6366f1';
    lyricsSearchResults.innerHTML = '<div style="padding: 0.75rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Searching lyrics databases...</div>';
    lyricsSearchResults.style.display = 'block';

    let results = [];
    let hadServerError = false;
    const seen = new Set();

    const fetchJsonRetry = async (url, tries = 3) => {
        for (let attempt = 1; attempt <= tries; attempt++) {
            try {
                const res = await fetch(url);
                if (res.ok) return await res.json();
                if (res.status !== 429 && res.status < 500) return null; // real "not found"-type answer
            } catch (err) { /* network error, retry */ }
            if (attempt < tries) await new Promise(r => setTimeout(r, 700 * attempt));
        }
        hadServerError = true;
        return null;
    };

    const addLrclibItems = (data) => {
        if (!Array.isArray(data)) return;
        data.forEach(item => {
            if (!item || item.instrumental) return;
            const synced = Boolean(item.syncedLyrics && item.syncedLyrics.trim());
            const plain = Boolean(item.plainLyrics && item.plainLyrics.trim());
            if (!synced && !plain) return;
            const key = 'lrclib:' + item.id;
            if (seen.has(key)) return;
            seen.add(key);
            results.push({
                title: item.trackName || item.name || 'Unknown Title',
                artist: item.artistName || 'Unknown Artist',
                album: item.albumName || '',
                duration: item.duration ? Math.floor(item.duration / 60) + ':' + String(Math.floor(item.duration % 60)).padStart(2, '0') : '',
                isSynced: synced,
                isWordSynced: Boolean(item.hasWordSync),
                source: 'LRCLIB',
                rawLyrics: synced ? item.syncedLyrics : item.plainLyrics
            });
        });
    };

    // Build query variants: free text, "Artist - Title" splits, and Info-tab fields
    const lrclibUrls = [`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`];
    const dashParts = query.split(/\s+[-–—:]\s+/);
    if (dashParts.length >= 2) {
        const [p1, ...rest] = dashParts;
        const p2 = rest.join(' ');
        lrclibUrls.push(`https://lrclib.net/api/search?track_name=${encodeURIComponent(p2)}&artist_name=${encodeURIComponent(p1)}`);
        lrclibUrls.push(`https://lrclib.net/api/search?track_name=${encodeURIComponent(p1)}&artist_name=${encodeURIComponent(p2)}`);
    }
    lrclibUrls.push(`https://lrclib.net/api/search?track_name=${encodeURIComponent(query)}`);
    const cleaned = sanitizeSongTitle(query);
    if (cleaned && cleaned !== query) lrclibUrls.push(`https://lrclib.net/api/search?q=${encodeURIComponent(cleaned)}`);

    // Resolve clean title/artist candidates via iTunes (YouLy+ requires an artist)
    const candidates = [];
    const pushCandidate = (t, a) => {
        if (!t || !a) return;
        const k = (t + '|' + a).toLowerCase();
        if (!candidates.some(c => (c.t + '|' + c.a).toLowerCase() === k)) candidates.push({ t, a });
    };
    if (dashParts.length >= 2) {
        pushCandidate(dashParts.slice(1).join(' '), dashParts[0]);
        pushCandidate(dashParts[0], dashParts.slice(1).join(' '));
    }
    if (songTitleInput && songArtistInput && songTitleInput.value.trim() && songArtistInput.value.trim()
        && query.toLowerCase().includes(songTitleInput.value.trim().toLowerCase())) {
        pushCandidate(songTitleInput.value.trim(), songArtistInput.value.trim());
    }

    const itunesPromise = fetchJsonRetry(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=4`, 2)
        .then(data => {
            if (data && Array.isArray(data.results)) {
                data.results.forEach(r => pushCandidate(sanitizeSongTitle(r.trackName) || r.trackName, r.artistName));
            }
        });

    // Run LRCLIB variants + iTunes resolution in parallel
    const lrclibPromises = lrclibUrls.map(u => fetchJsonRetry(u).then(addLrclibItems));
    await Promise.all([itunesPromise, ...lrclibPromises]);

    // Query YouLy+ for the resolved candidates (word-synced results)
    const lpTasks = candidates.slice(0, 4).map(async ({ t, a }) => {
        for (const base of LYRICS_PLUS_INSTANCES) {
            try {
                const res = await fetch(`${base}/v2/lyrics/get?title=${encodeURIComponent(t)}&artist=${encodeURIComponent(a)}`);
                if (!res.ok) continue;
                const lpData = await res.json();
                if (lpData && lpData.lyrics && lpData.lyrics.length > 0) {
                    const meta = lpData.metadata || {};
                    return {
                        title: meta.title || t,
                        artist: meta.artist || a,
                        album: meta.album || '',
                        duration: meta.totalDuration ? String(meta.totalDuration).replace(/\.\d+$/, '') : '',
                        isSynced: true,
                        isWordSynced: lpData.type === 'Word',
                        source: lpData.type === 'Word' ? 'YouLy+ (Word-Synced)' : 'YouLy+',
                        rawLyrics: convertYoulyToText(lpData)
                    };
                }
            } catch (err) { /* try next instance */ }
        }
        return null;
    });
    const lpResults = (await Promise.all(lpTasks)).filter(Boolean);
    const lpSeen = new Set();
    const uniqueLp = lpResults.filter(r => {
        const k = (r.title + '|' + r.artist).toLowerCase();
        if (lpSeen.has(k)) return false;
        lpSeen.add(k);
        return true;
    });

    // Rank: word-synced first, then synced, then plain
    const rank = r => (r.isWordSynced ? 0 : r.isSynced ? 1 : 2);
    results = [...uniqueLp, ...results].sort((a, b) => rank(a) - rank(b));

    lyricsSearchResults.innerHTML = '';
    if (results.length === 0) {
        lyricsSearchResults.innerHTML = hadServerError
            ? '<div style="padding: 0.75rem; text-align: center; color: #f59e0b; font-size: 0.85rem;">The lyrics servers are busy or unreachable right now. Please press Search again in a moment.</div>'
            : '<div style="padding: 0.75rem; text-align: center; color: #ec4899; font-size: 0.85rem;">No lyrics found for this search. Try adding the artist name (e.g. "Queen - Killer Queen").</div>';
        statusMessage.textContent = hadServerError ? 'Lyric servers busy. Try again.' : 'No lyrics found for query.';
        statusMessage.style.color = '#ec4899';
        return;
    }

    statusMessage.textContent = `Found ${results.length} lyric options.`;
    statusMessage.style.color = '#4ade80';

    results.slice(0, 15).forEach(item => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '0.75rem';
        row.style.padding = '0.5rem 0.6rem';
        row.style.cursor = 'pointer';
        row.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
        row.style.transition = 'background 0.2s ease';
        row.style.boxSizing = 'border-box';
        row.style.width = '100%';

        row.addEventListener('mouseenter', () => {
            row.style.background = 'rgba(99, 102, 241, 0.15)';
        });
        row.addEventListener('mouseleave', () => {
            row.style.background = 'transparent';
        });

        // Badge icon
        const badge = document.createElement('div');
        badge.style.minWidth = '36px';
        badge.style.height = '36px';
        badge.style.borderRadius = '8px';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'center';
        badge.style.fontSize = '1.1rem';
        badge.style.background = item.isWordSynced ? 'rgba(236, 72, 153, 0.2)' : (item.isSynced ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255, 255, 255, 0.08)');
        badge.textContent = item.isWordSynced ? '✨' : (item.isSynced ? '⏱️' : '📄');
        row.appendChild(badge);

        // Details
        const details = document.createElement('div');
        details.style.flex = '1';
        details.style.minWidth = '0';
        details.style.display = 'flex';
        details.style.flexDirection = 'column';
        details.style.gap = '0.15rem';

        const titleRow = document.createElement('div');
        titleRow.style.display = 'flex';
        titleRow.style.alignItems = 'center';
        titleRow.style.gap = '0.4rem';
        titleRow.style.overflow = 'hidden';

        const titleEl = document.createElement('div');
        titleEl.textContent = item.title;
        titleEl.style.fontWeight = '600';
        titleEl.style.fontSize = '0.85rem';
        titleEl.style.color = 'var(--text-main)';
        titleEl.style.whiteSpace = 'nowrap';
        titleEl.style.overflow = 'hidden';
        titleEl.style.textOverflow = 'ellipsis';
        titleRow.appendChild(titleEl);

        // Sync type pill
        const pill = document.createElement('span');
        pill.style.fontSize = '0.65rem';
        pill.style.padding = '0.1rem 0.35rem';
        pill.style.borderRadius = '4px';
        pill.style.fontWeight = '700';
        pill.style.whiteSpace = 'nowrap';
        if (item.isWordSynced) {
            pill.textContent = 'Word-Synced (TTML)';
            pill.style.background = 'rgba(236, 72, 153, 0.3)';
            pill.style.color = '#f472b6';
        } else if (item.isSynced) {
            pill.textContent = 'Synced (LRC)';
            pill.style.background = 'rgba(74, 222, 128, 0.2)';
            pill.style.color = '#4ade80';
        } else {
            pill.textContent = 'Plain text';
            pill.style.background = 'rgba(255, 255, 255, 0.1)';
            pill.style.color = 'var(--text-muted)';
        }
        titleRow.appendChild(pill);
        details.appendChild(titleRow);

        const metaEl = document.createElement('div');
        const metaParts = [item.artist];
        if (item.album) metaParts.push(item.album);
        if (item.duration) metaParts.push(item.duration);
        metaParts.push(item.source);
        metaEl.textContent = metaParts.join(' • ');
        metaEl.style.fontSize = '0.75rem';
        metaEl.style.color = 'var(--text-muted)';
        metaEl.style.whiteSpace = 'nowrap';
        metaEl.style.overflow = 'hidden';
        metaEl.style.textOverflow = 'ellipsis';
        details.appendChild(metaEl);

        row.appendChild(details);

        // Row click: load lyrics into editor
        row.addEventListener('click', () => {
            if (lrcEditor.value.trim()) {
                if (!confirm("This will overwrite the current lyrics in the editor. Are you sure you want to proceed?")) {
                    return;
                }
            }

            lrcEditor.value = item.rawLyrics;
            updateLyricsFromEditor();
            saveProgressToLocalStorage();

            // Automatically prefill song title and artist in Info tab if they are currently blank
            if (songTitleInput && !songTitleInput.value.trim() && item.title) {
                songTitleInput.value = item.title;
            }
            if (songArtistInput && !songArtistInput.value.trim() && item.artist) {
                songArtistInput.value = item.artist;
            }

            lyricsSearchResults.innerHTML = '';
            lyricsSearchResults.style.display = 'none';

            statusMessage.textContent = `✅ Loaded lyrics from ${item.source} (${item.title})!`;
            statusMessage.style.color = '#4ade80';
        });

        lyricsSearchResults.appendChild(row);
    });
}

if (lyricsSearchBtn && lyricsSearchInput) {
    lyricsSearchBtn.addEventListener('click', performLyricsSearch);
    lyricsSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performLyricsSearch();
        }
    });
}

if (fetchYoulyLyricsBtn) {
    fetchYoulyLyricsBtn.addEventListener('click', () => {
        fetchLyricsFromYouly(songTitleInput.value, songArtistInput.value, true);
    });
}
