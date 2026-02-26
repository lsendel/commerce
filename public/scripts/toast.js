/**
 * Toast notification system — lightweight, vanilla JS.
 * Supports: success (green), error (red), info (blue).
 * Auto-dismiss after 3s with fade-out. Stacks vertically bottom-right.
 */
(function () {
  "use strict";

  var TOAST_DURATION = 3000;
  var FADE_DURATION = 300;

  // ─── Icons (SVG path data) ──────────────────────────────────────────────────

  var icons = {
    success: "M4.5 12.75l6 6 9-13.5",
    error:
      "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z",
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  };

  var colorClasses = {
    success: "toast--success",
    error: "toast--error",
    info: "toast--info",
  };

  // ─── Container ──────────────────────────────────────────────────────────────

  function getOrCreateContainer() {
    var existing = document.getElementById("toast-container");
    if (existing) return existing;

    var container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "false");
    document.body.appendChild(container);
    return container;
  }

  // ─── SVG helper ─────────────────────────────────────────────────────────────

  function createSvgIcon(pathD, className, width, height) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", className || "");
    svg.setAttribute("fill", "none");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    if (width) svg.setAttribute("width", String(width));
    if (height) svg.setAttribute("height", String(height));
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("d", pathD);
    svg.appendChild(path);
    return svg;
  }

  // ─── Create Toast ───────────────────────────────────────────────────────────

  function showToast(message, type) {
    type = type || "success";
    var container = getOrCreateContainer();

    var toast = document.createElement("div");
    toast.className = "toast " + (colorClasses[type] || colorClasses.success);
    toast.setAttribute("role", "alert");

    // Build icon
    var iconSvg = createSvgIcon(
      icons[type] || icons.success,
      "toast__icon"
    );

    // Build text
    var textSpan = document.createElement("span");
    textSpan.className = "toast__text";
    textSpan.textContent = message;

    // Build close button (safe DOM construction, no innerHTML)
    var closeBtn = document.createElement("button");
    closeBtn.className = "toast__close";
    closeBtn.setAttribute("aria-label", "Dismiss");
    closeBtn.appendChild(
      createSvgIcon("M6 18L18 6M6 6l12 12", "", 14, 14)
    );
    closeBtn.addEventListener("click", function () {
      dismissToast(toast);
    });

    toast.appendChild(iconSvg);
    toast.appendChild(textSpan);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.classList.add("toast--visible");
      });
    });

    // Auto-dismiss
    var timer = setTimeout(function () {
      dismissToast(toast);
    }, TOAST_DURATION);

    // Pause auto-dismiss on hover
    toast.addEventListener("mouseenter", function () {
      clearTimeout(timer);
    });
    toast.addEventListener("mouseleave", function () {
      timer = setTimeout(function () {
        dismissToast(toast);
      }, TOAST_DURATION);
    });

    return toast;
  }

  function dismissToast(toast) {
    if (toast._dismissing) return;
    toast._dismissing = true;
    toast.classList.remove("toast--visible");
    toast.classList.add("toast--exit");
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, FADE_DURATION);
  }

  // ─── Export globally ────────────────────────────────────────────────────────

  window.showToast = showToast;
})();
