// Combined app.js — consolidated from previous JS files (main.js, script.js, debug_app.js)
// Adds DOB validation (accepts YYYY-MM-DD, DD/MM/YYYY or DD-MM-YYYY) and unified UI logic

const API_URL = "https://script.google.com/macros/s/AKfycbyvu_zDHgUVGe3v0xVZwFU7bbO7G3lMqBVOCG0N0dqeyZNsdKcTmkt4wdp5HLOx7tSLEQ/exec";

function setOutput(html) {
  const out = document.getElementById('output');
  if (out) out.innerHTML = html; else console.warn('Output container not found');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[s]);
}

function debugLog(msg) {
  const dbg = document.getElementById('debug');
  if (dbg) dbg.textContent += msg + "\n";
  console.debug(msg);
}

// Global error handlers to show JS/runtime issues on the page for easier diagnosis
window.addEventListener('error', e => {
  const msg = `JS Error: ${e.message} at ${e.filename}:${e.lineno}:${e.colno}`;
  debugLog(msg);
  setOutput(`<p class='error'><i class='fas fa-exclamation-circle'></i> ${escapeHtml(msg)}</p>`);
  console.error(e.error || e.message, e);
});

window.addEventListener('unhandledrejection', e => {
  const reason = (e.reason && (e.reason.message || e.reason)) || String(e.reason);
  const msg = `Unhandled Promise Rejection: ${reason}`;
  debugLog(msg);
  setOutput(`<p class='error'><i class='fas fa-exclamation-circle'></i> ${escapeHtml(msg)}</p>`);
  console.error('Unhandled rejection', e);
});

function parseDOB(input) {
  if (!input) return null;
  input = input.trim();
  // Enforce YYYY-MM-DD format to match sheet
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const [y,m,d] = input.split('-').map(Number);
  const date = new Date(y, m-1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m-1 || date.getDate() !== d) return null;
  const now = new Date();
  if (date > now) return null; // future DOB invalid
  if (y < 1900) return null; // too old / invalid
  return date;
}

function formatDisplayDate(date) {
  if (!date) return '-';
  return `${date.getFullYear()}-${('0'+(date.getMonth()+1)).slice(-2)}-${('0'+date.getDate()).slice(-2)}`;
}

async function viewResult() {
  // Quick check: if the page is opened via file:// some browsers block fetch/CORS
  if (location.protocol === 'file:') {
    setOutput("<p class='error'><i class='fas fa-exclamation-circle'></i> Page opened via file:// — open over HTTP (e.g. run 'python -m http.server' or use VSCode Live Server) to allow network requests.</p>");
    console.warn('Page opened via file:// — fetching may be blocked by browser');
    return;
  }

  const roll = document.getElementById("roll").value.trim();
  const sem = document.getElementById("sem").value;
  const dobInput = document.getElementById("dob").value.trim();

  if (!roll || !sem || !dobInput) {
    setOutput("<p class='error'><i class='fas fa-exclamation-circle'></i> Please enter Roll No, Semester, and DOB</p>");
    return;
  }

  const parsed = parseDOB(dobInput);
  if (!parsed) {
    setOutput("<p class='error'><i class='fas fa-exclamation-circle'></i> Invalid DOB. Use YYYY-MM-DD.</p>");
    return;
  }

  const dobForServer = parsed.toISOString().slice(0,10); // YYYY-MM-DD

  const requestUrl = `${API_URL}?roll=${encodeURIComponent(roll)}&sem=${encodeURIComponent(sem)}&dob=${encodeURIComponent(dobForServer)}`;

  // Show debug info on the page when ?debug=1 is present
  const debug = new URLSearchParams(location.search).get('debug');
  if (debug === '1') {
    setOutput(`<pre class="muted">Debug:\nroll=${roll}\nsem=${sem}\ndob=${dobInput}\nrequestUrl=${requestUrl}</pre>`);
  } else {
    setOutput('<p class="muted">Loading results…</p>');
  }

  try {
    const res = await fetch(requestUrl, { mode: 'cors' });

    const respText = await res.text();
    debugLog(`HTTP ${res.status} ${res.statusText} — body length ${respText.length}`);

    if (!res.ok) {
      setOutput(`<p class='error'><i class='fas fa-exclamation-circle'></i> Server returned ${res.status} ${res.statusText}<br><pre>${escapeHtml(respText)}</pre></p>`);
      console.error('Non-OK response', res.status, res.statusText, respText);
      return;
    }

    let data;
    try {
      data = JSON.parse(respText);
    } catch (parseErr) {
      setOutput(`<p class='error'><i class='fas fa-exclamation-circle'></i> Server returned non-JSON response:<br><pre>${escapeHtml(respText)}</pre></p>`);
      console.error('JSON parse error', parseErr, respText);
      return;
    }

    if (data.error) {
      setOutput(`<p class='error'><i class='fas fa-exclamation-circle'></i> ${data.error}</p>`);
      return;
    }

    // Prefer showing raw YYYY-MM-DD from the sheet; otherwise attempt to parse and normalize
    let dobDisplay = '-';
    if (data.DOB) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(data.DOB)) dobDisplay = data.DOB;
      else {
        const d = new Date(data.DOB);
        dobDisplay = formatDisplayDate(d);
      }
    }

    const subjects = Array.isArray(data.Subjects) ? data.Subjects : [];
    let totalMarks = 0;
    let totalAttendance = 0;
    let overallPass = true;

    const genDate = new Date().toLocaleDateString();

    let html = `
    <div class="result-card card-shadow">
      <div class="result-header">
        <div class="college-left">
          <img src="download.jpeg" alt="Logo">
          <div>
            <div class="college-name">Manmohan Memorial Polytechnic</div>
            <div class="dept">Department of Information Technology</div>
          </div>
        </div>
        <div class="result-meta">
          <div class="assessment-title">1st Internal Assessment</div>
          <div class="small muted">Generated: ${genDate}</div>
        </div>
      </div>

      <div class="student-info">
        <div><b>Student</b> ${data.Name || '-'}</div>
        <div><b>Roll No.</b> ${data['Roll No'] || '-'}</div>
        <div><b>Semester</b> ${data.Semester || '-'}</div>
        <div><b>DOB</b> ${dobDisplay}</div>
      </div>

      <div class="table-wrap">
        <table class="result-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Marks</th>
              <th class="center">Attendance</th>
              <th class="center">Status</th>
            </tr>
          </thead>
          <tbody>`;

    subjects.forEach(sub => {
      const mark = Number(sub.mark) || 0;
      const att = Number(sub.attendance) || 0;
      const isPass = mark >= 8;
      if (!isPass) overallPass = false;
      const statusHtml = isPass
        ? `<span class="status pass"><i class="fas fa-check-circle"></i> Pass</span>`
        : `<span class="status fail"><i class="fas fa-times-circle"></i> Fail</span>`;
      html += `<tr class="${isPass ? 'pass' : 'fail'}"><td class="subject">${sub.name}</td><td class="center">${mark}</td><td class="center">${att}%</td><td class="center">${statusHtml}</td></tr>`;
      totalMarks += mark;
      totalAttendance += att;
    });

    const avgAttendance = subjects.length ? (totalAttendance / subjects.length).toFixed(2) : '0.00';
    const overallStatus = subjects.length ? (overallPass ? 'Pass' : 'Fail') : '-';
    const overallHtml = overallStatus === '-' ? '-' : (overallStatus === 'Pass'
      ? `<span class="status pass"><i class="fas fa-check-circle"></i> Pass</span>`
      : `<span class="status fail"><i class="fas fa-times-circle"></i> Fail</span>`);

    html += `</tbody>
          <tfoot>
            <tr class="summary-row">
              <th>Total</th>
              <th>${totalMarks}</th>
              <th class="center">${avgAttendance}%</th>
              <th class="center">${overallHtml}</th>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="actions">
        <button class="btn-print" onclick="window.print()"><i class="fas fa-print"></i> Print</button>
      </div>

      <div class="signatures">
        <div class="signature">
          <div class="sig-line"></div>
          <div class="sig-title">Examiner</div>
        </div>
        <div class="signature">
          <div class="sig-line"></div>
          <div class="sig-title">Head of Department</div>
        </div>
      </div>
    </div>`;

    setOutput(html);

  } catch (err) {
    console.error('Fetch error:', err);
    setOutput(`<p class='error'><i class='fas fa-exclamation-circle'></i> Fetch error: ${err.message}</p>`);
  }
}

// Attach event handlers and add small UX improvements
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('button[onclick="viewResult()"]');
  if (btn) btn.addEventListener('click', viewResult);

  // Allow Enter to submit on inputs
  ['roll','dob'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keypress', (e) => { if (e.key === 'Enter') viewResult(); });
  });
});

































































































































});

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('button[onclick="viewResult()"]');
  if (btn) btn.addEventListener('click', viewResult);

  ['roll','dob'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keypress', (e) => { if (e.key === 'Enter') viewResult(); });
  });
});  }    setOutput("<p class='error'><i class='fas fa-exclamation-circle'></i> Error fetching results. Check the API URL and CORS settings.</p>");    console.error(err);  } catch (err) {    setOutput(html);      </div>`;        </div>          </div>            <div class="sig-title">Head of Department</div>            <div class="sig-line"></div>          <div class="signature">          </div>            <div class="sig-title">Examiner</div>            <div class="sig-line"></div>          <div class="signature">        <div class="signatures">        </div>          <button class="btn-print" onclick="window.print()"><i class="fas fa-print"></i> Print</button>        <div class="actions">        </div>          </table>            </tfoot>              </tr>                <th class="center">${overallHtml}</th>                <th class="center">${avgAttendance}%</th>                <th>${totalMarks}</th>                <th>Total</th>              <tr class="summary-row">            <tfoot>    html += `</tbody>      : `<span class="status fail"><i class="fas fa-times-circle"></i> Fail</span>`);      ? `<span class="status pass"><i class="fas fa-check-circle"></i> Pass</span>`    const overallHtml = overallStatus === '-' ? '-' : (overallStatus === 'Pass'    const overallStatus = subjects.length ? (overallPass ? 'Pass' : 'Fail') : '-';    const avgAttendance = subjects.length ? (totalAttendance / subjects.length).toFixed(2) : '0.00';    });      totalAttendance += att;      totalMarks += mark;      html += `<tr class="${isPass ? 'pass' : 'fail'}"><td class="subject">${sub.name}</td><td class="center">${mark}</td><td class="center">${att}%</td><td class="center">${statusHtml}</td></tr>`;        : `<span class="status fail"><i class="fas fa-times-circle"></i> Fail</span>`;        ? `<span class="status pass"><i class="fas fa-check-circle"></i> Pass</span>`      const statusHtml = isPass      if (!isPass) overallPass = false;      const isPass = mark >= 8;      const att = Number(sub.attendance) || 0;      const mark = Number(sub.mark) || 0;    subjects.forEach(sub => {            <tbody>`;            </thead>              </tr>                <th class="center">Status</th>                <th class="center">Attendance</th>                <th>Marks</th>                <th>Subject</th>              <tr>            <thead>          <table class="result-table">        <div class="table-wrap">        </div>          <div><b>DOB</b> ${dobDisplay || '-'}</div>          <div><b>Semester</b> ${data.Semester || '-'}</div>          <div><b>Roll No.</b> ${data['Roll No'] || '-'}</div>          <div><b>Student</b> ${data.Name || '-'}</div>        <div class="student-info">        </div>          </div>            <div class="small muted">Generated: ${genDate}</div>            <div class="assessment-title">1st Internal Assessment</div>          <div class="result-meta">          </div>            </div>              <div class="dept">Department of Information Technology</div>              <div class="college-name">Manmohan Memorial Polytechnic</div>            <div>            <img src="download.jpeg" alt="Logo">          <div class="college-left">        <div class="result-header">      <div class="result-card card-shadow">    let html = `    const genDate = new Date().toLocaleDateString();    let overallPass = true;    let totalAttendance = 0;    let totalMarks = 0;    const subjects = Array.isArray(data.Subjects) ? data.Subjects : [];    }      dobDisplay = `${('0'+d.getDate()).slice(-2)}/${('0'+(d.getMonth()+1)).slice(-2)}/${d.getFullYear()}`;      const d = new Date(dobDisplay);    if (dobDisplay) {    let dobDisplay = data.DOB;    }      return;      setOutput(`<p class='error'><i class='fas fa-exclamation-circle'></i> ${data.error}</p>`);    if (data.error) {    const data = await res.json();    }      return;      setOutput(`<p class='error'><i class='fas fa-exclamation-circle'></i> Server returned ${res.status} ${res.statusText}</p>`);      console.error('Non-OK response', res.status, res.statusText);    if (!res.ok) {    const res = await fetch(`${API_URL}?roll=${encodeURIComponent(roll)}&sem=${encodeURIComponent(sem)}&dob=${encodeURIComponent(dobInput)}`);  try {n  setOutput('<p class="muted">Loading results…</p>');