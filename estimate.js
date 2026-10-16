// 3D printing cost estimate. Rates live in content/pricing.json (editable in /admin).
const DEFAULTS = { cost_per_gram: 1, cost_per_hour: 50, design_fee_per_hour: 100, markup_percent: 20, round_up_to: 10 };
let rates = { ...DEFAULTS };

const form = document.getElementById('estForm');
const result = document.getElementById('estResult');
const priceEl = document.getElementById('estPrice');
const errEl = document.getElementById('estError');
const designBox = document.getElementById('needDesign');
const designNote = document.getElementById('designNote');

fetch('content/pricing.json', { cache: 'no-cache' }).then(r => r.json()).then(d => {
  rates = { ...DEFAULTS, ...d };
  designNote.textContent = `+${peso(rates.design_fee_per_hour)} per print hour`;
}).catch(() => { designNote.textContent = `+${peso(rates.design_fee_per_hour)} per print hour`; });

function peso(n) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function estimate(grams, hours, design) {
  const base = grams * rates.cost_per_gram + hours * rates.cost_per_hour + (design ? hours * rates.design_fee_per_hour : 0);
  const raw = Math.round(base * (1 + rates.markup_percent / 100) * 100) / 100; // avoid float noise before rounding up
  return Math.ceil(raw / rates.round_up_to) * rates.round_up_to;
}

function fail(msg) { errEl.textContent = msg; errEl.hidden = false; result.hidden = true; }

form.addEventListener('submit', e => {
  e.preventDefault();
  const g = parseFloat(document.getElementById('grams').value);
  const h = parseFloat(document.getElementById('hours').value) || 0;
  const m = parseFloat(document.getElementById('minutes').value) || 0;
  const hours = h + m / 60;
  if (isNaN(g)) return fail('Please enter the material weight in grams.');
  if (g < 0 || hours < 0) return fail('Values cannot be negative.');
  if (g === 0 && hours === 0) return fail('Please enter at least one value greater than zero.');
  if (g > 100000) return fail('Material weight seems too high. Please check your input.');
  if (hours > 1000) return fail('Print time seems too high. Please check your input.');
  errEl.hidden = true;
  priceEl.textContent = peso(estimate(g, hours, designBox.checked));
  document.getElementById('estWith').textContent = designBox.checked ? 'Includes model design' : 'Print only (you provide the model)';
  result.hidden = false;
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

['grams', 'hours', 'minutes'].forEach(id => document.getElementById(id).addEventListener('keydown', e => {
  if (['-', 'e', 'E', '+'].includes(e.key)) e.preventDefault();
}));
