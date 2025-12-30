# DIT Result Viewer ✅

A lightweight front-end for viewing internal assessment results for Manmohan Memorial Polytechnic — Department of Information Technology.

---

## Overview

This project provides a small web UI that queries a remote Google Apps Script / sheet-based API to fetch and display student assessment results. It supports roll number, semester and DOB verification and renders a printable result card.

## Features

- Simple form-based UI (`index.html`) to request results
- Client-side DOB parsing and validation with flexible formats (YYYY-MM-DD, DD/MM/YYYY, etc.)
- Pretty, responsive result display with print support (`styles.css`)
- Inlined/combined JavaScript logic that calls a Google Apps Script endpoint (`app.js` / inlined in `index.html`)
- Helpful error messages and debug logging for easier troubleshooting

---

## Quick start 🚀

1. Clone or copy the project files to a local folder.
2. Recommended: run a simple local HTTP server (some browsers block fetch on `file://`):
   - Python 3: `python -m http.server 8000`
   - Or use the VS Code Live Server extension
3. Open `http://localhost:8000/` (or the server URL) and use the form to view results.

Note: Network requests go to the configured `API_URL` in the JS. Ensure that endpoint is reachable and allows CORS from your origin.

---

## Usage

- Enter **Roll No**, select **Semester**, and enter **DOB** (supported formats: `YYYY-MM-DD`, `YYYY/MM/DD`, `DD/MM/YYYY`, `MM/DD/YYYY`).
- Click **View Result**. If the record matches (Roll, Semester, DOB), a result card is displayed and can be printed.

---

## Development & Notes 🔧

- Main files:
  - `index.html` — UI and inlined JS
  - `styles.css` — styling for the result card and form
  - `app.js` — combined JS (also present in `backup_js/` as references)
- Adjust the API endpoint by editing `API_URL` at the top of the JS.
- If you see CORS or `file://` errors, serve the site over HTTP and check the remote API CORS policy.

---

## Troubleshooting

- "Page opened via file://" — open via HTTP server (see Quick start).
- "Server returned ..." — the API returned an error; check network console and the API URL.
- DOB validation errors — ensure DOB is in one of the accepted formats and not a future date.

---

## File structure

```
DIT_result/
  ├─ index.html
  ├─ styles.css
  ├─ app.js
  ├─ README.md
  └─ backup_js/
      ├─ app.js
      ├─ debug_app.js
      ├─ main.js
      └─ script.js
```

---

## License

MIT — feel free to adapt for educational and internal use.

---

If you'd like, I can also add a short CONTRIBUTING guide or tidy up `app.js` to remove duplicated/trailing code. 💡
