"""Snowtune - a tiny local music player server (stdlib only).

Scans your music folders, streams the files to the browser UI in ./web,
and stops cleanly when POST /api/shutdown is called (used by stop.bat).
"""
import hashlib
import json
import mimetypes
import os
import sys
import threading
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

PORT = int(os.environ.get("SNOWTUNE_PORT", "8765"))
ROOT = Path(__file__).resolve().parent
WEB = ROOT / "web"
CONFIG = ROOT / "config.json"
PLAYLISTS = ROOT / "playlists.json"
HOME = Path.home()

AUDIO_EXT = {".mp3", ".wav", ".flac", ".ogg", ".oga", ".opus", ".m4a", ".aac", ".wma", ".webm"}
SKIP_DIRS = {"appdata", "node_modules", ".git", "$recycle.bin", "windows", "program files", "__pycache__"}
MAX_FILES = 20000
MAX_DEPTH = 6

mimetypes.add_type("audio/flac", ".flac")
mimetypes.add_type("audio/ogg", ".ogg")
mimetypes.add_type("audio/ogg", ".opus")
mimetypes.add_type("audio/mp4", ".m4a")
mimetypes.add_type("audio/aac", ".aac")
mimetypes.add_type("audio/webm", ".webm")

_lock = threading.Lock()
_scan_lock = threading.Lock()   # only one scan at a time
_tracks = {}      # id -> track dict (includes "path")
_scanned = False


def default_folders():
    return [str(HOME / d) for d in ("Music", "Downloads", "Desktop") if (HOME / d).is_dir()]


def load_config():
    if CONFIG.exists():
        try:
            return json.loads(CONFIG.read_text(encoding="utf-8"))
        except Exception:
            pass
    cfg = {"folders": default_folders()}
    save_config(cfg)
    return cfg


def save_config(cfg):
    CONFIG.write_text(json.dumps(cfg, indent=2), encoding="utf-8")


def scan():
    with _scan_lock:
        _scan()


def _scan():
    global _scanned
    found = {}
    for folder in load_config()["folders"]:
        base = Path(folder)
        if not base.is_dir() or len(found) >= MAX_FILES:
            continue
        base_depth = len(base.parts)
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d for d in dirnames
                           if not d.startswith(".") and d.lower() not in SKIP_DIRS
                           and len(Path(dirpath).parts) - base_depth < MAX_DEPTH]
            for name in filenames:
                p = Path(dirpath) / name
                if p.suffix.lower() not in AUDIO_EXT:
                    continue
                key = str(p)
                tid = hashlib.sha1(key.lower().encode()).hexdigest()[:12]
                if tid in found:
                    continue
                try:
                    st = p.stat()
                except OSError:
                    continue
                parent = p.parent.name if p.parent != base else base.name
                found[tid] = {
                    "id": tid,
                    "title": p.stem.replace("_", " "),
                    "album": parent,
                    "folder": str(base),
                    "ext": p.suffix.lower()[1:],
                    "size": st.st_size,
                    "added": int(st.st_mtime),
                    "path": key,
                }
                if len(found) >= MAX_FILES:
                    break
    with _lock:
        _tracks.clear()
        _tracks.update(found)
        _scanned = True


def public_tracks():
    if not _scanned:
        with _scan_lock:          # waits for a scan already in progress
            if not _scanned:
                _scan()
    with _lock:
        items = [{k: v for k, v in t.items() if k != "path"} for t in _tracks.values()]
    items.sort(key=lambda t: t["title"].lower())
    return items


class Handler(BaseHTTPRequestHandler):
    server_version = "Snowtune/1.0"

    def log_message(self, *args):
        pass

    # ---------- helpers ----------
    def send_json(self, data, code=200):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        try:
            return json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            return {}

    def send_file(self, path, allow_range=False):
        size = path.stat().st_size
        ctype = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        start, end = 0, size - 1
        rng = self.headers.get("Range") if allow_range else None
        if rng and rng.startswith("bytes="):
            a, _, b = rng[6:].partition("-")
            try:
                if a:
                    start = int(a)
                    end = int(b) if b else end
                else:
                    start = max(0, size - int(b))
            except ValueError:
                start, end = 0, size - 1
            end = min(end, size - 1)
            if start > end:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{size}")
                self.end_headers()
                return
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        else:
            self.send_response(200)
        length = end - start + 1
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        try:
            with open(path, "rb") as f:
                f.seek(start)
                left = length
                while left > 0:
                    chunk = f.read(min(256 * 1024, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError):
            pass

    # ---------- routes ----------
    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/api/tracks":
            if "rescan" in parse_qs(url.query):
                scan()
            return self.send_json(public_tracks())
        if url.path == "/api/folders":
            return self.send_json(load_config()["folders"])
        if url.path == "/api/playlists":
            try:
                return self.send_json(json.loads(PLAYLISTS.read_text(encoding="utf-8")))
            except Exception:
                return self.send_json([])
        if url.path.startswith("/stream/"):
            tid = url.path.rsplit("/", 1)[-1]
            with _lock:
                t = _tracks.get(tid)
            if not t or not Path(t["path"]).is_file():
                return self.send_json({"error": "not found"}, 404)
            return self.send_file(Path(t["path"]), allow_range=True)

        rel = url.path.lstrip("/") or "index.html"
        target = (WEB / rel).resolve()
        if WEB not in target.parents or not target.is_file():
            return self.send_json({"error": "not found"}, 404)
        return self.send_file(target)

    def do_POST(self):
        url = urlparse(self.path)
        if url.path == "/api/folders":
            data = self.read_json()
            cfg = load_config()
            add, remove = data.get("add"), data.get("remove")
            if add:
                p = Path(os.path.expandvars(os.path.expanduser(add.strip().strip('"'))))
                if not p.is_dir():
                    return self.send_json({"error": f"Folder not found: {p}"}, 400)
                if str(p) not in cfg["folders"]:
                    cfg["folders"].append(str(p))
            if remove:
                cfg["folders"] = [f for f in cfg["folders"] if f != remove]
            save_config(cfg)
            scan()
            return self.send_json(cfg["folders"])
        if url.path == "/api/playlists":
            data = self.read_json()
            if not isinstance(data, list):
                return self.send_json({"error": "expected a list"}, 400)
            tmp = PLAYLISTS.with_suffix(".tmp")
            tmp.write_text(json.dumps(data, indent=2), encoding="utf-8")
            os.replace(tmp, PLAYLISTS)
            return self.send_json({"ok": True})
        if url.path == "/api/shutdown":
            self.send_json({"ok": True})
            threading.Thread(target=self.server.shutdown, daemon=True).start()
            return
        self.send_json({"error": "not found"}, 404)


def make_server():
    return ThreadingHTTPServer(("127.0.0.1", PORT), Handler)


def main():
    try:
        httpd = make_server()
    except OSError:
        print(f"Snowtune already running on http://127.0.0.1:{PORT}")
        sys.exit(0)
    print(f"Snowtune running on http://127.0.0.1:{PORT}")
    threading.Thread(target=scan, daemon=True).start()
    httpd.serve_forever()
    httpd.server_close()
    print("Snowtune stopped.")


if __name__ == "__main__":
    main()
