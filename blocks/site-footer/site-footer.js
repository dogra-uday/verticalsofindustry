/*
* site-footer block
* Authoring pattern (document/block table):
*   Row 1..N-1: column title | links (each anchor in the cell becomes one link)
*   Row N (last row, single cell): copyright / bottom bar text
*
* Renders an enterprise-style multi-column footer with a bottom bar.
*/

export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const lastRow = rows[rows.length - 1];
  const isBottomBar = lastRow.children.length === 1;
  const columnRows = isBottomBar ? rows.slice(0, -1) : rows;
  const bottomText = isBottomBar ? lastRow.textContent.trim() : `© ${new Date().getFullYear()} All rights reserved.`;

  const wrap = document.createElement('div');
  wrap.className = 'site-footer-wrap';

  const columns = document.createElement('div');
  columns.className = 'site-footer-columns';

  columnRows.forEach((row) => {
    const [titleCell, linksCell] = [...row.children];
    const title = titleCell?.textContent?.trim();
    if (!title) return;

    const col = document.createElement('div');
    col.className = 'site-footer-column';
    const h4 = document.createElement('h4');
    h4.textContent = title;
    col.append(h4);

    const ul = document.createElement('ul');
    const anchors = linksCell?.querySelectorAll('a') || [];
    if (anchors.length) {
      anchors.forEach((a) => {
        const li = document.createElement('li');
        const clone = a.cloneNode(true);
        li.append(clone);
        ul.append(li);
      });
    } else if (linksCell?.textContent?.trim()) {
      const li = document.createElement('li');
      li.textContent = linksCell.textContent.trim();
      ul.append(li);
    }
    col.append(ul);
    columns.append(col);
  });

  const bottomBar = document.createElement('div');
  bottomBar.className = 'site-footer-bottom';
  bottomBar.textContent = bottomText;

  wrap.append(columns, bottomBar);
  block.textContent = '';
  block.append(wrap);
}
