// popup script for Wordle Timer: renders saved results and handles refresh/clear actions.
const status_el = document.getElementById('status');
const tbody = document.querySelector('#results tbody');
const refresh_button = document.getElementById('refresh');

// update the status text shown in the popup.
function set_status(message, error = false) {
  status_el.textContent = message;
  status_el.style.color = error ? '#b00020' : '#333';
}

function render_results(results) {
  tbody.innerHTML = '';
  if (!results || !results.length) {
    tbody.innerHTML = '<tr><td colspan="5">No saved results yet.</td></tr>';
    return;
  }

  for (const row of results.slice().reverse()) {
    const statusText = row.status || '';
    const statusClass = statusText.toUpperCase() === 'SOLVED' ? 'result-status-solved' : 'result-status-failed';
    const attempts = row.attempts != null ? row.attempts : -1;
    const attemptText = attempts === -1 ? '-' : attempts;
    const resultWord = row.word ? row.word.toString().toUpperCase() : 'UNKNOWN';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.date || ''}</td>
      <td>${resultWord}</td>
      <td>${format_time(row.duration_seconds || 0)}</td>
      <td>${attemptText}</td>
      <td><span class="${statusClass}">${statusText}</span></td>
    `;
    tbody.appendChild(tr);
  }
}


refresh_button.addEventListener('click', load_results);
load_results();
