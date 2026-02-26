/**
 * Dark mode toggle — loaded via layout on every page.
 * Reads from localStorage, falls back to prefers-color-scheme.
 * Applies "dark" class on <html>.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "petm8-dark-mode";

  function getPreference() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark") return "dark";
    if (stored === "light") return "light";
    // Respect system preference
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  function applyTheme(theme) {
    var html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    // Update toggle button icon state
    updateToggleIcons(theme);
  }

  function updateToggleIcons(theme) {
    var sunIcons = document.querySelectorAll("[data-darkmode-sun]");
    var moonIcons = document.querySelectorAll("[data-darkmode-moon]");
    sunIcons.forEach(function (el) {
      el.classList.toggle("hidden", theme !== "dark");
    });
    moonIcons.forEach(function (el) {
      el.classList.toggle("hidden", theme === "dark");
    });
    // Update aria-label on toggle buttons
    var toggleBtns = document.querySelectorAll("[data-darkmode-toggle]");
    toggleBtns.forEach(function (btn) {
      btn.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      );
    });
  }

  function toggle() {
    var html = document.documentElement;
    var isDark = html.classList.contains("dark");
    var newTheme = isDark ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
    // Announce change for screen readers
    var announcer = document.getElementById("announcer");
    if (announcer) {
      announcer.textContent = newTheme === "dark" ? "Dark mode enabled" : "Light mode enabled";
    }
  }

  // Apply immediately to avoid flash of wrong theme
  applyTheme(getPreference());

  // Listen for system preference changes
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
      // Only auto-switch if user has not manually set a preference
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(e.matches ? "dark" : "light");
      }
    });
  }

  // Bind toggle buttons once DOM is ready
  document.addEventListener("DOMContentLoaded", function () {
    updateToggleIcons(getPreference());
    document.querySelectorAll("[data-darkmode-toggle]").forEach(function (btn) {
      btn.addEventListener("click", toggle);
    });
  });

  // Expose for external use
  window.toggleDarkMode = toggle;
})();
