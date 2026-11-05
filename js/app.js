import { icon } from './icons.js';
import { topics } from './data/index.js';

const $nav = document.getElementById('sidebar');
const $main = document.getElementById('content');
const $search = document.getElementById('search');
const $toggle = document.getElementById('menuToggle');
const $scrim = document.getElementById('scrim');

// Flat, ordered list of every subtopic: used for prev/next and search.
const allSubs = topics.flatMap(t => t.subtopics.map(s => ({ topic: t, sub: s })));

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Inline markup in prose fields: `code` only.
const prose = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');

const cmdCount = sub => sub.sections.reduce((n, s) => n + s.cmds.length, 0);
const fileCount = sub => sub.sections.reduce((n, s) => n + (s.files ? s.files.length : 0), 0);
const countLabel = sub => {
  const f = fileCount(sub);
  return (f ? `${f} files · ` : '') + `${cmdCount(sub)} commands`;
};

// Light syntax colouring: comment lines, --flags and UPPER_CASE placeholders.
function highlight(code) {
  return code.split('\n').map(line => {
    if (/^\s*#/.test(line)) return `<span class="c">${esc(line)}</span>`;
    return line.split(/(\s+)/).map(tok => {
      if (/^--?[a-zA-Z][\w-]*/.test(tok)) {
        const m = tok.match(/^(--?[a-zA-Z][\w-]*)(.*)$/);
        return `<span class="f">${esc(m[1])}</span>${placeholders(m[2])}`;
      }
      return placeholders(tok);
    }).join('');
  }).join('\n');
}
// Source files: only comment lines are coloured. Placeholder colouring would be
// wrong in real code.
function highlightFile(code, lang) {
  const comment = { python: /^\s*#/, yaml: /^\s*#/, dockerfile: /^\s*#/, text: /^\s*#/, sql: /^\s*--/, javascript: /^\s*\/\// }[lang];
  return code.split('\n').map(l => comment && comment.test(l) ? `<span class="c">${esc(l)}</span>` : esc(l)).join('\n');
}
function placeholders(s) {
  return esc(s).replace(/\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+|PROJECT|REGION|ZONE|BUCKET|DATASET|TABLE|INSTANCE|SERVICE|REPO|IMAGE|TOPIC|EMAIL)\b/g, '<span class="p">$1</span>');
}

/* ---------------- sidebar ---------------- */
function renderNav() {
  const groups = topics.map(t => `
    <div class="nav-group" data-topic="${t.id}">
      <button class="nav-topic t-${t.color}" data-toggle="${t.id}" aria-expanded="false">
        ${icon(t.icon)}<span>${esc(t.title)}</span><svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
      </button>
      <div class="nav-subs">
        <a class="nav-sub" href="#/${t.id}" data-route="${t.id}">${icon('home')}Overview</a>
        ${t.subtopics.map(s => `<a class="nav-sub" href="#/${t.id}/${s.id}" data-route="${t.id}/${s.id}">${icon(s.icon)}${esc(s.title)}</a>`).join('')}
      </div>
    </div>`).join('');
  $nav.innerHTML = `<a class="nav-home" href="#/" data-route="">${icon('home')}<span>All topics</span></a>${groups}`;

  $nav.addEventListener('click', e => {
    const btn = e.target.closest('[data-toggle]');
    if (btn) {
      const g = btn.parentElement;
      g.classList.toggle('open');
      btn.setAttribute('aria-expanded', g.classList.contains('open'));
      return;
    }
    if (e.target.closest('a')) closeDrawer();
  });
}

function syncNav(route) {
  const [topicId] = route.split('/');
  $nav.querySelectorAll('[data-route]').forEach(a => a.classList.toggle('active', a.dataset.route === route));
  $nav.querySelectorAll('.nav-topic').forEach(b => b.classList.toggle('active', b.dataset.toggle === topicId && !route.includes('/')));
  if (topicId) {
    const g = $nav.querySelector(`.nav-group[data-topic="${topicId}"]`);
    if (g) { g.classList.add('open'); g.querySelector('.nav-topic').setAttribute('aria-expanded', 'true'); }
  }
  $nav.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
}

/* ---------------- pages ---------------- */
const card = (t, s) => `
  <a class="card t-${t.color}" href="#/${t.id}/${s.id}">
    <span class="card-icon">${icon(s.icon)}</span>
    <h3>${esc(s.title)}</h3>
    <p>${prose(s.summary)}</p>
    <span class="count">${countLabel(s)}</span>
  </a>`;

function renderHome() {
  const total = allSubs.reduce((n, { sub }) => n + cmdCount(sub), 0);
  return `
    <section class="hero">
      <h1>Google Cloud CLI cheat sheet</h1>
      <p>${topics.length} topics, ${allSubs.length} services, ${total} ready-to-copy <code>gcloud</code> / <code>bq</code> commands.
      Pick a service below, or press <code>/</code> to search. Replace <code>UPPER_CASE</code> placeholders with your own values.</p>
    </section>
    ${topics.map(t => `
      <section class="topic-block t-${t.color}">
        <h2 class="topic-title">${icon(t.icon)}<a href="#/${t.id}">${esc(t.title)}</a></h2>
        <p class="topic-desc">${prose(t.description)}</p>
        <div class="grid">${t.subtopics.map(s => card(t, s)).join('')}</div>
      </section>`).join('')}
    <p class="footer">Commands target the current GA <code>gcloud</code> CLI. Check <code>gcloud COMMAND --help</code> for every flag.</p>`;
}

function renderTopic(t) {
  return `
    <div class="crumbs"><a href="#/">All topics</a> / ${esc(t.title)}</div>
    <div class="page-head t-${t.color}"><span class="page-icon">${icon(t.icon)}</span><h1>${esc(t.title)}</h1></div>
    <p class="lead">${prose(t.description)}</p>
    <div class="usecases t-${t.color}"><h2>Use cases</h2><ul>${t.useCases.map(u => `<li>${prose(u)}</li>`).join('')}</ul></div>
    <div class="grid t-${t.color}">${t.subtopics.map(s => card(t, s)).join('')}</div>`;
}

const cmdBlock = c => `
  <div class="cmd">
    ${c.d ? `<p class="cmd-desc">${prose(c.d)}</p>` : ''}
    <div class="cmd-box"><pre><code>${highlight(c.c)}</code></pre>
      <button class="copy" title="Copy" aria-label="Copy command">${icon('copy')}</button></div>
  </div>`;

const fileBlock = f => `
  <details class="file"${f.open ? ' open' : ''}>
    <summary><span class="file-name">${esc(f.name)}</span><span class="file-meta">${esc(f.lang)} · ${f.code.split('\n').length} lines</span></summary>
    <div class="cmd-box"><pre class="code"><code>${highlightFile(f.code, f.lang)}</code></pre>
      <button class="copy" title="Copy file" aria-label="Copy file">${icon('copy')}</button></div>
  </details>`;

function renderCovers(s) {
  if (!s.covers) return '';
  const chips = s.covers.map(([tid, sid]) => {
    const t = topics.find(x => x.id === tid);
    const sub = t?.subtopics.find(x => x.id === sid);
    if (!sub) return '';
    return `<a class="chip t-${t.color}" href="#/${tid}/${sid}">${icon(sub.icon)}<span>${esc(sub.title)}</span></a>`;
  }).join('');
  const used = [...new Set(s.covers.map(([tid]) => tid))].map(id => topics.find(t => t.id === id)?.title).filter(Boolean);
  return `<div class="covers"><h2>Covers ${used.length} topics: ${used.map(esc).join(', ')}</h2><div class="chips">${chips}</div></div>`;
}

function renderFlow(s) {
  if (!s.flow) return '';
  const row = steps => `<div class="flow-row">${steps.map(x => `<span class="flow-node">${esc(x)}</span>`).join('<span class="flow-arrow" aria-hidden="true">→</span>')}</div>`;
  return `<div class="flow"><h2>Architecture</h2>${s.flow.map(row).join('')}</div>`;
}

function renderSub(t, s) {
  const i = allSubs.findIndex(x => x.sub === s);
  const prev = allSubs[i - 1], next = allSubs[i + 1];
  const link = (x, cls, label) => x ? `<a class="${cls}" href="#/${x.topic.id}/${x.sub.id}"><small>${label}</small>${esc(x.sub.title)}</a>` : '';
  return `
    <div class="crumbs"><a href="#/">All topics</a> / <a href="#/${t.id}">${esc(t.title)}</a> / ${esc(s.title)}</div>
    <div class="page-head t-${t.color}"><span class="page-icon">${icon(s.icon)}</span><h1>${esc(s.title)}</h1></div>
    <p class="lead">${prose(s.description)}</p>
    <div class="usecases t-${t.color}"><h2>Use cases</h2><ul>${s.useCases.map(u => `<li>${prose(u)}</li>`).join('')}</ul></div>
    ${renderFlow(s)}
    ${renderCovers(s)}
    <nav class="toc">${s.sections.map((sec, n) => `<a href="#" data-jump="sec-${n}">${esc(sec.title)}</a>`).join('')}</nav>
    ${s.sections.map((sec, n) => `
      <section class="section" id="sec-${n}">
        <h2>${esc(sec.title)}</h2>
        ${sec.note ? `<p class="note">${prose(sec.note)}</p>` : ''}
        ${(sec.files || []).map(fileBlock).join('')}
        ${sec.cmds.map(cmdBlock).join('')}
      </section>`).join('')}
    <div class="pager">${link(prev, 'prev', '← Previous')}${link(next, 'next', 'Next →')}</div>`;
}

function renderNotFound() {
  return `<h1>Not found</h1><p>That page doesn't exist. <a href="#/">Back to all topics</a>.</p>`;
}

/* ---------------- search ---------------- */
function renderSearch(q) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hit = text => terms.every(w => text.toLowerCase().includes(w));
  const mark = html => terms.reduce((h, w) => h.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![^<]*>)`, 'gi'), '<mark>$1</mark>'), html);

  const groups = allSubs.map(({ topic, sub }) => {
    const subHit = hit(`${topic.title} ${sub.title} ${sub.summary}`);
    const cmds = sub.sections.flatMap(sec => sec.cmds.filter(c => subHit || hit(`${sec.title} ${c.d || ''} ${c.c}`)));
    return { topic, sub, cmds: subHit ? cmds.slice(0, 4) : cmds };
  }).filter(g => g.cmds.length);

  if (!groups.length) return `<h1>Search</h1><p class="empty">No commands match “${esc(q)}”.</p>`;
  const n = groups.reduce((a, g) => a + g.cmds.length, 0);
  return `<h1>Search: “${esc(q)}”</h1><p class="lead">${n} command${n === 1 ? '' : 's'} in ${groups.length} service${groups.length === 1 ? '' : 's'}.</p>
    ${groups.map(g => `
      <section class="result-group">
        <h2><a href="#/${g.topic.id}/${g.sub.id}">${esc(g.topic.title)} / ${esc(g.sub.title)}</a></h2>
        ${mark(g.cmds.slice(0, 12).map(cmdBlock).join(''))}
      </section>`).join('')}`;
}

/* ---------------- router ---------------- */
function currentRoute() {
  return decodeURIComponent(location.hash.replace(/^#\/?/, '')).replace(/\/$/, '');
}

function render() {
  const q = $search.value.trim();
  if (q.length >= 2) { $main.innerHTML = renderSearch(q); return; }

  const route = currentRoute();
  const [tid, sid] = route.split('/');
  const t = topics.find(x => x.id === tid);
  const s = t && sid ? t.subtopics.find(x => x.id === sid) : null;

  if (!route) { $main.innerHTML = renderHome(); document.title = 'gcloud Cheat Sheet'; }
  else if (t && !sid) { $main.innerHTML = renderTopic(t); document.title = `${t.title} · gcloud Cheat Sheet`; }
  else if (s) { $main.innerHTML = renderSub(t, s); document.title = `${s.title} · gcloud Cheat Sheet`; }
  else { $main.innerHTML = renderNotFound(); }

  syncNav(route);
  window.scrollTo(0, 0);
}

/* ---------------- interactions ---------------- */
$main.addEventListener('click', async e => {
  const jump = e.target.closest('[data-jump]');
  if (jump) {
    e.preventDefault();
    document.getElementById(jump.dataset.jump)?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  const btn = e.target.closest('.copy');
  if (!btn) return;
  const text = btn.parentElement.querySelector('pre').textContent;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  btn.classList.add('done');
  btn.innerHTML = icon('check');
  setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = icon('copy'); }, 1400);
});

let searchTimer;
$search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(render, 120);
});
$search.addEventListener('keydown', e => {
  if (e.key === 'Escape') { $search.value = ''; $search.blur(); render(); }
});
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== $search && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    $search.focus();
  }
});

function closeDrawer() {
  document.body.classList.remove('nav-open');
  $toggle.setAttribute('aria-expanded', 'false');
}
$toggle.addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  $toggle.setAttribute('aria-expanded', open);
});
$scrim.addEventListener('click', closeDrawer);

window.addEventListener('hashchange', () => {
  if ($search.value) $search.value = '';
  render();
});

renderNav();
render();
