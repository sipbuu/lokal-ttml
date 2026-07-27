# ![Local TTML Editor](https://i.imgur.com/NzDrtAq.png)

![icon](https://i.imgur.com/3Id3RPj.png)
![kuro!!!](https://i.imgur.com/3LoTeml.png)

A standalone tool (from [Lokal](https://github.com/sipbuu/lokal/)) for creating and editing TTML lyric files with word-level timing. Made to make files compatible with Lokal Music's synced lyrics system, and any program that supports TTML. (like Spicy Lyrics)

[![Compatible with Spicy Lyrics](https://img.shields.io/badge/Spicy_Lyrics-Compatible-ff4500?style=for-the-badge&logoColor=white&labelColor=222222)](https://github.com) [![Lokal TTML](https://img.shields.io/badge/Lokal_TTML-v1.2.0-007acc?style=for-the-badge&logoColor=white&labelColor=222222)](https://github.com)
[![License](https://img.shields.io/badge/License-MIT-4c1?style=for-the-badge&logoColor=white&labelColor=222222)](https://github.com)
[![Discord](https://img.shields.io/badge/Discord-Join_Server-7289DA?style=for-the-badge&logo=discord&logoColor=white&labelColor=222222)](https://discord.gg/Wv3zfpG6UT)
---

## What it does

- Pulls lyrics automatically from **LRCLIB.net** by title + artist
- Import existing `.lrc`, `.ttml`, or `.txt` files
- Edit word-by-word timing by ear: press S to set a word's start, E to set its end, with estimated timing happening after each change.
- Supports **background vocals** (`x-bg`) and **duo / harmony** lines per line
- Live karaoke preview that lights up words as they pass
- Exports valid TTML that Lokal and other compatible players can read

---

## Getting Started

```bash
npm install
npm run dev
```

To build a portable `.exe`:

```bash
npm run build
# outputs: dist/lokal-ttml-editor.exe
```

---

## How to Use

1. **Open Audio** - load your audio file (mp3, flac, m4a, ogg, wav, aac, opus)
2. **Get Lyrics** - click **Search LRCLIB** to pull synced or plain lyrics by title/artist, or **Import File** to load a local `.lrc` / `.ttml` / `.txt`
3. **Select a line** from the left panel
4. **Select a word** from the editor (the word chips)
5. Play the audio, and when the word starts press `S` - when it ends press `E`
6. Use `Tab` / `Shift+Tab` to move between words without clicking
7. Add **background vocals** or **duo/harmony** to any line using the buttons below the main word row
8. **Export TTML** when done

---

## Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / pause |
| `S` | Set selected word start to current time |
| `E` | Set selected word end to current time |
| `Tab` | Next word |
| `Shift+Tab` | Previous word |
| `→` | Seek +0.1s |
| `←` | Seek -0.1s |
| `Shift+→` | Seek +1s |
| `Shift+←` | Seek -1s |
| Double-click word | Jump audio to that word's start time |

---

## TTML Vocal Types

| Type | TTML Role | Color |
|------|-----------|-------|
| Main vocals | *(default)* | White / green when active |
| Background vocals | `ttm:role="x-bg"` | Purple |
| Duo / harmony | `ttm:role="x-alt"` | Orange |

Both `x-bg` and `x-alt` are parsed correctly by Lokal.

---

## Tips

- Look into settings to tune the settings to your needs, especially if you're using this tool for Spicy Lyrics, or any other "community-upload" TTML service.
- If LRCLIB returns synced lyrics, word timings are pre-estimated from line timings, you'll want to likely fine-tune them
- If it returns plain lyrics, all words start with no timing, work through each line with the S/E keys
- The waveform bar at the top shows green markers for each line's start position so it's easier to track
- Double-clicking a word chip in the editor jumps the audio to that word's start so you can re-sync it
- The status bar at the bottom shows how many words are still missing timing
- Each word chip in a line section is highlighted for ease of use.
- Estimation will attempt to match the song to the line length, and will work around your words to improve syncing.
---

## Importing into Lokal

After exporting, open the fullscreen lyrics view (of the song you just synced) in Lokal -> click the Import button (top right) -> select your newly created `.ttml` file. The lyrics will load immediately with word-level sync.


---

## Further usage? 

There are plans to use this to later create an easily accessible by many API for TTML files, so that many aren't restricted to only word-line.
