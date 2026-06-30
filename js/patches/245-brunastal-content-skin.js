/* === BRUNASTAL CONTENT SKIN v1 ===
 * Aggressive theme polish for the Brunastál preset — applies the
 * THEME-SPEC.md recipes to the CONTENT area of every page (not just
 * the sidebar + banner that patch 230 already styles).
 *
 * Scope: html[data-thm-preset="brunastal"] only — the other 9 themes
 * are untouched. Uses !important everywhere to win against:
 *   • css/app.css base rules
 *   • 200+ inline style="…" attributes on patch-built markup
 *   • js/newfeatures.js style overrides
 *
 * Covers per THEME-SPEC.md sections:
 *   §1 — design tokens (page bg gradient + font wiring)
 *   §2 — 4 button styles (A metallic black, B accent grad, C green, D light)
 *   §3 — status chips (done / progress / pending / overdue / neutral / fire / samn.)
 *   §4 — table recipe (.tcard + .dtbl, sticky thead, hover, mono numbers)
 *   §5 — stat cards / hero cards
 *   §7 — empty state, mono numbers, white-on-dark-band page titles
 *
 * Does NOT touch ársskoðun (153) markup or the eldbanner (230).
 */
(() => {
  const ID = 'bstal-content-skin-css';
  if (document.getElementById(ID)) return;
  const s = document.createElement('style');
  s.id = ID;

  // Scope prefix — every selector starts here so non-brunastal themes pass through.
  const P = 'html[data-thm-preset="brunastal"] ';

  // Sidebar logo CSS already lives in patch 230. Patch 246 owns the
  // markup-level swap (handles dynamic re-rendering).

  s.textContent = `
/* ============================================================
   §1 — fonts: Space Mono for numbers/kt/dates/amounts/IDs
   ============================================================ */
${P}.kr,
${P}.price,
${P}.amount,
${P}.kt,
${P}.kennitala,
${P}.date,
${P}.dags,
${P}.mono,
${P}.num,
${P}.numeric,
${P}.tnum,
${P}[class*="kennitala"],
${P}[class*="amount"],
${P}[class*="price"]:not([class*="picker"]),
${P}.dtbl tbody td.num,
${P}.dtbl tbody td.right,
${P}.dtbl tbody td[align="right"],
${P}.dtbl tbody td[style*="text-align:right"],
${P}.dtbl tbody td[style*="text-align: right"],
${P}.sb-badge,
${P}.badge,
${P}.count,
${P}[class*="count"]:not(.fcol-count) {
  font-family: 'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace !important;
  font-variant-numeric: tabular-nums !important;
}

/* ============================================================
   §1 — page background gradient (steel-grey content area)
   ============================================================ */
${P}.view{
  background: linear-gradient(180deg,#060607 0px,#060607 95px,#aeb4be 360px,#9ba1ad 100%) !important;
}

/* ============================================================
   §4 — TABLE RECIPE: .tcard + .dtbl get the sticky/hover/shadow treatment
   This is the #1 visual upgrade the user expects.
   ============================================================ */
${P}.view .tcard{
  border-radius: 16px !important;
  border: 1px solid rgba(20,24,34,.08) !important;
  background: #fff !important;
  box-shadow: 0 10px 28px -16px rgba(25,35,60,.16) !important;
  overflow: hidden !important;
}
${P}.view .tcard > .dtbl,
${P}.view .tcard table.dtbl{
  display: table !important;
  width: 100% !important;
  border-collapse: collapse !important;
  background: #fff !important;
}
${P}.view .dtbl thead{
  position: sticky !important;
  top: 0 !important;
  z-index: 2 !important;
}
${P}.view .dtbl thead th{
  background: #eef1f6 !important;
  color: #5b6573 !important;
  font-size: 10.5px !important;
  font-weight: 700 !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
  text-align: left !important;
  padding: 11px 16px !important;
  border: 0 !important;
  box-shadow: 0 1px 0 rgba(20,24,34,.10) !important;
  white-space: nowrap !important;
}
${P}.view .dtbl tbody td{
  padding: 11px 16px !important;
  border-top: 1px solid #eef1f6 !important;
  color: #11141c !important;
  font-size: 13.5px !important;
  background: transparent !important;
}
${P}.view .dtbl tbody tr{
  transition: background .12s ease !important;
}
${P}.view .dtbl tbody tr:hover td{
  background: #f3f6fc !important;
}
${P}.view .dtbl tbody tr:nth-child(odd) td{
  background: #fbfcfe;
}
${P}.view .dtbl tbody tr:nth-child(odd):hover td{
  background: #f3f6fc !important;
}

/* Non-.tcard tables inside .view content also get the basics (sticky head,
 * hover, mono numerics). Avoid map/calendar/legend internals. */
${P}.view table:not(.dtbl):not(.no-skin){
  border-collapse: collapse !important;
  background: #fff !important;
  border-radius: 14px !important;
  overflow: hidden !important;
}
${P}.view table:not(.dtbl):not(.no-skin) thead th{
  background: #eef1f6 !important;
  color: #5b6573 !important;
  font-size: 10.5px !important;
  font-weight: 700 !important;
  letter-spacing: .08em !important;
  text-transform: uppercase !important;
  padding: 10px 14px !important;
}
${P}.view table:not(.dtbl):not(.no-skin) tbody td{
  padding: 10px 14px !important;
  border-top: 1px solid #eef1f6 !important;
}
${P}.view table:not(.dtbl):not(.no-skin) tbody tr{
  transition: background .12s ease !important;
}
${P}.view table:not(.dtbl):not(.no-skin) tbody tr:hover td{
  background: #f3f6fc !important;
}

/* ============================================================
   §2 — BUTTONS
   A. .btn-outline / .btn-secondary / generic .btn → metallic black
   B. .btn-primary / .btn-brand → accent gradient (patch 230 already does)
   C. .btn-success → dark-metal green
   D. .btn-ghost → light neutral
   ============================================================ */
${P}.view .btn:not(.btn-primary):not(.btn-success):not(.btn-danger):not(.btn-brand):not(.btn-ghost){
  height: 38px !important;
  padding: 0 16px !important;
  border-radius: 11px !important;
  border: 1px solid #0a0b0d !important;
  background: linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%) !important;
  color: #fff !important;
  font-family: 'Space Grotesk', system-ui, sans-serif !important;
  font-weight: 500 !important;
  text-shadow: 0 1px 1px rgba(0,0,0,.5) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.10) !important;
}
${P}.view .btn:not(.btn-primary):not(.btn-success):not(.btn-danger):not(.btn-brand):not(.btn-ghost):hover{
  background: linear-gradient(145deg,#101012 0%,#34343b 26%,#4a4a52 50%,#212126 74%,#0c0c0f 100%) !important;
}
${P}.view .btn-sm:not(.btn-primary):not(.btn-success):not(.btn-danger):not(.btn-brand):not(.btn-ghost){
  height: 32px !important;
  padding: 0 12px !important;
  font-size: 12px !important;
}

${P}.view .btn-success{
  height: 38px !important;
  padding: 0 18px !important;
  border-radius: 12px !important;
  border: 1px solid #156e3a !important;
  background: linear-gradient(150deg,#2bbf6c,#0f6e3a) !important;
  color: #fff !important;
  font-weight: 700 !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.25) !important;
}

${P}.view .btn-ghost{
  height: 38px !important;
  padding: 0 14px !important;
  border-radius: 11px !important;
  border: 1px solid rgba(20,24,34,.14) !important;
  background: #f1f5f9 !important;
  color: #3a4250 !important;
  font-weight: 500 !important;
}
${P}.view .btn-ghost:hover{
  background: #e5ebf3 !important;
}

${P}.view .btn-danger{
  background: linear-gradient(150deg,#d63a3a,#7a1414) !important;
  border: 1px solid #5a0e0e !important;
  color: #fff !important;
  font-weight: 600 !important;
}

/* ============================================================
   §3 — STATUS CHIPS (every status word → soft tinted pill)
   Applies whether the chip uses class names OR data-status OR
   common inline-style green/red backgrounds. Beats both class-based
   and inline backgrounds.
   ============================================================ */
${P}.view .chip,
${P}.view .pill,
${P}.view .status-chip,
${P}.view .status-pill{
  display: inline-block !important;
  padding: 3px 9px !important;
  border-radius: 7px !important;
  font-size: 11.5px !important;
  font-weight: 600 !important;
  line-height: 1.4 !important;
  font-family: 'Space Grotesk', system-ui, sans-serif !important;
  background-image: none !important;
  text-shadow: none !important;
  box-shadow: none !important;
}

/* done / búið / græn / skoðað */
${P}.view .chip.done, ${P}.view .pill.done, ${P}.view .chip.green, ${P}.view .pill.green,
${P}.view .chip.success, ${P}.view .pill.success, ${P}.view [data-status="done"],
${P}.view [data-status="grnn"], ${P}.view .status-green, ${P}.view .badge-success{
  color: #047857 !important;
  background: #ecfdf5 !important;
  border: 1px solid #a7f3d0 !important;
}

/* in-progress / í vinnslu (blue-metal) */
${P}.view .chip.in-progress, ${P}.view .chip.progress, ${P}.view .pill.in-progress,
${P}.view .chip.info, ${P}.view .pill.info, ${P}.view .chip.blue, ${P}.view .pill.blue,
${P}.view [data-status="in-progress"], ${P}.view [data-status="progress"],
${P}.view .status-blue, ${P}.view .badge-info{
  color: #2f5fe0 !important;
  background: #eef3ff !important;
  border: 1px solid #c6d6ff !important;
}

/* pending / á dagskrá / bíður / amber */
${P}.view .chip.pending, ${P}.view .pill.pending, ${P}.view .chip.warning, ${P}.view .pill.warning,
${P}.view .chip.amber, ${P}.view .pill.amber, ${P}.view .chip.orange, ${P}.view .pill.orange,
${P}.view [data-status="pending"], ${P}.view [data-status="warning"],
${P}.view .status-amber, ${P}.view .status-orange, ${P}.view .badge-warning{
  color: #b45309 !important;
  background: #fffbeb !important;
  border: 1px solid #fde68a !important;
}

/* overdue / liðin / forgangur / rauð */
${P}.view .chip.overdue, ${P}.view .pill.overdue, ${P}.view .chip.danger, ${P}.view .pill.danger,
${P}.view .chip.red, ${P}.view .pill.red, ${P}.view .chip.urgent, ${P}.view .pill.urgent,
${P}.view [data-status="overdue"], ${P}.view [data-status="urgent"], ${P}.view [data-status="danger"],
${P}.view .status-red, ${P}.view .badge-danger{
  color: #be123c !important;
  background: #fff1f2 !important;
  border: 1px solid #fecdd3 !important;
}

/* neutral */
${P}.view .chip.neutral, ${P}.view .pill.neutral, ${P}.view .chip.gray, ${P}.view .pill.gray,
${P}.view .chip.muted, ${P}.view .pill.muted, ${P}.view [data-status="neutral"],
${P}.view .status-gray, ${P}.view .badge-neutral{
  color: #64748b !important;
  background: #f1f5f9 !important;
  border: 1px solid #e2e8f0 !important;
}

/* fire / brunakerfi */
${P}.view .chip.fire, ${P}.view .pill.fire, ${P}.view [data-status="fire"]{
  color: #c0241f !important;
  background: #fdecec !important;
  border: 1px solid #f3c6c4 !important;
}

/* samningur (purple) */
${P}.view .chip.contract, ${P}.view .pill.contract, ${P}.view .chip.purple, ${P}.view .pill.purple,
${P}.view [data-status="contract"]{
  color: #6d28d9 !important;
  background: #f5f3ff !important;
  border: 1px solid #ddd6fe !important;
}

/* ============================================================
   §5 — STAT CARDS / KPI tiles. Patch markup often uses .stat,
   .kpi, .stat-card, .tile, .kpi-tile, .summary-card.
   ============================================================ */
${P}.view .stat,
${P}.view .kpi,
${P}.view .stat-card,
${P}.view .kpi-tile,
${P}.view .kpi-card,
${P}.view .summary-card,
${P}.view .tile{
  border: 1px solid rgba(20,24,34,.08) !important;
  border-radius: 14px !important;
  background: #fff !important;
  box-shadow: 0 8px 22px -16px rgba(25,35,60,.18) !important;
  padding: 16px 18px !important;
}
${P}.view .stat-label,
${P}.view .kpi-label,
${P}.view .stat .label,
${P}.view .kpi .label{
  font-size: 10.5px !important;
  font-weight: 700 !important;
  letter-spacing: .14em !important;
  color: #8a93a5 !important;
  text-transform: uppercase !important;
  font-family: 'Space Grotesk', system-ui, sans-serif !important;
}
${P}.view .stat-value,
${P}.view .kpi-value,
${P}.view .stat .value,
${P}.view .kpi .value{
  font-family: 'Space Mono', ui-monospace, monospace !important;
  font-size: 30px !important;
  font-weight: 700 !important;
  color: #11141c !important;
  margin-top: 4px !important;
}
${P}.view .stat-sub,
${P}.view .kpi-sub,
${P}.view .stat .sub,
${P}.view .kpi .sub{
  font-size: 11.5px !important;
  color: #9098a6 !important;
  margin-top: 3px !important;
}

/* ============================================================
   §1 — CARDS / SURFACES outside the table primitive
   Catch .card, .panel, .section, .surface, .box used by patches
   ============================================================ */
${P}.view .card,
${P}.view .panel,
${P}.view .section-card,
${P}.view .surface,
${P}.view .box-card,
${P}.view .info-card,
${P}.view .data-card{
  border-radius: 16px !important;
  border: 1px solid rgba(20,24,34,.08) !important;
  background: #fff !important;
  box-shadow: 0 10px 28px -16px rgba(25,35,60,.16) !important;
  color: #11141c !important;
}

/* ============================================================
   §1 — INPUTS (text/search/number/email/tel/date + textarea/select)
   White inside cards, soft outline, accent focus ring.
   ============================================================ */
${P}.view input[type="text"],
${P}.view input[type="search"],
${P}.view input[type="number"],
${P}.view input[type="email"],
${P}.view input[type="tel"],
${P}.view input[type="date"],
${P}.view input[type="password"],
${P}.view textarea,
${P}.view select,
${P}.view .fi{
  height: 42px !important;
  padding: 0 14px !important;
  border-radius: 11px !important;
  border: 1px solid rgba(20,24,34,.12) !important;
  background: #fff !important;
  color: #141822 !important;
  font-family: 'Space Grotesk', system-ui, sans-serif !important;
  font-size: 14px !important;
}
${P}.view textarea,
${P}.view textarea.fi{
  height: auto !important;
  min-height: 80px !important;
  padding: 10px 14px !important;
}
${P}.view input:focus,
${P}.view textarea:focus,
${P}.view select:focus,
${P}.view .fi:focus{
  outline: none !important;
  border-color: var(--bstal-accent,#e23232) !important;
  box-shadow: 0 0 0 3px rgba(220,40,34,.18) !important;
}
${P}.view .fl{
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: .08em !important;
  color: #5b6573 !important;
  text-transform: uppercase !important;
}

/* ============================================================
   §7 — Empty states (centered muted in dashed box)
   ============================================================ */
${P}.view .empty-state{
  background: #fff !important;
  border: 1px dashed rgba(20,24,34,.16) !important;
  border-radius: 14px !important;
  color: #5b6573 !important;
  padding: 48px 24px !important;
}
${P}.view .empty-state .es-icon{
  font-size: 32px !important;
  opacity: .55 !important;
}
${P}.view .empty-state .es-title{
  color: #11141c !important;
  font-weight: 700 !important;
  font-size: 16px !important;
  margin-top: 8px !important;
}
${P}.view .empty-state .es-sub{
  color: #8a93a5 !important;
  font-size: 13px !important;
}

/* ============================================================
   Page titles on the dark band (above content) — white + mono sub
   The .view top h1 sits over the page-gradient's black band.
   ============================================================ */
${P}.view > .main-panel > h1:first-child,
${P}.view > h1:first-child,
${P}.view > .main-panel > div > h1:first-child{
  color: #fff !important;
  font-size: 28px !important;
  font-weight: 700 !important;
  letter-spacing: -.01em !important;
  text-shadow: 0 2px 8px rgba(0,0,0,.55) !important;
  font-family: 'Space Grotesk', system-ui, sans-serif !important;
}

/* ============================================================
   Modal dialogs — soft shadow + 16px radius
   ============================================================ */
${P}.modal,
${P}.modal-content{
  border-radius: 16px !important;
  background: #fff !important;
  box-shadow: 0 30px 60px -20px rgba(0,0,0,.4), 0 12px 22px -10px rgba(25,35,60,.20) !important;
  color: #11141c !important;
  border: 1px solid rgba(20,24,34,.10) !important;
}
${P}.modal .modal-hd,
${P}.modal-hd{
  background: linear-gradient(180deg,#fbfcfe,#eef1f6) !important;
  border-bottom: 1px solid rgba(20,24,34,.08) !important;
  padding: 14px 18px !important;
  border-radius: 16px 16px 0 0 !important;
}
${P}.modal .modal-hd h2,
${P}.modal-hd h2{
  color: #11141c !important;
  font-family: 'Space Grotesk', system-ui, sans-serif !important;
  font-size: 17px !important;
  font-weight: 700 !important;
}
${P}.modal .modal-ft,
${P}.modal-ft{
  background: #fbfcfe !important;
  border-top: 1px solid rgba(20,24,34,.08) !important;
  border-radius: 0 0 16px 16px !important;
}

/* ============================================================
   Section labels (.sec-label, .nav-section-label inside content)
   ============================================================ */
${P}.view .sec-label{
  font-size: 10.5px !important;
  font-weight: 700 !important;
  letter-spacing: .14em !important;
  color: #5b6573 !important;
  text-transform: uppercase !important;
}

/* ============================================================
   sb-badge / badge / count pills — already unified by patch 241,
   but force the mono font here too for tabular alignment.
   ============================================================ */
${P}.view-nav .vnav-btn .sb-badge,
${P}.view-nav .vnav-btn .badge,
${P}.view-nav .vnav-btn .count{
  font-family: 'Space Mono', ui-monospace, monospace !important;
}

/* ============================================================
   Tabs / toolbar filter chips — light gradient inactive,
   metallic-black active (per spec §3 toolbar chips).
   ============================================================ */
${P}.view .filter-chip,
${P}.view .tab-chip,
${P}.view .toolbar-chip,
${P}.view .chip-filter{
  height: 32px !important;
  padding: 0 12px !important;
  border-radius: 9px !important;
  background: linear-gradient(180deg,#fdfdfe,#e3e7ee) !important;
  border: 1px solid rgba(20,24,34,.14) !important;
  color: #3a4250 !important;
  font-size: 12.5px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
}
${P}.view .filter-chip.active,
${P}.view .tab-chip.active,
${P}.view .toolbar-chip.active,
${P}.view .chip-filter.active{
  background: linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%) !important;
  border-color: #0a0b0d !important;
  color: #fff !important;
  text-shadow: 0 1px 1px rgba(0,0,0,.5) !important;
}
`;
  document.head.appendChild(s);
})();
/* === END BRUNASTAL CONTENT SKIN === */
