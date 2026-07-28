 # ![Lokal TTML Editor](https://i.imgur.com/NzDrtAq.png)


![icon](https://i.imgur.com/3Id3RPj.png) ![kuro!!!](https://i.imgur.com/3LoTeml.png)

A standalone desktop editor for creating, timing, and fine-tuning word-level TTML lyric files. Built primarily for [Lokal Music](https://github.com/sipbuu/lokal/), but fully compatible with any system supporting rich TTML (including Spicy Lyrics).

[![Compatible with Spicy Lyrics](https://img.shields.io/badge/Spicy_Lyrics-Compatible-ff4500?style=for-the-badge&logoColor=white&labelColor=222222)](https://github.com)[![Lokal TTML](https://img.shields.io/badge/Lokal_TTML-v1.4.0-007acc?style=for-the-badge&logoColor=white&labelColor=222222)](https://github.com/sipbuu/lokal-ttml/releases)[![License](https://img.shields.io/badge/License-MIT-4c1?style=for-the-badge&logoColor=white&labelColor=222222)](https://github.com)[![Discord](https://img.shields.io/badge/Discord-Join_Server-7289DA?style=for-the-badge&logo=discord&logoColor=white&labelColor=222222)](https://discord.gg/Wv3zfpG6UT) 

---

## Key Features

* **Project & Session Management:** Dedicated project workspaces with automatic background saving (up to 20 restore points), crash recovery, and persistent state across launches.
* **Smart Lyric Ingestion:** Automatic search & pull via **LRCLIB.net**, or import local `.lrc`, `.ttml`, and `.txt` files. Includes side-by-side spellcheck/diff with LRCLIB sources.
* **Spicy Lyrics Automation:** Auto-normalizes text on input (splits compound words, moves parenthetical text to background vocal tracks, and handles punctuation cleanly). Includes metadata validation on export.
* **Waveform Editing:** Interactive audio waveform with zoom support (`Ctrl + Scroll`), region markers, colored vocal boundaries, and bulk timestamp shifting (`Ctrl + Click + Drag`).
* **Multi-Layer Vocal Support:** Native support for Main, Background (`x-bg`), and Duo/Harmony (`x-alt`) vocal layers with instant slot swapping.
* **Live Karaoke Preview:** Refactored real-time preview with customizable styles, smooth auto-scrolling, lyric blur effects, and click-any-word-to-seek playback.
* **Audio Engine Tuning:** Speed playback dropdown, pitch preservation toggle, and manual audio latency offset adjustments to counteract audio buffer delays.
* **Theme & Preset System:** Fully customizable UI themes with exportable/importable `.lttheme` preset files.

---

## Getting Started

### Development

```bash
npm install
npm run dev

```

### Packaging

```bash
npm run build

```

---

## How to Use

1. **Load Audio:** Open your local track (`.mp3`, `.flac`, `.m4a`, `.ogg`, `.wav`, `.aac`, `.opus`).
2. **Import Lyrics:** Click **Search LRCLIB** to fetch lyrics online, or **Import File** to load an existing `.lrc`, `.ttml`, or `.txt`.
3. **Prep & Structure:**
* Enable **Spicy Lyrics Prep** in settings to auto-sort background vocals and hyphenated words.
* Manually split words with `\` in the editor box if needed.


4. **Time Words:**
* Select a line and word chip.
* Play audio and hit `S` to mark start times, `E` to mark end times.
* Use `Tab` / `Shift+Tab` to move between word chips smoothly.


5. **Adjust & Refine:**
* `Ctrl + Click + Drag` on the waveform to bulk-shift timing (great for mismatched intro lengths).
* Toggle **Tap-to-Time** or use the speed dropdown for precise millisecond alignment.


6. **Export:** Click **Export TTML** (or **Export LRC**). The built-in validator will warn you of any missing metadata or overlapping timestamps before saving.

---

## Shortcuts & Controls

| Input | Action |
| --- | --- |
| `Space` | Play / Pause audio |
| `S` | Set selected word **Start** to current playhead |
| `E` | Set selected word **End** to current playhead |
| `Tab` / `Shift+Tab` | Next / Previous word chip |
| `→` / `←` | Seek ±0.1s |
| `Shift + →` / `Shift + ←` | Seek ±1.0s |
| `Ctrl + Scroll` | Zoom in / out on audio waveform |
| `Ctrl + Click + Drag` | Bulk shift lyrics on waveform |
| Double-click word | Jump playhead directly to word start time |
| Click Preview Word | Jump playhead to word in Live Preview |

---

## Vocal Roles & Formatting

| Type | TTML Role | Color Identifier |
| --- | --- | --- |
| **Main Vocals** | *(default)* | White / Active Highlight |
| **Background Vocals** | `ttm:role="x-bg"` | Purple |
| **Duo / Harmony** | `ttm:role="x-alt"` | Orange |

---

## Importing into Lokal

Once exported:

1. Open **Lokal Music** and play the corresponding track.
2. Open the Fullscreen Lyrics view.
3. Click **Import** (top right) and select your `.ttml` file.

---

## License

Distributed under the MIT License.
