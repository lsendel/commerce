(function () {
  "use strict";

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".retry-btn");
    if (!btn) return;

    var requestId = btn.getAttribute("data-request-id");
    if (!requestId) return;

    btn.textContent = "Retrying...";
    btn.disabled = true;

    fetch("/api/admin/fulfillment/" + requestId + "/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then(function (resp) {
        if (resp.ok) {
          btn.textContent = "Queued";
          btn.classList.remove("text-brand-600", "hover:text-brand-700");
          btn.classList.add("text-green-600");
          setTimeout(function () {
            window.location.reload();
          }, 1500);
        } else {
          return resp.json().then(function (data) {
            btn.textContent = "Failed";
            btn.classList.add("text-red-600");
            alert(data.error || "Retry failed");
          });
        }
      })
      .catch(function () {
        btn.textContent = "Error";
        btn.disabled = false;
      });
  });
})();
