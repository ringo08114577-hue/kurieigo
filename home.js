(() => {
  try {
    const best = Number(localStorage.getItem("creigeo-best-score-v1")) || 0;
    const target = document.getElementById("home-best-score");
    if (target) target.textContent = best.toLocaleString();
  } catch {
    // The home screen works even when local storage is unavailable.
  }
})();