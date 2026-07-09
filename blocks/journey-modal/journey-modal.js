/*
* journey-modal block
* Place once anywhere on the page (hidden until triggered). Listens for
* `vertical:selected` (dispatched by vertical-selector), fetches
* /data/journeys.json, and renders that vertical's steps as an enterprise-
* styled modal wizard.
*
* Field schema (in journeys.json), per step:
*   {
*     "name": "fullName",
*     "type": "text" | "email" | "mobile" | "date" | "dob" | "select" |
*             "aadhaar" | "pan" | "patientId",
*     "label": "Full Name",
*     "hint": "optional helper text shown under the field",
*     "options": ["Male", "Female", "Other"],       // required for type=select
*     "required": true,                              // default true
*     "condition": { "field": "hasNominee", "equals": "Yes" }  // optional
*   }
*
* The final step of a journey should have an empty `fields` array — it will
* auto-render a review summary of everything entered in prior steps.
*/

const DATA_SOURCE = '/data/journeys.json';

const VALIDATORS = {
  text: { fn: (v) => v.trim().length > 0, message: 'This field is required.' },
  email: {
    fn: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
    message: 'Enter a valid email address.',
  },
  mobile: {
    fn: (v) => /^[6-9]\d{9}$/.test(v.replace(/\s/g, '')),
    message: 'Enter a valid 10-digit mobile number.',
  },
  date: { fn: (v) => !!v, message: 'Select a date.' },
  dob: {
    fn: (v) => {
      if (!v) return false;
      const dob = new Date(v);
      const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return age >= 18;
    },
    message: 'You must be 18 or older.',
  },
  select: { fn: (v) => !!v, message: 'Please select an option.' },
  aadhaar: {
    fn: (v) => /^\d{12}$/.test(v.replace(/\s/g, '')),
    message: 'Enter a valid 12-digit Aadhaar number.',
  },
  pan: {
    fn: (v) => /^[A-Z]{5}\d{4}[A-Z]$/.test(v.trim().toUpperCase()),
    message: 'Enter a valid PAN (format: ABCDE1234F).',
  },
  patientId: {
    fn: (v) => /^[A-Z0-9]{6,12}$/.test(v.trim().toUpperCase()),
    message: 'Enter a valid Patient ID (6-12 alphanumeric characters).',
  },
  pincode: {
    fn: (v) => /^\d{6}$/.test(v.trim()),
    message: 'Enter a valid 6-digit pincode.',
  },
  cardLast4: {
    fn: (v) => /^\d{4}$/.test(v.trim()),
    message: 'Enter the last 4 digits of your card.',
  },
};

const DATE_TYPES = new Set(['date', 'dob']);

let journeysCache = null;
async function fetchJourneys() {
  if (journeysCache) return journeysCache;
  const res = await fetch(DATA_SOURCE);
  if (!res.ok) throw new Error(`Failed to load journeys: ${res.status}`);
  journeysCache = await res.json();
  return journeysCache;
}

function conditionMet(field, formState) {
  if (!field.condition) return true;
  const { field: depName, equals } = field.condition;
  return formState[depName] === equals;
}

function renderField(field, formState) {
  const wrap = document.createElement('div');
  wrap.className = 'journey-modal-field';
  wrap.dataset.fieldName = field.name;
  if (field.condition) wrap.dataset.conditionField = field.condition.field;
  if (!conditionMet(field, formState)) wrap.hidden = true;

  const label = document.createElement('label');
  label.textContent = field.label + (field.required === false ? '' : ' *');
  wrap.append(label);

  let input;
  if (field.type === 'select') {
    input = document.createElement('select');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select…';
    input.append(placeholder);
    (field.options || []).forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      input.append(o);
    });
  } else {
    input = document.createElement('input');
    input.type = DATE_TYPES.has(field.type) ? 'date' : 'text';
    if (field.hint) input.placeholder = field.hint;
  }
  input.name = field.name;
  input.dataset.validateType = field.type;
  input.dataset.required = field.required === false ? 'false' : 'true';
  if (formState[field.name] !== undefined) input.value = formState[field.name];
  wrap.append(input);

  if (field.hint) {
    const hint = document.createElement('div');
    hint.className = 'journey-modal-hint';
    hint.textContent = field.hint;
    wrap.append(hint);
  }

  const error = document.createElement('div');
  error.className = 'journey-modal-error-text';
  wrap.append(error);

  return wrap;
}

function buildSummary(steps, formState) {
  const wrap = document.createElement('div');
  wrap.className = 'journey-modal-summary';
  steps.forEach((step) => {
    (step.fields || []).forEach((field) => {
      if (formState[field.name] === undefined || formState[field.name] === '') return;
      const row = document.createElement('div');
      row.className = 'journey-modal-summary-row';
      row.innerHTML = `<span class="journey-modal-summary-k">${field.label}</span><span class="journey-modal-summary-v">${formState[field.name]}</span>`;
      wrap.append(row);
    });
  });
  return wrap;
}

export default function decorate(block) {
  block.textContent = '';
  block.className = 'journey-modal';
  block.hidden = true;

  const overlay = document.createElement('div');
  overlay.className = 'journey-modal-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'journey-modal-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');

  const header = document.createElement('div');
  header.className = 'journey-modal-header';
  const headerLeft = document.createElement('div');
  headerLeft.className = 'journey-modal-header-left';
  const icon = document.createElement('div');
  icon.className = 'journey-modal-icon';
  const headerText = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'journey-modal-title';
  const sub = document.createElement('div');
  sub.className = 'journey-modal-sub';
  headerText.append(title, sub);
  headerLeft.append(icon, headerText);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'journey-modal-close';
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = '&times;';
  header.append(headerLeft, closeBtn);

  const stepperEl = document.createElement('div');
  stepperEl.className = 'journey-modal-stepper';

  const panel = document.createElement('div');
  panel.className = 'journey-modal-panel';

  const nav = document.createElement('div');
  nav.className = 'journey-modal-nav';
  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'journey-modal-btn';
  backBtn.textContent = 'Back';
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'journey-modal-btn primary';
  nextBtn.textContent = 'Next';
  nav.append(backBtn, nextBtn);

  dialog.append(header, stepperEl, panel, nav);
  overlay.append(dialog);
  block.append(overlay);

  let steps = [];
  let currentStep = 0;
  let vertical = null;
  let formState = {};

  function close() { block.hidden = true; }
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  function renderStepper() {
    stepperEl.innerHTML = '';
    steps.forEach((_, i) => {
      const item = document.createElement('div');
      item.className = 'journey-modal-step-item';
      const circle = document.createElement('div');
      circle.className = `journey-modal-step-circle${i === currentStep ? ' is-active' : ''}${i < currentStep ? ' is-complete' : ''}`;
      circle.textContent = i < currentStep ? '\u2713' : String(i + 1);
      item.append(circle);
      if (i < steps.length - 1) {
        const line = document.createElement('div');
        line.className = `journey-modal-step-line${i < currentStep ? ' is-complete' : ''}`;
        item.append(line);
      }
      stepperEl.append(item);
    });
  }

  function attachConditionalListeners() {
    const controllers = new Set([...panel.querySelectorAll('[data-condition-field]')].map((w) => w.dataset.conditionField));
    controllers.forEach((depName) => {
      const controllerInput = panel.querySelector(`[name="${depName}"]`);
      if (!controllerInput) return;
      controllerInput.addEventListener('change', () => {
        formState[depName] = controllerInput.value;
        panel.querySelectorAll(`[data-condition-field="${depName}"]`).forEach((wrap) => {
          const name = wrap.dataset.fieldName;
          const field = steps[currentStep].fields.find((f) => f.name === name);
          wrap.hidden = !conditionMet(field, formState);
        });
      });
    });
  }

  function renderPanel() {
    panel.innerHTML = '';
    const step = steps[currentStep];
    const h4 = document.createElement('h4');
    h4.textContent = step.title;
    panel.append(h4);

    const fields = step.fields || [];
    if (!fields.length) {
      const p = document.createElement('p');
      p.className = 'journey-modal-review-text';
      p.textContent = 'Review your information below, then submit to complete this journey.';
      panel.append(p);
      panel.append(buildSummary(steps, formState));
    } else {
      fields.forEach((field) => panel.append(renderField(field, formState)));
      attachConditionalListeners();
    }

    backBtn.disabled = currentStep === 0;
    nextBtn.textContent = currentStep === steps.length - 1 ? 'Submit' : 'Next';
  }

  function validateCurrentStep() {
    let valid = true;
    const fields = steps[currentStep].fields || [];
    fields.forEach((field) => {
      const wrap = panel.querySelector(`[data-field-name="${field.name}"]`);
      if (!wrap || wrap.hidden) return; // skip hidden conditional fields
      const input = wrap.querySelector('[data-validate-type]');
      const errorEl = wrap.querySelector('.journey-modal-error-text');
      const required = input.dataset.required !== 'false';
      const value = input.value || '';

      if (!required && value.trim() === '') {
        input.classList.remove('is-invalid');
        errorEl.textContent = '';
        return;
      }

      const validator = VALIDATORS[input.dataset.validateType] || VALIDATORS.text;
      const ok = validator.fn(value);
      input.classList.toggle('is-invalid', !ok);
      errorEl.textContent = ok ? '' : validator.message;
      if (!ok) valid = false;
      else formState[field.name] = value;
    });
    return valid;
  }

  function renderSuccess() {
    stepperEl.innerHTML = '';
    nav.innerHTML = '';
    panel.innerHTML = `
      <div class="journey-modal-success">
        <div class="journey-modal-success-icon">&#10003;</div>
        <h4>${vertical.title} journey complete</h4>
        <p>Your submission has been recorded for this sandbox demo.</p>
      </div>
    `;
    const doneBtn = document.createElement('button');
    doneBtn.className = 'journey-modal-btn primary journey-modal-btn-full';
    doneBtn.textContent = 'Close';
    doneBtn.addEventListener('click', close);
    nav.append(doneBtn);
  }

  backBtn.addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep -= 1;
      renderStepper();
      renderPanel();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (!validateCurrentStep()) return;
    if (currentStep < steps.length - 1) {
      currentStep += 1;
      renderStepper();
      renderPanel();
    } else {
      document.dispatchEvent(new CustomEvent('journey:complete', { detail: { vertical: vertical.id, data: formState } }));
      renderSuccess();
    }
  });

  document.addEventListener('vertical:selected', async (e) => {
    vertical = e.detail;
    currentStep = 0;
    formState = {};
    nav.hidden = false;

    icon.style.background = vertical.color || '2e5eaa';
    icon.textContent = (vertical.title || '').slice(0, 2).toUpperCase();
    title.textContent = `${vertical.title} onboarding`;
    sub.textContent = vertical.tag || '';
    try {
      const journeys = await fetchJourneys();
      steps = journeys[vertical.id]?.data || [];
      if (!steps.length) {
        panel.innerHTML = `<p> No journey configured yet for ${vertical.title}.<p>`;
      } else {
        renderStepper();
        renderPanel();
      }
      block.hidden = false;
    } catch (err) {
      panel.innerHTML = '<p class="journey-modal-error">Unable to load this journey right now.</p>';
      block.hidden = false;
      console.error(err);
    }
  });
}
