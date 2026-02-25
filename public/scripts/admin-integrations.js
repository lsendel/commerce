(function () {
  "use strict";

  // ─── Tab Switching ──────────────────────────────────────────
  document.querySelectorAll("[data-tab-target]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = btn.getAttribute("data-tab-target");
      var panels = document.querySelectorAll(".tab-panel");
      panels.forEach(function (p) {
        p.classList.add("hidden");
      });
      var panel = document.getElementById(target);
      if (panel) panel.classList.remove("hidden");

      // Update active tab style
      btn
        .closest("nav")
        .querySelectorAll("[role=tab]")
        .forEach(function (t) {
          t.classList.remove("border-indigo-600", "text-indigo-600");
          t.classList.add("border-transparent", "text-gray-500");
        });
      btn.classList.add("border-indigo-600", "text-indigo-600");
      btn.classList.remove("border-transparent", "text-gray-500");
    });
  });

  // ─── Toggle Secret Visibility ───────────────────────────────
  document.querySelectorAll(".toggle-visibility").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var input = btn.previousElementSibling;
      if (input.type === "password") {
        input.type = "text";
        btn.textContent = "Hide";
      } else {
        input.type = "password";
        btn.textContent = "Show";
      }
    });
  });

  // ─── Form Submission ────────────────────────────────────────
  document.querySelectorAll(".integration-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var provider = form.getAttribute("data-provider");
      var storeId = form.getAttribute("data-store-id");
      var formData = new FormData(form);
      var secrets = {};
      var config = {};

      formData.forEach(function (value, key) {
        if (key.startsWith("config_")) {
          config[key.replace("config_", "")] = value;
        } else if (value) {
          secrets[key] = value;
        }
      });

      var url = storeId
        ? "/api/integrations/store/" + storeId + "/" + provider
        : "/api/integrations/" + provider;

      var card = form.closest("[data-provider]");
      var toggle = card ? card.querySelector(".toggle-integration") : null;

      fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: toggle ? toggle.checked : true,
          secrets: secrets,
          config: config,
        }),
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (data.verification && data.verification.success) {
            alert(data.verification.message || "Connected successfully!");
          } else if (data.verification) {
            alert(
              "Saved but verification failed: " + data.verification.message,
            );
          } else {
            alert("Saved!");
          }
          window.location.reload();
        })
        .catch(function (err) {
          alert("Error: " + err.message);
        });
    });
  });

  // ─── Verify Button ─────────────────────────────────────────
  document.querySelectorAll(".verify-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var provider = btn.getAttribute("data-provider");
      var card = btn.closest("[data-provider]");
      var storeId = card ? card.getAttribute("data-store-id") : "";

      var url = storeId
        ? "/api/integrations/store/" + storeId + "/" + provider + "/verify"
        : "/api/integrations/" + provider + "/verify";

      btn.textContent = "Verifying...";
      btn.disabled = true;

      fetch(url, { method: "POST" })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          alert(
            data.success
              ? data.message
              : "Verification failed: " + data.message,
          );
          window.location.reload();
        })
        .catch(function (err) {
          alert("Error: " + err.message);
          btn.textContent = "Verify Connection";
          btn.disabled = false;
        });
    });
  });

  // ─── Revert to Platform Default ─────────────────────────────
  document.querySelectorAll(".revert-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (
        !confirm(
          "Revert to platform default? Your store-specific key will be deleted.",
        )
      )
        return;

      var provider = btn.getAttribute("data-provider");
      var storeId = btn.getAttribute("data-store-id");

      fetch("/api/integrations/store/" + storeId + "/" + provider, {
        method: "DELETE",
      })
        .then(function () {
          window.location.reload();
        })
        .catch(function (err) {
          alert("Error: " + err.message);
        });
    });
  });

  // ─── Override Button (switch from platform to store key) ────
  document.querySelectorAll(".override-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var provider = btn.getAttribute("data-provider");
      var storeId = btn.getAttribute("data-store-id");

      fetch("/api/integrations/store/" + storeId + "/" + provider, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true, secrets: {}, config: {} }),
      })
        .then(function () {
          window.location.reload();
        })
        .catch(function (err) {
          alert("Error: " + err.message);
        });
    });
  });
})();
