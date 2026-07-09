export function renderDataTable({ columns, rows, actions = [] }) {
  return `
    <table class="table">
      <thead>
        <tr>${columns.map(c => `<th>${c.label}</th>`).join('')}
        ${actions.length ? '<th style="width: 80px;">Acciones</th>' : ''}</tr>
      </thead>
      <tbody>
        ${rows.length ? rows.map(row => `
          <tr>
            ${columns.map(c => `<td>${c.render ? c.render(row) : row[c.key] ?? '-'}</td>`).join('')}
            ${actions.length ? `<td>${actions.map(a => `<button class="btn btn-sm ${a.class}" data-action="${a.key}" data-id="${row.id}">${a.label}</button>`).join(' ')}</td>` : ''}
          </tr>
        `).join('') : '<tr><td colspan="99" style="text-align:center;padding:2rem;color:#94a3b8;">Sin datos</td></tr>'}
      </tbody>
    </table>
  `;
}
