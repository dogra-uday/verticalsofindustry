/*
* vertical-selector block
* Data-driven from /data/verticals.json (no per-row block-table authoring
* required — drop this block anywhere on the home page).
*
* Selecting a card does not navigate. It dispatches a `vertical:selected`
* CustomEvent on `document` with the full vertical record, which the
* `journey-modal` block listens for and opens as an overlay wizard.
*/

const DATA_SOURCE = '/data/verticals.json';

async function fetchVerticals() {
  const res = await fetch(DATA_SOURCE);
  if (!res.ok) throw new Error(`Failed to load verticals: ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

function buildCard(vertical) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'vertical-selector-card';
  card.dataset.verticalId = vertical.id;
  card.style.setProperty('--vertical-color', vertical.color || '#2e5eaa');

  card.innerHTML = `
    <span class="vertical-selector-bar"></span>
    <span class="vertical-selector-body">
      <span class="vertical-selector-eyebrow">${vertical.tag || ''}</span>
      <h3 class="vertical-selector-title">${vertical.title}</h3>
      <p class="vertical-selector-desc">${vertical.description}</p>
      <span class="vertical-selector-meta">
        <span class="vertical-selector-time">${vertical.time || ''}</span>
        <span class="vertical-selector-cta">Start →</span>
      </span>
    </span>
  `;

  card.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('vertical:selected', { detail: vertical }));
  });

  return card;
}

export default async function decorate(block) {
  block.textContent = '';
  const grid = document.createElement('div');
  grid.className = 'vertical-selector-grid';
  block.append(grid);

  try {
    const verticals = await fetchVerticals();
    verticals.forEach((v) => grid.append(buildCard(v)));
  } catch (err) {
    grid.innerHTML = '<p class="vertical-selector-error">Unable to load verticals right now.</p>';
    // eslint-disable-next-line no-console
    console.error(err);
  }
}
