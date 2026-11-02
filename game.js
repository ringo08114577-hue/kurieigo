(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const VOWELS = "AEIOU".split("");
  const CONSONANTS = "BCDFGHJKLMNPQRSTVWXYZ".split("");
  const ROUND_MS = 30_000;
  const BEST_KEY = "creigeo-best-score-v1";
  const POINTS = (length) => length < 3 ? 0 : 2 * length - 5;

  const lettersEl = $("letters");
  const input = $("word-input");
  const form = $("answer-form");
  const startBtn = $("start-btn");
  const submitBtn = $("submit-btn");
  const feedback = $("feedback");
  const timerBar = $("timer-bar");
  const timerTrack = document.querySelector(".timer-track");
  const dictionaryStatus = $("dictionary-status");
  const acceptedWordsEl = $("accepted-words");

  let dictionary = new Set();
  let letters = [];
  let seenWords = new Set();
  let acceptedWords = [];
  let score = 0;
  let bestScore = readBestScore();
  let seconds = 30;
  let timerId = null;
  let deadline = 0;
  let playing = false;
  let dictionaryReady = false;

  function readBestScore() {
    try {
      return Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  function saveBestScore(value) {
    try {
      localStorage.setItem(BEST_KEY, String(value));
    } catch {
      // Private browsing may block local storage; the game still works.
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
    const vowels = shuffle(VOWELS).slice(0, 2);
    const consonants = shuffle(CONSONANTS).slice(0, 6);
    return shuffle([...vowels, ...consonants]);
  }

  function renderLetters() {
    lettersEl.replaceChildren();
    letters.forEach((letter) => {
      const tile = document.createElement("span");
      tile.className = "letter";
      tile.textContent = letter;
      lettersEl.appendChild(tile);
    });
  }

  function showMessage(text, kind = "") {
    feedback.textContent = text;
    feedback.className = "feedback" + (kind ? " " + kind : "");
  }

  function updateStats() {
    $("score").textContent = score;
    $("word-count").textContent = acceptedWords.length;
    $("best-score").textContent = bestScore;
    $("accepted-total").textContent = acceptedWords.length + " WORDS";
  }

  function updateTimer() {
    const remaining = Math.max(0, deadline - Date.now());
    const nextSeconds = Math.ceil(remaining / 1000);
    if (nextSeconds !== seconds) {
      seconds = nextSeconds;
      $("time-value").textContent = seconds;
    }
    const percent = (remaining / ROUND_MS) * 100;
    timerBar.style.width = percent + "%";
    timerTrack.setAttribute("aria-valuenow", String(seconds));
    if (remaining <= 0) endGame();
  }

  function addAcceptedWord(word, points) {
    const empty = acceptedWordsEl.querySelector(".empty-words");
    if (empty) empty.remove();

    const chip = document.createElement("span");
    chip.className = "word-chip";
    const wordText = document.createElement("span");
    wordText.textContent = word;
    const pointText = document.createElement("b");
    pointText.textContent = "+" + points;
    chip.append(wordText, pointText);
    acceptedWordsEl.prepend(chip);
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
      if (dictionary.size < 1000) {
        throw new Error("辞書の単語数が少なすぎます: " + dictionary.size);
      }
      dictionaryReady = true;
      dictionaryStatus.textContent = "辞書 " + dictionary.size.toLocaleString() + "語";
      startBtn.disabled = false;
      startBtn.querySelector(".button-label").textContent = "ゲームスタート";
      showMessage("辞書の準備完了！スタートを押して挑戦しよう。", "good");
    } catch (error) {
      dictionaryStatus.textContent = "辞書の読み込みに失敗";
      startBtn.disabled = true;
      startBtn.querySelector(".button-label").textContent = "辞書を読み込めません";
      showMessage("辞書ファイルを読み込めなかったよ。GitHub Pagesの公開状態を確認してね。", "bad");
      console.error("Dictionary load error:", error);
    }
  }

  function startGame() {
    if (!dictionaryReady || playing) return;
    clearInterval(timerId);

    letters = makeLetters();
    seenWords = new Set();
    acceptedWords = [];
    score = 0;
    seconds = 30;
    playing = true;
    deadline = Date.now() + ROUND_MS;

    renderLetters();
    updateStats();
    $("time-value").textContent = "30";
    timerBar.style.width = "100%";
    timerTrack.setAttribute("aria-valuenow", "30");
    acceptedWordsEl.replaceChildren();
    const empty = document.createElement("span");
    empty.className = "empty-words";
    empty.textContent = "正解した単語がここに並ぶよ。";
    acceptedWordsEl.appendChild(empty);

    $("result-panel").hidden = true;
    $("new-record").hidden = true;
    startBtn.disabled = true;
    startBtn.querySelector(".button-label").textContent = "ゲーム中…";
    input.disabled = false;
    submitBtn.disabled = false;
    input.value = "";
    showMessage("スタート！英単語を入力してEnter！", "good");

    // Focus is called directly from the start-button interaction for mobile keyboards.
    input.focus();
    timerId = setInterval(updateTimer, 100);
  }

  function isAllowedByLetters(word) {
    const available = new Set(letters.map((letter) => letter.toLowerCase()));
    // A given tile may be reused any number of times inside one word.
    return [...word].every((character) => available.has(character));
  }

  function submitWord(event) {
    event.preventDefault();
    if (!playing) return;

    if (Date.now() >= deadline) {
      endGame();
      return;
    }

    const word = input.value.trim().toLowerCase();
    input.value = "";
    input.focus();

    if (!/^[a-z]+$/.test(word)) {
      showMessage("英語のアルファベットだけで入力してね。", "bad");
      return;
    }
    if (word.length < 3) {
      showMessage("3文字以上の単語が必要だよ。", "bad");
      return;
    }
    if (!isAllowedByLetters(word)) {
      showMessage("配られた8種類の文字だけで作ってね！", "bad");
      return;
    }
    if (seenWords.has(word)) {
      showMessage("その単語はもう使ったよ。別の単語を探そう！", "bad");
      return;
    }
    if (!dictionary.has(word)) {
      showMessage("辞書に見つからなかったよ。別の単語を試してね。", "bad");
      return;
    }

    seenWords.add(word);
    const points = POINTS(word.length);
    score += points;
    acceptedWords.push({ word, points });
    if (score > bestScore) {
      bestScore = score;
      saveBestScore(bestScore);
    }
    addAcceptedWord(word, points);
    updateStats();
    showMessage("正解！ " + word + "  +" + points + "点", "good");
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
    input.disabled = true;
    submitBtn.disabled = true;
    startBtn.disabled = false;
    startBtn.querySelector(".button-label").textContent = "もう一度プレイ";

    $("final-score").textContent = score;
    $("final-summary").textContent = acceptedWords.length + "個の単語を作ったよ！";
    $("new-record").hidden = !(score > 0 && score >= bestScore && bestScore > 0);

    const wordBox = $("final-words");
    wordBox.replaceChildren();
    if (acceptedWords.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "次は1つでも単語を見つけてみよう！";
      empty.className = "feedback";
      wordBox.appendChild(empty);
    } else {
      acceptedWords.forEach(({ word, points }) => {
        const chip = document.createElement("span");
        chip.className = "word-chip";
        chip.textContent = word + " (+" + points + ")";
        wordBox.appendChild(chip);
      });
    }
    updateStats();
    $("result-panel").hidden = false;
    $("result-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    showMessage("ゲーム終了！おつかれさま。");
  }

  startBtn.addEventListener("click", startGame);
  $("again-btn").addEventListener("click", startGame);
  form.addEventListener("submit", submitWord);
  startBtn.disabled = true;
  $("best-score").textContent = bestScore;
  loadDictionary();
})();