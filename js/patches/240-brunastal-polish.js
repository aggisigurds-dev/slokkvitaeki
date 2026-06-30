/* === BRUNASTAL POLISH v1 ===
 * Brunastál-only re-skin: spec-aligned tokens + readability fixes.
 * Every selector scoped to so the other
 * 9 themes are untouched. Every property uses !important to beat the
 * earlier patch cascade (15, 76, 213, 229, 230 inline styles, 229 token map).
 *
 * Does NOT modify ársskoðun markup (153-arsskodun.js) or the eldbanner
 * (230-brunastal-theme.js) — pure CSS injection on document.head.
 */
(() => {
  const ID = 'bstal-polish-css';
  if (document.getElementById(ID)) return;
  const s = document.createElement('style');
  s.id = ID;
  s.textContent = `
/* ============================================================
   Brunastál — spec-aligned tokens + aliases
   ============================================================ */
:root{
  /* Spec-aligned aliases so spec snippets using --accent work as-is */
  --accent: var(--bstal-accent, #c92a2a) !important;
  --accent-2: var(--bstal-accent2, #8d1b1b) !important;
  --ring: var(--bstal-ring, rgba(201,42,42,.35)) !important;
  --glow: 0 0 0 3px rgba(201,42,42,.18) !important;
  --btn-grad: linear-gradient(180deg,#150203 0%,#1b0405 22%,#1f0506 50%,#180304 78%,#120203 100%) !important;
  --plate: #eef1f6 !important;
  --plate-2: #d9deea !important;
  --steel-line: #1e2128 !important;

  /* Readable text levels on brushed-steel bg #9ba1ad */
  --ink-on-steel: #ffffff !important;
  --ink-on-card: #11141c !important;
  --ink-sub-on-card: #3a4250 !important;
  --ink-sub-strong: #2b313c !important;
  --ink-muted-readable: #5b6573 !important;

  /* Soft chip palette per spec §3 */
  --chip-done-bg: #ecfdf5 !important; --chip-done-ink: #047857 !important; --chip-done-bd: #a7f3d0 !important;
  --chip-prog-bg: #eff6ff !important; --chip-prog-ink: #1d4ed8 !important; --chip-prog-bd: #bfdbfe !important;
  --chip-pend-bg: #fffbeb !important; --chip-pend-ink: #92400e !important; --chip-pend-bd: #fde68a !important;
  --chip-over-bg: #fef2f2 !important; --chip-over-ink: #b91c1c !important; --chip-over-bd: #fecaca !important;
  --chip-neut-bg: #f1f5f9 !important; --chip-neut-ink: #334155 !important; --chip-neut-bd: #cbd5e1 !important;
}

/* ============================================================
   Heading contrast — fix .view h1 white-on-light from patch 230
   Only the banner keeps white text.
   ============================================================ */
.view h1{
  color:#11141c !important;
  font-family:'Space Grotesk', system-ui, sans-serif !important;
  font-weight:700 !important;
  letter-spacing:-.01em !important;
}
.view h2{
  color:#1f2530 !important;
  font-family:'Space Grotesk', system-ui, sans-serif !important;
  font-weight:600 !important;
}
.view h3{
  color:#3a4250 !important;
  font-family:'Space Grotesk', system-ui, sans-serif !important;
  font-weight:600 !important;
}
/* Banner h1/h2 explicitly white (only inside the eldbanner) */
#bstal-banner h1,
#bstal-banner h2,
#bstal-banner .bb-word{
  color:#fff !important;
}

/* Beat patch 213's plain h1/h2 font rules with attr-selector specificity */
h1,
h2,
h3{
  font-family:'Space Grotesk', system-ui, sans-serif !important;
}

/* ============================================================
   Muted-text readability — beat patch 229 token mapping and
   inline #64748b/#94a3b8/#9ca3af/#6b7280 colors.
   ============================================================ */
[style*="color:#64748b"],
[style*="color: #64748b"],
[style*="color:#94a3b8"],
[style*="color: #94a3b8"],
[style*="color:#9ca3af"],
[style*="color: #9ca3af"],
[style*="color:#6b7280"],
[style*="color: #6b7280"]{
  color:#3a4250 !important;
}
.muted,
.text-muted,
small{
  color:#3a4250 !important;
}

/* ============================================================
   Table recipe — sticky header + horizontal overflow
   ============================================================ */
.view table{
  display:block !important;
  overflow-x:auto !important;
  max-width:100% !important;
  border-collapse:collapse !important;
  background:#fff !important;
  border-radius:10px !important;
  border:1px solid #e3e7ee !important;
}
.view table thead{
  position:sticky !important;
  top:0 !important;
  z-index:2 !important;
}
.view table thead th{
  background:linear-gradient(180deg,#1b1d23,#0e0f13) !important;
  color:#fff !important;
  font-weight:600 !important;
  text-align:left !important;
  padding:10px 12px !important;
  font-size:12px !important;
  letter-spacing:.02em !important;
  text-transform:uppercase !important;
  border:0 !important;
}
.view table tbody td{
  padding:10px 12px !important;
  border-top:1px solid #eef1f6 !important;
  color:#11141c !important;
  background:#fff !important;
}
.view table tbody tr:hover td{
  background:#f5f7fb !important;
}

/* ============================================================
   Status chip soft tints (spec §3) — replace heavy gradient
   with readable flat backgrounds.
   ============================================================ */
.chip.done,
.pill.done,
.badge.done,
[data-status="done"]{
  background:#ecfdf5 !important;
  color:#047857 !important;
  border:1px solid #a7f3d0 !important;
  background-image:none !important;
  text-shadow:none !important;
}
.chip.in-progress,
.chip.progress,
.pill.in-progress,
[data-status="in-progress"]{
  background:#eff6ff !important;
  color:#1d4ed8 !important;
  border:1px solid #bfdbfe !important;
  background-image:none !important;
  text-shadow:none !important;
}
.chip.pending,
.chip.warning,
.pill.pending,
[data-status="pending"]{
  background:#fffbeb !important;
  color:#92400e !important;
  border:1px solid #fde68a !important;
  background-image:none !important;
  text-shadow:none !important;
}
.chip.overdue,
.chip.danger,
.pill.overdue,
[data-status="overdue"]{
  background:#fef2f2 !important;
  color:#b91c1c !important;
  border:1px solid #fecaca !important;
  background-image:none !important;
  text-shadow:none !important;
}
.chip.neutral,
[data-status="neutral"]{
  background:#f1f5f9 !important;
  color:#334155 !important;
  border:1px solid #cbd5e1 !important;
  background-image:none !important;
  text-shadow:none !important;
}

/* ============================================================
   Sidebar hover — beat patch 76 white-tinted hover.
   ============================================================ */
.view-nav .vnav-btn:hover{
  background:rgba(255,255,255,.08) !important;
  color:#fff !important;
}
.view-nav .vnav-btn.active{
  background:linear-gradient(180deg,#2a2d35,#1a1c22) !important;
  color:#fff !important;
  border-left:3px solid var(--bstal-accent,#c92a2a) !important;
}

/* ============================================================
   Topbar — beat patch 213 plain .topbar selector
   ============================================================ */
.topbar{
  background:linear-gradient(180deg,#1b1d23,#0e0f13) !important;
  color:#fff !important;
  border-bottom:1px solid var(--steel-line,#1e2128) !important;
}

/* ============================================================
   Ársskoðun modal widening — DOES NOT touch markup;
   only overrides inline max-width via theme CSS.
   ============================================================ */
._ars-modal{
  max-width:min(1100px,96vw) !important;
  width:100% !important;
}
._ars-modal-bg{
  padding:24px 16px !important;
}
#_ars-search{
  background:#fff !important;
  color:#11141c !important;
  border:1px solid #cbd5e1 !important;
  border-radius:8px !important;
  padding:8px 12px !important;
  font-size:14px !important;
}
#_ars-search:focus{
  outline:none !important;
  border-color:var(--bstal-accent,#c92a2a) !important;
  box-shadow:0 0 0 3px rgba(201,42,42,.18) !important;
}

/* ============================================================
   Bilstjóri overlay — lives outside .view scope, give it
   the same readable colour scheme.
   ============================================================ */
#view-bilstjori{
  background:linear-gradient(180deg,#9ba1ad 0%,#8a929e 100%) !important;
  color:#11141c !important;
}
#view-bilstjori .bs-card,
#view-bilstjori [class*="card"]{
  background:#fff !important;
  color:#11141c !important;
  border:1px solid #e3e7ee !important;
  border-radius:10px !important;
}
#view-bilstjori h1,
#view-bilstjori h2,
#view-bilstjori h3{
  color:#11141c !important;
}

/* ============================================================
   Input shapes — spec §1 input recipe.
   ============================================================ */
.view input[type="text"],
.view input[type="search"],
.view input[type="number"],
.view input[type="tel"],
.view input[type="email"],
.view textarea,
.view select{
  background:#fff !important;
  color:#11141c !important;
  border:1px solid #cbd5e1 !important;
  border-radius:8px !important;
}
.view input:focus,
.view textarea:focus,
.view select:focus{
  outline:none !important;
  border-color:var(--bstal-accent,#c92a2a) !important;
  box-shadow:0 0 0 3px rgba(201,42,42,.18) !important;
}
`;
  document.head.appendChild(s);
})();
/* === END BRUNASTAL POLISH === */
