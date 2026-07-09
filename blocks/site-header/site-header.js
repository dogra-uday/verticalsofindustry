/*
* site-header block
* Authoring pattern (document/block table):
*   Row 1: brand text | environment badge text (optional)
*   Row 2+: nav link label | link
*
* Renders a fixed enterprise-style top nav with brand mark, nav links,
* and an environment badge (e.g. "Sandbox · POC").
*/

export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const [brandRow, ...linkRows] = rows;
  const [brandCell, badgeCell] = [...brandRow.children];
  const brandText = brandCell?.textContent?.trim() || 'Site';
  const badgeText = badgeCell?.textContent?.trim() || '';

  const nav = document.createElement('div');
  nav.className = 'site-header-nav';

  const brand = document.createElement('div');
  brand.className = 'site-header-brand';
  brand.innerHTML = `<span class="site-header-mark">${brandText.slice(0, 2).toUpperCase()}</span><span>${brandText}</span>`;

  const links = document.createElement('div');
  links.className = 'site-header-links';
  linkRows.forEach((row) => {
    const [labelCell, linkCell] = [...row.children];
    const label = labelCell?.textContent?.trim();
    if (!label) return;
    const href = linkCell?.querySelector('a')?.getAttribute('href') || linkCell?.textContent?.trim() || '#';
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    links.append(a);
  });

  nav.append(brand, links);

  if (badgeText) {
    const badge = document.createElement('span');
    badge.className = 'site-header-badge';
    badge.textContent = badgeText;
    nav.append(badge);
  }

  block.textContent = '';
}
