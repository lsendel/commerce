/**
 * Toast notification system — lightweight, vanilla JS.
 * Supports: success (green), error (red), warning (amber), info (blue).
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
    warning:
      "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z",
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  };

  var colorClasses = {
    success: "toast--success",
    error: "toast--error",
    warning: "toast--warning",
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

    // Inject toast styles if not already present
    if (!document.getElementById("toast-styles")) {
      var style = document.createElement("style");
      style.id = "toast-styles";
      style.textContent = [
        ".toast-container{position:fixed;bottom:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:.5rem;pointer-events:none;}",
        ".toast{pointer-events:auto;display:flex;align-items:center;gap:.5rem;padding:.75rem 1rem;border-radius:.75rem;font-size:.875rem;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,.15);transform:translateX(100%);opacity:0;transition:all .3s ease;}",
        ".toast--visible{transform:translateX(0);opacity:1;}",
        ".toast--exit{transform:translateX(100%);opacity:0;}",
        ".toast--success{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;}",
        ".toast--error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;}",
        ".toast--warning{background:#fffbeb;color:#92400e;border:1px solid #fde68a;}",
        ".toast--info{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;}",
        ".toast__icon{width:1.25rem;height:1.25rem;flex-shrink:0;}",
        ".toast__text{flex:1;}",
        ".toast__close{background:none;border:none;cursor:pointer;opacity:.5;padding:.25rem;border-radius:.25rem;color:inherit;}",
        ".toast__close:hover{opacity:1;}",
        "@media(prefers-color-scheme:dark){",
        ".toast--success{background:#064e3b;color:#a7f3d0;border-color:#065f46;}",
        ".toast--error{background:#7f1d1d;color:#fecaca;border-color:#991b1b;}",
        ".toast--warning{background:#78350f;color:#fde68a;border-color:#92400e;}",
        ".toast--info{background:#1e3a5f;color:#bfdbfe;border-color:#1e40af;}",
        "}",
      ].join("\n");
      document.head.appendChild(style);
    }

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

    // Build close button
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
