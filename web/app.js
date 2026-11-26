(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const audio = $("#audio");

  // ---------- icons ----------
  const S = (d, fill) => `<svg viewBox="0 0 24 24" fill="${fill ? "currentColor" : "none"}" stroke="${fill ? "none" : "currentColor"}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONS = {
    play: S('<path d="M7 4.5v15l12.5-7.5z"/>', true),
    pause: S('<rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/>', true),
    next: S('<path d="M5 5l10 7-10 7z" fill="currentColor"/><path d="M19 5v14"/>'),
    prev: S('<path d="M19 5L9 12l10 7z" fill="currentColor"/><path d="M5 5v14"/>'),
    shuffle: S('<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'),
    repeat: S('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
    heart: S('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>'),
    heartFull: S('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>', true),
    note: S('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
    clock: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    plus: S('<path d="M12 5v14M5 12h14"/>'),
    x: S('<path d="M6 6l12 12M18 6L6 18"/>'),
    more: S('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>', true),
    queue: S('<path d="M3 6h13M3 12h13M3 18h9M17 15v6l5-3z"/>'),
    list: S('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
    download: S('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
    folder: S('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    vol: S('<path d="M11 5L6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>'),
    volLow: S('<path d="M11 5L6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>'),
    mute: S('<path d="M11 5L6 9H3v6h3l5 4z" fill="currentColor"/><path d="M16 9l6 6M22 9l-6 6"/>'),
    flake: S('<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2M4 10.5l1.5-3.2L2.3 6M20 13.5l-1.5 3.2 3.2 1.3M4 13.5l1.5 3.2L2.3 18M20 10.5l-1.5-3.2L21.7 6"/>'),
  };
  const icon = (n) => `<i data-icon="${n}">${ICONS[n]}</i>`;
  const setIcon = (el, n) => { const i = el.querySelector("i[data-icon]") || el; i.dataset.icon = n; i.innerHTML = ICONS[n]; };
  $$("i[data-icon]").forEach((i) => (i.innerHTML = ICONS[i.dataset.icon]));

  const store = {
    get(k, d) { try { const v = localStorage.getItem("snowtune." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("snowtune." + k, JSON.stringify(v)); } catch {} },
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (s) => { if (!isFinite(s)) return "0:00"; s = Math.floor(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const shuffled = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- state ----------
  let tracks = [], trackMap = new Map();
  let playlists = [];
  let view = "songs";                 // songs | liked | recent | library | folders | pl:<id>
  let liked = new Set(store.get("liked", []));
  let shuffle = store.get("shuffle", false);
  let repeat = store.get("repeat", "off");   // off | all | one
  let libCat = "All";

  // playback: a "context" (the list you pressed play on) plus your own "up next" queue
  let nowId = null;
  let ctxOriginal = [], ctx = [], ctxIndex = -1, ctxName = "";
  let upNext = [];

  const T = (id) => trackMap.get(id);
  const isTrackView = () => ["songs", "liked", "recent"].includes(view) || view.startsWith("pl:");
  const curPlaylist = () => view.startsWith("pl:") ? playlists.find((p) => "pl:" + p.id === view) : null;

  // ---------- data ----------
  async function loadTracks(rescan = false) {
    const r = await fetch("/api/tracks" + (rescan ? "?rescan=1" : ""));
    tracks = await r.json();
    trackMap = new Map(tracks.map((t) => [t.id, t]));
    render();
  }
  async function loadPlaylists() {
    try { playlists = await (await fetch("/api/playlists")).json(); } catch { playlists = []; }
    renderPlaylists();
  }
  function savePlaylists() {
    fetch("/api/playlists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(playlists) });
    renderPlaylists();
  }

  function visibleTracks() {
    let list;
    const pl = curPlaylist();
    if (pl) list = pl.tracks.map(T).filter(Boolean);
    else if (view === "liked") list = tracks.filter((t) => liked.has(t.id));
    else if (view === "recent") list = [...tracks].sort((a, b) => b.added - a.added).slice(0, 100);
    else list = tracks;
    const q = $("#search").value.trim().toLowerCase();
    if (q) list = list.filter((t) => (t.title + " " + t.album).toLowerCase().includes(q));
    return list;
  }

  // ---------- playlists ----------
  function createPlaylist(name, firstTrack) {
    const n = playlists.length + 1;
    const pl = { id: Date.now().toString(36), name: name || `Playlist ${n}`, tracks: firstTrack ? [firstTrack] : [] };
    playlists.push(pl);
    savePlaylists();
    return pl;
  }
  function addToPlaylist(pl, ids) {
    const add = ids.filter((id) => !pl.tracks.includes(id));
    pl.tracks.push(...add);
    savePlaylists();
    toast(add.length ? `Added to ${pl.name}` : `Already in ${pl.name}`);
    if (view === "pl:" + pl.id) render();
  }
  function removeFromPlaylist(pl, id) {
    pl.tracks = pl.tracks.filter((x) => x !== id);
    savePlaylists();
    render();
  }

  function renderPlaylists() {
    $("#playlists").innerHTML = playlists.map((p) =>
      `<button class="nav${view === "pl:" + p.id ? " active" : ""}" data-pl="${p.id}">${icon("list")}<span>${esc(p.name)}</span></button>`).join("");
  }

  function startNewPlaylistInput() {
    if ($("#playlists input")) return $("#playlists input").focus();
    const inp = document.createElement("input");
    inp.placeholder = "Playlist name";
    $("#playlists").appendChild(inp);
    inp.focus();
    let done = false;
    const finish = (save) => {
      if (done) return; done = true;
      const name = inp.value.trim();
      inp.remove();
      if (save && name) { const pl = createPlaylist(name); go("pl:" + pl.id); }
    };
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") finish(true); if (e.key === "Escape") finish(false); });
    inp.addEventListener("blur", () => finish(true));
  }

  // ---------- rendering ----------
  function go(v) { view = v; $("#search").value = ""; render(); $("#main").scrollTop = 0; }

  function render() {
    $$(".side .nav").forEach((b) => b.classList.toggle("active", b.dataset.view === view || "pl:" + b.dataset.pl === view));
    const pl = curPlaylist();
    $("#trackView").hidden = !isTrackView();
    $("#libraryView").hidden = view !== "library";
    $("#foldersView").hidden = view !== "folders";
    $("#search").style.visibility = view === "folders" ? "hidden" : "visible";
    $("#deletePlaylist").hidden = !pl;
    const titles = { songs: "Songs", liked: "Liked", recent: "Recently added", library: "Free downloads", folders: "Folders" };
    const h1 = $("#viewTitle");
    h1.textContent = pl ? pl.name : titles[view];
    h1.contentEditable = pl ? "true" : "false";
    h1.title = pl ? "Click to rename" : "";
    $("#kicker").textContent = pl ? "Playlist" : "";
    if (isTrackView()) renderTracks();
    if (view === "library") renderLibrary();
    if (view === "folders") renderFolders();
  }

  function renderTracks() {
    const list = visibleTracks();
    $("#count").textContent = `${list.length} song${list.length === 1 ? "" : "s"}`;
    $("#tracks").innerHTML = list.map((t, i) => {
      const on = nowId === t.id;
      return `<div class="row${on ? " playing" : ""}" data-id="${t.id}" draggable="true">
        <div class="t-num">${on && !audio.paused ? "▶" : i + 1}</div>
        <div class="t-title">${esc(t.title)}</div>
        <div class="t-album">${esc(t.album)}</div>
        <div class="t-ext">${esc(t.ext)}</div>
        <div class="t-act">
          <button class="icon-btn${liked.has(t.id) ? " liked" : ""}" data-like title="Like">${icon(liked.has(t.id) ? "heartFull" : "heart")}</button>
          <button class="icon-btn" data-more title="More">${icon("more")}</button>
        </div>
      </div>`;
    }).join("");
    const empty = $("#empty");
    empty.hidden = list.length > 0;
    if (!list.length) {
      empty.textContent = $("#search").value ? "No matches."
        : curPlaylist() ? "Empty playlist. Right-click a song (or use ⋯) and pick this playlist, or drag a song onto its name in the sidebar."
        : view === "liked" ? "Songs you like show up here."
        : "No music found. Add a folder under Folders.";
    }
  }

  function renderLibrary() {
    const cats = ["All", ...new Set(FREE_LIBRARY.map((x) => x.cat))];
    $("#chips").innerHTML = cats.map((c) => `<button class="chip${c === libCat ? " active" : ""}" data-cat="${c}">${c}</button>`).join("");
    const q = $("#search").value.trim().toLowerCase();
    const items = FREE_LIBRARY.filter((x) => (libCat === "All" || x.cat === libCat) && (!q || (x.name + x.desc + x.cat).toLowerCase().includes(q)));
    const groups = [...new Set(items.map((x) => x.cat))];
    $("#lib").innerHTML = groups.map((g) => `
      <h3 class="lib-cat">${g}</h3>
      ${items.filter((x) => x.cat === g).map((x) => `
        <div class="lib-row">
          <a href="${x.url}" target="_blank" rel="noopener noreferrer">${esc(x.name)}<span class="host">${new URL(x.url).hostname.replace(/^www\./, "")}</span></a>
          <p>${esc(x.desc)}</p>
          <span class="lic${x.warn ? " warn" : ""}">${esc(x.tag)}</span>
        </div>`).join("")}`).join("") || `<div class="empty">No matches.</div>`;
  }

  async function renderFolders(folders) {
    if (!folders) folders = await (await fetch("/api/folders")).json();
    $("#folderList").innerHTML = folders.map((f) =>
      `<div class="folder">${icon("folder")}<span title="${esc(f)}">${esc(f)}</span><button class="icon-btn" data-remove="${esc(f)}" title="Remove">${icon("x")}</button></div>`).join("")
      || `<div class="muted">No folders.</div>`;
  }

  function renderQueue() {
    if ($("#queuePanel").hidden) return;
    const item = (id, extra, cls = "") => {
      const t = T(id); if (!t) return "";
      return `<div class="q-item ${cls}" ${extra}><div class="txt"><div class="ttl">${esc(t.title)}</div><div class="sub">${esc(t.album)}</div></div>`;
    };
    let h = `<div class="q-label">Now playing</div>`;
    h += nowId ? item(nowId, "", "now") + `</div>` : `<div class="q-empty">Nothing yet</div>`;
    h += `<div class="q-label"><span>Next in queue</span>${upNext.length ? `<button data-clear>Clear</button>` : ""}</div>`;
    h += upNext.length
      ? upNext.map((id, i) => item(id, `data-up="${i}" draggable="true"`) + `<button class="icon-btn" data-unq="${i}" title="Remove">${icon("x")}</button></div>`).join("")
      : `<div class="q-empty">Right-click a song → Add to queue, or drag it here.</div>`;
    const rest = ctx.slice(ctxIndex + 1, ctxIndex + 41);
    if (rest.length) {
      h += `<div class="q-label">Next from ${esc(ctxName)}</div>`;
      h += rest.map((id, i) => item(id, `data-ctx="${ctxIndex + 1 + i}"`) + `</div>`).join("");
    }
    $("#queueBody").innerHTML = h;
  }

  // ---------- playback ----------
  function setContext(ids, start, name) {
    ctxOriginal = ids;
    ctxName = name;
    if (shuffle) {
      const first = ids[start];
      ctx = [first, ...shuffled(ids.filter((_, i) => i !== start))];
      ctxIndex = 0;
    } else { ctx = [...ids]; ctxIndex = start; }
  }
  function contextName() {
    const pl = curPlaylist();
    return pl ? pl.name : { songs: "Songs", liked: "Liked", recent: "Recently added" }[view] || "Songs";
  }
  function playList(ids, start = 0) {
    if (!ids.length) return;
    setContext(ids, start, contextName());
    load(ctx[ctxIndex]);
  }
  function load(id) {
    if (!T(id)) return;
    nowId = id;
    audio.src = "/stream/" + id;
    audio.play().catch(() => {});
    refresh();
  }
  function next(auto = false) {
    if (auto && repeat === "one" && nowId) { audio.currentTime = 0; audio.play(); return; }
    if (upNext.length) return load(upNext.shift());
    if (ctxIndex + 1 < ctx.length) { ctxIndex++; return load(ctx[ctxIndex]); }
    if (ctx.length && (repeat === "all" || !auto)) {
      if (shuffle) ctx = shuffled(ctxOriginal);
      ctxIndex = 0; return load(ctx[0]);
    }
    audio.pause(); refresh();
  }
  function prev() {
    if (audio.currentTime > 3 || !ctx.length) { audio.currentTime = 0; return; }
    if (nowId !== ctx[ctxIndex]) return load(ctx[ctxIndex]);   // was playing something from the queue
    if (ctxIndex > 0) { ctxIndex--; load(ctx[ctxIndex]); } else audio.currentTime = 0;
  }
  function toggle() {
    if (!nowId) return playList(visibleTracks().map((t) => t.id));
    audio.paused ? audio.play() : audio.pause();
  }
  function toggleShuffle() {
    shuffle = !shuffle; store.set("shuffle", shuffle);
    if (ctx.length) {
      if (shuffle) ctx = [...ctx.slice(0, ctxIndex + 1), ...shuffled(ctx.slice(ctxIndex + 1))];
      else { ctx = [...ctxOriginal]; ctxIndex = Math.max(0, ctx.indexOf(nowId)); }
    }
    refresh();
  }
  function queueAdd(ids, front = false) {
    ids = ids.filter((id) => T(id));
    if (!ids.length) return;
    front ? upNext.unshift(...ids) : upNext.push(...ids);
    toast(front ? "Playing next" : ids.length > 1 ? `Added ${ids.length} songs to queue` : "Added to queue");
    if (!nowId) next();
    renderQueue();
  }
  function toggleLike(id) {
    liked.has(id) ? liked.delete(id) : liked.add(id);
    store.set("liked", [...liked]);
    refresh();
  }

  function refresh() {
    const t = T(nowId);
    $("#nowTitle").textContent = t ? t.title : "—";
    $("#nowAlbum").textContent = t ? t.album : "";
    document.title = t ? `${t.title} – Snowtune` : "Snowtune";
    setIcon($("#playBtn"), audio.paused ? "play" : "pause");
    const on = t && liked.has(t.id);
    setIcon($("#likeBtn"), on ? "heartFull" : "heart");
    $("#likeBtn").classList.toggle("liked", !!on);
    $("#shuffleBtn").classList.toggle("on", shuffle);
    $("#repeatBtn").classList.toggle("on", repeat !== "off");
    $("#repeatBtn").classList.toggle("one", repeat === "one");
    if (isTrackView()) renderTracks();
    renderQueue();
    if ("mediaSession" in navigator && t) navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.album, album: "Snowtune" });
  }

  // ---------- menu ----------
  const menu = $("#menu");
  function openMenu(x, y, id) {
    const pl = curPlaylist();
    let h = `<button data-m="next">Play next</button><button data-m="queue">Add to queue</button><div class="sep"></div>
      <div class="lbl">Add to playlist</div>
      ${playlists.map((p) => `<button data-m="add" data-pl="${p.id}">${esc(p.name)}</button>`).join("")}
      <button data-m="new">New playlist</button><div class="sep"></div>
      <button data-m="like">${liked.has(id) ? "Remove from Liked" : "Add to Liked"}</button>`;
    if (pl) h += `<button data-m="remove" class="danger">Remove from this playlist</button>`;
    menu.innerHTML = h;
    menu.dataset.id = id;
    menu.hidden = false;
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.min(x, innerWidth - r.width - 8) + "px";
    menu.style.top = Math.min(y, innerHeight - r.height - 8) + "px";
  }
  const closeMenu = () => { menu.hidden = true; };
  menu.addEventListener("click", (e) => {
    const b = e.target.closest("[data-m]"); if (!b) return;
    const id = menu.dataset.id;
    ({
      next: () => queueAdd([id], true),
      queue: () => queueAdd([id]),
      add: () => addToPlaylist(playlists.find((p) => p.id === b.dataset.pl), [id]),
      new: () => { const pl = createPlaylist(null, id); toast(`Added to ${pl.name}`); },
      like: () => toggleLike(id),
      remove: () => removeFromPlaylist(curPlaylist(), id),
    })[b.dataset.m]();
    closeMenu();
  });
  document.addEventListener("mousedown", (e) => { if (!menu.contains(e.target)) closeMenu(); });
  addEventListener("blur", closeMenu);

  let toastTimer;
  function toast(msg) {
    const el = $("#toast"); el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.hidden = true), 1800);
  }

  // ---------- events ----------
  $$(".side .nav[data-view]").forEach((b) => b.addEventListener("click", () => go(b.dataset.view)));
  $("#playlists").addEventListener("click", (e) => { const b = e.target.closest("[data-pl]"); if (b) go("pl:" + b.dataset.pl); });
  $("#newPlaylist").addEventListener("click", startNewPlaylistInput);
  $("#search").addEventListener("input", render);

  const h1 = $("#viewTitle");
  h1.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h1.blur(); } });
  h1.addEventListener("blur", () => {
    const pl = curPlaylist(); if (!pl) return;
    const name = h1.textContent.trim();
    if (name && name !== pl.name) { pl.name = name; savePlaylists(); } else h1.textContent = pl.name;
  });
  $("#deletePlaylist").addEventListener("click", () => {
    const pl = curPlaylist(); if (!pl || !confirm(`Delete "${pl.name}"? Your songs stay on your laptop.`)) return;
    playlists = playlists.filter((p) => p !== pl); savePlaylists(); go("songs");
  });

  $("#tracks").addEventListener("click", (e) => {
    const row = e.target.closest(".row"); if (!row) return;
    const id = row.dataset.id;
    if (e.target.closest("[data-like]")) return toggleLike(id);
    if (e.target.closest("[data-more]")) { const r = e.target.closest("[data-more]").getBoundingClientRect(); return openMenu(r.left - 170, r.bottom + 4, id); }
  });
  $("#tracks").addEventListener("dblclick", (e) => {
    const row = e.target.closest(".row"); if (!row || e.target.closest("button")) return;
    if (nowId === row.dataset.id) return toggle();
    const ids = visibleTracks().map((t) => t.id);
    playList(ids, ids.indexOf(row.dataset.id));
  });
  // single click on the number plays too, like most players
  $("#tracks").addEventListener("click", (e) => {
    const num = e.target.closest(".t-num"); if (!num) return;
    const id = num.parentElement.dataset.id;
    if (nowId === id) return toggle();
    const ids = visibleTracks().map((t) => t.id);
    playList(ids, ids.indexOf(id));
  });
  $("#tracks").addEventListener("contextmenu", (e) => {
    const row = e.target.closest(".row"); if (!row) return;
    e.preventDefault(); openMenu(e.clientX, e.clientY, row.dataset.id);
  });

  // drag songs onto a playlist in the sidebar, or into the queue panel
  let dragId = null;
  $("#tracks").addEventListener("dragstart", (e) => {
    const row = e.target.closest(".row"); if (!row) return;
    dragId = row.dataset.id; row.classList.add("dragging");
    e.dataTransfer.effectAllowed = "copy"; e.dataTransfer.setData("text/plain", T(dragId).title);
  });
  $("#tracks").addEventListener("dragend", (e) => { e.target.closest(".row")?.classList.remove("dragging"); dragId = null; });
  const pls = $("#playlists");
  pls.addEventListener("dragover", (e) => {
    const b = e.target.closest("[data-pl]"); if (!b || !dragId) return;
    e.preventDefault(); $$("#playlists .drop").forEach((x) => x !== b && x.classList.remove("drop")); b.classList.add("drop");
  });
  pls.addEventListener("dragleave", (e) => e.target.closest("[data-pl]")?.classList.remove("drop"));
  pls.addEventListener("drop", (e) => {
    const b = e.target.closest("[data-pl]"); if (!b || !dragId) return;
    e.preventDefault(); b.classList.remove("drop");
    addToPlaylist(playlists.find((p) => p.id === b.dataset.pl), [dragId]);
  });

  const qb = $("#queueBody");
  let dragUp = null;
  qb.addEventListener("dragstart", (e) => { const it = e.target.closest("[data-up]"); if (it) { dragUp = +it.dataset.up; e.dataTransfer.effectAllowed = "move"; } });
  qb.addEventListener("dragover", (e) => {
    if (!dragId && dragUp == null) return;
    e.preventDefault();
    qb.querySelectorAll(".over").forEach((x) => x.classList.remove("over"));
    if (dragUp != null) e.target.closest("[data-up]")?.classList.add("over"); else qb.classList.add("drop");
  });
  qb.addEventListener("dragleave", (e) => { if (!qb.contains(e.relatedTarget)) qb.classList.remove("drop"); });
  qb.addEventListener("drop", (e) => {
    e.preventDefault(); qb.classList.remove("drop");
    if (dragId) { queueAdd([dragId]); dragId = null; return; }
    if (dragUp != null) {
      const target = e.target.closest("[data-up]");
      const to = target ? +target.dataset.up : upNext.length - 1;
      const [id] = upNext.splice(dragUp, 1); upNext.splice(to, 0, id);
      dragUp = null; renderQueue();
    }
  });
  qb.addEventListener("dragend", () => { dragUp = null; });
  qb.addEventListener("click", (e) => {
    const un = e.target.closest("[data-unq]");
    if (un) { upNext.splice(+un.dataset.unq, 1); return renderQueue(); }
    if (e.target.closest("[data-clear]")) { upNext = []; return renderQueue(); }
  });
  qb.addEventListener("dblclick", (e) => {
    const up = e.target.closest("[data-up]");
    if (up) { const [id] = upNext.splice(+up.dataset.up, 1); return load(id); }
    const c = e.target.closest("[data-ctx]");
    if (c) { ctxIndex = +c.dataset.ctx; load(ctx[ctxIndex]); }
  });
  qb.addEventListener("contextmenu", (e) => {
    const it = e.target.closest(".q-item"); if (!it) return;
    e.preventDefault();
    const id = it.dataset.up != null ? upNext[+it.dataset.up] : it.dataset.ctx != null ? ctx[+it.dataset.ctx] : nowId;
    if (id) openMenu(e.clientX, e.clientY, id);
  });

  const toggleQueue = (show) => {
    const p = $("#queuePanel");
    p.hidden = show === undefined ? !p.hidden : !show;
    $("#app").classList.toggle("with-queue", !p.hidden);
    $("#queueBtn").classList.toggle("on", !p.hidden);
    store.set("queueOpen", !p.hidden);
    renderQueue();
  };
  $("#queueBtn").addEventListener("click", () => toggleQueue());
  $("#closeQueue").addEventListener("click", () => toggleQueue(false));

  $("#playAll").addEventListener("click", () => {
    if (shuffle) toggleShuffle();
    playList(visibleTracks().map((t) => t.id));
  });
  $("#shuffleAll").addEventListener("click", () => {
    const ids = visibleTracks().map((t) => t.id); if (!ids.length) return;
    if (!shuffle) { shuffle = true; store.set("shuffle", true); }
    playList(ids, Math.floor(Math.random() * ids.length));
  });
  $("#chips").addEventListener("click", (e) => { const c = e.target.closest("[data-cat]"); if (c) { libCat = c.dataset.cat; renderLibrary(); } });

  $("#addFolder").addEventListener("submit", async (e) => {
    e.preventDefault();
    const path = $("#folderInput").value.trim(); if (!path) return;
    $("#folderMsg").textContent = "Scanning…";
    const r = await fetch("/api/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ add: path }) });
    const data = await r.json();
    if (!r.ok) { $("#folderMsg").textContent = data.error; return; }
    $("#folderMsg").textContent = ""; $("#folderInput").value = "";
    renderFolders(data); loadTracks();
  });
  $("#folderList").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-remove]"); if (!b) return;
    const r = await fetch("/api/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ remove: b.dataset.remove }) });
    renderFolders(await r.json()); loadTracks();
  });
  $("#rescan").addEventListener("click", async () => {
    $("#folderMsg").textContent = "Scanning…"; await loadTracks(true);
    $("#folderMsg").textContent = `${tracks.length} songs.`;
  });

  $("#playBtn").addEventListener("click", toggle);
  $("#nextBtn").addEventListener("click", () => next());
  $("#prevBtn").addEventListener("click", prev);
  $("#shuffleBtn").addEventListener("click", toggleShuffle);
  $("#repeatBtn").addEventListener("click", () => { repeat = { off: "all", all: "one", one: "off" }[repeat]; store.set("repeat", repeat); refresh(); });
  $("#likeBtn").addEventListener("click", () => nowId && toggleLike(nowId));

  const seek = $("#seek");
  const paint = (el) => el.style.setProperty("--p", (el.value / el.max) * 100 + "%");
  let seeking = false;
  seek.addEventListener("input", () => { seeking = true; paint(seek); $("#cur").textContent = fmt((seek.value / 1000) * audio.duration); });
  seek.addEventListener("change", () => { if (isFinite(audio.duration)) audio.currentTime = (seek.value / 1000) * audio.duration; seeking = false; });
  audio.addEventListener("timeupdate", () => {
    if (seeking || !isFinite(audio.duration)) return;
    seek.value = (audio.currentTime / audio.duration) * 1000; paint(seek);
    $("#cur").textContent = fmt(audio.currentTime);
  });
  audio.addEventListener("loadedmetadata", () => { $("#dur").textContent = fmt(audio.duration); });
  audio.addEventListener("play", refresh);
  audio.addEventListener("pause", refresh);
  audio.addEventListener("ended", () => next(true));
  audio.addEventListener("error", () => { if (nowId) { toast("Couldn't play that file, skipping"); setTimeout(() => next(true), 500); } });

  const vol = $("#volume");
  const setVol = (v) => {
    v = +v; audio.volume = v / 100; vol.value = v; paint(vol);
    setIcon($("#muteBtn"), v === 0 ? "mute" : v < 50 ? "volLow" : "vol"); store.set("volume", v);
  };
  let lastVol = store.get("volume", 80);
  setVol(lastVol);
  vol.addEventListener("input", () => setVol(vol.value));
  $("#muteBtn").addEventListener("click", () => { if (+vol.value) { lastVol = +vol.value; setVol(0); } else setVol(lastVol || 80); });

  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input:not([type=range]), textarea, [contenteditable=true]")) return;
    if (e.code === "Space") { e.preventDefault(); toggle(); }
    else if (e.key === "ArrowRight" && e.shiftKey) next();
    else if (e.key === "ArrowLeft" && e.shiftKey) prev();
    else if (e.key === "ArrowRight") audio.currentTime += 5;
    else if (e.key === "ArrowLeft") audio.currentTime -= 5;
    else if (e.key === "m") $("#muteBtn").click();
    else if (e.key === "s") toggleShuffle();
    else if (e.key === "r") $("#repeatBtn").click();
    else if (e.key === "q") toggleQueue();
    else if (e.key === "/") { e.preventDefault(); $("#search").focus(); }
    else if (e.key === "Escape") closeMenu();
  });

  if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("play", () => audio.play());
    navigator.mediaSession.setActionHandler("pause", () => audio.pause());
    navigator.mediaSession.setActionHandler("nexttrack", () => next());
    navigator.mediaSession.setActionHandler("previoustrack", prev);
  }

  // ---------- snow ----------
  const canvas = $("#snow"), ctx2d = canvas.getContext("2d");
  let flakes = [], snowOn = store.get("snow", true);
  $("#snowToggle").checked = snowOn;
  function resize() {
    canvas.width = innerWidth; canvas.height = innerHeight;
    const n = Math.round((innerWidth * innerHeight) / 30000);
    flakes = Array.from({ length: n }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: 0.8 + Math.random() * 1.8, s: 0.25 + Math.random() * 0.6, d: Math.random() * 6.3 }));
  }
  function tick() {
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    if (snowOn) {
      ctx2d.fillStyle = "rgba(140, 160, 185, 0.35)";
      for (const f of flakes) {
        f.y += f.s; f.d += 0.01; f.x += Math.sin(f.d) * 0.3;
        if (f.y > canvas.height + 4) { f.y = -4; f.x = Math.random() * canvas.width; }
        ctx2d.beginPath(); ctx2d.arc(f.x, f.y, f.r, 0, 6.3); ctx2d.fill();
      }
    }
    requestAnimationFrame(tick);
  }
  $("#snowToggle").addEventListener("change", (e) => { snowOn = e.target.checked; store.set("snow", snowOn); });
  addEventListener("resize", resize);
  resize(); tick();

  if (store.get("queueOpen", false)) toggleQueue(true);
  refresh();
  loadPlaylists();
  loadTracks();
})();
