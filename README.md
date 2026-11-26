# Snowtune

A small music player for the songs already on your laptop. It has a clean white look with a few Christmas touches.

Snowtune finds the audio files in your Music, Downloads and Desktop folders and plays them in their own app window. You can make playlists, queue songs and like tracks. A **Free downloads** page lists sites where you can get free, legal music and sound effects.

Everything runs on your own computer. Nothing is uploaded and you don't need an account.

![icon](web/icon-192.png)

## Features

- Plays mp3, wav, flac, ogg, opus, m4a, aac and webm audio
- Playlists: create, rename and delete them, and add songs by right-clicking or by dragging onto a playlist
- Queue: **Play next** or **Add to queue**, drag to reorder, and a side panel shows what's coming up
- Shuffle, repeat all or one, liked songs, recently added and search
- Keyboard shortcuts and your keyboard's media keys
- Snowfall you can switch off
- Add any folder, for example a USB drive or `D:\Music`

## Requirements

- **Python 3.9 or newer.** On Windows, tick "Add python.exe to PATH" when you install it from [python.org](https://www.python.org/downloads/).
- **Microsoft Edge or Google Chrome** to show the app window. Without either, Snowtune opens in your normal browser.

No extra packages are needed. Snowtune only uses Python's standard library.

## Getting started

1. Download this repo: **Code → Download ZIP**, then unzip it somewhere you'll keep it.
2. Start it:
   - **Windows:** double-click `Start Snowtune.bat`
   - **macOS / Linux:** run `sh start.sh`
3. Close the window when you're done. That also stops Snowtune.

**Windows only:** double-click `Make Shortcuts.bat` to add a Snowtune icon to your Desktop and Start menu. Run it again if you move the folder.

If the window ever gets stuck, `Stop Snowtune.bat` (or `sh stop.sh`) shuts it down.

## Using it

| Action | How |
| --- | --- |
| Play a song | Double-click it, or click its number |
| Add to a playlist | Right-click it (or use **⋯**) and pick the playlist, or drag it onto the playlist in the sidebar |
| Queue a song | Right-click → **Play next** / **Add to queue** |
| Open the queue | The queue button at the bottom right, or **Q** |
| Rename a playlist | Click its title |
| Add a music folder | **Folders** → paste the path → **Add** |

**Keyboard shortcuts**

- **Space**: play or pause
- **← / →**: skip back or forward 5 seconds
- **Shift + ← / →**: previous or next song
- **S**: shuffle
- **R**: repeat
- **M**: mute
- **/**: search

Songs you download from the Free downloads sites show up after you press **Rescan** on the Folders page.

## Where your data lives

- `config.json`: the folders Snowtune scans
- `playlists.json`: your playlists

Both files are created the first time you run Snowtune and stay on your computer. Git ignores them.

## Settings

- **Port:** Snowtune uses port `8765`. To change it, set the environment variable `SNOWTUNE_PORT`.
- **Icon:** to redraw it, run `pip install pillow`, then `python tools/make_icon.py`.

## Licence

MIT. See [LICENSE](LICENSE).

The sites on the Free downloads page are run by other people, and each one has its own licence. Check it before using a track in a video or game.
