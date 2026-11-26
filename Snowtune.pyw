"""Opens Snowtune as its own app window.

Starts the music server (if it isn't already running), opens a browser window in
app mode (no tabs or address bar), and shuts the server down when you close the window.
"""
import os
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
import server  # noqa: E402

URL = f"http://127.0.0.1:{server.PORT}"
PROFILE = ROOT / ".app-window"          # own browser profile, so the window is its own process


def running():
    try:
        urllib.request.urlopen(URL + "/api/folders", timeout=1)
        return True
    except Exception:
        return False


def find_browser():
    pf, pf86, local = os.environ.get("ProgramFiles", ""), os.environ.get("ProgramFiles(x86)", ""), os.environ.get("LOCALAPPDATA", "")
    for p in (
        Path(pf86) / "Microsoft/Edge/Application/msedge.exe",
        Path(pf) / "Microsoft/Edge/Application/msedge.exe",
        Path(pf) / "Google/Chrome/Application/chrome.exe",
        Path(pf86) / "Google/Chrome/Application/chrome.exe",
        Path(local) / "Google/Chrome/Application/chrome.exe",
        Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
        Path("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
    ):
        if p.is_file():
            return str(p)
    for name in ("msedge", "chrome", "google-chrome", "chromium", "chromium-browser", "microsoft-edge"):
        if shutil.which(name):
            return shutil.which(name)
    return None


def main():
    httpd = None
    if not running():
        httpd = server.make_server()
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        threading.Thread(target=server.scan, daemon=True).start()

    browser = find_browser()
    if not browser:
        webbrowser.open(URL)
        if httpd:
            while True:          # no app window to watch; Stop Snowtune.bat ends it
                time.sleep(3600)
        return

    proc = subprocess.Popen([
        browser, f"--app={URL}", f"--user-data-dir={PROFILE}",
        "--window-size=1200,780", "--no-first-run", "--no-default-browser-check",
    ])
    proc.wait()                  # returns when the Snowtune window is closed

    if httpd:
        httpd.shutdown()
        httpd.server_close()


if __name__ == "__main__":
    main()
