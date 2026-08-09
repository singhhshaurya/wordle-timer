// content script for Wordle Timer: injects timer display, starts/stops the timer, and saves results.


const play_button_selector = '[data-testid="Play"]';
let timer_running = false;
let start_time = 0;
let elapsed_ms = 0;
let timer_interval = null;
let observer = null;


// create or return the timer display overlay on the page.
function create_timer_display() {
  let box = document.getElementById('wordle-timer-display');
  if (box) return box;

  box = document.createElement('div');
  box.id = 'wordle-timer-display';
  box.style.position = 'fixed';
  box.style.top = '60px';
  box.style.right = '12px';
  box.style.zIndex = 2147483647;
  box.style.padding = '10px 14px';
  box.style.background = 'rgba(0, 0, 0, 0.75)';
  box.style.color = '#fff';
  box.style.fontSize = '14px';
  box.style.fontFamily = 'Arial, sans-serif';
  box.style.borderRadius = '8px';
  box.style.boxShadow = '0 0 12px rgba(0,0,0,0.35)';
  box.style.pointerEvents = 'none';
  box.textContent = 'Wordle Timer ready YAY';
  document.body.appendChild(box);
  return box;
}

// Format elapsed milliseconds into MM:SS text.
function format_time(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = seconds.toString().padStart(2, '0');
  return `${minutes}:${paddedSeconds}`;
}

// update the visible timer text on the injected overlay.
function update_timer_display() {
  const box = create_timer_display();
  box.textContent = timer_running
    ? `Wordle Timer: ${format_time(elapsed_ms)}`
    : 'Wordle Timer ready';
}


// find Wordle board rows from the page DOM.
function get_tile_rows() {
  const rows = Array.from(document.querySelectorAll('[role="group"][aria-label^="Row"]'));
  if (rows.length) return rows;

  const board = document.querySelector('[data-testid="board"], .Board-module_board__jeoPS');
  return board ? Array.from(board.children) : [];
}

// get all tile elements inside one board row.
function get_tiles_for_row(row) {
  return Array.from(row.querySelectorAll('[data-testid="tile"]'));
}

// determine whether a board row has any letters entered.
function is_row_filled(row) {
  const tiles = get_tiles_for_row(row);
  return tiles.some((tile) => tile.textContent.trim().length > 0);
}

// determine whether a board row is fully solved (all correct tiles).
function is_solved_row(row) {
  const tiles = get_tiles_for_row(row);
  return tiles.length === 5 && tiles.every((tile) => tile.getAttribute('data-state') === 'correct');
}

// extract the guessed word text from a board row.
function get_word_from_row(row) {
  const tiles = get_tiles_for_row(row);
  return tiles.map((tile) => tile.textContent.trim()).join('').toLowerCase();
}

// return the first solved row found on the board.
function get_solved_row() {
  return get_tile_rows().find((row) => is_solved_row(row));
}

// count how many rows have been filled in the current board.
function get_attempts_from_tiles() {
  return get_tile_rows().filter(is_row_filled).length;
}


// determine the final result word.
function find_result_word_from_page() {
  const solvedRow = get_solved_row();
  if (solvedRow) {
    return get_word_from_row(solvedRow);
  }

  const bodyText = document.body.innerText || '';
  const match = bodyText.match(/the word was\s+([A-Z]+)/i);
  if (match && match[1]) return match[1].trim().toLowerCase();
  return get_word_from_storage();
}

// identify whether the current game is solved, failed, or still in progress.
function get_game_status() {
  const solvedRow = get_solved_row();
  if (solvedRow) return 'SOLVED';

  const attempts = get_attempts_from_tiles();
  if (attempts === 6) return 'FAILED';

  const page_text = document.body.innerText || '';
  if (/the word was\s+[A-Z]+/i.test(page_text)) return 'FAILED';
  return null;
}

// get the current guess attempt count from the board.
function get_attempts() {
  return get_attempts_from_tiles();
}

// build the result object to save when a game finishes.
function gather_result() {
  const word = find_result_word_from_page();
  const status = get_game_status() || 'SOLVED';
  const attempts = get_attempts();
  const durationSeconds = elapsed_ms / 1000;
  return {
    date: new Date().toISOString().slice(0, 10),
    word,
    duration_seconds: parseFloat(durationSeconds.toFixed(2)),
    status,
    attempts,
    timestamp: new Date().toISOString()
  };
}

// stop the timer, record the final result, and update the overlay.
function stop_timer() {
  if (!timer_running) return;
  timer_running = false;
  clearInterval(timer_interval);
  timer_interval = null;
  update_timer_display();
  const result = gather_result();
  save_result(result);
  const box = create_timer_display();
  box.textContent = `Done: ${format_time(elapsed_ms)} (${result.status})`;
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

function is_game_complete_button_visible() {
  return Array.from(document.querySelectorAll('button, a, div, span')).some((el) => {
    const text = (el.textContent || '').trim().toLowerCase();
    return text === 'see results' || text === 'play again';
  });
}

// periodically check whether the game has finished and stop the timer if so.
function check_if_game_finished() {
  if (!timer_running) return;
  const gameStatus = get_game_status();
    if (gameStatus || is_game_complete_button_visible()) {
    stop_timer();
  }
}

// start the timer and watch the page for the game finish event.
function start_timer() {
  if (timer_running) return;
  timer_running = true;
  elapsed_ms = 0;
  start_time = Date.now();
  update_timer_display();
  timer_interval = setInterval(() => {
    elapsed_ms = Date.now() - start_time;
    update_timer_display();
    check_if_game_finished();
  }, 250);

  if (observer) observer.disconnect();
  observer = new MutationObserver(check_if_game_finished);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

// handle the Play button click by creating the display and starting the timer.
function handle_play_click() {
  create_timer_display();
  start_timer();
}

// attach a click listener to detect when the Wordle play button is pressed.
function attach_play_listener() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest ? event.target.closest(play_button_selector) : null;
    if (button) {
      handle_play_click();
    }
  }, true);
}


// STORAGE 
// Save a new result entry into Chrome local storage.
function save_result(result) {
  chrome.storage.local.get({ wordleTimerResults: [] }, (data) => {
    const results = data.wordleTimerResults || [];
    const existingIndex = results.findIndex((row) => row.date === result.date && row.word === result.word && row.status === result.status);
    if (existingIndex === -1) {
      results.push(result);
    } else {
      results[existingIndex] = result;
    }
    chrome.storage.local.set({ wordleTimerResults: results });
  });
}

function read_wordle_state() {
  const stateKeys = ['nyt-wordle-state', 'wordle-state'];
  for (const key of stateKeys) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      return JSON.parse(raw);
    } catch (e) {
      continue;
    }
  }
  return null;
}


// Read saved Wordle state from localStorage if available.
function read_wordle_state() {
  const stateKeys = ['nyt-wordle-state', 'wordle-state'];
  for (const key of stateKeys) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      return JSON.parse(raw);
    } catch (e) {
      continue;
    }
  }
  return null;
}

// fetching.
function get_word_from_storage() {
  try {
    const answerKeys = ['nyt-wordle-answer', 'wordle-answer'];
    for (const key of answerKeys) {
      const value = window.localStorage.getItem(key);
      if (value) return value;
    }

    const state = read_wordle_state();
    if (state) {
      if (state.solution) return state.solution;
      if (state.answer) return state.answer;
      if (Array.isArray(state.board) && state.board.length > 0) {
        return state.solution || state.answer || 'unknown';
      }
      if (Array.isArray(state.guesses) && state.guesses.length > 0) {
        return state.solution || state.answer || 'unknown';
      }
    }
  } catch (e) {
    console.warn('Error: unable to read localStorage', e);
  }
  return 'unknown';
}



// Read saved Wordle state from localStorage if available.


attach_play_listener();
update_timer_display();
