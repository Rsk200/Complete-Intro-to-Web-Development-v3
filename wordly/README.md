# Word Masters

A production-ready Wordle clone built using plain HTML, CSS, and JavaScript.

## Features
- Fetches a random 5-letter word of the day from a remote API.
- Live validation of words against a dictionary API before consuming a guess.
- Fully responsive design that works seamlessly on desktop and mobile devices.
- Classic flip animations, loading indicators, and informative shake effects.
- Semantic HTML and ARIA live regions for accessibility.

## How to Run
This project requires no build tools or local servers. Simply open `index.html` in any modern web browser to play!

## Scoring Algorithm (Two-Pass Duplicate Handling)
Handling duplicate letters accurately is one of the trickiest parts of Wordle. This game implements a robust two-pass algorithm:
1. **Pass 1:** It iterates over the guess and matches exact positions with the secret word. Exact matches are marked as `correct` (green), and that specific letter instance is consumed from the secret word's available pool.
2. **Pass 2:** It iterates again over the non-green guessed letters. It checks if they exist in the remaining pool of the secret word's letters. If found, it marks them as `present` (yellow) and consumes them. If not, they are marked `absent` (gray).
This ensures that a guess like "SPOOL" against the word "OVERT" correctly colors only the first 'O' as yellow and the second 'O' as gray, instead of highlighting both.
