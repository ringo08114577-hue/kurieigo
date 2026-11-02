(() => {
  "use strict";
  const LETTER_OPTIONS = [8, 10, 12, 14];
  const TIME_OPTIONS = [30, 45, 60];
  const BEST_PREFIX = "creigeo-best-score-";
  let letters = 8;
  let seconds = 30;

  const startLink = document.getElementById("home-start-link");
  const bestScore = document.getElementById("home-best-score");

  function getBest() {
    try {
      const stored = localStorage.getItem(BEST_PREFIX + letters + "-" + seconds);
      if (stored !== null) return Number(stored) || 0;
      // Carry forward the original default-mode record.
      if (letters === 8 && seconds === 30) {
        return Number(localStorage.getItem("creigeo-best-score-v1")) || 0;
      }
    } catch {
      // The mode picker still works without local storage.
    }
    return 0;
  }

  function updateSelection() {
    document.querySelectorAll("[data-letters]").forEach((button) => {
      const selected = Number(button.dataset.letters) === letters;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    document.querySelectorAll("[data-time]").forEach((button) => {
      const selected = Number(button.dataset.time) === seconds;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    startLink.href = "game.html?letters=" + letters + "&time=" + seconds;
    bestScore.textContent = getBest().toLocaleString();
  }

  document.querySelectorAll("[data-letters]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = Number(button.dataset.letters);
      if (LETTER_OPTIONS.includes(value)) {
        letters = value;
        updateSelection();
      }
    });
  });

  document.querySelectorAll("[data-time]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = Number(button.dataset.time);
      if (TIME_OPTIONS.includes(value)) {
        seconds = value;
        updateSelection();
      }
    });
  });

  updateSelection();
})();