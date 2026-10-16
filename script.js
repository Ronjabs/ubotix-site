// Gallery, services and updates are edited in /admin and stored in /content/*.json
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const load = name => fetch(`content/${name}.json`, { cache: 'no-cache' }).then(r => r.json());
const FB = 'https://www.facebook.com/profile.php?id=61595112535000';

document.getElementById('y').textContent = new Date().getFullYear();

const menu = document.querySelector('.menu');
menu.addEventListener('click', () => {
  const open = document.body.classList.toggle('open');
  menu.setAttribute('aria-expanded', open);
});

const lb = document.getElementById('lb');
function openLightbox(p) {
  lb.querySelector('img').src = p.src;
  lb.querySelector('img').alt = p.caption;
  lb.querySelector('p').textContent = p.caption;
  lb.hidden = false;
}
lb.addEventListener('click', () => (lb.hidden = true));
document.addEventListener('keydown', e => { if (e.key === 'Escape') lb.hidden = true; });

const grid = document.getElementById('grid');
if (grid) {
  load('gallery').then(d => (d.photos || []).forEach(ph => {
    const p = { src: ph.image, caption: ph.caption || '' };
    const f = document.createElement('figure');
    f.innerHTML = `<img loading="lazy" src="${esc(p.src)}" alt="${esc(p.caption)}"><figcaption>${esc(p.caption)}</figcaption>`;
    f.querySelector('img').addEventListener('click', () => openLightbox(p));
    grid.appendChild(f);
  })).catch(() => {});
}

// services (home cards + services page)
const svcs = document.getElementById('svcs');
const svcBig = document.getElementById('svc-big');
if (svcs || svcBig) {
  load('services').then(d => {
    const list = d.services || [];
    if (svcs) svcs.innerHTML = list.map(s => `<article class="svc" data-cat="${esc(s.category)}"><span class="chip">${esc(s.tag)}</span><h3>${esc(s.title)}</h3><ul>${(s.bullets || []).map(b => `<li>${esc(b)}</li>`).join('')}</ul><div class="row"><a class="btn primary sm" href="${FB}" target="_blank" rel="noopener">Inquire</a><a class="link" href="services.html">Details</a></div></article>`).join('');
    if (svcBig) svcBig.innerHTML = list.map((s, i) => `<article class="big"><span class="n ${i % 2 ? 'b' : 'r'}">${String(i + 1).padStart(2, '0')}</span><h3>${esc(s.title)}</h3><p>${esc(s.description)}</p>${/3d/i.test(s.title) ? '<p><a class="link" href="estimate.html">Estimate your print cost &rarr;</a></p>' : ''}</article>`).join('');
  }).catch(() => {});
}

// latest updates (home)
const upd = document.getElementById('updates');
if (upd) {
  load('updates').then(d => {
    const list = (d.updates || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 3);
    if (!list.length) return;
    upd.innerHTML = list.map(u => `<article><span class="chip">${esc(u.date)}</span><h3>${esc(u.title)}</h3><p>${esc(u.body)}</p></article>`).join('');
    document.getElementById('updates-sec').hidden = false;
  }).catch(() => {});
}

// hero carousel
const slides = document.querySelectorAll('.slide');
if (slides.length) {
  const dots = document.querySelectorAll('.dot');
  let i = 0, timer;
  const show = n => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('on', k === i));
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
  };
  const start = () => { timer = setInterval(() => show(i + 1), 6000); };
  dots.forEach((d, k) => d.addEventListener('click', () => { clearInterval(timer); show(k); start(); }));
  start();
}

// service tabs
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
  document.querySelectorAll('.svc').forEach(c => { c.hidden = t.dataset.f !== 'all' && c.dataset.cat !== t.dataset.f; });
}));
