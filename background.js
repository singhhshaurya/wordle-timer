// Background script for the Wordle Timer extension.
// Initializes persistent storage on installation and ensures the
// `wordleTimerResults` array exists in `chrome.storage.local`.

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ wordleTimerResults: [] }, (data) => {
    if (!Array.isArray(data.wordleTimerResults)) {
      chrome.storage.local.set({ wordleTimerResults: [] });
    }
  });
});
