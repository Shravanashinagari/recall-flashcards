/* =========================================================
   Recall v2 – vanilla JS frontend (no build step)
   Sections: helpers · API · navigation · dashboard · study ·
             library · notes · add/edit modal · backup · keyboard
   ========================================================= */

// >>> CHANGE THIS to your own name. It is shown in the dashboard greeting.
const USER_NAME = "Shrav";

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function debounce(fn, ms = 250) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** Tiny markdown renderer: **bold**, `code`, ``` blocks ```, - lists, paragraphs. Escapes HTML first. */
function md(src) {
  const blocks = [];
  let s = esc(src || "");
  s = s.replace(/```[\w+-]*\n?([\s\S]*?)```/g, (_, code) => {
    blocks.push(`<pre><code>${code.replace(/\n$/, "")}</code></pre>`);
    return `\u0000${blocks.length - 1}\u0000`;
  });
  s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");

  const out = [];
  let para = [];
  let list = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${para.join("<br>")}</p>`); para = []; } };
  const flushList = () => {
    if (list.length) { out.push(`<ul>${list.map((li) => `<li>${li}</li>`).join("")}</ul>`); list = []; }
  };
  for (const raw of s.split("\n")) {
    const line = raw.trimEnd();
    const block = line.match(/^\u0000(\d+)\u0000$/);
    const li = line.match(/^\s*[-*•]\s+(.*)$/);
    if (block) { flushPara(); flushList(); out.push(blocks[Number(block[1])]); }
    else if (li) { flushPara(); list.push(li[1]); }
    else if (line.trim() === "") { flushPara(); flushList(); }
    else { flushList(); para.push(line); }
  }
  flushPara();
  flushList();
  return out.join("").replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[Number(i)]);
}

/* Inline SVG icons (feather-style). Use <i data-icon="name"></i> in HTML. */
const ICONS = {
  home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  layers: '<path d="M12 2l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  x: '<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',
  arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.9 4.9l1.4 1.4"/><path d="M17.7 17.7l1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.9 19.1l1.4-1.4"/><path d="M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;

/* Toasts */
function toast(msg, type = "") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  $("toasts").appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 3000);
}

/** Run an async function and show any error as a toast instead of crashing. */
async function safe(fn) {
  try { await fn(); } catch (e) { toast(e.message || "Something went wrong", "error"); console.error(e); }
}

/* ---------------------------------------------------------
   API (talks to the Spring Boot REST endpoints)
--------------------------------------------------------- */
async function request(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (_) {
    throw new Error("Cannot reach the server. Is the Spring Boot app running?");
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { const j = await res.json(); msg = j.error || j.message || msg; } catch (_) { /* ignore */ }
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

const api = {
  decks: () => request("GET", "/api/decks"),
  createDeck: (d) => request("POST", "/api/decks", d),
  deleteDeck: (id) => request("DELETE", `/api/decks/${id}`),

  cards: ({ deckId, q } = {}) => {
    const p = new URLSearchParams();
    if (deckId) p.set("deckId", deckId);
    if (q) p.set("q", q);
    const s = p.toString();
    return request("GET", "/api/cards" + (s ? `?${s}` : ""));
  },
  createCard: (c) => request("POST", "/api/cards", c),
  updateCard: (id, c) => request("PUT", `/api/cards/${id}`, c),
  deleteCard: (id) => request("DELETE", `/api/cards/${id}`),

  due: (deckId) => request("GET", "/api/review/due" + (deckId ? `?deckId=${deckId}` : "")),
  review: (id, quality) => request("POST", `/api/review/${id}`, { quality }),
  stats: () => request("GET", "/api/stats"),

  notes: (q) => request("GET", "/api/notes" + (q ? `?q=${encodeURIComponent(q)}` : "")),
  createNote: (n) => request("POST", "/api/notes", n),
  updateNote: (id, n) => request("PUT", `/api/notes/${id}`, n),
  deleteNote: (id) => request("DELETE", `/api/notes/${id}`),

  exportAll: () => request("GET", "/api/export"),
  importAll: (data) => request("POST", "/api/import", data),
};

/* ---------------------------------------------------------
   App state + navigation
--------------------------------------------------------- */
const state = {
  view: "dashboard",
  decks: [],
  cards: [],
  deckFilter: null,
  tagFilter: null,
  search: "",
  lastDeck: null,
  studyPanel: "idle",
  notes: [],
  noteId: null,        // number | "new" | null
  renderedNoteId: null,
  notePinned: false,
  notePreview: false,
  editingCardId: null,
  addMode: "single",
  addBusy: false,
};

async function refreshDecks() {
  state.decks = await api.decks();
  updateNavDue(state.decks.reduce((a, d) => a + d.due, 0));
}
function updateNavDue(n) {
  const pill = $("nav-due");
  pill.textContent = n;
  pill.classList.toggle("hidden", !n);
}

function showView(name, skipLoad = false) {
  state.view = name;
  try { localStorage.setItem("view", name); } catch (_) { /* ignore */ }
  qsa(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  qsa(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  window.scrollTo(0, 0);
  if (!skipLoad) safe(loaders[name]);
}
const reloadView = () => safe(loaders[state.view]);

/* ---------------------------------------------------------
   Dashboard
--------------------------------------------------------- */
async function loadDashboard() {
  const s = await api.stats();
  updateNavDue(s.dueToday);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  $("hero-title").textContent = USER_NAME ? `${greet}, ${USER_NAME}` : greet;
  $("hero-date").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  $("hero-sub").textContent =
    s.totalCards === 0 ? "Add your first concept to start building your interview memory."
    : s.dueToday > 0 ? `${plural(s.dueToday, "card")} waiting for review. A few focused minutes today beats cramming the night before.`
    : "You're all caught up. Add new concepts or revisit your notes.";
  $("hero-study").classList.toggle("hidden", s.totalCards === 0);

  // progress ring: reviewed today vs (reviewed + still due)
  const total = s.reviewedToday + s.dueToday;
  const pct = total ? Math.min(1, s.reviewedToday / total) : 0;
  const C = 2 * Math.PI * 52;
  $("hero-ring").innerHTML =
    `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="ring-bg"/>` +
    `<circle cx="60" cy="60" r="52" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 60 60)"/></svg>` +
    `<div class="ring-text"><b>${Math.round(pct * 100)}%</b><span>of today</span></div>`;

  const tiles = [
    ["🔥", s.streak, "Day streak"],
    ["⏰", s.dueToday, "Due today"],
    ["📚", s.totalCards, "Total cards"],
    ["🎯", `${s.accuracy}%`, "Recall accuracy"],
    ["✅", s.reviewedToday, "Reviewed today"],
    ["🏆", s.mature, "Mature cards"],
  ];
  $("tiles").innerHTML = tiles
    .map(([ico, val, lbl]) => `<div class="tile"><div class="t-ico">${ico}</div><div class="t-val">${val}</div><div class="t-lbl">${lbl}</div></div>`)
    .join("");

  renderHeatmap(s.heatmap);
  $("heat-sub").textContent = `${s.totalReviews} reviews in total`;

  $("deck-progress").innerHTML = s.deckProgress.length
    ? s.deckProgress.map((d) => {
        const learning = Math.max(0, d.learned - d.mature);
        const fresh = Math.max(0, d.total - d.learned);
        const w = (n) => (d.total ? (n / d.total) * 100 : 0);
        return `<div class="dp-row">
          <div class="dp-top"><b>${esc(d.name)}</b><span class="muted">${d.mature}/${d.total} mature</span></div>
          <div class="dp-bar">
            <span class="seg-mature" style="width:${w(d.mature)}%"></span>
            <span class="seg-learning" style="width:${w(learning)}%"></span>
            <span class="seg-new" style="width:${w(fresh)}%"></span>
          </div></div>`;
      }).join("")
    : `<p class="muted">No decks yet. Add your first concept to create one.</p>`;
}

function renderHeatmap(days) {
  if (!days || !days.length) { $("heatmap").innerHTML = ""; return; }
  const first = new Date(days[0].date + "T00:00:00");
  const pad = (first.getDay() + 6) % 7; // rows start on Monday
  let html = "";
  for (let i = 0; i < pad; i++) html += `<i class="hm pad"></i>`;
  for (const d of days) {
    const c = d.count;
    const lvl = c === 0 ? 0 : c < 3 ? 1 : c < 6 ? 2 : c < 10 ? 3 : 4;
    html += `<i class="hm l${lvl}" title="${d.date}: ${plural(c, "review")}"></i>`;
  }
  $("heatmap").innerHTML = html;
}

/* ---------------------------------------------------------
   Study session
--------------------------------------------------------- */
const session = { queue: [], total: 0, done: 0, again: 0, current: null, revealed: false, active: false, busy: false };

function setStudyPanel(name) {
  state.studyPanel = name;
  $("study-idle").classList.toggle("hidden", name !== "idle");
  $("study-area").classList.toggle("hidden", name !== "area");
  $("study-summary").classList.toggle("hidden", name !== "summary");
}

async function loadStudyDecks() {
  await refreshDecks();
  const sel = $("study-deck");
  const keep = sel.value;
  sel.innerHTML = `<option value="">All decks</option>` +
    state.decks.map((d) => `<option value="${d.id}">${esc(d.name)} · ${d.due} due</option>`).join("");
  sel.value = [...sel.options].some((o) => o.value === keep) ? keep : "";
  if (!session.active && state.studyPanel !== "summary") renderIdle();
}

function renderIdle() {
  setStudyPanel("idle");
  const sel = $("study-deck").value;
  const decks = sel ? state.decks.filter((d) => String(d.id) === sel) : state.decks;
  const due = decks.reduce((a, d) => a + d.due, 0);
  const total = decks.reduce((a, d) => a + d.total, 0);
  let html;
  if (total === 0) {
    html = `<h3>No cards here yet</h3><p>Add your first concept and it will show up for review.</p><button class="btn primary" data-open-add>Add concept</button>`;
  } else if (due === 0) {
    html = `<h3>You're all caught up 🎉</h3><p>Nothing is due${sel ? " in this deck" : ""}. Come back tomorrow, or add new concepts.</p><button class="btn" data-open-add>Add concept</button>`;
  } else {
    html = `<h3>${plural(due, "card")} ready for review</h3><p>Press <b>Start session</b> to begin. Use <kbd>Space</kbd> to reveal and <kbd>1</kbd>–<kbd>4</kbd> to rate.</p>`;
  }
  $("study-idle").innerHTML = html;
}

async function startStudy() {
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const due = await api.due($("study-deck").value);
  if (!due.length) { session.active = false; renderIdle(); return; }
  Object.assign(session, { queue: [...due], total: due.length, done: 0, again: 0, active: true, busy: false, current: null });
  setStudyPanel("area");
  nextCard();
}

function nextCard() {
  session.current = session.queue.shift() || null;
  updateProgress();
  if (!session.current) { finishSession(); return; }

  const c = session.current;
  session.revealed = false;
  const flip = $("flip");
  const inner = $("flip-inner");
  inner.style.transition = "none";            // reset instantly (no flip-back animation)
  flip.classList.remove("flipped", "enter");
  $("fc-deck").textContent = c.deckName;
  $("fc-q").innerHTML = md(c.question);
  $("fc-q2").innerHTML = md(c.question);
  $("fc-a").innerHTML = md(c.answer);
  $("fc-tags").innerHTML = (c.tags || "").split(",").filter(Boolean)
    .map((t) => `<span class="tag">#${esc(t)}</span>`).join("");
  void inner.offsetWidth;                      // force reflow
  inner.style.transition = "";
  flip.classList.add("enter");
  $("rate").classList.add("locked");
  $("study-left").textContent = `${plural(session.queue.length + 1, "card")} left`;
}

function updateProgress() {
  $("study-bar").style.width = (session.total ? (session.done / session.total) * 100 : 0) + "%";
}

function reveal() {
  if (!session.active || !session.current || session.revealed) return;
  session.revealed = true;
  $("flip").classList.add("flipped");
  $("rate").classList.remove("locked");
}

async function rate(quality) {
  if (!session.active || !session.current || !session.revealed || session.busy) return;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  session.busy = true;
  const card = session.current;
  try {
    const r = await api.review(card.id, quality);
    session.done++;
    if (quality < 3) { session.again++; session.queue.push(card); session.total++; }
    toast(`Next review in ${plural(r.intervalDays, "day")}`, quality < 3 ? "" : "success");
  } catch (e) {
    toast(e.message, "error");
    session.busy = false;
    return;
  }
  session.busy = false;
  nextCard();
}

function finishSession() {
  session.active = false;
  session.current = null;
  const unique = session.total - session.again;
  $("sum-text").textContent =
    `${plural(unique, "card")} reviewed` +
    (session.again ? ` · ${plural(session.again, "card")} needed another pass` : " · nothing needed a second pass");
  setStudyPanel("summary");
  safe(refreshDecks);
}

/* ---------------------------------------------------------
   Library (decks + cards)
--------------------------------------------------------- */
async function loadLibrary() {
  await refreshDecks();
  if (state.deckFilter && !state.decks.some((d) => d.id === state.deckFilter)) state.deckFilter = null;
  state.cards = await api.cards({ deckId: state.deckFilter, q: state.search });
  renderLibrary();
}

function renderLibrary() {
  const totalAll = state.decks.reduce((a, d) => a + d.total, 0);
  $("deck-chips").innerHTML =
    `<button class="deck-chip ${state.deckFilter === null ? "active" : ""}" data-deck="">All<small>${totalAll}</small></button>` +
    state.decks.map((d) =>
      `<button class="deck-chip ${state.deckFilter === d.id ? "active" : ""}" data-deck="${d.id}">${esc(d.name)}<small>${d.total}</small></button>`).join("");
  $("deck-actions").classList.toggle("hidden", state.deckFilter === null);

  // tag chips come from the cards currently loaded
  const tagSet = new Set();
  state.cards.forEach((c) => (c.tags || "").split(",").filter(Boolean).forEach((t) => tagSet.add(t)));
  if (state.tagFilter && !tagSet.has(state.tagFilter)) state.tagFilter = null;
  $("tag-chips").innerHTML = [...tagSet].sort()
    .map((t) => `<span class="tag ${state.tagFilter === t ? "active" : ""}" data-tag="${esc(t)}">#${esc(t)}</span>`).join("");

  const visible = state.tagFilter
    ? state.cards.filter((c) => (c.tags || "").split(",").includes(state.tagFilter))
    : state.cards;
  $("lib-meta").textContent = `${plural(visible.length, "card")}${state.search ? ` matching “${state.search}”` : ""}`;

  if (!visible.length) {
    $("card-grid").innerHTML = (totalAll === 0)
      ? `<div class="empty" style="grid-column:1/-1"><h3>Your library is empty</h3><p>Add your first concept: a question you might be asked and the answer you want to give.</p><button class="btn primary" data-open-add>Add concept</button></div>`
      : `<div class="empty" style="grid-column:1/-1"><h3>No cards match</h3><p>Try a different search, deck or tag.</p></div>`;
    return;
  }
  $("card-grid").innerHTML = visible.map(cardHTML).join("");
}

function cardHTML(c) {
  const today = todayStr();
  const tags = (c.tags || "").split(",").filter(Boolean)
    .map((t) => `<span class="tag" data-tag="${esc(t)}">#${esc(t)}</span>`).join("");
  const status = c.repetitions === 0 ? `<span class="badge new">New</span>`
    : c.intervalDays >= 21 ? `<span class="badge mature">Mature</span>`
    : `<span class="badge learning">Learning</span>`;
  const due = c.dueDate <= today ? "Due now" : `Due ${fmtDate(c.dueDate + "T00:00:00")}`;
  const long = c.answer.length > 150 || c.answer.split("\n").length > 3;
  return `<article class="kcard" data-id="${c.id}">
    <div class="kcard-top"><span class="chip">${esc(c.deckName)}</span>${status}</div>
    <div class="kq md">${md(c.question)}</div>
    <div class="ka md ${long ? "collapsed" : ""}">${md(c.answer)}</div>
    ${long ? `<button class="link" data-act="toggle">Show more</button>` : ""}
    <div class="tags">${tags}</div>
    <div class="kcard-foot">
      <span>${due} · every ${c.intervalDays}d · EF ${c.easeFactor}</span>
      <span class="row-actions">
        <button class="icon-btn" data-act="edit" title="Edit">${icon("edit")}</button>
        <button class="icon-btn danger" data-act="delete" title="Delete">${icon("trash")}</button>
      </span>
    </div>
  </article>`;
}

/* ---------------------------------------------------------
   Notes
--------------------------------------------------------- */
async function loadNotes() {
  state.notes = await api.notes($("note-search").value.trim());
  if (state.noteId !== "new" && !state.notes.some((n) => n.id === state.noteId)) {
    state.noteId = state.notes.length ? state.notes[0].id : null;
  }
  renderNoteList();
  renderNoteEditor(false);
}

function renderNoteList() {
  if (!state.notes.length) {
    $("note-list").innerHTML = `<div class="empty">No notes yet.<br/>Click <b>New note</b> to write your first one.</div>`;
    return;
  }
  $("note-list").innerHTML = state.notes.map((n) => {
    const snip = n.content.replace(/[`*#>-]/g, "").replace(/\s+/g, " ").trim().slice(0, 140);
    const tags = n.tags ? " · " + n.tags.split(",").map((t) => "#" + esc(t)).join(" ") : "";
    return `<button class="note-item ${n.id === state.noteId ? "active" : ""}" data-id="${n.id}">
      <b><span>${esc(n.title)}</span>${n.pinned ? `<span class="pin">📌</span>` : ""}</b>
      <span class="snip">${esc(snip)}</span>
      <span class="meta">${fmtDate(n.updatedAt)}${tags}</span>
    </button>`;
  }).join("");
}

function renderNoteEditor(force) {
  const has = state.noteId !== null;
  $("note-empty").classList.toggle("hidden", has);
  $("note-form").classList.toggle("hidden", !has);
  if (!has) { state.renderedNoteId = null; return; }
  if (!force && state.renderedNoteId === state.noteId) return; // keep unsaved typing
  const n = state.noteId === "new"
    ? { title: "", content: "", tags: "", pinned: false }
    : state.notes.find((x) => x.id === state.noteId);
  if (!n) return;
  state.renderedNoteId = state.noteId;
  $("note-title").value = n.title;
  $("note-tags").value = n.tags || "";
  $("note-content").value = n.content;
  state.notePinned = !!n.pinned;
  state.notePreview = false;
  updateNoteUI();
}

function updateNoteUI() {
  $("note-pin").textContent = state.notePinned ? "Unpin" : "Pin";
  $("note-preview-btn").textContent = state.notePreview ? "Edit" : "Preview";
  $("note-content").classList.toggle("hidden", state.notePreview);
  $("note-preview").classList.toggle("hidden", !state.notePreview);
  if (state.notePreview) $("note-preview").innerHTML = md($("note-content").value) || `<p class="muted">Nothing to preview yet.</p>`;
  $("note-delete").classList.toggle("hidden", state.noteId === "new");
}

function selectNote(id) {
  state.noteId = id;
  renderNoteList();
  renderNoteEditor(true);
}

async function saveNote(silent = false) {
  const title = $("note-title").value.trim();
  const content = $("note-content").value.trim();
  if (!title || !content) { toast("A note needs a title and some content", "error"); return; }
  const payload = { title, content, tags: $("note-tags").value, pinned: state.notePinned };
  const saved = state.noteId === "new" ? await api.createNote(payload) : await api.updateNote(state.noteId, payload);
  state.noteId = saved.id;
  state.notes = await api.notes($("note-search").value.trim());
  renderNoteList();
  renderNoteEditor(true);
  if (!silent) toast("Note saved", "success");
}

/* ---------------------------------------------------------
   Modals (add / edit concept, new deck, confirm)
--------------------------------------------------------- */
const anyModalOpen = () => qsa(".modal").some((m) => !m.classList.contains("hidden"));
function openModal(id) { $(id).classList.remove("hidden"); document.body.classList.add("modal-open"); }
function closeModal(id) {
  $(id).classList.add("hidden");
  if (!anyModalOpen()) document.body.classList.remove("modal-open");
}

let confirmResolver = null;
function confirmBox(title, text, okLabel = "Delete") {
  return new Promise((resolve) => {
    confirmResolver = resolve;
    $("confirm-title").textContent = title;
    $("confirm-text").textContent = text || "";
    $("confirm-ok").textContent = okLabel;
    openModal("modal-confirm");
  });
}
function settleConfirm(value) {
  if (!confirmResolver) return;
  const resolve = confirmResolver;
  confirmResolver = null;
  closeModal("modal-confirm");
  resolve(value);
}

function setAddMode(mode) {
  state.addMode = mode;
  qsa("#add-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  $("add-single").classList.toggle("hidden", mode !== "single");
  $("add-bulk").classList.toggle("hidden", mode !== "bulk");
}
function syncNewDeck() {
  $("add-newdeck").classList.toggle("hidden", $("add-deck").value !== "__new__");
}

/** opts: { editId, deckId, question, answer, tags } */
async function openAdd(opts = {}) {
  if (!state.decks.length) { try { await refreshDecks(); } catch (_) { /* ignore */ } }
  const editing = !!opts.editId;
  state.editingCardId = opts.editId || null;
  $("add-title").textContent = editing ? "Edit concept" : "Add concept";
  $("add-submit").textContent = editing ? "Save changes" : "Save concept";
  $("add-tabs").classList.toggle("hidden", editing);
  $("add-another-wrap").classList.toggle("hidden", editing);
  $("add-another").checked = false;
  setAddMode("single");

  $("add-deck").innerHTML =
    state.decks.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join("") +
    `<option value="__new__">+ New deck…</option>`;
  const prefer = Number(opts.deckId || state.lastDeck || state.deckFilter || (state.decks[0] && state.decks[0].id));
  $("add-deck").value = state.decks.some((d) => d.id === prefer) ? String(prefer) : "__new__";
  syncNewDeck();

  $("add-newdeck").value = "";
  $("add-q").value = opts.question || "";
  $("add-a").value = opts.answer || "";
  $("add-tags").value = opts.tags || "";
  $("add-bulk-text").value = "";
  openModal("modal-add");
  setTimeout(() => ($("add-deck").value === "__new__" ? $("add-newdeck") : $("add-q")).focus(), 60);
}

async function submitAdd(e) {
  e.preventDefault();
  if (state.addBusy) return;
  state.addBusy = true;
  try {
    // 1) which deck?
    let deckId;
    if ($("add-deck").value === "__new__") {
      const name = $("add-newdeck").value.trim();
      if (!name) { toast("Give the new deck a name", "error"); return; }
      deckId = (await api.createDeck({ name, description: "" })).id;
    } else {
      deckId = Number($("add-deck").value);
    }
    const tags = $("add-tags").value;

    // 2) save
    if (state.editingCardId) {
      const question = $("add-q").value.trim();
      const answer = $("add-a").value.trim();
      if (!question || !answer) { toast("Question and answer are required", "error"); return; }
      await api.updateCard(state.editingCardId, { deckId, question, answer, tags });
      toast("Changes saved", "success");
    } else if (state.addMode === "bulk") {
      const lines = $("add-bulk-text").value.split("\n").map((l) => l.trim()).filter(Boolean);
      let saved = 0, skipped = 0;
      for (const line of lines) {
        const idx = line.indexOf("::");
        const q = idx > 0 ? line.slice(0, idx).trim() : "";
        const a = idx > 0 ? line.slice(idx + 2).trim() : "";
        if (!q || !a) { skipped++; continue; }
        await api.createCard({ deckId, question: q, answer: a, tags });
        saved++;
      }
      if (!saved) { toast("No valid lines found. Use: question :: answer", "error"); return; }
      toast(`Added ${plural(saved, "card")}${skipped ? ` (${skipped} skipped)` : ""}`, "success");
    } else {
      const question = $("add-q").value.trim();
      const answer = $("add-a").value.trim();
      if (!question || !answer) { toast("Question and answer are required", "error"); return; }
      await api.createCard({ deckId, question, answer, tags });
      toast("Concept added", "success");
    }

    state.lastDeck = deckId;
    await refreshDecks();

    // 3) stay open for the next one, or close
    if (!state.editingCardId && $("add-another").checked) {
      $("add-q").value = ""; $("add-a").value = ""; $("add-bulk-text").value = "";
      $("add-deck").innerHTML =
        state.decks.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join("") +
        `<option value="__new__">+ New deck…</option>`;
      $("add-deck").value = String(deckId);
      syncNewDeck();
      (state.addMode === "bulk" ? $("add-bulk-text") : $("add-q")).focus();
    } else {
      closeModal("modal-add");
    }
    reloadView();
  } catch (err) {
    toast(err.message, "error");
  } finally {
    state.addBusy = false;
  }
}

/* ---------------------------------------------------------
   Backup / restore (JSON)
--------------------------------------------------------- */
async function exportData() {
  const data = await api.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `recall-backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Backup downloaded", "success");
}

async function importData(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch (_) { toast("That file is not valid JSON", "error"); return; }
  const r = await api.importAll(data);
  toast(`Imported ${plural(r.cards, "card")}, ${plural(r.decks, "deck")}, ${plural(r.notes, "note")}`, "success");
  reloadView();
}

/* ---------------------------------------------------------
   Theme
--------------------------------------------------------- */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem("theme", theme); } catch (_) { /* ignore */ }
  $("theme-btn").innerHTML = icon(theme === "dark" ? "sun" : "moon");
}

/* ---------------------------------------------------------
   Wire everything up
--------------------------------------------------------- */
const loaders = {
  dashboard: loadDashboard,
  study: loadStudyDecks,
  library: loadLibrary,
  notes: loadNotes,
};

function init() {
  qsa("[data-icon]").forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
  applyTheme(document.documentElement.getAttribute("data-theme") || "light");

  // navigation + global buttons
  qsa(".nav-item").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
  $("theme-btn").addEventListener("click", () =>
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"));
  $("export-btn").addEventListener("click", () => safe(exportData));
  $("import-btn").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) safe(() => importData(file));
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-add]")) openAdd();
  });

  // dashboard
  $("hero-study").addEventListener("click", () => safe(async () => {
    showView("study", true);
    await loadStudyDecks();
    $("study-deck").value = "";
    await startStudy();
  }));

  // study
  $("study-start").addEventListener("click", () => safe(startStudy));
  $("study-deck").addEventListener("change", () => { if (!session.active) renderIdle(); });
  $("flip").addEventListener("click", reveal);
  qsa(".rate-btn").forEach((b) => b.addEventListener("click", () => safe(() => rate(Number(b.dataset.q)))));
  $("sum-again").addEventListener("click", () => safe(startStudy));
  $("sum-home").addEventListener("click", () => showView("dashboard"));

  // library
  $("lib-search").addEventListener("input", debounce((e) => {
    state.search = e.target.value.trim();
    safe(loadLibrary);
  }));
  $("new-deck-btn").addEventListener("click", () => {
    $("deck-form").reset();
    openModal("modal-deck");
    setTimeout(() => $("deck-name").focus(), 60);
  });
  $("deck-chips").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-deck]");
    if (!chip) return;
    state.deckFilter = chip.dataset.deck ? Number(chip.dataset.deck) : null;
    state.tagFilter = null;
    safe(loadLibrary);
  });
  $("tag-chips").addEventListener("click", (e) => {
    const tag = e.target.closest("[data-tag]");
    if (!tag) return;
    state.tagFilter = state.tagFilter === tag.dataset.tag ? null : tag.dataset.tag;
    renderLibrary();
  });
  $("deck-study").addEventListener("click", () => safe(async () => {
    const deckId = state.deckFilter;
    showView("study", true);
    await loadStudyDecks();
    $("study-deck").value = String(deckId);
    await startStudy();
  }));
  $("deck-delete").addEventListener("click", () => safe(async () => {
    const deck = state.decks.find((d) => d.id === state.deckFilter);
    if (!deck) return;
    if (await confirmBox(`Delete “${deck.name}”?`, `This also deletes its ${plural(deck.total, "card")} and their review history.`)) {
      await api.deleteDeck(deck.id);
      state.deckFilter = null;
      toast("Deck deleted");
      await loadLibrary();
    }
  }));
  $("card-grid").addEventListener("click", (e) => {
    const tag = e.target.closest(".tag[data-tag]");
    if (tag) {
      state.tagFilter = state.tagFilter === tag.dataset.tag ? null : tag.dataset.tag;
      renderLibrary();
      return;
    }
    const btn = e.target.closest("[data-act]");
    const cardEl = e.target.closest(".kcard");
    if (!btn || !cardEl) return;
    const id = Number(cardEl.dataset.id);
    const c = state.cards.find((x) => x.id === id);
    if (btn.dataset.act === "toggle") {
      const collapsed = cardEl.querySelector(".ka").classList.toggle("collapsed");
      btn.textContent = collapsed ? "Show more" : "Show less";
    } else if (btn.dataset.act === "edit" && c) {
      openAdd({ editId: id, deckId: c.deckId, question: c.question, answer: c.answer, tags: c.tags || "" });
    } else if (btn.dataset.act === "delete") {
      safe(async () => {
        if (await confirmBox("Delete this card?", "Its review history will be removed too.")) {
          await api.deleteCard(id);
          toast("Card deleted");
          await loadLibrary();
        }
      });
    }
  });

  // notes
  $("note-search").addEventListener("input", debounce(() => safe(loadNotes)));
  $("note-new").addEventListener("click", () => {
    state.noteId = "new";
    renderNoteList();
    renderNoteEditor(true);
    $("note-title").focus();
  });
  $("note-list").addEventListener("click", (e) => {
    const item = e.target.closest(".note-item");
    if (item) selectNote(Number(item.dataset.id));
  });
  $("note-save").addEventListener("click", () => safe(() => saveNote()));
  $("note-preview-btn").addEventListener("click", () => { state.notePreview = !state.notePreview; updateNoteUI(); });
  $("note-pin").addEventListener("click", () => safe(async () => {
    state.notePinned = !state.notePinned;
    updateNoteUI();
    if (state.noteId !== "new") await saveNote(true);
  }));
  $("note-card").addEventListener("click", () => {
    const title = $("note-title").value.trim();
    const content = $("note-content").value.trim();
    if (!title || !content) { toast("Write a title and some content first", "error"); return; }
    openAdd({ question: title, answer: content, tags: $("note-tags").value });
  });
  $("note-delete").addEventListener("click", () => safe(async () => {
    if (state.noteId === "new" || state.noteId === null) return;
    if (await confirmBox("Delete this note?", "This cannot be undone.")) {
      await api.deleteNote(state.noteId);
      state.noteId = null;
      toast("Note deleted");
      await loadNotes();
    }
  }));

  // add / edit modal
  $("add-deck").addEventListener("change", syncNewDeck);
  $("add-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-mode]");
    if (b) setAddMode(b.dataset.mode);
  });
  $("add-form").addEventListener("submit", submitAdd);

  // new deck modal
  $("deck-form").addEventListener("submit", (e) => {
    e.preventDefault();
    safe(async () => {
      const d = await api.createDeck({ name: $("deck-name").value.trim(), description: $("deck-desc").value.trim() });
      closeModal("modal-deck");
      toast(`Deck “${d.name}” created`, "success");
      state.deckFilter = d.id;
      reloadView();
    });
  });

  // confirm modal
  $("confirm-ok").addEventListener("click", () => settleConfirm(true));
  $("confirm-cancel").addEventListener("click", () => settleConfirm(false));

  // generic modal close (backdrop click or any [data-close] button)
  const dismiss = (m) => { if (m.id === "modal-confirm") settleConfirm(false); else closeModal(m.id); };
  qsa(".modal").forEach((m) => {
    m.addEventListener("mousedown", (e) => { if (e.target === m) dismiss(m); });
    m.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) dismiss(m); });
  });

  // keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$("modal-confirm").classList.contains("hidden")) settleConfirm(false);
      else qsa(".modal").forEach((m) => closeModal(m.id));
      return;
    }
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === "Enter" && !$("modal-add").classList.contains("hidden")) {
      e.preventDefault();
      $("add-form").requestSubmit();
      return;
    }
    if (mod && e.key.toLowerCase() === "s" && state.view === "notes") {
      e.preventDefault();
      safe(() => saveNote());
      return;
    }
    const tag = (e.target.tagName || "").toLowerCase();
    if (["input", "textarea", "select"].includes(tag) || mod || e.altKey || anyModalOpen()) return;

    if (e.key === "n" || e.key === "N") { e.preventDefault(); openAdd(); return; }
    if (state.view === "study" && session.active) {
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); reveal(); return; }
      const map = { Digit1: 1, Digit2: 3, Digit3: 4, Digit4: 5 };
      if (map[e.code] !== undefined) safe(() => rate(map[e.code]));
    }
  });

  let saved = "dashboard";
  try { saved = localStorage.getItem("view") || "dashboard"; } catch (_) { /* ignore */ }
  showView(loaders[saved] ? saved : "dashboard");
}

init();
