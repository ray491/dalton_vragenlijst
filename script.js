// ── SlimDalton Core Script ──

const VAKKEN = [
  'Nederlands', 'Engels', 'Duits', 'Frans',
  'Wiskunde', 'Natuurkunde', 'Scheikunde', 'Biologie',
  'Aardrijkskunde', 'Geschiedenis', 'Economie', 'Bedrijfseconomie',
  'Informatica', 'Kunst & Tekenen', 'Muziek', 'Lichamelijke Opvoeding'
];

const DAGEN = [
  { long: 'Maandag',   short: 'Ma', id: 'ma' },
  { long: 'Dinsdag',   short: 'Di', id: 'di' },
  { long: 'Woensdag',  short: 'Wo', id: 'wo' },
  { long: 'Donderdag', short: 'Do', id: 'do' },
  { long: 'Vrijdag',   short: 'Vr', id: 'vr' },
];

// Active Dalton Days (Default: all 5 weekdays)
let selectedDays = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];

// ── Dalton Planning Algorithm ────────────────────────────────────────────────
// Scores: Toets = 10, Voorkeur = 5, Huiswerk = 3
// Spreading: Avoid identical subject on consecutive Dalton days where possible
// Prioritizes high-stake subjects early and evenly in the selected Dalton days
function maakPlanning(huiswerk, toetsen, voorkeur, chosenDays) {
  const scores = {};
  
  toetsen.forEach(v  => { scores[v] = (scores[v] || 0) + 10; });
  voorkeur.forEach(v => { scores[v] = (scores[v] || 0) + 5;  });
  huiswerk.forEach(v => { scores[v] = (scores[v] || 0) + 3;  });

  const uniqueSorted = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([v]) => v);

  // Filter chronological days by user selection
  const activeDagen = chosenDays && chosenDays.length > 0
    ? DAGEN.filter(dag => chosenDays.includes(dag.long))
    : DAGEN;

  const planning = [];
  const ingepland = {};
  let pool = [...uniqueSorted];
  let vorigeVak = null;

  for (let i = 0; i < activeDagen.length; i++) {
    // If pool is empty, re-fill with candidates prioritized by score (max 2 sessions per subject)
    if (pool.length === 0) {
      const repeatable = uniqueSorted.filter(v => (ingepland[v] || 0) < 2);
      if (repeatable.length > 0) {
        pool = [...repeatable];
      }
    }

    if (pool.length === 0) {
      planning.push({
        dag: activeDagen[i],
        vak: 'Vrije studie',
        type: 'vrij',
        tip: 'Zelfstandig werken, achterstand wegwerken of herhalen.'
      });
      vorigeVak = 'Vrije studie';
      continue;
    }

    let candidateIndex = pool.findIndex(v => v !== vorigeVak);

    // If the only candidate left equals previous day's subject, insert free study for spacing
    if (candidateIndex === -1 && pool.length === 1 && uniqueSorted.length === 1 && (activeDagen.length - i) > 1 && (ingepland[pool[0]] || 0) < 2) {
      planning.push({
        dag: activeDagen[i],
        vak: 'Vrije studie',
        type: 'vrij',
        tip: 'Tussentijdse rust of zelfstandig huiswerk herhalen.'
      });
      vorigeVak = 'Vrije studie';
      continue;
    }

    if (candidateIndex === -1) candidateIndex = 0;

    const gekozen = pool.splice(candidateIndex, 1)[0];

    let type = 'huiswerk';
    let tip = 'Huiswerkopgaven maken en antwoorden controleren.';

    if (toetsen.includes(gekozen)) {
      type = 'toets';
      tip = 'Samenvatting doornemen, formules oefenen & vragen stellen.';
    } else if (voorkeur.includes(gekozen)) {
      type = 'voorkeur';
      tip = 'Verdiepende stof behandelen of extra uitleg vragen.';
    }

    planning.push({
      dag: activeDagen[i],
      vak: gekozen,
      type,
      tip
    });

    ingepland[gekozen] = (ingepland[gekozen] || 0) + 1;
    vorigeVak = gekozen;
  }

  return planning;
}

// ── UI Helpers: Pill Builders & Group Counters ──────────────────────────────
function makePills(containerId, countId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';

  VAKKEN.forEach(vak => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pill';
    btn.dataset.value = vak;
    btn.setAttribute('role', 'checkbox');
    btn.setAttribute('aria-checked', 'false');

    btn.innerHTML = `
      <span class="pill-check" aria-hidden="true">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </span>
      <span>${vak}</span>
    `;

    btn.onclick = () => {
      btn.classList.toggle('selected');
      const isSelected = btn.classList.contains('selected');
      btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      updateGroupCounter(containerId, countId);
      
      // Auto dismiss empty warning if user selects something
      if (containerId === 'pills-huiswerk' || containerId === 'pills-toets') {
        const hwCount = getSelected('pills-huiswerk').length;
        const toetsCount = getSelected('pills-toets').length;
        if (hwCount > 0 || toetsCount > 0) {
          const hint = document.getElementById('empty-hw-hint');
          if (hint) hint.classList.remove('show');
        }
      }
    };

    el.appendChild(btn);
  });

  updateGroupCounter(containerId, countId);
}

function updateGroupCounter(containerId, countId) {
  const count = document.querySelectorAll(`#${containerId} .pill.selected`).length;
  const countEl = document.getElementById(countId);
  if (countEl) {
    countEl.textContent = `${count} ${count === 1 ? 'vak' : 'vakken'} geselecteerd`;
  }
}

function clearGroup(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.querySelectorAll('.pill.selected').forEach(pill => {
    pill.classList.remove('selected');
    pill.setAttribute('aria-checked', 'false');
  });

  if (containerId === 'pills-toets') updateGroupCounter('pills-toets', 'count-toets');
  if (containerId === 'pills-huiswerk') updateGroupCounter('pills-huiswerk', 'count-huiswerk');
  if (containerId === 'pills-voorkeur') updateGroupCounter('pills-voorkeur', 'count-voorkeur');
}

function getSelected(containerId) {
  return [...document.querySelectorAll(`#${containerId} .pill.selected`)].map(b => b.dataset.value);
}

// ── Dalton Days Picker & Presets ───────────────────────────────────────────
function createDaySelection() {
  const container = document.getElementById('days-grid');
  if (!container) return;
  container.innerHTML = '';

  DAGEN.forEach(dag => {
    const isSelected = selectedDays.includes(dag.long);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `day-card ${isSelected ? 'selected' : ''}`;
    card.dataset.day = dag.long;
    card.setAttribute('role', 'checkbox');
    card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    card.setAttribute('aria-label', `${dag.long} als daltondag`);

    card.innerHTML = `
      <span class="day-badge-short">${dag.short}</span>
      <span class="day-badge-full">${dag.long}</span>
      <span class="day-check-icon">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </span>
    `;

    card.addEventListener('click', () => {
      card.classList.toggle('selected');
      const nowSelected = card.classList.contains('selected');
      card.setAttribute('aria-checked', nowSelected ? 'true' : 'false');

      if (nowSelected) {
        if (!selectedDays.includes(dag.long)) selectedDays.push(dag.long);
      } else {
        selectedDays = selectedDays.filter(d => d !== dag.long);
      }

      updateDayCountChip();
      updatePresetButtonsState();
    });

    container.appendChild(card);
  });

  updateDayCountChip();
}

function updateDayCountChip() {
  const chip = document.getElementById('days-count-chip');
  if (chip) {
    const count = selectedDays.length;
    chip.textContent = `${count} ${count === 1 ? 'dag' : 'dagen'} geselecteerd`;
  }
}

function setDayPreset(preset) {
  if (preset === 'all') {
    selectedDays = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];
  } else if (preset === 'mwf') {
    selectedDays = ['Maandag', 'Woensdag', 'Vrijdag'];
  } else if (preset === 'tt') {
    selectedDays = ['Dinsdag', 'Donderdag'];
  }

  // Update card visuals
  document.querySelectorAll('.day-card').forEach(card => {
    const day = card.dataset.day;
    const isSelected = selectedDays.includes(day);
    card.classList.toggle('selected', isSelected);
    card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  });

  updateDayCountChip();
  updatePresetButtonsState();
}

function updatePresetButtonsState() {
  const isAll = selectedDays.length === 5;
  const isMWF = selectedDays.length === 3 && selectedDays.includes('Maandag') && selectedDays.includes('Woensdag') && selectedDays.includes('Vrijdag');
  const isTT = selectedDays.length === 2 && selectedDays.includes('Dinsdag') && selectedDays.includes('Donderdag');

  const presetBtns = document.querySelectorAll('.preset-btn');
  if (presetBtns.length >= 3) {
    presetBtns[0].classList.toggle('active', isAll);
    presetBtns[1].classList.toggle('active', isMWF);
    presetBtns[2].classList.toggle('active', isTT);
  }
}

// ── Form Submission & Schedule Rendering ────────────────────────────────────
let currentPlanning = [];

function submitForm() {
  const hw = getSelected('pills-huiswerk');
  const toets = getSelected('pills-toets');
  const vk = getSelected('pills-voorkeur');

  const emptyHint = document.getElementById('empty-hw-hint');

  // If no subjects at all are selected, highlight warning
  if (hw.length === 0 && toets.length === 0 && vk.length === 0) {
    if (emptyHint) {
      emptyHint.classList.add('show');
      emptyHint.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  } else {
    if (emptyHint) emptyHint.classList.remove('show');
  }

  // Ensure at least 1 day is selected (default to all if empty)
  if (selectedDays.length === 0) {
    selectedDays = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];
    setDayPreset('all');
  }

  // Generate schedule
  currentPlanning = maakPlanning(hw, toets, vk, selectedDays);

  // Update Quick Stats
  const statDays = document.getElementById('stat-days-count');
  const statTests = document.getElementById('stat-tests-count');
  const statHw = document.getElementById('stat-hw-count');
  if (statDays) statDays.textContent = selectedDays.length;
  if (statTests) statTests.textContent = toets.length;
  if (statHw) statHw.textContent = hw.length;

  // Render Selection Summary Tags
  renderSummaryTags('res-dagen', selectedDays, 'tag-day');
  renderSummaryTags('res-toets', toets, 'tag-toets');
  renderSummaryTags('res-huiswerk', hw, 'tag-hw');
  renderSummaryTags('res-voorkeur', vk, 'tag-vk');

  // Render Planning Timeline
  const grid = document.getElementById('planning-grid');
  if (grid) {
    grid.innerHTML = '';

    currentPlanning.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'planning-item';
      row.setAttribute('role', 'listitem');
      row.style.animationDelay = `${index * 0.06}s`;

      const typeLabels = {
        toets: '📝 Toets',
        voorkeur: '⭐ Focusvak',
        huiswerk: '✏️ Huiswerk',
        vrij: '○ Vrije studie'
      };

      row.innerHTML = `
        <div class="plan-day-pill">
          <span class="plan-day-short">${item.dag.short}</span>
          <span class="plan-day-full">${item.dag.long.substring(0, 3)}</span>
        </div>
        <div class="plan-info">
          <div class="plan-title-wrap">
            <span class="plan-subject ${item.vak === 'Vrije studie' ? 'vrij' : ''}">${item.vak}</span>
          </div>
          <p class="plan-tip">${item.tip}</p>
        </div>
        <div class="plan-type-badge ${item.type}">
          ${typeLabels[item.type] || item.type}
        </div>
      `;

      grid.appendChild(row);
    });
  }

  // Reveal results with smooth animation
  const result = document.getElementById('result');
  if (result) {
    result.style.display = 'block';
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderSummaryTags(containerId, items, tagClass) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (items && items.length > 0) {
    el.innerHTML = items.map(item => `<span class="tag-badge ${tagClass}">${item}</span>`).join('');
  } else {
    el.innerHTML = '<span class="tag-badge tag-none">Geen opgegeven</span>';
  }
}

function resetForm() {
  document.querySelectorAll('.pill.selected').forEach(pill => {
    pill.classList.remove('selected');
    pill.setAttribute('aria-checked', 'false');
  });

  updateGroupCounter('pills-toets', 'count-toets');
  updateGroupCounter('pills-huiswerk', 'count-huiswerk');
  updateGroupCounter('pills-voorkeur', 'count-voorkeur');

  // Reset days to default all 5 weekdays
  setDayPreset('all');

  const emptyHint = document.getElementById('empty-hw-hint');
  if (emptyHint) emptyHint.classList.remove('show');

  const result = document.getElementById('result');
  if (result) result.style.display = 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Clipboard & Sharing ─────────────────────────────────────────────────────
function copyPlanningToClipboard() {
  if (!currentPlanning || currentPlanning.length === 0) return;

  let text = '📅 Mijn Daltonplanning voor deze week:\n';
  const typeIcons = {
    toets: '📝 Toets',
    voorkeur: '⭐ Focusvak',
    huiswerk: '✏️ Huiswerk',
    vrij: '○ Vrije studie'
  };

  currentPlanning.forEach(item => {
    text += `• ${item.dag.long}: ${item.vak} [${typeIcons[item.type] || item.type}]\n`;
  });

  text += '\nGegenereerd met SlimDalton';

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Planning gekopieerd naar klembord!');
    }).catch(() => {
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showToast('Planning gekopieerd naar klembord!');
  } catch (err) {
    alert('Kopiëren is niet gelukt. Selecteer de tekst handmatig.');
  }
  document.body.removeChild(textarea);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');
  if (!toast) return;

  if (toastText) toastText.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

// ── Theme Switcher (Light / Dark) ───────────────────────────────────────────
function initTheme() {
  const savedTheme = localStorage.getItem('slimdalton-theme') || 'auto';
  document.documentElement.setAttribute('data-theme', savedTheme);

  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      let nextTheme = 'light';

      if (currentTheme === 'light') {
        nextTheme = 'dark';
      } else if (currentTheme === 'dark') {
        nextTheme = 'auto';
      } else {
        // From auto, toggle to opposite of current system
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        nextTheme = prefersDark ? 'light' : 'dark';
      }

      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('slimdalton-theme', nextTheme);
      showToast(`Thema: ${nextTheme === 'auto' ? 'Systeem' : (nextTheme === 'dark' ? 'Donker' : 'Licht')}`);
    });
  }
}

// ── Adblocker Detection Modal (Apple HIG Sheet Style) ───────────────────────
async function checkAdBlocker() {
  await new Promise(resolve => setTimeout(resolve, 800));

  let isBlocked = false;

  const adFrame = document.querySelector('#frame iframe');
  if (adFrame) {
    const rect = adFrame.getBoundingClientRect();
    const style = window.getComputedStyle(adFrame);
    if (rect.height === 0 || rect.width === 0 || style.display === 'none' || style.visibility === 'hidden') {
      isBlocked = true;
    }
  }

  if (!isBlocked && navigator.onLine) {
    try {
      await fetch('https://acceptable.a-ads.com/2439455/?size=Adaptive', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store'
      });
    } catch (e) {
      isBlocked = true;
    }
  }

  if (isBlocked) {
    showAdblockModal();
  }
}

function showAdblockModal() {
  const backdrop = document.createElement('div');
  backdrop.className = 'ab-backdrop';

  const modal = document.createElement('div');
  modal.className = 'ab-modal';

  const title = document.createElement('h3');
  title.className = 'ab-title';
  title.textContent = 'Adblocker Gedetecteerd';

  const text = document.createElement('p');
  text.className = 'ab-text';
  text.textContent = 'SlimDalton is gratis te gebruiken voor alle leerlingen. We financieren de serverkosten met niet-storende advertenties. Overweeg alstublieft onze website te whitelisten!';

  const btn = document.createElement('button');
  btn.className = 'ab-close-btn';
  btn.textContent = 'Begrepen';
  btn.onclick = () => {
    backdrop.classList.remove('show');
    setTimeout(() => backdrop.remove(), 250);
  };

  modal.appendChild(title);
  modal.appendChild(text);
  modal.appendChild(btn);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  setTimeout(() => backdrop.classList.add('show'), 50);
}

// ── App Initialization ───────────────────────────────────────────────────────
function init() {
  initTheme();
  createDaySelection();
  makePills('pills-toets', 'count-toets');
  makePills('pills-huiswerk', 'count-huiswerk');
  makePills('pills-voorkeur', 'count-voorkeur');

  // Adblocker check
  checkAdBlocker();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

// Export for module/test environments if present
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VAKKEN, DAGEN, maakPlanning };
}

