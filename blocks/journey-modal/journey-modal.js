/*
* journey-modal block
* Place once anywhere on the page (hidden until triggered). Listens for
* `vertical:selected` (dispatched by vertical-selector), fetches
* /data/journeys.json, and renders that vertical's steps as an enterprise-
* styled modal wizard: numbered stepper, validated fields, success state.
*/

const DATA_SOURCE = '/data/journeys.json';

const VALIDATORS = {
  aadhaar: (v) => /^\d{12}$/.test(v.replace(/\s/g, '')),
  pan: (v) => /^[A-Z]{5}\d{4}[A-Z]$/.test(v.trim().toUpperCase()),
  patientId: (v) => /^[A-Z0-9]{6,12}$/.test(v.trim().toUpperCase()),
  text: (v) => v.trim().length > 0,
  date: (v) => !!v,
  select: (v) => !!v,
};

let journeysCache = null;
async function fetchJourneys() {
  if (journeysCache) return journeysCache;
  const res = await fetch(DATA_SOURCE);
  if (!res.ok) throw new Error(`Failed to load journeys: ${res.status}`);
  journeysCache = await res.json();
  return journeysCache;
}

// "name:type:label[:hint][:options]" pipe-separated field specs
function parseFields(spec) {
  if (!spec) return [];
  return spec.split('|').map((f) => {
    const [name, type, label, hint, options] = f.split(':');
    return {
      name,
      type,
      label,
      hint: hint || null,
      options: options ? options.split(',') : null,
    };
  });
}

function renderField(field) {
  const wrap = document.createElement('div');
  wrap.className = 'journey-modal-field';

  const label = document.createElement('label');
  label.textContent = field.label;
  wrap.append(label);

  let input;
  if (field.type === 'select') {
    input = document.createElement('select');
    (field.options || []).forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      input.append(o);
    });
  } else {
    input = document.createElement('input');
    input.type = field.type === 'date' ? 'date' : 'text';
    if (field.hint) input.placeholder = field.hint;
  }
  input.name = field.name;
  input.dataset.validateType = field.type;
  wrap.append(input);

  if (field.hint) {
    const hint = document.createElement('div');
    hint.className = 'journey-modal-hint';
    hint.textContent = field.hint;
    wrap.append(hint);
  }

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

  function close() { block.hidden = true; }
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  function renderStepper() {
    stepperEl.innerHTML = '';
    steps.forEach((_, i) => {
      const item = document.createElement('div');
      item.className = 'journey-modal-step-item';
      const circle = document.createElement('div');
      circle.className = 'journey-modal-step-circle'
        + (i === currentStep ? ' is-active' : '')
        + (i < currentStep ? ' is-complete' : '');
      circle.textContent = i < currentStep ? '\u2713' : String(i + 1);
      item.append(circle);
      if (i < steps.length - 1) {
        const line = document.createElement('div');
        line.className = 'journey-modal-step-line' + (i < currentStep ? ' is-complete' : '');
        item.append(line);
      }
      stepperEl.append(item);
    });
  }

  function renderPanel() {
    panel.innerHTML = '';
    const step = steps[currentStep];
    const h4 = document.createElement('h4');
    h4.textContent = step.title;
    panel.append(h4);

    const fields = parseFields(step.fields);
    fields.forEach((field) => panel.append(renderField(field)));

    if (!fields.length) {
      const p = document.createElement('p');
      p.className = 'journey-modal-review-text';
      p.textContent = 'Review your information above, then submit to complete this journey.';
      panel.append(p);
    }

    backBtn.disabled = currentStep === 0;
    nextBtn.textContent = currentStep === steps.length - 1 ? 'Submit' : 'Next';
  }

  function validateCurrentStep() {
    let valid = true;
    panel.querySelectorAll('[data-validate-type]').forEach((input) => {
      const fn = VALIDATORS[input.dataset.validateType] || (() => true);
      const ok = fn(input.value || '');
      input.classList.toggle('is-invalid', !ok);
      if (!ok) valid = false;
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
      document.dispatchEvent(new CustomEvent('journey:complete', { detail: { vertical: vertical.id } }));
      renderSuccess();
    }
  });

  document.addEventListener('vertical:selected', async (e) => {
    vertical = e.detail;
    currentStep = 0;

    icon.style.background = vertical.color || '#2e5eaa';
    icon.textContent = (vertical.title || '').slice(0, 2).toUpperCase();
    title.textContent = `${vertical.title} onboarding`;
    sub.textContent = vertical.tag || '';

    try {
      const journeys = await fetchJourneys();
      steps = journeys[vertical.id]?.data || [];
      if (!steps.length) {
        panel.innerHTML = `<p>No journey configured yet for ${vertical.title}.</p>`;
      } else {
        renderStepper();
        renderPanel();
      }
      block.hidden = false;
    } catch (err) {
      panel.innerHTML = '<p class="journey-modal-error">Unable to load this journey right now.</p>';
      block.hidden = false;
      // eslint-disable-next-line no-console
      console.error(err);
    }
  });
}
