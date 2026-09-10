/* ================================================================
   RENTLY SHARED RUNTIME
   Icon set, duotone "photography" placeholders, mock data, and the
   handful of interaction patterns (reveal-on-scroll, nav state,
   date-range picker, avatar menu) reused across every screen.
   ================================================================ */

/* ---------------- ICONS (feather-style outline, 24x24 viewBox) ---------------- */
const ICONS = {
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  pin:'<path d="M12 22s8-7.5 8-13a8 8 0 1 0-16 0c0 5.5 8 13 8 13z"/><circle cx="12" cy="9" r="2.5"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
  star:'<path d="M12 2l3 6 6 .9-4.5 4.3 1 6.3-5.5-3-5.5 3 1-6.3L3 8.9 9 8z"/>',
  check:'<path d="M20 6L9 17l-5-5"/>',
  close:'<path d="M18 6L6 18M6 6l12 12"/>',
  chevronLeft:'<path d="M15 18l-6-6 6-6"/>',
  chevronRight:'<path d="M9 18l6-6-6-6"/>',
  chevronDown:'<path d="M6 9l6 6 6-6"/>',
  arrowUpRight:'<path d="M7 17L17 7M7 7h10v10"/>',
  arrowRight:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v11h14V10"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  message:'<path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"/>',
  bell:'<path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 8.96 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.96a1.7 1.7 0 0 0-.34-1.87l-.06-.06A2 2 0 1 1 7.13 4.2l.06.06A1.7 1.7 0 0 0 9.06 4.6a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 17v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  camera:'<path d="M4 8a2 2 0 0 1 2-2h1.2l1-2h7.6l1 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.6"/>',
  shield:'<path d="M12 2l8 3.5v6c0 5-3.4 8.7-8 10.5-4.6-1.8-8-5.5-8-10.5v-6z"/>',
  card:'<rect x="2" y="5" width="20" height="15" rx="2.5"/><path d="M2 10h20"/>',
  wallet:'<path d="M20 7H6a3 3 0 0 0 0 6h13a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z"/><path d="M20 13v4a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h11"/><circle cx="16.2" cy="10" r="1"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  filter:'<path d="M4 5h16M7 12h10M10 19h4"/>',
  map:'<path d="M9 19l-6 2V6l6-2 6 2 6-2v15l-6 2-6-2z"/><path d="M9 4v15M15 6v15"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  minus:'<path d="M5 12h14"/>',
  trash:'<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  download:'<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 19h16"/>',
  share:'<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.6l7.4-4.2M8.3 13.4l7.4 4.2"/>',
  more:'<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  lock:'<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  mail:'<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M3 6.5l9 6.5 9-6.5"/>',
  phone:'<path d="M4 4h4l2 5-2.5 1.5a12 12 0 0 0 6 6L15 14l5 2v4a2 2 0 0 1-2 2C9.6 22 2 14.4 2 6a2 2 0 0 1 2-2z"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5.5-5.5L4 21"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  alert:'<path d="M12 2 1 21h22z"/><path d="M12 9v5M12 17h.01"/>',
  building:'<path d="M4 21V6l8-3 8 3v15"/><path d="M9 21v-5h6v5M9 9h.01M15 9h.01M9 13h.01M15 13h.01"/>',
  truck:'<path d="M2 15l1-6a2 2 0 0 1 2-2h6v9"/><path d="M11 8h5l4 4v4h-9z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  tool:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2z"/>',
  music:'<circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 18V5l12-2v13"/>',
  shirt:'<path d="M8 3l4 2 4-2 4 4-3 3v11H7V10L4 7z"/>',
  video:'<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3z"/>',
  ellipse:'<path d="M20 6L9 17l-5-5"/>',
};
function icon(name,{size=18,stroke=2,fill=false,cls=''}={}){
  const d=ICONS[name]||ICONS.info;
  return `<svg class="icon ${cls}" style="width:${size}px;height:${size}px" viewBox="0 0 24 24" fill="${fill?'currentColor':'none'}" stroke="${fill?'none':'currentColor'}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}
function starIcon(size=13){return icon('star',{size,fill:true,cls:'star-fill'});}

/* ---------------- DUOTONE "photography" (no stock images, consistent hand) ---------------- */
const DUOTONE = {
  event:      ['#C97B4A','#EFD9BE'],
  vehicle:    ['#151A22','#5B6B82'],
  realestate: ['#41523F','#CBD3B9'],
  tools:      ['#7A4A1E','#E3AE5C'],
  av:         ['#26262A','#7C7C84'],
  music:      ['#3B2A52','#9A7FC2'],
  clothing:   ['#7A2E42','#E8A9B8'],
  provider:   ['#1B2B29','#5C9E8C'],
  spaces:     ['#2E3A52','#9BAAC9'],
  boats:      ['#0E3A4A','#6FB3C4'],
  sports:     ['#3E1F0F','#D98A4C'],
  hero:       ['#20242B','#7D8A9E'],
};
const SIL = {
  event: ICONS.calendar.replace(/<rect[^>]*x="3"[^>]*\/>/,'')+'<path d="M12 3l9 8h-4v10H7V11H3z"/>',
  vehicle: ICONS.truck,
  realestate: ICONS.building,
  tools: ICONS.tool,
  av: ICONS.video,
  music: ICONS.music,
  clothing: ICONS.shirt,
  provider: ICONS.check,
  spaces: ICONS.home,
  boats:'<path d="M2 18l2-8h16l2 8"/><path d="M6 10V4h8l2 6"/><path d="M2 18c2 2 4 2 6 0s4-2 6 0 4 2 6 0"/>',
  sports:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18"/>',
  hero: ICONS.image,
};
/* Real photography, sourced free-license from Unsplash, one representative
   shot per category — living under assets/images/. Categories without a
   sourced photo fall back to the duotone mark so nothing ever renders blank. */
const PHOTOS = new Set([
  'event','vehicle','realestate','tools','av','music','clothing','sports','boats','spaces','provider','hero',
  // per-listing overrides — used instead of the category photo wherever a
  // listing's actual item would otherwise look wrong next to its category
  // mates (e.g. a pickup truck showing the same photo as a supercar).
  'tractor','generator','welding','pickup','cargovan','shuttlebus','sedan','plasticchairs','projector','cinemacamera','piano','weddingdecor',
]);
function hasPhoto(key){ return PHOTOS.has(key); }
function photoTag(key,{position='50% 50%',zoom=1}={}){
  return `<img src="assets/images/${key}.jpg" alt="" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${position};transform:scale(${zoom});">`;
}
function artStyle(key){
  const c=DUOTONE[key]||DUOTONE.hero;
  return `background:linear-gradient(155deg,${c[0]} 0%,${c[1]} 100%);`;
}
function artHTML(key,iconSize=90,opacity=.2){
  if(hasPhoto(key)) return photoTag(key);
  const path=SIL[key]||SIL.hero;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"
    style="position:absolute;width:${iconSize}%;height:${iconSize}%;top:50%;left:58%;transform:translate(-50%,-50%) rotate(-8deg);opacity:${opacity}">${path}</svg>`;
}
function paintArt(el,key,iconSize=120,opacity=.2){
  if(!el) return;
  el.style.cssText+=artStyle(key);
  el.innerHTML=artHTML(key,iconSize,opacity);
}
function artDiv(key,iconSize=100,opacity=.18){
  return `<div class="art" style="${artStyle(key)}">${artHTML(key,iconSize,opacity)}</div>`;
}

/* ---------------- FORMAT HELPERS ---------------- */
function money(n){return '₦'+Math.round(n).toLocaleString('en-NG');}
function initials(name){return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();}

/* ---------------- BAR CHART ----------------
   Plain CSS bars via template-string injection — same convention as
   rcard()/renderStageTimeline(). Callers pre-aggregate their own data
   (dashboard Reports views reduce data they've already fetched); this
   only draws. No canvas/SVG/chart library — keeps the "no build step"
   footprint at zero. */
function renderBarChart(container, dataPoints, opts = {}) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return;
  const { formatValue = (v) => v, color = 'var(--blue)', horizontal = false, maxBars = 12 } = opts;
  const points = dataPoints.slice(0, maxBars);
  if (!points.length) {
    el.className = '';
    el.innerHTML = '<p style="color:var(--ink-faint);font-size:13px;">Not enough data yet.</p>';
    return;
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  if (horizontal) {
    el.className = 'chart-bars horizontal';
    el.innerHTML = points.map((p) => `
      <div class="chart-bar-row">
        <div class="chart-bar-lbl">${p.label}</div>
        <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${Math.max(Math.round((p.value / max) * 100), 2)}%;background:${color};"></div></div>
        <div class="chart-bar-val">${formatValue(p.value)}</div>
      </div>
    `).join('');
  } else {
    el.className = 'chart-bars';
    el.innerHTML = points.map((p) => `
      <div class="chart-bar-col">
        <div class="chart-bar-val">${formatValue(p.value)}</div>
        <div class="chart-bar-track"><div class="chart-bar-fill" style="height:${Math.max(Math.round((p.value / max) * 100), 2)}%;background:${color};"></div></div>
        <div class="chart-bar-lbl">${p.label}</div>
      </div>
    `).join('');
  }
}

/* ---------------- LINE / TREND CHART ----------------
   For "over time" analytics (bookings, spend) alongside renderBarChart's
   categorical comparisons — a single hue per series, 2px line, gradient
   area fill, and a hover crosshair+tooltip that snaps to the nearest
   point (see dataviz skill: ship the hover layer by default, never a
   second y-axis). Plain inline SVG, no chart library. */
function renderLineChart(container, dataPoints, opts = {}) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return;
  const { formatValue = (v) => v, color = 'var(--blue)', height = 180 } = opts;
  if (!dataPoints.length) {
    el.className = '';
    el.innerHTML = '<div class="lc-empty">Not enough data yet.</div>';
    return;
  }
  const w = 600, h = height, padX = 6, padY = 14;
  const max = Math.max(...dataPoints.map((p) => p.value), 1);
  const stepX = dataPoints.length > 1 ? (w - padX * 2) / (dataPoints.length - 1) : 0;
  const points = dataPoints.map((p, i) => ({
    ...p,
    x: dataPoints.length > 1 ? padX + i * stepX : w / 2,
    y: h - padY - (p.value / max) * (h - padY * 2),
  }));
  const linePath = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${h - padY} L${points[0].x.toFixed(1)},${h - padY} Z`;
  const gradId = 'lg' + Math.random().toString(36).slice(2, 9);

  el.className = 'line-chart-wrap';
  el.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px;display:block;">
      <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.24"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${areaPath}" fill="url(#${gradId})" stroke="none"/>
      <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${color}"/>`).join('')}
      <circle class="lc-hover-dot" r="5" fill="${color}" stroke="#fff" stroke-width="2" style="opacity:0;"/>
      <line class="lc-crosshair" y1="0" y2="${h - padY}" stroke="var(--line-strong)" stroke-width="1" style="opacity:0;"/>
      <rect class="lc-capture" x="0" y="0" width="${w}" height="${h}" fill="transparent" style="cursor:crosshair;"/>
    </svg>
    <div class="lc-tooltip" style="display:none;"></div>
    <div class="lc-labels">${points.map((p) => `<span>${p.label}</span>`).join('')}</div>
  `;

  const svg = el.querySelector('svg');
  const tooltip = el.querySelector('.lc-tooltip');
  const hoverDot = el.querySelector('.lc-hover-dot');
  const crosshair = el.querySelector('.lc-crosshair');
  const capture = el.querySelector('.lc-capture');
  function showAt(clientX) {
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * w;
    let nearest = 0, nearestDist = Infinity;
    points.forEach((p, i) => { const d = Math.abs(p.x - relX); if (d < nearestDist) { nearestDist = d; nearest = i; } });
    const p = points[nearest];
    hoverDot.setAttribute('cx', p.x); hoverDot.setAttribute('cy', p.y); hoverDot.style.opacity = '1';
    crosshair.setAttribute('x1', p.x); crosshair.setAttribute('x2', p.x); crosshair.style.opacity = '1';
    tooltip.style.display = 'block';
    tooltip.innerHTML = `<b>${formatValue(p.value)}</b><span>${p.label}</span>`;
    tooltip.style.left = (p.x / w) * 100 + '%';
    tooltip.style.top = (p.y / h) * 100 + '%';
  }
  capture.addEventListener('mousemove', (e) => showAt(e.clientX));
  capture.addEventListener('touchstart', (e) => { if (e.touches[0]) showAt(e.touches[0].clientX); }, { passive: true });
  capture.addEventListener('mouseleave', () => { hoverDot.style.opacity = '0'; crosshair.style.opacity = '0'; tooltip.style.display = 'none'; });
  // Land on the most recent point by default so the headline number is visible without a hover.
  showAt(svg.getBoundingClientRect().left + svg.getBoundingClientRect().width);
}

/* ---------------- KPI / STAT CARD ----------------
   `accent` picks the icon-chip color (green/blue/amber/red, matching the
   role palette in rently.css); pass `delta` (see setKpiDelta) once the
   caller can compute a real trailing-period comparison — never a
   fabricated one, so most cards simply omit it. */
function kpiCard(id, label, opts = {}) {
  const { icon: iconName, accent } = opts;
  return `<div class="kpi ${accent ? 'accent-' + accent : ''}">
    ${iconName ? `<div class="ic">${icon(iconName, { size: 16 })}</div>` : ''}
    <div class="lbl">${label}</div>
    <div class="val" id="${id}">—</div>
    <div class="delta" id="${id}Delta"></div>
  </div>`;
}
/** deltaPct: signed % change vs. the prior period; null/undefined/non-finite hides the row (e.g. no prior-period data to compare against). */
function setKpiDelta(id, deltaPct, opts = {}) {
  const el = document.getElementById(id + 'Delta');
  if (!el) return;
  if (deltaPct === null || deltaPct === undefined || !isFinite(deltaPct)) { el.style.display = 'none'; return; }
  const up = deltaPct >= 0;
  const suffix = opts.suffix || 'vs last month';
  el.className = 'delta ' + (up ? 'up' : 'down');
  el.innerHTML = icon('arrowUpRight', { size: 11, cls: up ? '' : 'rot-down' }) + ` ${up ? '+' : ''}${Math.round(deltaPct)}% ${suffix}`;
  el.style.display = 'flex';
}

/* ---------------- CONVERSATION INBOX ----------------
   Messaging is booking-scoped (there's no "list my conversations"
   endpoint — see MessagingModule), so an inbox is built client-side by
   checking each booking's own thread. `bookings` is
   [{id, title, otherPartyName}]; only bookings with at least one real
   message become a row — an empty thread never existed as far as either
   party is concerned, so it doesn't clutter the inbox. */
async function loadConversations(bookings, myUserId){
  const results = await Promise.all(bookings.map(async (b)=>{
    try{
      const {data} = await apiFetch(`/bookings/${b.id}/messages`);
      const messages = data.data || data || [];
      if(!messages.length) return null;
      const last = messages[messages.length-1];
      const unreadCount = messages.filter(m=>m.senderId!==myUserId && !m.readAt).length;
      return {bookingId:b.id, title:b.title, otherPartyName:b.otherPartyName, lastMessage:last.body, lastSenderIsMe:last.senderId===myUserId, lastMessageAt:last.createdAt, unreadCount};
    }catch(e){ return null; }
  }));
  return results.filter(Boolean).sort((a,b)=>new Date(b.lastMessageAt)-new Date(a.lastMessageAt));
}
function renderConversationList(containerId, conversations, emptyText){
  const el = document.getElementById(containerId);
  if(!el) return;
  if(!conversations.length){
    el.innerHTML = `<div class="empty-state"><div class="ic">${icon('message',{size:22})}</div><h3>No messages yet</h3><p>${emptyText}</p></div>`;
    return;
  }
  el.innerHTML = conversations.map(c=>`
    <a class="msg-row" href="booking?id=${c.bookingId}&thread=1">
      <div class="${c.unreadCount?'unread-dot':'unread-spacer'}"></div>
      <div class="p-avatar">${initials(c.otherPartyName)}</div>
      <div style="flex:1;min-width:0;">
        <div class="m-title">${c.title}${c.unreadCount?` <span class="badge info">${c.unreadCount} new</span>`:''}</div>
        <div class="m-prev">${c.lastSenderIsMe?'You: ':''}${c.lastMessage.replace(/</g,'&lt;')}</div>
      </div>
      <div class="m-time">${timeAgo(c.lastMessageAt)}</div>
    </a>
  `).join('');
}

/* ---------------- UI CONSTANTS ----------------
   Everything that used to live here as fabricated demo data (fake
   categories/providers/listings/bookings/admin stats/current-user) has been
   removed -- every one of those was fully superseded by real API data
   (GET /categories, /listings, /bookings, /admin/*) and, per a repo-wide
   reference check, was no longer read by any page. What is left below is
   genuinely used, non-fabricated UI content: an icon lookup and static,
   honestly-labeled search suggestions/locations (not personalized history
   or "trending now" claims -- see homepage.html/browse.html for how these
   are presented). */
const CATEGORY_ICON={event:'calendar',vehicle:'truck',realestate:'building',tools:'tool',av:'video',music:'music',clothing:'shirt',sports:'star',boats:'map',spaces:'grid'};

const POPULAR_SEARCHES=['Generator','Plastic chairs','Canopy & chairs','Sound system','Wedding decoration','Bouncy castle'];
const LOCATIONS=[['Lekki Phase 1','Lagos'],['Victoria Island','Lagos'],['Ikeja','Lagos'],['Ajah','Lagos'],['Yaba','Lagos'],['Banana Island','Lagos'],['Wuse II','Abuja'],['Garki','Abuja'],['Maitama','Abuja'],['GRA','Port Harcourt'],['Trans Amadi','Port Harcourt'],['Bodija','Ibadan'],['Ring Road','Ibadan'],['Sabon Gari','Kano'],['Independence Layout','Enugu'],['GRA','Benin City'],['Oke-Ilewo','Abeokuta']];

/* ---------------- LISTING CARD RENDERER (shared) ---------------- */
function rcard(l,feature=false,opts={}){
  const href=opts.href!==undefined?opts.href:`listing?id=${l.id}`;
  return `<a class="rcard ${feature?'feature':''}" href="${href}">
    <div class="rcard-media">
      ${artDiv(l.img||l.cat,feature?90:100,.18)}
      <div class="rcard-top">
        <div class="badge-row">${l.verified?`<div class="badge float verified">${icon('check',{size:11,stroke:2.6})}Verified</div>`:''}${l.mode==='instant'?`<div class="badge float instant">${icon('check',{size:11,stroke:2.6})}Instant Book</div>`:''}${l.availability==='limited'?`<div class="badge float request">${icon('alert',{size:11,stroke:2.6})}Few left</div>`:''}</div>
        <div class="fav-btn" onclick="event.preventDefault();event.stopPropagation();this.classList.toggle('on')">${icon('heart',{size:15})}</div>
      </div>
    </div>
    <div class="rcard-body">
      <div class="rcard-row1">
        <div class="rcard-title">${l.title}</div>
        <div class="rrating">${starIcon(13)}${l.rating}</div>
      </div>
      <div class="rcard-meta">${icon('pin',{size:12})}${l.loc} · ${l.catName}</div>
      <div class="rcard-foot">
        <div class="provider-mini"><div class="p-avatar">${l.pAvatar}</div><div class="p-name">${l.provider}</div></div>
        <div class="rprice">${money(l.price)}<span>/${l.unit}</span></div>
      </div>
    </div>
  </a>`;
}

/* ================================================================
   BOOKING LIFECYCLE — the 12-stage timeline every booking moves
   through, from request to closed-out deposit. Shared by the booking
   tracking page and, in summary form, by the provider/renter
   dashboards.
   ================================================================ */
const STAGES=[
  {key:'requested',label:'Booking Requested',desc:'Your request was sent to the provider.',offsetDays:-5},
  {key:'accepted',label:'Provider Accepted',desc:'The provider approved your request.',offsetDays:-4.7},
  {key:'payment',label:'Payment Completed',desc:'Your payment was captured and held in escrow.',offsetDays:-4.6},
  {key:'reserved',label:'Item Reserved',desc:'This item is blocked out on the provider\'s calendar for your dates.',offsetDays:-4.5},
  {key:'ready',label:'Ready for Pickup',desc:'The provider has prepared the item for handover.',offsetDays:-0.15},
  {key:'pickedup',label:'Picked Up',desc:'Handover confirmed — your rental period has started.',offsetDays:0},
  {key:'active',label:'Rental Active',desc:'You have the item. Extensions and support are available below.',offsetDays:0.1},
  {key:'returnsched',label:'Return Scheduled',desc:'A return appointment has been arranged with the provider.',offsetFromEnd:-0.3},
  {key:'returned',label:'Returned',desc:'The item was handed back to the provider.',offsetFromEnd:0},
  {key:'inspected',label:'Inspection Completed',desc:'The provider checked the item against the pickup condition report.',offsetFromEnd:0.25},
  {key:'depositreleased',label:'Deposit Released',desc:'Your security deposit has been refunded.',offsetFromEnd:0.9},
  {key:'completed',label:'Completed',desc:'This booking is closed. Thank you for renting with Rently.',offsetFromEnd:1.1},
];
function stageIdx(key){ return STAGES.findIndex(s=>s.key===key); }
function stageDate(booking,stage){
  const from=new Date(booking.dateFrom+'T10:00:00');
  const to=new Date(booking.dateTo+'T17:00:00');
  return stage.offsetDays!==undefined
    ? new Date(from.getTime()+stage.offsetDays*86400000)
    : new Date(to.getTime()+stage.offsetFromEnd*86400000);
}
function fmtStageTime(d){
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' · '+d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
}
function renderStageTimeline(booking,currentKey,history){
  const curIdx=stageIdx(currentKey);
  // `history` (real BookingStatusHistory rows, {toStage,createdAt}) takes
  // priority when provided — real transition timestamps instead of the
  // synthetic offset math `stageDate()` was built for the mock prototype.
  const timeFor=(s)=>{
    if(history){
      const row=history.find(h=>h.toStage===s.key);
      return row ? fmtStageTime(new Date(row.createdAt)) : '';
    }
    return fmtStageTime(stageDate(booking,s));
  };
  return STAGES.map((s,i)=>{
    const state = i<curIdx?'done':(i===curIdx?'active':'upcoming');
    const time = i<=curIdx ? timeFor(s) : '';
    const circ = state==='done' ? icon('check',{size:12,stroke:3}) : (i+1);
    const line = i<STAGES.length-1 ? `<div class="tl-line ${i<curIdx?'done':''}"></div>` : '';
    return `<div class="tl-item ${state}">
      <div class="tl-marker"><div class="tl-circ">${circ}</div>${line}</div>
      <div class="tl-body">
        <div class="tl-label">${s.label}</div>
        <div class="tl-time ${time?'':'muted'}">${time||'—'}</div>
        <div class="tl-desc">${s.desc}</div>
      </div>
    </div>`;
  }).join('');
}

/* ---------------- REVEAL ON SCROLL ---------------- */
function initReveal(){
  const io=new IntersectionObserver((entries)=>{
    entries.forEach(en=>{ if(en.isIntersecting){en.target.classList.add('in'); io.unobserve(en.target);} });
  },{threshold:.15});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
}

/* ---------------- MARKETING NAV: solid-on-scroll + mini search reveal ---------------- */
function initMarketingNav(){
  const nav=document.getElementById('nav');
  if(!nav) return;
  const navMini=document.getElementById('navSearchMini');
  window.addEventListener('scroll',()=>{
    const y=window.scrollY;
    if(y>window.innerHeight*0.75){nav.classList.add('solid');nav.classList.remove('on-dark');}
    else{nav.classList.remove('solid');if(nav.dataset.onDark!=='false')nav.classList.add('on-dark');}
    if(navMini){ if(y>window.innerHeight*0.6){navMini.classList.add('show');} else {navMini.classList.remove('show');} }
  });
  if(navMini) navMini.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
}

/* ---------------- SEARCH SEG ACCESSIBILITY (homepage/browse "what/where/when" triggers) ----------------
   These are plain divs (not <button>/<select>) so the search pill's visual
   design — pill-shaped segments sharing one continuous background rather
   than three separate button chrome — didn't have to change; this adds
   the keyboard/screen-reader semantics a real control would carry for free.
   toggleSeg()/closePanels() are page-local (homepage.html and browse.html
   each define their own), so this only owns the parts common to both:
   role/tabindex/aria-haspopup up front, and Enter/Space activating the
   same click each page's own toggleSeg() already handles. */
function initAccessibleSearchSegs(){
  document.querySelectorAll('.seg[data-panel]').forEach(seg=>{
    seg.setAttribute('role','button');
    seg.setAttribute('tabindex','0');
    seg.setAttribute('aria-haspopup','true');
    seg.setAttribute('aria-expanded','false');
    seg.addEventListener('keydown',(e)=>{
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); seg.click(); }
    });
  });
}
/** Call after any code that adds/removes .seg's "active" class, so aria-expanded stays truthful for screen readers. */
function syncSearchSegAria(){
  document.querySelectorAll('.seg[data-panel]').forEach(seg=>{
    seg.setAttribute('aria-expanded', seg.classList.contains('active') ? 'true' : 'false');
  });
}

/* ---------------- FOOTER COPYRIGHT YEAR ---------------- */
function setCopyrightYear(elId){
  const el=document.getElementById(elId);
  if(el) el.textContent = el.textContent.replace(/\d{4}/, new Date().getFullYear());
}

/* ---------------- SWITCH TO PROVIDER (first-time onboarding gate) ----------------
   Every account already carries the `renter` role from signup (see
   AuthService.signup()), so "Switch to Renter" is always just a plain nav
   link — nothing to create. Going the other way needs a real
   ProviderProfile row first; the *first* time this happens for a given
   user, this shows a small modal to collect the profile info the backend
   actually models (CreateProviderProfileDto: businessName,
   businessRegistrationNo) instead of silently POSTing an empty body and
   leaving it blank forever (profile editing isn't wired up yet, so a
   blank business name had no way to ever get fixed). Once the `provider`
   role exists, every subsequent click is just a normal link — the modal
   never has to be repeated, since ProviderProfileService.createProfile()
   returns the existing profile unchanged for a user who already has one.
   Requires the page to include #becomeProviderOverlay (see
   dashboard-renter.html for the reference markup) and a `session` var. */
function initProviderSwitchLinks(ids, session){
  const overlay=document.getElementById('becomeProviderOverlay');
  if(!overlay || !session) return; // no session means requireSession() already kicked off a redirect to auth — nothing to wire up
  function openModal(){ document.getElementById('becomeProviderError').style.display='none'; overlay.classList.add('open'); }
  function closeModal(){ overlay.classList.remove('open'); }
  document.getElementById('closeBecomeProvider').addEventListener('click',closeModal);
  overlay.addEventListener('click',(e)=>{ if(e.target===overlay) closeModal(); });
  ids.forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.addEventListener('click',(e)=>{
      if(session.user.roles.includes('provider')) return; // already switched before — plain link navigation is fine
      e.preventDefault();
      openModal();
    });
  });
  document.getElementById('submitBecomeProviderBtn').addEventListener('click', async ()=>{
    const errEl=document.getElementById('becomeProviderError'); errEl.style.display='none';
    const businessName=document.getElementById('bpBusinessName').value.trim();
    const businessRegistrationNo=document.getElementById('bpRegNo').value.trim();
    const btn=document.getElementById('submitBecomeProviderBtn');
    btn.disabled=true; const original=btn.textContent; btn.textContent='Setting up…';
    try{
      await apiFetch('/providers/profile',{method:'POST',body:{
        businessName: businessName||undefined,
        businessRegistrationNo: businessRegistrationNo||undefined,
      }});
      await refreshSession();
      window.location.href='dashboard-provider';
    }catch(err){
      errEl.innerHTML=icon('alert',{size:15})+`<div>${apiErrorMessage(err)}</div>`; errEl.style.display='flex';
      btn.disabled=false; btn.textContent=original;
    }
  });
}

/* ---------------- AVATAR DROPDOWN (app nav) ---------------- */
function initAvatarMenu(btnId='avatarBtn',ddId='avatarDropdown'){
  const btn=document.getElementById(btnId), dd=document.getElementById(ddId);
  if(!btn||!dd) return;
  btn.addEventListener('click',(e)=>{e.stopPropagation();dd.classList.toggle('open');});
  document.addEventListener('click',(e)=>{ if(!e.target.closest(`#${ddId}`) && !e.target.closest(`#${btnId}`)) dd.classList.remove('open'); });
}

/* ---------------- NOTIFICATION CENTER (bell dropdown, app nav) ----------------
   Backed by the real GET /notifications, POST /notifications/:id/read and
   POST /notifications/read-all endpoints. The API stores structured
   {type, payload} rows, not pre-rendered text, so NOTIF_COPY mirrors (in
   miniature) the subject/body judgment calls the backend's own
   DomainEventsListener makes for emails — same event vocabulary, rendered
   for the bell instead of an inbox. */
const NOTIF_ICON={
  booking_created:'calendar', booking_approved:'check', booking_declined:'close', booking_cancelled:'close',
  booking_handed_over:'check', booking_returned:'check', booking_deposit_released:'wallet', booking_disputed:'alert',
  booking_extension_requested:'clock', booking_extension_resolved:'clock', provider_verified:'shield',
  provider_rejected:'alert', listing_approved:'check', listing_rejected:'alert',
  verification_document_reviewed:'shield', message_received:'message',
};
const NOTIF_TONE={
  booking_declined:'danger', booking_cancelled:'danger', booking_disputed:'danger', provider_rejected:'danger', listing_rejected:'danger',
  booking_extension_requested:'warning', verification_document_reviewed:'warning',
};
const NOTIF_COPY={
  booking_created:p=>`New booking request for "${p.listingTitle}".`,
  booking_approved:p=>`Your booking for "${p.listingTitle}" was approved.`,
  booking_declined:p=>`Your request for "${p.listingTitle}" was declined.${p.reason?' Reason: '+p.reason:''}`,
  booking_cancelled:p=>`The booking for "${p.listingTitle}" was cancelled.${p.reason?' Reason: '+p.reason:''}`,
  booking_handed_over:p=>`Handover confirmed for "${p.listingTitle}".`,
  booking_returned:p=>`"${p.listingTitle}" has been returned.`,
  booking_deposit_released:p=>`Your deposit for "${p.listingTitle}" was released.`,
  booking_disputed:p=>p.finalDeductionMinor!==undefined ? `The dispute over "${p.listingTitle}" was resolved.` : `A dispute was opened for "${p.listingTitle}".`,
  booking_extension_requested:p=>`A renter asked to extend "${p.listingTitle}".`,
  booking_extension_resolved:p=>`Your extension request for "${p.listingTitle}" was updated.`,
  provider_verified:()=>`Your provider account has been verified.`,
  provider_rejected:p=>`Provider verification wasn't approved.${p.reason?' Reason: '+p.reason:''}`,
  listing_approved:p=>`"${p.listingTitle}" is now live.`,
  listing_rejected:p=>`"${p.listingTitle}" was not approved.`,
  verification_document_reviewed:p=>`Your ${(p.docType||'').replace(/_/g,' ')} was ${p.status}.`,
  message_received:()=>`You have a new message.`,
};
const NOTIF_TITLE={
  booking_created:'New booking request', booking_approved:'Booking approved', booking_declined:'Booking declined',
  booking_cancelled:'Booking cancelled', booking_handed_over:'Rental started', booking_returned:'Item returned',
  booking_deposit_released:'Deposit released', booking_disputed:'Dispute update',
  booking_extension_requested:'Extension requested', booking_extension_resolved:'Extension update',
  provider_verified:'Provider verified', provider_rejected:'Verification update', listing_approved:'Listing approved',
  listing_rejected:'Listing rejected', verification_document_reviewed:'Document reviewed', message_received:'New message',
};
function timeAgo(iso){
  const ms=Date.now()-new Date(iso).getTime();
  const mins=Math.floor(ms/60000);
  if(mins<1) return 'just now';
  if(mins<60) return mins+'m ago';
  const hrs=Math.floor(mins/60);
  if(hrs<24) return hrs+'h ago';
  const days=Math.floor(hrs/24);
  if(days<7) return days+'d ago';
  return Math.floor(days/7)+'w ago';
}
function notifHref(n){
  const p=n.payload||{};
  if(p.bookingId) return `booking?id=${p.bookingId}`;
  return null;
}
let _notifCache=[];
function renderNotifDropdown(){
  const list=document.getElementById('notifList');
  if(!list) return;
  list.innerHTML = _notifCache.length ? _notifCache.map(n=>{
    const href=notifHref(n);
    const tag=href?'a':'div';
    const body=(NOTIF_COPY[n.type]||(()=>'You have a new update.'))(n.payload||{});
    return `<${tag} class="notif-item ${n.readAt?'':'unread'}" ${href?`href="${href}"`:''} data-id="${n.id}">
      <div class="ic ${NOTIF_TONE[n.type]||'success'}">${icon(NOTIF_ICON[n.type]||'bell',{size:15})}</div>
      <div><div class="t">${NOTIF_TITLE[n.type]||'Notification'}</div><div class="b">${body}</div><div class="tm">${timeAgo(n.createdAt)}</div></div>
    </${tag}>`;
  }).join('') : `<div class="notif-empty">You're all caught up.</div>`;
  list.querySelectorAll('.notif-item.unread').forEach(el=>{
    el.addEventListener('click',()=>{ apiFetch(`/notifications/${el.dataset.id}/read`,{method:'POST'}).catch(()=>{}); }, {once:true});
  });
  const bellDot=document.querySelector('#bellBtn .dot');
  if(bellDot) bellDot.style.display = _notifCache.some(n=>!n.readAt) ? 'block' : 'none';
}
async function loadNotifications(){
  try{
    const {data}=await apiFetch('/notifications?limit=15');
    _notifCache = data.data || data || [];
  }catch(e){
    _notifCache = [];
  }
  renderNotifDropdown();
}
function initNotifDropdown(){
  const btn=document.getElementById('bellBtn'), dd=document.getElementById('notifDropdown');
  if(!btn||!dd) return;
  loadNotifications();
  setInterval(loadNotifications, 30000);
  btn.addEventListener('click',(e)=>{e.stopPropagation();dd.classList.toggle('open');});
  document.getElementById('markAllReadBtn')?.addEventListener('click', async ()=>{
    try{ await apiFetch('/notifications/read-all',{method:'POST'}); }catch(e){}
    await loadNotifications();
  });
  document.addEventListener('click',(e)=>{ if(!e.target.closest('#notifDropdown') && !e.target.closest('#bellBtn')) dd.classList.remove('open'); });
}

/* ---------------- DATE RANGE PICKER (factory) ----------------
   Renders into `calEl`; calls onChange(start,end) whenever a full
   range is picked. Reused by the homepage hero search and the
   listing-detail booking widget.                                 */
function createDateRangePicker(calEl,onChange){
  let calMonth=new Date().getMonth(), calYear=new Date().getFullYear();
  let rangeStart=null, rangeEnd=null;
  const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  function render(){
    const first=new Date(calYear,calMonth,1);
    const startDow=first.getDay();
    const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
    let html=`<div class="cal-head"><div class="cal-nav" data-dir="-1">${icon('chevronLeft',{size:14})}</div><div>${MONTHS[calMonth]} ${calYear}</div><div class="cal-nav" data-dir="1">${icon('chevronRight',{size:14})}</div></div><div class="cal-grid">`;
    ['S','M','T','W','T','F','S'].forEach(d=>html+=`<div class="dow">${d}</div>`);
    for(let i=0;i<startDow;i++) html+=`<div></div>`;
    const today=new Date();
    for(let d=1;d<=daysInMonth;d++){
      const thisDate=new Date(calYear,calMonth,d);
      const isPast = thisDate < new Date(today.getFullYear(),today.getMonth(),today.getDate());
      let cls='cal-day'+(isPast?' muted':'');
      if(rangeStart && +thisDate===+rangeStart) cls+=' range-start';
      if(rangeEnd && +thisDate===+rangeEnd) cls+=' range-end';
      if(rangeStart && rangeEnd && thisDate>rangeStart && thisDate<rangeEnd) cls+=' in-range';
      html+=`<div class="${cls}" data-y="${calYear}" data-m="${calMonth}" data-d="${d}">${d}</div>`;
    }
    html+='</div>';
    calEl.innerHTML=html;
    // stopPropagation matters here, not just style: render() below replaces
    // calEl's innerHTML, detaching the very button this click event is
    // bubbling from. A document-level "click outside .search-pill" listener
    // (see homepage.html/browse.html) calls e.target.closest('.search-pill')
    // to decide whether to close the dropdown — closest() on an
    // already-detached node can't find any ancestor, so the outside-click
    // handler wrongly concludes the click was "outside" and closes the
    // panel out from under the calendar the instant a day or month changes.
    calEl.querySelectorAll('.cal-nav').forEach(b=>b.addEventListener('click',(e)=>{e.stopPropagation();shiftMonth(+b.dataset.dir);}));
    calEl.querySelectorAll('.cal-day:not(.muted)').forEach(b=>b.addEventListener('click',(e)=>{
      e.stopPropagation();
      pickDate(+b.dataset.y,+b.dataset.m,+b.dataset.d);
    }));
  }
  function shiftMonth(dir){calMonth+=dir; if(calMonth<0){calMonth=11;calYear--;} if(calMonth>11){calMonth=0;calYear++;} render();}
  function pickDate(y,m,d){
    const picked=new Date(y,m,d);
    if(!rangeStart || (rangeStart&&rangeEnd)){rangeStart=picked;rangeEnd=null;}
    else if(picked<rangeStart){rangeEnd=rangeStart;rangeStart=picked;}
    else{rangeEnd=picked;}
    render();
    if(rangeStart&&rangeEnd && onChange) onChange(rangeStart,rangeEnd);
  }
  function clear(){rangeStart=null;rangeEnd=null;render();if(onChange)onChange(null,null);}
  render();
  return {render,clear,get range(){return [rangeStart,rangeEnd];}};
}

/* ================================================================
   LIVE UPDATE DETECTION
   Polls version.json (regenerated on every Vercel deploy — see
   /write-version.js and vercel.json's buildCommand) and reloads once a
   newer build has gone live. Runs on every page automatically since this
   file is loaded everywhere — no per-page wiring needed.

   A deploy landing mid-checkout or mid-form shouldn't just yank the page
   out from under someone, so the reload is deferred (and a small "Refresh"
   prompt shown instead) while the visitor looks busy: a focused form
   field, an open modal, or an in-flight submit (this codebase consistently
   disables its buttons while an async action is pending, so a disabled
   button is a reliable proxy for "don't reload yet"). The deferred reload
   fires the moment they stop.
   ================================================================ */
(function watchForUpdates(){
  let knownVersion=null;
  let pendingReload=false;

  function isUserBusy(){
    const tag=document.activeElement && document.activeElement.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return true;
    if(document.querySelector('.overlay.open')) return true;
    if(document.querySelector('button:disabled')) return true;
    return false;
  }

  function showUpdateToast(){
    if(document.getElementById('updateToast')) return;
    const el=document.createElement('div');
    el.id='updateToast';
    el.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#151310;color:#fff;padding:12px 20px;border-radius:999px;display:flex;align-items:center;gap:14px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.28);font-family:inherit;';
    el.innerHTML='<span>A new version of Rently is available.</span><button style="background:#fff;color:#151310;border-radius:999px;padding:6px 14px;font-weight:700;font-size:12.5px;flex-shrink:0;">Refresh</button>';
    el.querySelector('button').addEventListener('click',()=>window.location.reload());
    document.body.appendChild(el);
  }

  async function checkVersion(){
    try{
      const res=await fetch('version.json?_='+Date.now(),{cache:'no-store'});
      if(!res.ok) return;
      const {version}=await res.json();
      if(knownVersion===null){ knownVersion=version; return; }
      if(version!==knownVersion && !pendingReload){
        pendingReload=true;
        if(isUserBusy()) showUpdateToast();
        else window.location.reload();
      }
    }catch(e){ /* offline or a network hiccup — just try again next interval */ }
  }

  document.addEventListener('focusout',()=>{
    if(!pendingReload) return;
    setTimeout(()=>{ if(!isUserBusy()) window.location.reload(); }, 50);
  });

  checkVersion();
  setInterval(checkVersion, 60000);
})();
