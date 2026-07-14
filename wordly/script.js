const WORD_LENGTH = 5;

const state = {
    secretWord: "",
    currentGuessChars: [null, null, null, null, null],
    currentRow: 0,
    isGameOver: false,
    isLoading: true,
    isModalOpen: false,
    hintsUsed: 0,
    hintedPositions: [null, null, null, null, null],
    guessedCorrectPositions: [false, false, false, false, false],
    maxGuesses: 6
};

const board = document.getElementById("game-board");
const keyboard = document.getElementById("keyboard");
const announcement = document.getElementById("announcement");
const messageContainer = document.getElementById("message-container");
const loadingSpinner = document.getElementById("loading-spinner");
const title = document.getElementById("title");

async function init() {
    setupTheme();
    createBoard();
    setupKeyboard();
    setupHelpModal();
    
    document.getElementById("btn-hint").addEventListener("click", () => {
        document.getElementById("btn-hint").blur();
        applyHint();
    });

    await fetchSecretWord();
    document.addEventListener("keydown", handleKeydown);
}

function setupTheme() {
    const toggleBtn = document.getElementById('theme-toggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('word-masters-theme');
    
    let currentTheme = savedTheme;
    if (!currentTheme) {
        currentTheme = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', currentTheme);
    
    toggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('word-masters-theme', currentTheme);
        toggleBtn.blur();
    });
}

function createBoard() {
    for (let r = 0; r < state.maxGuesses; r++) {
        const row = document.createElement("div");
        row.classList.add("row");
        row.id = `row-${r}`;
        for (let c = 0; c < WORD_LENGTH; c++) {
            const tile = document.createElement("div");
            tile.classList.add("tile");
            tile.id = `tile-${r}-${c}`;
            tile.textContent = ""; // Fix: Ensures no 'F' or other characters are rendered
            row.appendChild(tile);
        }
        board.appendChild(row);
    }
}

function setupKeyboard() {
    const keys = keyboard.querySelectorAll("button[data-key]");
    keys.forEach(key => {
        key.addEventListener("click", () => {
            handleInput(key.getAttribute("data-key"));
        });
    });
}

async function fetchSecretWord() {
    try {
        const response = await fetch("https://words.dev-apis.com/word-of-the-day?random=1");
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const data = await response.json();
        state.secretWord = data.word.toLowerCase();
        
        loadingSpinner.classList.add("hidden");
        document.getElementById("hint-container").classList.remove("hidden");
        board.classList.remove("hidden");
        keyboard.classList.remove("hidden");
        
        state.isLoading = false;
        updateHintUI();
    } catch (error) {
        loadingSpinner.className = "";
        loadingSpinner.innerHTML = `Error loading game. <button onclick="fetchSecretWord()" style="margin-left:10px; padding:5px 10px; border-radius:4px; border:none; cursor:pointer; background:var(--key-bg); color:var(--text-color); font-weight:bold;">Retry</button>`;
        loadingSpinner.style.color = "red";
        showMessage("Failed to fetch word.", true);
    }
}

function showMessage(msg, keep = false) {
    const el = document.createElement("div");
    el.classList.add("message");
    el.textContent = msg;
    messageContainer.appendChild(el);
    announcement.textContent = msg; 
    
    if (!keep) {
        setTimeout(() => {
            el.classList.add("fade-out");
            el.addEventListener("transitionend", () => el.remove());
        }, 2000);
    }
}

async function handleKeydown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    await handleInput(e.key);
}

async function handleInput(key) {
    if (state.isGameOver || state.isLoading || state.isModalOpen) {
        return;
    }

    if (key === "Enter") {
        await submitGuess();
        return;
    }

    if (key === "Backspace" || key === "Delete") {
        for (let i = WORD_LENGTH - 1; i >= 0; i--) {
            if (state.currentGuessChars[i] !== null && state.hintedPositions[i] === null) {
                state.currentGuessChars[i] = null;
                renderRow();
                return;
            }
        }
        return;
    }

    if (/^[a-zA-Z]$/.test(key)) {
        const emptyIndex = state.currentGuessChars.indexOf(null);
        if (emptyIndex !== -1) {
            state.currentGuessChars[emptyIndex] = key.toLowerCase();
            renderRow();
        }
    }
}

function renderRow() {
    const row = document.getElementById(`row-${state.currentRow}`);
    const tiles = row.querySelectorAll(".tile");
    
    for (let i = 0; i < WORD_LENGTH; i++) {
        const char = state.currentGuessChars[i];
        tiles[i].textContent = char ? char : "";
        
        if (state.hintedPositions[i] !== null) {
            tiles[i].className = "tile correct hint-locked";
        } else {
            if (char) {
                tiles[i].className = "tile filled";
            } else {
                tiles[i].className = "tile";
            }
        }
    }
}

async function submitGuess() {
    if (state.currentGuessChars.includes(null)) {
        flashInvalidRow();
        showMessage("Not enough letters");
        return;
    }

    const guessString = state.currentGuessChars.join('');
    const row = document.getElementById(`row-${state.currentRow}`);
    
    state.isLoading = true;
    row.classList.add("pulsing");

    try {
        const response = await fetch("https://words.dev-apis.com/validate-word", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ word: guessString })
        });
        
        if (!response.ok) throw new Error("Validation failed");
        
        const data = await response.json();
        row.classList.remove("pulsing");
        
        if (!data.validWord) {
            state.isLoading = false;
            flashInvalidRow();
            showMessage("Not a valid word");
            return;
        }

        await scoreGuess();
    } catch (error) {
        row.classList.remove("pulsing");
        state.isLoading = false;
        showMessage("Validation error. Try again.");
    }
}

function flashInvalidRow() {
    const row = document.getElementById(`row-${state.currentRow}`);
    row.classList.remove("invalid");
    void row.offsetWidth;
    row.classList.add("invalid");
    
    row.addEventListener("animationend", (e) => {
        if (e.animationName === "shake-red") {
            row.classList.remove("invalid");
        }
    }, { once: true });
}

async function scoreGuess() {
    const row = document.getElementById(`row-${state.currentRow}`);
    const tiles = row.querySelectorAll(".tile");
    
    const guessString = state.currentGuessChars.join('');
    const secret = state.secretWord;
    
    const scores = new Array(WORD_LENGTH).fill("absent");
    const secretLetters = secret.split("");
    
    // Pass 1
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessString[i] === secretLetters[i]) {
            scores[i] = "correct";
            secretLetters[i] = null; 
            state.guessedCorrectPositions[i] = true;
        }
    }
    
    // Pass 2
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (scores[i] === "correct") continue; 
        
        const letterIndex = secretLetters.indexOf(guessString[i]);
        if (letterIndex > -1) {
            scores[i] = "present";
            secretLetters[letterIndex] = null; 
        }
    }
    
    const stagger = 150;
    state.isLoading = true; 
    
    return new Promise(resolve => {
        for (let i = 0; i < WORD_LENGTH; i++) {
            setTimeout(() => {
                const tile = tiles[i];
                tile.classList.add("flip-in");
                
                tile.addEventListener("animationend", function handler(e) {
                    if (e.animationName === "flip-in") {
                        tile.classList.remove("flip-in", "filled", "hint-locked");
                        tile.classList.add(scores[i], "flip-out");
                        updateKeyboard(guessString[i], scores[i]);
                    } else if (e.animationName === "flip-out") {
                        tile.classList.remove("flip-out");
                        tile.removeEventListener("animationend", handler);
                        
                        if (i === WORD_LENGTH - 1) {
                            state.isLoading = false;
                            updateHintUI();
                            checkWinLoss(guessString);
                            resolve();
                        }
                    }
                });
            }, i * stagger);
        }
    });
}

function updateKeyboard(letter, status) {
    const key = keyboard.querySelector(`button[data-key="${letter}"]`);
    if (!key) return;
    
    const isCorrect = key.classList.contains("correct");
    const isPresent = key.classList.contains("present");
    
    if (isCorrect) return;
    if (isPresent && status === "absent") return;
    
    key.classList.remove("absent", "present", "correct");
    key.classList.add(status);
}

function checkWinLoss(guessString) {
    if (guessString === state.secretWord) {
        handleWin();
    } else if (state.currentRow >= state.maxGuesses - 1) {
        handleLoss();
    } else {
        state.currentRow++;
        state.currentGuessChars = [...state.hintedPositions];
        renderRow();
    }
}

function handleWin() {
    state.isGameOver = true;
    updateHintUI();
    
    title.style.color = "var(--color-correct)";
    setTimeout(() => { title.style.color = "var(--text-color)"; }, 1500);
    
    showMessage("You win!", true);
    
    const tiles = document.getElementById(`row-${state.currentRow}`).querySelectorAll(".tile");
    tiles.forEach((tile, i) => {
        setTimeout(() => { tile.classList.add("win-bounce"); }, i * 100);
    });
}

function handleLoss() {
    state.isGameOver = true;
    updateHintUI();
    showMessage(`The word was ${state.secretWord.toUpperCase()}`, true);
}

// Hint System
function applyHint() {
    if (state.isGameOver || state.isLoading) return;

    const available = [];
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (state.hintedPositions[i] === null && !state.guessedCorrectPositions[i]) {
            available.push(i);
        }
    }
    
    if (available.length === 0) return;
    
    if (state.hintsUsed >= 1) {
        const rowsRemaining = state.maxGuesses - state.currentRow;
        if (rowsRemaining <= 1) {
            showConfirmDialog("This is your last guess — use hint anyway?", () => {
                state.maxGuesses--;
                hideConfirmDialog();
                executeHint(available);
            });
            return;
        } else {
            state.maxGuesses--;
            const bottomRow = document.getElementById(`row-${state.maxGuesses}`);
            if (bottomRow) bottomRow.classList.add("grayed-out");
        }
    }
    
    executeHint(available);
}

function showConfirmDialog(msg, onConfirm) {
    const dialog = document.getElementById("confirm-dialog");
    const msgEl = document.getElementById("confirm-msg");
    const btnYes = document.getElementById("btn-confirm-yes");
    const btnNo = document.getElementById("btn-confirm-no");
    
    msgEl.textContent = msg;
    dialog.classList.remove("hidden");
    
    const newBtnYes = btnYes.cloneNode(true);
    const newBtnNo = btnNo.cloneNode(true);
    btnYes.replaceWith(newBtnYes);
    btnNo.replaceWith(newBtnNo);
    
    newBtnYes.addEventListener("click", onConfirm);
    newBtnNo.addEventListener("click", hideConfirmDialog);
}

function hideConfirmDialog() {
    const dialog = document.getElementById("confirm-dialog");
    dialog.classList.add("hidden");
}

function executeHint(available) {
    state.hintsUsed++;
    updateHintUI();
    
    const rand = Math.floor(Math.random() * available.length);
    const pos = available[rand];
    const letter = state.secretWord[pos];
    
    state.hintedPositions[pos] = letter;
    state.currentGuessChars[pos] = letter;
    
    const row = document.getElementById(`row-${state.currentRow}`);
    const tile = row.querySelectorAll(".tile")[pos];
    
    state.isLoading = true;
    tile.classList.add("flip-in");
    
    tile.addEventListener("animationend", function handler(e) {
        if (e.animationName === "flip-in") {
            tile.classList.remove("flip-in", "filled");
            tile.classList.add("correct", "hint-locked", "flip-out");
            tile.textContent = letter;
            updateKeyboard(letter, "correct");
        } else if (e.animationName === "flip-out") {
            tile.classList.remove("flip-out");
            tile.removeEventListener("animationend", handler);
            
            state.isLoading = false;
            showMessage(`Hint: letter '${letter.toUpperCase()}' revealed in position ${pos + 1}!`);
            renderRow();
            
            if (state.currentRow >= state.maxGuesses) {
                handleLoss();
            } else {
                updateHintUI();
            }
        }
    });
}

function updateHintUI() {
    const hintLabel = document.getElementById("hint-label");
    const hintBtn = document.getElementById("btn-hint");
    
    if (state.isGameOver) {
        hintBtn.disabled = true;
        return;
    }

    let unhintedCount = 0;
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (state.hintedPositions[i] === null && !state.guessedCorrectPositions[i]) {
            unhintedCount++;
        }
    }
    
    if (unhintedCount === 0) {
        hintBtn.disabled = true;
        hintLabel.textContent = "Word fully revealed";
        return;
    }

    if (state.hintsUsed === 0) {
        hintLabel.textContent = "Free hint available";
    } else {
        hintLabel.textContent = "Next hint costs 1 guess";
    }
}

// Help Modal Logic
function setupHelpModal() {
    const btnHelp = document.getElementById("btn-help");
    const modal = document.getElementById("help-modal");
    const btnClose = document.getElementById("btn-close-help");

    const openModal = () => {
        modal.classList.remove("hidden");
        setTimeout(() => modal.classList.add("show"), 10);
        state.isModalOpen = true;
    };

    const closeModal = () => {
        modal.classList.remove("show");
        setTimeout(() => modal.classList.add("hidden"), 200);
        state.isModalOpen = false;
    };

    btnHelp.addEventListener("click", () => {
        btnHelp.blur();
        openModal();
    });

    btnClose.addEventListener("click", closeModal);

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && state.isModalOpen) {
            closeModal();
        }
    });

    if (!localStorage.getItem("wordMastersHasVisited")) {
        localStorage.setItem("wordMastersHasVisited", "true");
        openModal();
    }
}

init();
