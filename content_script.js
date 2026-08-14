// content script for Wordle Timer: injects timer display, starts/stops/pauses the timer, and saves results.


const play_button_selector = '[data-testid="Play"]'; // selector for the Wordle "Play" button to detect when a new game starts.
                                                     // for "Continue" button, pause continue timer added.

let timer_running = false;
let start_time = 0;
let elapsed_ms = 0;
let timer_interval = null;
let observer = null;
let was_running_before_pause = false; // tracks whether timer was running before a visibility pause



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

// MM:SS time format.
function format_time(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = seconds.toString().padStart(2, '0'); // pad seconds with leading zero if needed

  return `${minutes}:${paddedSeconds}`;
}

// update the visible timer text on the injected overlay.
function update_timer_display() {
  const box = create_timer_display();
  box.textContent = timer_running
    ? `Wordle Timer: ${format_time(elapsed_ms)}`
    : 'Wordle Timer ready';
}


// find Wordle board rows from the page DOM. Returns an array of all row elements, or an empty array if none found.
function get_tile_rows() {
  // newer Wordle versions use role="group" with aria-label for rows

  const rows = Array.from(document.querySelectorAll('[role="group"][aria-label^="Row"]')); // 
  if (rows.length) return rows;

  // older Wordle versions use a board container with children as rows
  const board = document.querySelector('[data-testid="board"], .Board-module_board__jeoPS');
  if (board) {
    return Array.from(board.children);
  }
  return [];
}


// get all tile elements inside one board row. board -> row -> tiles 

function get_tiles_for_row(row) {
  let tileElements = row.querySelectorAll('[data-testid="tile"]');
  let tiles = [];

 for (let tile of tileElements) {
    tiles.push(tile);
}

  return tiles;
}


// determine whether a board row has any letters entered.
function is_row_filled(row) {
  const tiles = get_tiles_for_row(row); // gets all tiles in the row
  for (let tile of tiles) {
      let text = tile.textContent.trim();

      if (text.length > 0) {
          return true;
      }
  }

  return false;
}


// determine whether a board row is fully solved (all correct tiles). 
// length should be 5 and all tiles should have data-state="correct".
function is_solved_row(row) {
  const tiles = get_tiles_for_row(row);
  for (let tile of tiles) {
    if (tile.getAttribute('data-state') !== 'correct') return false;
  }
  // all tiles are correct by now.
  return tiles.length === 5;
}


// extract the guessed word text from a board row. 
// Do this by reading text from last row with letters entered. returns a string of the guessed word.
function get_word_from_row(row) {
  const tiles = get_tiles_for_row(row); // extract all the tiles.

  let word = "";
  for (let tile of tiles) {
      let text = tile.textContent.trim();
      word = word + text;
  }
  // console.log(word);
  return word;
}


// return the first solved row found on the board. 
// Read the tiles and check if all are correct. If none found, return null.
function get_solved_row() {
  let board = get_tile_rows();
  for (let row of board) {
    if (is_solved_row(row)) return row;
  }
  return null;
}


// count how many rows have been filled in the current board.
function get_attempts_from_tiles() {
  let board = get_tile_rows();
  let attempts = 0;
  for (let row of board) {
    if (is_row_filled(row)) attempts++;
  }
  return attempts;
  // return get_tile_rows().filter(is_row_filled).length;
}


// check if a row is fully attempted
function is_row_attempted(row) {
	let finished = true;
	const tiles = get_tiles_for_row(row);

	for (let tile of tiles) {
		let state = tile.getAttribute("data-state");

		if (state !== "correct" && state !== "present" && state !== "absent") {
			finished = false;
		}
	}
	return finished;
}



// determine the final result word.
function find_result_word_from_page() {
  const solvedRow = get_solved_row();
  if (solvedRow) {
    return get_word_from_row(solvedRow);
  }

  const bodyText = document.body.innerText || ''; // get the text content of the entire page
  const match = bodyText.match(/the word was\s+([A-Z]+)/i); // get the word from the text "The word was XXXXX"
  if (match && match[1]) return match[1].trim().toLowerCase();

  return get_word_from_storage(); // at last, if not solvedRow and no match, try to read from localStorage.
}


// identify whether the current game is solved, failed, or still in progress.
function get_game_status() {
  const solvedRow = get_solved_row();
  const board = get_tile_rows();
  if (solvedRow) return 'SOLVED';

  if (get_attempts_from_tiles() === 6 && is_row_attempted(board[5])) return 'FAILED';

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
  // clear any temporary persisted running state when a game fully completes
  clear_temp_state();
}


// TEMP STATE STORAGE HELPERS ---------------------------------------
// save transient timer state so a later "Continue" can restore it.
function save_temp_state() {
  try {
    const temp = {
      elapsed_ms,
      timestamp: new Date().toISOString()
    };
    chrome.storage.local.set({ wordleTimerTemp: temp });
  } catch (e) {
    console.warn('Unable to save temp state', e);
  }
}

// Read transient timer state and call callback with the stored object (or null).
function get_temp_state(cb) {
  chrome.storage.local.get({ wordleTimerTemp: null }, (data) => {
    cb(data.wordleTimerTemp || null);
  });
}

// Remove the transient timer state after it is consumed or when a game finishes.
function clear_temp_state() {
  chrome.storage.local.remove(['wordleTimerTemp']);
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
  // start_timer(): starts or resumes the timer. If `elapsed_ms` already contains
  // a non-zero value it will resume from that elapsed time; otherwise it starts fresh.
  if (timer_running) return;
  timer_running = true;
  if (!elapsed_ms || typeof elapsed_ms !== 'number') {
    elapsed_ms = 0;
  }
  // set start_time so that Date.now() - start_time yields the current elapsed_ms.
  start_time = Date.now() - elapsed_ms;
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


// Pause/Resume HELPERS.
// pause the timer without finalizing a game result. This is used when the user
// switches to another tab (visibility change) or when the tab is being closed.
function pause_timer() {
  if (!timer_running) return;
  // record that we paused while running (used to resume automatically on visibility)
  was_running_before_pause = true;
  timer_running = false;
  clearInterval(timer_interval);
  timer_interval = null;
  // persist transient state so "Continue" can restore later
  save_temp_state();
  // update_timer_display();
}

// resume the timer if there is a elapsed value available!
function resume_timer_from_temp() {
  get_temp_state((temp) => {
    if (temp && typeof temp.elapsed_ms === 'number') {
      elapsed_ms = temp.elapsed_ms;
    }
    // start_timer will use existing elapsed_ms to resume
    start_timer();
  });
}



// STORAGE 
// save a new result entry into Chrome local storage.
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


// read saved Wordle state from localStorage if available.
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



// handle the Play/Continue button click by creating the display and starting the timer.
function handle_play_click() {
  create_timer_display();
  start_timer();
}


// attach a click listener to detect when the Wordle play button is pressed.
function attach_play_listener() {
  document.addEventListener('click', (event) => {
    // detect clicks on Play or Continue buttons by checking nearby clickable elements
    const clickedEl = event.target.closest ? event.target.closest('button, a, div, span') : event.target;
    if (!clickedEl) return;
    const text = (clickedEl.textContent || '').trim().toLowerCase();
    if (text === 'play') {
      handle_play_click();
      return;
    }
    if (text === 'continue') {
      // when user clicks Continue, restore the transient timer state and resume
      create_timer_display();
      resume_timer_from_temp();
      return;
    }
  }, true);
}


attach_play_listener();
update_timer_display();

// pause when the user hides the page (switches tabs). resume automatically
// when the page becomes visible again if it was running before the pause.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pause_timer();
  } else {
    if (was_running_before_pause) {
      // reset flag and resume
      was_running_before_pause = false;
      resume_timer_from_temp();
    }
  }
});

// when the tab or window is being closed, pause and save transient state so
// the "Continue" button on next visit can restore the timer.

// function handleUnload() {
//     pause_timer();
// }
// window.addEventListener('beforeunload', handleUnload);

window.addEventListener('beforeunload', () => {pause_timer();
});

