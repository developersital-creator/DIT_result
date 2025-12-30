const API_URL = "https://script.google.com/macros/s/AKfycbyvu_zDHgUVGe3v0xVZwFU7bbO7G3lMqBVOCG0N0dqeyZNsdKcTmkt4wdp5HLOx7tSLEQ/exec";

function setOutput(html) {
  const out = document.getElementById('output');
  if (out) out.innerHTML = html; else console.warn('Output container not found');
}

async function viewResult() {
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

  const url = `${API_URL}?roll=${encodeURIComponent(roll)}&sem=${encodeURIComponent(sem)}&dob=${encodeURIComponent(dobInput)}`;
  console.log('Fetching result from:', url);
  setOutput('<p class="muted">Loading results…</p>');

  try {
    const res = await fetch(url, { mode: 'cors' });
    console.log('Fetch completed. Status:', res.status, res.statusText);

    const text = await res.text();
    console.log('Response text:', text);

    if (!res.ok) {
      setOutput(`<p class='error'><i class='fas fa-exclamation-circle'></i> Server returned ${res.status} ${res.statusText}</p>`);
      return;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error('Failed to parse JSON response:', parseErr);
      setOutput('<p class="error"><i class="fas fa-exclamation-circle"></i> Server returned non-JSON response — check console network/response.</p>');
      return;
    }

    if (data.error) {
      setOutput(`<p class='error'><i class='fas fa-exclamation-circle'></i> ${data.error}</p>`);
      return;
    }

    let dobDisplay = data.DOB;
    if (dobDisplay) {
      const d = new Date(dobDisplay);
      dobDisplay = `${('0'+d.getDate()).slice(-2)}/${('0'+(d.getMonth()+1)).slice(-2)}/${d.getFullYear()}`;
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
          <div><b>DOB</b> ${dobDisplay || '-'}</div>
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

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('button[onclick="viewResult()"]');
  if (btn) btn.addEventListener('click', viewResult);

  ['roll','dob'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keypress', (e) => { if (e.key === 'Enter') viewResult(); });
  });
});