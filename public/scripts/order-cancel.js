(function () {
  "use strict";

  function notify(message, type) {
    if (!message) return;
    if (window.showToast) {
      window.showToast(message, type || "info");
      return;
    }
    if (type === "error") console.error(message);
    else console.log(message);
  }

  function requireSecondClick(btn, confirmText, idleText, timeoutMs) {
    if (btn.dataset.confirming === "true") return true;
    btn.dataset.confirming = "true";
    btn.dataset.idleText = btn.textContent || idleText;
    btn.textContent = confirmText;
    notify("Click again to confirm", "warning");
    if (btn._confirmTimer) clearTimeout(btn._confirmTimer);
    btn._confirmTimer = setTimeout(function () {
      btn.dataset.confirming = "false";
      btn.textContent = btn.dataset.idleText || idleText;
    }, timeoutMs);
    return false;
  }

  function applyCancelledState(orderId) {
    var orderRoot = document.getElementById("order-" + orderId);
    if (!orderRoot) return;

    var badgeWrap = orderRoot.querySelector("[data-order-status-badge]");
    var badge = badgeWrap && badgeWrap.firstElementChild
      ? badgeWrap.firstElementChild
      : badgeWrap;
    if (badge) {
      badge.className =
        "inline-flex items-center rounded-full font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 px-2.5 py-0.5 text-xs";
      badge.textContent = "Cancelled";
    }

    var cancelBtn = orderRoot.querySelector(".cancel-order-btn");
    if (cancelBtn) {
      cancelBtn.textContent = "Cancelled";
      cancelBtn.disabled = true;
      cancelBtn.classList.remove("text-red-600", "hover:text-red-700", "hover:bg-red-50");
      cancelBtn.classList.add("text-gray-400", "cursor-not-allowed");
    }

    var returnBtn = orderRoot.querySelector(".return-exchange-btn");
    if (returnBtn) {
      returnBtn.disabled = true;
      returnBtn.classList.remove("text-brand-600", "hover:text-brand-700", "hover:bg-brand-50");
      returnBtn.classList.add("text-gray-400", "bg-gray-50", "cursor-not-allowed");
      returnBtn.setAttribute("title", "Order is cancelled");
    }
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".cancel-order-btn");
    if (!btn) return;

    var orderId = btn.getAttribute("data-order-id");
    if (!orderId) return;

    if (!requireSecondClick(btn, "Confirm Cancel", "Cancel Order", 5000)) return;
    btn.dataset.confirming = "false";
    if (btn._confirmTimer) clearTimeout(btn._confirmTimer);

    btn.textContent = "Cancelling...";
    btn.disabled = true;

    fetch("/api/orders/" + orderId + "/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(function (resp) {
        return resp.json().then(function (data) {
          if (resp.ok || resp.status === 207) {
            if (data.success) {
              applyCancelledState(orderId);
            } else {
              btn.textContent = "Retry Cancel";
              btn.disabled = false;
            }
            if (data.message) {
              notify(data.message, data.success ? "success" : "warning");
            }
          } else {
            btn.textContent = "Cancel Order";
            btn.disabled = false;
            notify(data.error || data.message || "Cancellation failed", "error");
          }
        });
      })
      .catch(function () {
        btn.textContent = "Cancel Order";
        btn.disabled = false;
        notify("Network error. Please try again.", "error");
      });
  });
})();
