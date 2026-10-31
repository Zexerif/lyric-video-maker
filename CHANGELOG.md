# Changelog

All notable changes to **Lyric Video Maker** are documented in this file.

---

## [2.0.0] - 2026-10-31

### 🚀 Highlights & Major Features
- **Lyric Studio & Tap-to-Sync**:
  - Fullscreen studio modal with interactive audio waveform timeline.
  - Live cursor scrubbing, audio seek synchronization, and line-level preview playback.
  - Interactive nudging tools (+/- 50ms, +/- 200ms) and line timing editing.
  - Real-time **Tap-to-Sync**: Tap spacebar as the audio plays to stamp timestamps onto un-synced lyrics on the fly.
- **Apple Music-Style Backing Vocals & Overlapping Vocal Sync**:
  - Secondary typography rendered at 73% scale with soft translucent glow.
  - Configurable styles: Apple Music style, Normal style, or Hide/Remove.
  - **Overlapping Vocals Mode**: When backing vocals or ad-libs overlap with the active main vocal, they are rendered alongside rather than prematurely skipping the active main melody.
- **Dual-Language & Sub-Lyrics Support**:
  - Automatic parsing of dual-language lines delimited by `//`, `///`, `|`, or identical consecutive timestamps.
  - Renders translations or romanized pronunciations directly beneath the main lyric line.
  - Toggle options to display or hide secondary subtitles.
- **Curated One-Click Style Presets**:
  - Added 5 curated presets: *Clean Modern*, *Retro Synthwave*, *Minimalist Monospace*, *Romantic Rose*, and *Cinematic Glow*.
  - Instantly configures fonts, colors, glows, animations, and visualizer settings with one click.
- **Global Undo & Redo System (`Ctrl+Z` / `Ctrl+Y`)**:
  - History state manager capturing style customizations, editor inputs, and presets.
  - Dedicated header undo/redo action buttons with real-time disabled state indication.
- **Comprehensive Keyboard Shortcuts**:
  - Global transport and navigation hotkeys (`Space`, `←/→`, `↑/↓`, `M`, `Ctrl+Z`, `Ctrl+Y`, `Ctrl+S`, `Ctrl+O`, `L`).
  - Dedicated interactive keyboard shortcuts modal cheatsheet accessible via `?` or `⌨️`.
- **Audio-Reactive Visualizer Engine**:
  - Real-time Web Audio API frequency analysis.
  - Visualizer modes: Pulsing Artwork (Beat Bass), Glowing Spectrum Bars, Ambient Canvas Breathing.
- **iTunes Metadata & High-Res Cover Artwork Auto-Fill**:
  - Direct search querying iTunes for song title, artist, key, BPM, and high-definition album art.
- **Integrated Synced Lyrics Search**:
  - Direct lookup via LyricsPlus and LRCLIB APIs to automatically retrieve and load timed lyrics.
- **Homoglyph & Typography Normalization**:
  - Automatic normalization of Cyrillic homoglyphs (such as Cyrillic 'е' / 'а') in imported lyrics, preventing system font mismatches.

### 🎨 UI & Responsive Layout Fixes
- **Unified 38px Pill Button Aesthetic**: Header action buttons (undo, redo, shortcuts, "What's New" badge, language select, and GitHub star badge) aligned at a uniform 38px height with matching circular/pill geometry.
- **Zero-Overflow Responsive Grid**: Fixed horizontal layout clipping on narrow screens and split-window viewports with flexible grid constraints and responsive wrapping.
- **Media Rack Ordering Fix**: Corrected swap between Item 3 (Background Media) and Item 4 (Album Cover) across all supported languages.
- **Consistent Action Button Sizing**: Fixed border-radius, padding, and height inconsistencies across Album URL inputs, search buttons, and export controls.

### 🔧 Architecture & Code Quality
- Modularized monolithic codebase into 20 clean, maintainable ES6 modules under `js/`.
- Verified with automated test suite (`test_suite.js`) covering parsers, history, presets, and studio logic.
- Automated ID verification (`verify_ids.js`) validating 100% selector consistency between HTML and JavaScript.


---

## [1.7.0] - 2026-06-08

### 🚀 Highlights
- **Built-in Diagnostics & 1-Click Auto-Repair**: Automated linter and one-click repair suite for syntax issues, timestamp sequencing, and overlapping lines.
