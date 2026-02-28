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
            btn.textContent = data.success ? "Cancelled" : "Partial";
            btn.classList.remove(
              "text-red-600",
              "hover:text-red-700",
              "hover:bg-red-50"
            );
            btn.classList.add("text-gray-400");
            if (data.message) {
              notify(data.message, data.success ? "success" : "warning");
            }
            setTimeout(function () {
              window.location.reload();
            }, 1500);
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
