(function () {
  "use strict";

  function showFlash(message, type) {
    var banner = document.getElementById("admin-fulfillment-flash");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "admin-fulfillment-flash";
      banner.className =
        "fixed top-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm font-medium shadow-lg";
      document.body.appendChild(banner);
    }
    banner.textContent = message;
    if (type === "success") {
      banner.classList.remove("bg-red-50", "text-red-700", "border-red-200", "hidden");
      banner.classList.add("bg-emerald-50", "text-emerald-700", "border-emerald-200");
    } else {
      banner.classList.remove("bg-emerald-50", "text-emerald-700", "border-emerald-200", "hidden");
      banner.classList.add("bg-red-50", "text-red-700", "border-red-200");
    }
    setTimeout(function () {
      banner.classList.add("hidden");
    }, 4000);
  }

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
            showFlash(data.error || "Retry failed", "error");
          });
        }
      })
      .catch(function () {
        btn.textContent = "Error";
        btn.disabled = false;
        showFlash("Retry request failed", "error");
      });
  });
})();
