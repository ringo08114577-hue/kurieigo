(() => {
  const $ = (id) => document.getElementById(id);
  const VOWELS = "AEIOU".split("");
  const CONSONANTS = "BCDFGHJKLMNPQRSTVWXYZ".split("");
  const ROUND_SECONDS = 30;
  const POINTS = (length) => length < 3 ? 0 : length === 3 ? 1 : 2 * length - 5;
  const lettersEl = $("letters");
  const input = $("word-input");
  const form = $("answer-form");
  const startBtn = $("start-btn");
  const submitBtn = $("submit-btn");
  const feedback = $("feedback");
  const dictionaryStatus = $("dictionary-status");
  let dictionary = new Set();
  let letters = [];
  let seenWords = new Set();
  let acceptedWords = [];
  let score = 0;
  let seconds = ROUND_SECONDS;
  let timer = null;
  let playing = false;
  let dictionaryReady = false;

  function shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
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

  function message(text, kind = "") {
    feedback.textContent = text;
    feedback.className = "feedback" + (kind ? " " + kind : "");
  }

  function updateStats() {
    $("time").innerHTML = seconds + '<span class="unit">秒</span>';
    $("score").textContent = score;
    $("word-count").textContent = acceptedWords.length;
  }

  async function loadDictionary() {
    try {
      const response = await fetch("dictionary.txt", { cache: "no-store" });
      if (!response.ok) throw new Error("辞書ファイルを読み込めません");
      const text = await response.text();
      text.split(/\r?\n/).forEach((line) => {
        const word = line.trim().toLowerCase();
        if (/^[a-z]{3,}$/.test(word)) dictionary.add(word);
      });
      if (dictionary.size < 1) throw new Error("辞書に単語がありません");
      dictionaryReady = true;
      dictionaryStatus.textContent = "辞書 " + dictionary.size.toLocaleString() + "語 読み込み済み";
      startBtn.disabled = false;
    } catch (error) {
      dictionaryStatus.textContent = "辞書の読み込みに失敗";
      message("辞書ファイルを読み込めないよ。GitHub Pagesで公開されているか確認してね。", "bad");
      startBtn.disabled = true;
    }
  }

  function startGame() {
    if (!dictionaryReady || playing) return;
    clearInterval(timer);
    letters = makeLetters();
    seenWords = new Set();
    acceptedWords = [];
    score = 0;
    seconds = ROUND_SECONDS;
    playing = true;
    renderLetters();
    updateStats();
    $("result-panel").hidden = true;
    startBtn.disabled = true;
    startBtn.textContent = "ゲーム中…";
    input.disabled = false;
    submitBtn.disabled = false;
    input.value = "";
    input.focus();
    message("スタート！ 3文字以上の英単語を入力してEnter！", "good");
    timer = setInterval(() => {
      seconds--;
      updateStats();
      if (seconds <= 0) endGame();
    }, 1000);
  }

  function isAllowedByLetters(word) {
    const available = new Set(letters.map((letter) => letter.toLowerCase()));
    return [...word].every((char) => available.has(char));
  }

  function submitWord(event) {
    event.preventDefault();
    if (!playing) return;
    const word = input.value.trim().toLowerCase();
    input.value = "";
    input.focus();

    if (!/^[a-z]+$/.test(word)) {
      message("英小文字の単語を入力してね。", "bad");
      return;
    }
    if (word.length < 3) {
      message("3文字以上の単語が必要だよ。", "bad");
      return;
    }
    if (!isAllowedByLetters(word)) {
      message("配られた8文字だけで作ってね！", "bad");
      return;
    }
    if (seenWords.has(word)) {
      message("その単語はもう使ったよ。別の単語を探そう！", "bad");
      return;
    }
    if (!dictionary.has(word)) {
      message("辞書に見つからなかったよ。別の単語を試してね。", "bad");
      return;
    }

    seenWords.add(word);
    const points = POINTS(word.length);
    score += points;
    acceptedWords.push({ word, points });
    updateStats();
    message("正解！ " + word + "  +" + points + "点", "good");
  }

  function endGame() {
    if (!playing) return;
    playing = false;
    clearInterval(timer);
    seconds = 0;
    updateStats();
    input.disabled = true;
    submitBtn.disabled = true;
    startBtn.disabled = false;
    startBtn.textContent = "もう一度プレイ ↻";
    $("final-score").textContent = score;
    $("final-summary").textContent = acceptedWords.length + "個の単語を作ったよ！";
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
    $("result-panel").hidden = false;
    $("result-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    message("ゲーム終了！ おつかれさま。");
  }

  startBtn.addEventListener("click", startGame);
  $("again-btn").addEventListener("click", startGame);
  form.addEventListener("submit", submitWord);
  startBtn.disabled = true;
  loadDictionary();
})();