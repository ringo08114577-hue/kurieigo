(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const VOWELS = "AEIOU".split("");
  const CONSONANTS = "BCDFGHJKLMNPQRSTVWXYZ".split("");
  const LETTER_OPTIONS = [8, 10, 12, 14];
  const TIME_OPTIONS = [30, 45, 60];
  const params = new URLSearchParams(window.location.search);
  const requestedLetters = Number(params.get("letters"));
  const requestedTime = Number(params.get("time"));
  const LETTER_COUNT = LETTER_OPTIONS.includes(requestedLetters) ? requestedLetters : 8;
  const ROUND_SECONDS = TIME_OPTIONS.includes(requestedTime) ? requestedTime : 30;
  const ROUND_MS = ROUND_SECONDS * 1000;
  const VOWEL_COUNT = Math.round(LETTER_COUNT / 4);
  const CONSONANT_COUNT = LETTER_COUNT - VOWEL_COUNT;
  const BEST_KEY = "creigeo-best-score-" + LETTER_COUNT + "-" + ROUND_SECONDS;
  const POINTS = (length) => {
    if (length < 3) return 0;
    if (length <= 5) return 2 * length - 5;
    // Longer words get progressively larger bonuses.
    return Math.floor((length * length - 5 * length + 10) / 2);
  };

  const keyboard = $("letter-keyboard");
  const wordDisplay = $("word-display");
  const feedback = $("feedback");
  const timerBar = $("timer-bar");
  const timerTrack = document.querySelector(".timer-track");
  const dictionaryStatus = $("dictionary-status");

  let dictionary = new Set();
  let letters = [];
  let wordDraft = "";
  let seenWords = new Set();
  let acceptedWords = [];
  let score = 0;
  let bestScore = readBestScore();
  let seconds = ROUND_SECONDS;
  let timerId = null;
  let deadline = 0;
  let playing = false;
  let dictionaryReady = false;
  let newRecordThisRound = false;

  function readBestScore() {
    try {
      const stored = localStorage.getItem(BEST_KEY);
      if (stored !== null) return Number(stored) || 0;
      if (LETTER_COUNT === 8 && ROUND_SECONDS === 30) {
        return Number(localStorage.getItem("creigeo-best-score-v1")) || 0;
      }
    } catch {
      return 0;
    }
    return 0;
  }

  function saveBestScore(value) {
    try {
      localStorage.setItem(BEST_KEY, String(value));
    } catch {
      // The game remains playable if local storage is unavailable.
    }
  }

  function shuffle(items) {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function makeLetters() {
    const vowels = shuffle(VOWELS).slice(0, VOWEL_COUNT);
    const consonants = shuffle(CONSONANTS).slice(0, CONSONANT_COUNT);
    return [...vowels, ...consonants].sort();
  }

  function showMessage(text, kind = "") {
    feedback.textContent = text;
    feedback.className = "game-feedback" + (kind ? " " + kind : "");
  }

  function updateStats() {
    $("score").textContent = score;
    $("word-count").textContent = acceptedWords.length;
    $("best-score").textContent = bestScore;
    $("accepted-total").textContent = acceptedWords.length + " WORDS";
  }

  function updateDraftDisplay() {
    wordDisplay.replaceChildren();
    if (!wordDraft) {
      const placeholder = document.createElement("span");
      placeholder.className = "word-placeholder";
      placeholder.textContent = "下の文字をタップ！";
      wordDisplay.appendChild(placeholder);
    } else {
      [...wordDraft].forEach((letter) => {
        const span = document.createElement("span");
        span.className = "word-letter";
        span.textContent = letter.toUpperCase();
        wordDisplay.appendChild(span);
      });
    }
    $("backspace-btn").disabled = !playing || wordDraft.length === 0;
    $("clear-btn").disabled = !playing || wordDraft.length === 0;
    $("submit-btn").disabled = !playing || wordDraft.length === 0;
  }

  function renderKeyboard() {
    keyboard.replaceChildren();
    const columns = LETTER_COUNT === 8 ? 8 : Math.ceil(LETTER_COUNT / 2);
    keyboard.style.setProperty("--keyboard-columns", String(columns));
    letters.forEach((letter) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "letter-key";
      button.textContent = letter;
      button.disabled = !playing;
      button.setAttribute("aria-label", letter + " を追加");
      button.addEventListener("click", () => addLetter(letter));
      keyboard.appendChild(button);
    });
    $("keyboard-count-label").textContent = LETTER_COUNT + " LETTERS";
  }

  function addLetter(letter) {
    if (!playing) return;
    if (wordDraft.length >= 30) {
      showMessage("これ以上は入力できないよ。", "bad");
      return;
    }
    wordDraft += letter.toLowerCase();
    updateDraftDisplay();
    showMessage("単語を作成中…", "");
  }

  function removeLastLetter() {
    if (!playing || !wordDraft) return;
    wordDraft = wordDraft.slice(0, -1);
    updateDraftDisplay();
  }

  function clearWord() {
    if (!playing) return;
    wordDraft = "";
    updateDraftDisplay();
  }

  function updateTimer() {
    if (!playing) return;
    const remaining = Math.max(0, deadline - Date.now());
    const nextSeconds = Math.ceil(remaining / 1000);
    if (nextSeconds !== seconds) {
      seconds = nextSeconds;
      $("time-value").textContent = String(seconds);
    }
    timerBar.style.width = (remaining / ROUND_MS * 100) + "%";
    timerTrack.setAttribute("aria-valuenow", String(seconds));
    if (remaining <= 0) endGame();
  }

  function addAcceptedWord(word, points) {
    const container = $("accepted-words");
    const empty = container.querySelector(".empty-words");
    if (empty) empty.remove();

    const chip = document.createElement("span");
    chip.className = "word-chip";
    const wordText = document.createElement("span");
    wordText.textContent = word;
    const pointText = document.createElement("b");
    pointText.textContent = "+" + points;
    chip.append(wordText, pointText);
    container.prepend(chip);
  }

  function submitWord() {
    if (!playing) return;
    if (Date.now() >= deadline) {
      endGame();
      return;
    }
    const word = wordDraft.toLowerCase();
    if (!word) {
      showMessage("先に下の文字をタップして単語を作ってね。", "bad");
      return;
    }
    if (word.length < 3) {
      showMessage("3文字以上の単語が必要だよ。", "bad");
      return;
    }
    const available = new Set(letters.map((letter) => letter.toLowerCase()));
    if (![...word].every((letter) => available.has(letter))) {
      showMessage("配られた文字だけで作ってね！", "bad");
      return;
    }
    if (seenWords.has(word)) {
      showMessage("その単語はもう使ったよ。別の単語を探そう！", "bad");
      wordDraft = "";
      updateDraftDisplay();
      return;
    }
    if (!dictionary.has(word)) {
      showMessage("辞書に見つからなかったよ。別の単語を試してね。", "bad");
      wordDraft = "";
      updateDraftDisplay();
      return;
    }

    seenWords.add(word);
    const points = POINTS(word.length);
    score += points;
    acceptedWords.push({ word, points });
    if (score > bestScore) {
      bestScore = score;
      newRecordThisRound = true;
      saveBestScore(bestScore);
    }
    addAcceptedWord(word, points);
    wordDraft = "";
    updateDraftDisplay();
    updateStats();
    showMessage("正解！ " + word + "  +" + points + "点", "good");
  }

  async function loadDictionary() {
    try {
      const response = await fetch("dictionary.txt", { cache: "force-cache" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const text = await response.text();
      text.split(/\r?\n/).forEach((line) => {
        const word = line.trim().toLowerCase();
        if (/^[a-z]{3,}$/.test(word)) dictionary.add(word);
      });
      if (dictionary.size < 1000) throw new Error("辞書の単語数が少なすぎます");
      dictionaryReady = true;
      dictionaryStatus.textContent = dictionary.size.toLocaleString() + "語収録";
      $("start-btn").disabled = false;
      $("start-label").textContent = "ゲームスタート";
    } catch (error) {
      dictionaryStatus.textContent = "辞書エラー";
      $("start-label").textContent = "辞書を読み込めません";
      showMessage("辞書を読み込めなかったよ。通信状態を確認してね。", "bad");
      console.error("Dictionary load error:", error);
    }
  }

  function startGame() {
    if (!dictionaryReady || playing) return;
    clearInterval(timerId);
    letters = makeLetters();
    wordDraft = "";
    seenWords = new Set();
    acceptedWords = [];
    score = 0;
    seconds = ROUND_SECONDS;
    newRecordThisRound = false;
    deadline = Date.now() + ROUND_MS;
    playing = true;

    $("result-panel").hidden = true;
    $("keyboard-dock").hidden = false;
    $("ready-panel").hidden = true;
    $("play-area").hidden = false;
    $("time-value").textContent = String(ROUND_SECONDS);
    timerBar.style.width = "100%";
    timerTrack.setAttribute("aria-valuenow", String(ROUND_SECONDS));
    $("accepted-words").replaceChildren();
    const empty = document.createElement("span");
    empty.className = "empty-words";
    empty.textContent = "正解した単語がここに並ぶよ。";
    $("accepted-words").appendChild(empty);

    renderKeyboard();
    updateDraftDisplay();
    updateStats();
    showMessage("下の文字をタップして単語を作ろう。", "good");
    timerId = setInterval(updateTimer, 80);
  }

  function findPossibleWords() {
    const available = new Set(letters.map((letter) => letter.toLowerCase()));
    return [...dictionary]
      .filter((word) => word.length >= 3 && [...word].every((letter) => available.has(letter)))
      .sort((a, b) => b.length - a.length || b.localeCompare(a))
      .slice(0, 15);
  }

  function renderPossibleWords() {
    const container = $("possible-words");
    container.replaceChildren();
    const examples = findPossibleWords();
    if (examples.length === 0) {
      const empty = document.createElement("span");
      empty.className = "empty-words";
      empty.textContent = "この文字で作れる単語が見つからなかったよ。";
      container.appendChild(empty);
      return;
    }
    examples.forEach((word) => {
      const chip = document.createElement("span");
      chip.className = "possible-word";
      const wordText = document.createElement("span");
      wordText.textContent = word;
      const pointsText = document.createElement("b");
      pointsText.textContent = "+" + POINTS(word.length) + "点";
      chip.append(wordText, pointsText);
      if (seenWords.has(word)) {
        chip.classList.add("already-found");
        chip.title = "今回すでに作成した単語";
      }
      container.appendChild(chip);
    });
  }

  function endGame() {
    if (!playing) return;
    playing = false;
    clearInterval(timerId);
    timerId = null;
    seconds = 0;
    $("time-value").textContent = "0";
    timerBar.style.width = "0%";
    timerTrack.setAttribute("aria-valuenow", "0");
    renderKeyboard();
    $("keyboard-dock").hidden = true;
    updateDraftDisplay();

    $("final-score").textContent = String(score);
    $("final-summary").textContent = acceptedWords.length + "個の単語を作ったよ！";
    $("final-letters").textContent = letters.join(" · ");
    renderPossibleWords();
    $("new-record").hidden = !newRecordThisRound;

    const finalWords = $("final-words");
    finalWords.replaceChildren();
    if (acceptedWords.length === 0) {
      const empty = document.createElement("span");
      empty.className = "empty-words";
      empty.textContent = "次は1つでも単語を見つけてみよう！";
      finalWords.appendChild(empty);
    } else {
      acceptedWords.forEach(({ word, points }) => {
        const chip = document.createElement("span");
        chip.className = "final-word";
        chip.textContent = word + " (+" + points + ")";
        finalWords.appendChild(chip);
      });
    }

    $("play-area").hidden = true;
    $("result-panel").hidden = false;
    updateStats();
  }

  $("start-btn").addEventListener("click", startGame);
  $("again-btn").addEventListener("click", startGame);
  $("submit-btn").addEventListener("click", submitWord);
  $("backspace-btn").addEventListener("click", removeLastLetter);
  $("clear-btn").addEventListener("click", clearWord);

  document.addEventListener("keydown", (event) => {
    if (!playing) return;
    if (event.key === "Enter") {
      event.preventDefault();
      submitWord();
    } else if (event.key === "Backspace") {
      event.preventDefault();
      removeLastLetter();
    } else if (event.key === "Escape") {
      clearWord();
    } else if (/^[a-zA-Z]$/.test(event.key)) {
      const letter = event.key.toUpperCase();
      if (letters.includes(letter)) addLetter(letter);
    }
  });

  $("mode-label").textContent = LETTER_COUNT + "文字 · " + ROUND_SECONDS + "秒";
  $("mode-description").textContent = "母音" + VOWEL_COUNT + "文字・子音" + CONSONANT_COUNT + "文字、合計" + LETTER_COUNT + "文字が配られて、" + ROUND_SECONDS + "秒のチャレンジが始まるよ。";
  $("time-value").textContent = String(ROUND_SECONDS);
  timerTrack.setAttribute("aria-valuemax", String(ROUND_SECONDS));
  timerTrack.setAttribute("aria-valuenow", String(ROUND_SECONDS));
  $("best-score").textContent = String(bestScore);
  $("keyboard-count-label").textContent = LETTER_COUNT + " LETTERS";
  loadDictionary();
})();