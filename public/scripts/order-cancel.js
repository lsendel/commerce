(function () {
  "use strict";

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".cancel-order-btn");
    if (!btn) return;

    var orderId = btn.getAttribute("data-order-id");
    if (!orderId) return;

    if (!confirm("Are you sure you want to cancel this order?")) return;

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
              alert(data.message);
            }
            setTimeout(function () {
              window.location.reload();
            }, 1500);
          } else {
            btn.textContent = "Cancel Order";
            btn.disabled = false;
            alert(data.error || data.message || "Cancellation failed");
          }
        });
      })
      .catch(function () {
        btn.textContent = "Cancel Order";
        btn.disabled = false;
        alert("Network error. Please try again.");
      });
  });
})();
