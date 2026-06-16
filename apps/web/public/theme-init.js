// Applies the saved (or system) theme before first paint to avoid a flash.
(function () {
  try {
    var t = localStorage.getItem("cs.theme");
    if (!t) {
      t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    if (t === "dark") document.documentElement.classList.add("dark");
  } catch (e) {
    /* ignore */
  }
})();
