const form = document.getElementById('dayActivity');
const summary = document.getElementById('error-summary');
const clearBtn = document.getElementById('clearBtn');

const fields = {
  date: document.getElementById('date'),
  sleep: document.getElementById('sleep'),
  sleepOutput: document.getElementById('sleepValue'),
  medicationYes: document.getElementById('medicationYes'),
  medicationNo: document.getElementById('medicationNo'),
  time: document.getElementById('time'),
  bikeWork: document.getElementById('bikeWork'),
  bikeHome: document.getElementById('bikeHome'),
  discgolf: document.getElementById('discgolf'),
  noActivities: document.getElementById('noActivities'),
  activitiesOther: document.getElementById('activitiesOther'),
  otherActivities: document.getElementById('otherActivities'),
  sugar: document.getElementById('sugar'),
  wheat: document.getElementById('wheat'),
  rye: document.getElementById('rye'),
  fodmap: document.getElementById('fodmap'),
  noFood: document.getElementById('noFood'),
  foodOther: document.getElementById('foodOther'),
  otherFood: document.getElementById('otherFood'),
  back: document.getElementById('back'),
  legs: document.getElementById('legs'),
  arms: document.getElementById('arms'),
  migren: document.getElementById('migren'),
  head: document.getElementById('head'),
  noPain: document.getElementById('noPain'),
  painOther: document.getElementById('painOther'),
  otherPain: document.getElementById('otherPain'),
  painLevel: document.getElementById('painLevel'),
  painOutput: document.getElementById('painValue')
};

const errorEls = {
  date: document.getElementById('dateError'),
  sleep: document.getElementById('sleepError'),
  medication: document.getElementById('medicationError'),
  activities: document.getElementById('activitiesError'),
  food: document.getElementById('foodError'),
  pain: document.getElementById('painError')
};

const STORAGE_KEY = 'heds-tracker-data';

// Debounce utility to limit validation frequency
function debounce(fn, wait = 250) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

// Escape HTML to prevent XSS
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}

// Live updates
fields.sleepOutput.textContent = `${fields.sleep.value}h`;
fields.painOutput.textContent = fields.painLevel.value;
fields.sleep.addEventListener('input', () => fields.sleepOutput.textContent = `${fields.sleep.value}h`);
fields.painLevel.addEventListener('input', () => fields.painOutput.textContent = fields.painLevel.value);

// Medication yes/no
[fields.medicationYes, fields.medicationNo].forEach(cb =>
  cb.addEventListener('change', () => {
    if (cb.checked) {
      [fields.medicationYes, fields.medicationNo].forEach(other => { if (other !== cb) other.checked = false; });
    }
    document.getElementById('medicationFields').hidden = !fields.medicationYes.checked;
    if (!fields.medicationYes.checked) fields.time.value = '';
  })
);

// Other fields toggle visibility
fields.activitiesOther.addEventListener('change', e => toggleOtherField(e, fields.otherActivities));
fields.foodOther.addEventListener('change', e => toggleOtherField(e, fields.otherFood));
fields.painOther.addEventListener('change', e => toggleOtherField(e, fields.otherPain));

function toggleOtherField(e, input) {
  input.hidden = !e.target.checked;
  if (!e.target.checked) input.value = '';
}

// Validation helpers
function validateDate() {
  const el = fields.date;
  el.setCustomValidity('');
  if (!el.value) el.setCustomValidity('Please select a date');
  errorEls.date.textContent = el.validationMessage;
  return el.checkValidity();
}

function validateSleep() {
  const el = fields.sleep;
  el.setCustomValidity('');
  if (!el.value) el.setCustomValidity('Please select your sleep hours');
  errorEls.sleep.textContent = el.validationMessage;
  return el.checkValidity();
}

function validateMedication() {
  const yes = fields.medicationYes.checked;
  const no = fields.medicationNo.checked;
  if (!yes && !no) {
    errorEls.medication.textContent = 'Please select Yes or No';
    return false;
  }
  if (yes && !fields.time.value) {
    errorEls.medication.textContent = 'Please enter medication time';
    return false;
  }
  errorEls.medication.textContent = '';
  return true;
}

function validateActivities() {
  const group = [fields.bikeWork, fields.bikeHome, fields.discgolf, fields.noActivities];
  const any = group.some(i => i.checked) || (fields.activitiesOther.checked && fields.otherActivities.value.trim() !== '');
  errorEls.activities.textContent = any ? '' : 'Please select or enter at least one activity';
  return any;
}

function validateFood() {
  const group = [fields.sugar, fields.wheat, fields.rye, fields.fodmap, fields.noFood];
  const any = group.some(i => i.checked) || (fields.foodOther.checked && fields.otherFood.value.trim() !== '');
  errorEls.food.textContent = any ? '' : 'Please select or enter a food';
  return any;
}

function validatePain() {
  const group = [fields.back, fields.legs, fields.arms, fields.migren, fields.head, fields.noPain];
  const any = group.some(i => i.checked) || (fields.painOther.checked && fields.otherPain.value.trim() !== '');
  if (!any) {
    errorEls.pain.textContent = 'Please select at least one pain type';
    return false;
  }
  errorEls.pain.textContent = '';
  return true;
}
// Schema validation before save
function validateSchema(data) {
  const required = ['date', 'sleep', 'painLevel'];
  for (const key of required) {
    if (!data[key] || data[key] === '') {
      console.warn(`Missing field: ${key}`);
      return false;
    }
  }
  return true;
}

// Local storage handling
function saveDraft() {
  const data = {};
  Object.keys(fields).forEach(key => {
    const el = fields[key];
    data[key] = el.type === 'checkbox' ? el.checked : el.value;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function restoreDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    Object.keys(fields).forEach(key => {
      const el = fields[key];
      if (!el) return;
      if (el.type === 'checkbox') el.checked = Boolean(data[key]);
      else el.value = data[key] || '';
    });
    document.getElementById('medicationFields').hidden = !fields.medicationYes.checked;
    fields.otherActivities.hidden = !fields.activitiesOther.checked;
    fields.otherFood.hidden = !fields.foodOther.checked;
    fields.otherPain.hidden = !fields.painOther.checked;
    fields.sleepOutput.textContent = `${fields.sleep.value}h`;
    fields.painOutput.textContent = fields.painLevel.value;
  } catch (e) {
    console.error('Restore error', e);
  }
}

['input', 'change'].forEach(evt => form.addEventListener(evt, debounce(saveDraft, 300)));
restoreDraft();

// Clear form
clearBtn.addEventListener('click', () => {
  form.reset();
  localStorage.removeItem(STORAGE_KEY);
  Object.values(errorEls).forEach(el => { if (el) el.textContent = ''; });
  document.getElementById('medicationFields').hidden = true;
  fields.otherActivities.hidden = true;
  fields.otherFood.hidden = true;
  fields.otherPain.hidden = true;
  fields.sleepOutput.textContent = `${fields.sleep.value}h`;
  fields.painOutput.textContent = fields.painLevel.value;
  summary.classList.add('visually-hidden');
  summary.innerHTML = '';
});

// Build summary with escaped HTML
function buildSummary() {
  const problems = [];
  if (!validateDate()) problems.push('Date missing');
  if (!validateSleep()) problems.push('Sleep missing');
  if (!validateMedication()) problems.push('Medication incomplete');
  if (!validateActivities()) problems.push('Activities incomplete');
  if (!validateFood()) problems.push('Food incomplete');
  if (!validatePain()) problems.push('Pain incomplete');

  if (problems.length) {
    summary.classList.remove('visually-hidden');
    summary.innerHTML = `<strong>Please fix:</strong><ul><li>${problems.map(escapeHTML).join('</li><li>')}</li></ul>`;
  } else {
    summary.classList.add('visually-hidden');
    summary.innerHTML = '';
  }
}

// Submit handler with loading state
form.addEventListener('submit', async e => {
  e.preventDefault();

  const ok = validateDate() && validateSleep() && validateMedication() && validateActivities() && validateFood() && validatePain();
  buildSummary();
  if (!ok) return;

  const payload = {};
  Object.keys(fields).forEach(key => {
    const el = fields[key];
    if (!el) return;
    payload[key] = (el.type === 'checkbox') ? el.checked : el.value;
  });

  if (!validateSchema(payload)) {
    alert('Some required data missing.');
    return;
  }

  // Show loading state
  const saveBtn = form.querySelector('.btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  document.getElementById('loadingOverlay').classList.add('active');

  try {
    const resp = await fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    alert('Saved successfully — demo id: ' + data.id);
  } catch (err) {
    alert('Network error. Try later.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
    document.getElementById('loadingOverlay').classList.remove('active');
  }
});
