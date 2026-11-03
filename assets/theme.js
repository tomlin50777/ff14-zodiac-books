(function () {
  const themes = {
    daylight: { label: "晨光白", color: "#f4f8f7" },
    mist: { label: "霧藍", color: "#dce7ed" },
    forest: { label: "森綠", color: "#e6efe4" },
    night: { label: "水晶夜", color: "#101827" }
  };
  const key = "ff14-encyclopedia-theme";
  function readSavedTheme() {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }
  function saveTheme(name) {
    try { localStorage.setItem(key, name); } catch (error) { /* 無儲存權限時仍可在本頁切換 */ }
  }
  const stored = readSavedTheme();
  const initial = Object.prototype.hasOwnProperty.call(themes, stored) ? stored : "daylight";

  function applyTheme(name) {
    const themeName = themes[name] ? name : "daylight";
    const theme = themes[themeName];
    document.documentElement.dataset.theme = themeName;
    saveTheme(themeName);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme.color;
    document.querySelectorAll("[data-theme-choice]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.themeChoice === themeName ? "true" : "false");
    });
    const label = document.querySelector(".theme-trigger-label");
    if (label) label.textContent = theme.label;
  }

  applyTheme(initial);

  function buildPicker() {
    const host = document.querySelector(".nav") || document.querySelector(".top-actions");
    if (!host || host.querySelector(".theme-picker")) return;
    const picker = document.createElement("div");
    picker.className = "theme-picker";
    picker.innerHTML = '<button class="theme-trigger" type="button" aria-expanded="false" aria-haspopup="true"><span class="theme-trigger-icon" aria-hidden="true"></span><span class="theme-trigger-label"></span><span aria-hidden="true">⌄</span></button><div class="theme-menu" hidden></div>';
    const menu = picker.querySelector(".theme-menu");
    Object.keys(themes).forEach(function (name) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.themeChoice = name;
      button.innerHTML = '<span class="theme-swatch ' + name + '" aria-hidden="true"></span><span>' + themes[name].label + "</span>";
      button.addEventListener("click", function () {
        applyTheme(name);
        menu.hidden = true;
        picker.querySelector(".theme-trigger").setAttribute("aria-expanded", "false");
      });
      menu.appendChild(button);
    });
    const trigger = picker.querySelector(".theme-trigger");
    trigger.addEventListener("click", function () {
      const open = menu.hidden;
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (event) {
      if (!picker.contains(event.target)) {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      }
    });
    // The header scrolls away. Close its dropdown before it crosses pinned reading tools.
    window.addEventListener("scroll", function () {
      if (!menu.hidden) {
        const restoreFocus = menu.contains(document.activeElement);
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        if (restoreFocus) trigger.focus({ preventScroll: true });
      }
    }, { passive: true });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        trigger.focus();
      }
    });
    if (host.classList.contains("top-actions")) host.prepend(picker);
    else host.appendChild(picker);
    applyTheme(document.documentElement.dataset.theme);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildPicker);
  else buildPicker();
})();
