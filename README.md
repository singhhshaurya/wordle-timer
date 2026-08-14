# wordle-timer
A simple chrome extension to time how long it takes to solve the daily New York Times Wordle puzzle, and save your result in chrome's local storage, allowing you to review your history and compare your performance over time.

## Features

- Tracks the time taken to solve Wordle.
- Tracks the number of guesses.
- Detects when the Wordle is solved or if you failed.
- Pauses the timer when the Wordle tab is not active.
- Saves your previous results.
- View your Wordle history through the extension popup.

## Installation

1. Download or clone this repository:

git clone https://github.com/singhhshaurya/wordle-timer.git

2. Open Chrome and go to:

chrome://extensions

3. Turn on Developer mode in the top-right corner.

4. Click Load unpacked.

5. Select the `wordle-timer` folder containing `manifest.json`.

6. Open Wordle:

https://www.nytimes.com/games/wordle/

7. The extension will now run on the Wordle page and the timer will start when you click on the "play" button.

