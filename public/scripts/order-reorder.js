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

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".reorder-btn");
    if (!btn) return;

    var orderId = btn.getAttribute("data-order-id");
    if (!orderId) return;

    btn.disabled = true;
    var idleText = btn.textContent || "Order Again";
    btn.textContent = "Adding...";

    fetch("/api/orders/" + orderId + "/reorder-preview", {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
      .then(function (resp) {
        return resp.json().then(function (data) {
          if (!resp.ok) throw new Error(data.error || "Could not build reorder preview");
          return data;
        });
      })
      .then(function (preview) {
        if (!preview || preview.eligible === false || preview.action === "blocked") {
          var previewMessage =
            preview && Array.isArray(preview.messages) && preview.messages.length > 0
              ? preview.messages[0]
              : "No items from this order are currently eligible for reorder.";
          throw new Error(previewMessage);
        }

        if (preview.action === "partial") {
          notify("Some items will be adjusted based on current availability.", "warning");
        }

        return fetch("/api/orders/" + orderId + "/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferPartial: true }),
        });
      })
      .then(function (resp) {
        return resp.json().then(function (data) {
          if (!resp.ok) throw new Error(data.error || "Reorder failed");
          return data;
        });
      })
      .then(function (data) {
        var added = Number(data.addedLineCount || 0);
        var skipped = Number(data.skippedLineCount || 0);
        if (added > 0) {
          notify(
            skipped > 0
              ? "Added " + added + " line(s) to cart (" + skipped + " skipped)."
              : "Added " + added + " line(s) to cart.",
            skipped > 0 ? "warning" : "success",
          );
          window.location.href = "/cart";
          return;
        }

        var skippedMessage =
          data && Array.isArray(data.skipped) && data.skipped.length > 0
            ? data.skipped[0]
            : "No items could be reordered from that order.";
        notify(skippedMessage, "warning");
        btn.disabled = false;
        btn.textContent = idleText;
      })
      .catch(function (err) {
        notify(err.message || "Network error. Please try again.", "error");
        btn.disabled = false;
        btn.textContent = idleText;
      });
  });
})();
