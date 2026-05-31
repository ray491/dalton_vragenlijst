const vakken = [
  'Nederlands','Engels','Duits','Frans',
  'Wiskunde','Natuurkunde','Scheikunde','Biologie',
  'Aardrijkskunde','Geschiedenis','Economie','M&O',
  'Informatica','Kunst','Muziek','LO'
];

const DAGEN = [
  { long: 'Maandag',   short: 'Ma' },
  { long: 'Dinsdag',   short: 'Di' },
  { long: 'Woensdag',  short: 'Wo' },
  { long: 'Donderdag', short: 'Do' },
  { long: 'Vrijdag',   short: 'Vr' },
];

// ── Algoritme ──────────────────────────────────────────────────────────────
// Scores: toets=10, voorkeur=5, huiswerk=3
// Spreiding: geen herhaling twee opeenvolgende dagen indien mogelijk
// Toetsvakken krijgen voorrang en worden vroeg ingepland
function maakPlanning(huiswerk, toetsen, voorkeur) {
  const scores = {};
  toetsen.forEach(v  => { scores[v] = (scores[v] || 0) + 10; });
  voorkeur.forEach(v => { scores[v] = (scores[v] || 0) + 5;  });
  huiswerk.forEach(v => { scores[v] = (scores[v] || 0) + 3;  });

  let kandidaten = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([v]) => v);

  const planning = [];
  const ingepland = {};
  let vorigeVak = null;

  for (let i = 0; i < 5; i++) {
    if (!kandidaten.length) {
      planning.push({ dag: DAGEN[i], vak: 'Vrije studie', type: 'vrij' });
      vorigeVak = null;
      continue;
    }

    const gekozen = kandidaten.find(v => v !== vorigeVak) || kandidaten[0];

    let type = 'huiswerk';
    if (toetsen.includes(gekozen))   type = 'toets';
    else if (voorkeur.includes(gekozen)) type = 'voorkeur';

    planning.push({ dag: DAGEN[i], vak: gekozen, type });
    ingepland[gekozen] = (ingepland[gekozen] || 0) + 1;
    vorigeVak = gekozen;

    if (!toetsen.includes(gekozen) || ingepland[gekozen] >= 2) {
      kandidaten = kandidaten.filter(v => v !== gekozen);
      if ((5 - i - 1) > kandidaten.length) kandidaten.push(gekozen);
    }
  }
  return planning;
}
// ───────────────────────────────────────────────────────────────────────────

function makePills(containerId) {
  const el = document.getElementById(containerId);
  vakken.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.textContent = v;
    btn.dataset.value = v;
    btn.setAttribute('role', 'checkbox');
    btn.setAttribute('aria-checked', 'false');
    btn.onclick = () => {
      btn.classList.toggle('selected');
      btn.setAttribute('aria-checked', btn.classList.contains('selected') ? 'true' : 'false');
    };
    el.appendChild(btn);
  });
}

function getSelected(id) {
  return [...document.querySelectorAll(`#${id} .pill.selected`)].map(b => b.dataset.value);
}

function renderTags(id, items, cls) {
  const el = document.getElementById(id);
  el.innerHTML = items.length
    ? items.map(v => `<span class="result-tag ${cls}">${v}</span>`).join('')
    : '<span class="result-tag none">Geen opgegeven</span>';
}

const BADGE = {
  toets:    '<span class="badge badge-toets">📝 Toets</span>',
  voorkeur: '<span class="badge badge-voorkeur">⭐ Voorkeur</span>',
  huiswerk: '<span class="badge badge-huiswerk">✏️ Huiswerk</span>',
  vrij:     '<span class="badge badge-vrij">○ Vrij</span>',
};

function submitForm() {
  const hw    = getSelected('pills-huiswerk');
  const toets = getSelected('pills-toets');
  const vk    = getSelected('pills-voorkeur');

  // Show empty-state hint on card 1 if nothing selected
  document.getElementById('wrap-huiswerk').classList.toggle('show-empty', hw.length === 0);

  renderTags('res-huiswerk', hw, 'hw');
  renderTags('res-toets',    toets, 'tts');
  renderTags('res-voorkeur', vk, 'vk');

  const planning = maakPlanning(hw, toets, vk);
  const grid = document.getElementById('planning-grid');
  grid.innerHTML = '';

  planning.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = `planning-row type-${item.type}`;
    row.setAttribute('role', 'listitem');
    row.style.animationDelay = `${i * .06}s`;

    row.innerHTML = `
      <div class="p-day">
        <span class="day-long">${item.dag.long}</span>
        <span class="day-short" aria-hidden="true">${item.dag.short}</span>
      </div>
      <div class="p-vak${item.vak === 'Vrije studie' ? ' leeg' : ''}">${item.vak}</div>
      <div>${BADGE[item.type]}</div>
    `;
    grid.appendChild(row);
  });

  const result = document.getElementById('result');
  result.style.display = 'block';
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetForm() {
  document.querySelectorAll('.pill.selected').forEach(p => {
    p.classList.remove('selected');
    p.setAttribute('aria-checked', 'false');
  });
  document.querySelectorAll('.pill-wrap').forEach(w => w.classList.remove('show-empty'));
  document.getElementById('result').style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Responsive day label swap via JS (simpler than CSS content tricks)
function applyDayLabels() {
  const narrow = window.innerWidth <= 520;
  document.querySelectorAll('.day-long').forEach(el => el.style.display = narrow ? 'none' : '');
  document.querySelectorAll('.day-short').forEach(el => el.style.display = narrow ? '' : 'none');
}

// ── Adblocker Detection ─────────────────────────────────────────────────────
async function checkAdBlocker() {
  // Brief delay to allow extension injection/blocking to settle
  await new Promise(resolve => setTimeout(resolve, 800));

  let isBlocked = false;

  // Method 1: Check if the ad iframe is hidden, collapsed, or has 0 dimensions
  const adFrame = document.querySelector('#frame iframe');
  if (adFrame) {
    const rect = adFrame.getBoundingClientRect();
    const style = window.getComputedStyle(adFrame);
    if (
      rect.height === 0 ||
      rect.width === 0 ||
      style.display === 'none' ||
      style.visibility === 'hidden'
    ) {
      isBlocked = true;
    }
  }

  // Method 2: Attempt fetching a known ad domain / specific ad resource
  if (!isBlocked && navigator.onLine) {
    try {
      // Fetch site's own ad-network unit
      await fetch('https://acceptable.a-ads.com/2439455/?size=Adaptive', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store'
      });
    } catch (e) {
      isBlocked = true;
    }
  }

  // Method 3: Fallback DOM inspection for standard ad container classes
  if (!isBlocked) {
    const dummy = document.createElement('div');
    dummy.className = 'adsbygoogle ad-placement ad-banner adsbox';
    dummy.setAttribute('style', 'position: absolute; left: -9999px; top: -9999px; width: 1px; height: 1px; display: block !important;');
    document.body.appendChild(dummy);
    
    const computedStyle = window.getComputedStyle(dummy);
    if (
      dummy.offsetHeight === 0 ||
      dummy.offsetWidth === 0 ||
      computedStyle.display === 'none' ||
      computedStyle.visibility === 'hidden'
    ) {
      isBlocked = true;
    }
    document.body.removeChild(dummy);
  }

  // If adblocker is detected, politely request to disable it via a JS alert
  if (isBlocked) {
    alert("Het lijkt erop dat u een adblocker gebruikt. Schakel deze alstublieft uit voor onze website, aangezien we onze hosting betalen met advertenties. Bedankt voor uw steun!");
  }
}

// ── Initialisation ───────────────────────────────────────────────────────────
function init() {
  makePills('pills-huiswerk');
  makePills('pills-toets');
  makePills('pills-voorkeur');
  applyDayLabels();
  window.addEventListener('resize', applyDayLabels);
  
  // Perform adblocker check
  checkAdBlocker();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
