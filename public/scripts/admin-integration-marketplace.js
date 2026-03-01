(function () {
  "use strict";

  var statusEl = document.getElementById("marketplace-status");
  var errorEl = document.getElementById("marketplace-error");
  var refreshBtn = document.getElementById("marketplace-refresh-btn");
  var gridEl = document.getElementById("marketplace-grid");

  function parseError(payload, fallback) {
    if (window.petm8GetApiErrorMessage) {
      return window.petm8GetApiErrorMessage(payload, fallback);
    }
    return (payload && (payload.error || payload.message)) || fallback;
  }

  function setStatus(message, isError) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.className = isError ? "mt-2 text-xs text-red-600" : "mt-2 text-xs text-gray-500";
  }

  function clearError() {
    if (!errorEl) return;
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }

  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }

  async function requestJson(url, options) {
    var response = await fetch(url, options);
    var payload = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(parseError(payload, "Request failed."));
    }

    return payload;
  }

  async function installProvider(provider) {
    clearError();
    setStatus("Installing " + provider + "...", false);

    try {
      await requestJson("/api/admin/integration-marketplace/apps/" + encodeURIComponent(provider) + "/install", {
        method: "POST",
        credentials: "same-origin",
      });

      setStatus("Installed " + provider + ".", false);
      window.location.reload();
    } catch (err) {
      var message = err && err.message ? err.message : "Failed to install app.";
      showError(message);
      setStatus(message, true);
    }
  }

  async function uninstallProvider(provider) {
    clearError();
    setStatus("Uninstalling " + provider + "...", false);

    try {
      await requestJson("/api/admin/integration-marketplace/apps/" + encodeURIComponent(provider) + "/uninstall", {
        method: "POST",
        credentials: "same-origin",
      });

      setStatus("Uninstalled " + provider + ".", false);
      window.location.reload();
    } catch (err) {
      var message = err && err.message ? err.message : "Failed to uninstall app.";
      showError(message);
      setStatus(message, true);
    }
  }

  async function verifyProvider(provider) {
    clearError();
    setStatus("Verifying " + provider + "...", false);

    try {
      var payload = await requestJson("/api/admin/integration-marketplace/apps/" + encodeURIComponent(provider) + "/verify", {
        method: "POST",
        credentials: "same-origin",
      });

      setStatus((payload.success ? "Verified" : "Verification failed") + ": " + (payload.message || provider), !payload.success);
      window.location.reload();
    } catch (err) {
      var message = err && err.message ? err.message : "Failed to verify app.";
      showError(message);
      setStatus(message, true);
    }
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      clearError();
      setStatus("Refreshing marketplace...", false);
      window.location.reload();
    });
  }

  if (gridEl) {
    gridEl.addEventListener("click", function (event) {
      var target = event.target;
      if (!target) return;

      var installBtn = target.closest(".marketplace-install-btn");
      if (installBtn) {
        var installProviderId = installBtn.getAttribute("data-provider");
        if (installProviderId) {
          installProvider(installProviderId);
        }
        return;
      }

      var uninstallBtn = target.closest(".marketplace-uninstall-btn");
      if (uninstallBtn) {
        var uninstallProviderId = uninstallBtn.getAttribute("data-provider");
        if (uninstallProviderId && window.confirm("Uninstall this store override?")) {
          uninstallProvider(uninstallProviderId);
        }
        return;
      }

      var verifyBtn = target.closest(".marketplace-verify-btn");
      if (verifyBtn) {
        var verifyProviderId = verifyBtn.getAttribute("data-provider");
        if (verifyProviderId) {
          verifyProvider(verifyProviderId);
        }
      }
    });
  }
})();
