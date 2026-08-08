# Wordle Timer Extension Notes

This extension injects a timer into the NYT Wordle page and saves completion results locally in Chrome storage.

## How a Chrome extension is made

A Chrome extension is made from simple web files: a manifest, HTML, CSS, and JavaScript. The manifest (`manifest.json`) declares permissions, scripts, popup UI, and page matches. Content scripts run inside matching web pages, action popups show the extension UI, and storage lets the extension keep data across browser sessions.

REQUIREMENTS:
- `manifest.json`: tells Chrome what the extension is and what it can do.
- `content_script.js`: code injected into the Wordle page to start/stop the timer and save results.
- `popup.html`: the extension popup window where saved history is shown.
- `popup.js`: handles loading and clearing stored results in the popup.
- `icon.png`: the extension icon shown in the toolbar.

How it runs:
1. Chrome loads the extension from the folder and reads `manifest.json`.
2. When the browser opens the Wordle page, Chrome injects `content_script.js` into that page.
3. The content script listens for the Wordle Play button and displays a timer overlay.
4. When the game finishes, the content script saves the result to `chrome.storage.local`.
5. When the user opens the extension popup, `popup.js` reads saved history and renders it in `popup.html`.

## Extension flow

- `manifest.json`: defines the extension, permissions, icon, popup, and content script injection rules.
- `content_script.js`: inserts the timer overlay, detects the Play button click, watches for Wordle completion, gathers the word, attempts, status, and duration, then stores the result.
- `popup.html`: displays the saved history table and buttons to refresh or clear history.
- `popup.js`: loads stored results, formats them for display, uppercases the guessed word, and clears history when requested.
