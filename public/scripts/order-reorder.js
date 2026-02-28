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

    fetch("/api/orders/" + orderId + "/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(function (resp) {
        return resp.json().then(function (data) {
          if (!resp.ok) {
            throw new Error(data.error || "Reorder failed");
          }

          var added = Number(data.addedLineCount || 0);
          var skipped = Number(data.skippedLineCount || 0);
          if (added > 0) {
            notify(
              skipped > 0
                ? "Added " + added + " item(s) to cart (" + skipped + " skipped)."
                : "Added " + added + " item(s) to cart.",
              skipped > 0 ? "warning" : "success",
            );
            window.location.href = "/cart";
            return;
          }

          notify("No items could be reordered from that order.", "warning");
          btn.disabled = false;
          btn.textContent = idleText;
        });
      })
      .catch(function (err) {
        notify(err.message || "Network error. Please try again.", "error");
        btn.disabled = false;
        btn.textContent = idleText;
      });
  });
})();
