(function () {
  "use strict";

  var flashTimeout = null;
  var STATUS_DOT_CLASSES = {
    connected: "bg-green-500",
    disconnected: "bg-gray-400",
    error: "bg-red-500",
    pending_verification: "bg-yellow-500",
  };
  var STATUS_LABELS = {
    connected: "Connected",
    disconnected: "Disconnected",
    error: "Error",
    pending_verification: "Verifying...",
  };

  function showFlash(message, type) {
    var banner = document.getElementById("admin-integrations-flash");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "admin-integrations-flash";
      banner.className =
        "fixed top-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm font-medium shadow-lg";
      document.body.appendChild(banner);
    }
    banner.textContent = message;
    banner.classList.remove(
      "bg-red-50",
      "text-red-700",
      "border-red-200",
      "bg-amber-50",
      "text-amber-800",
      "border-amber-200",
      "bg-emerald-50",
      "text-emerald-700",
      "border-emerald-200",
      "hidden"
    );
    if (type === "success") {
      banner.classList.add("bg-emerald-50", "text-emerald-700", "border-emerald-200");
    } else if (type === "warning") {
      banner.classList.add("bg-amber-50", "text-amber-800", "border-amber-200");
    } else {
      banner.classList.add("bg-red-50", "text-red-700", "border-red-200");
    }
    if (flashTimeout) clearTimeout(flashTimeout);
    flashTimeout = setTimeout(function () {
      banner.classList.add("hidden");
    }, 4000);
  }

  function parseError(payload, fallback) {
    if (window.petm8GetApiErrorMessage) {
      return window.petm8GetApiErrorMessage(payload, fallback);
    }
    return (payload && (payload.error || payload.message)) || fallback;
  }

  function requestJson(url, options, fallbackMessage) {
    return fetch(url, options).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (payload) {
        if (!response.ok) {
          throw new Error(parseError(payload, fallbackMessage || "Request failed"));
        }
        return payload;
      });
    });
  }

  function getListUrl(storeId) {
    return storeId
      ? "/api/integrations/store/" + storeId
      : "/api/integrations";
  }

  function formatDateTime(value) {
    if (!value) return "";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  }

  function normalizeStoreId(value) {
    return (value || "").trim();
  }

  function setReadonlyState(card, readOnly) {
    card.dataset.readOnly = readOnly ? "true" : "false";

    var toggleWrap = card.querySelector("[data-toggle-wrap]");
    if (toggleWrap) {
      toggleWrap.classList.toggle("hidden", readOnly);
    }

    var note = card.querySelector("[data-readonly-note]");
    if (note) {
      note.classList.toggle("hidden", !readOnly);
    }

    var form = card.querySelector(".integration-form");
    if (!form) return;
    form.querySelectorAll("input, button, select, textarea").forEach(function (control) {
      control.disabled = readOnly;
    });
  }

  function setStatusBadge(card, status, message) {
    var dot = card.querySelector("[data-status-dot]");
    var label = card.querySelector("[data-status-label]");
    var messageEl = card.querySelector("[data-status-message]");

    if (dot) {
      dot.className = "w-2 h-2 rounded-full " + (STATUS_DOT_CLASSES[status] || "bg-gray-400");
    }
    if (label) {
      label.textContent = STATUS_LABELS[status] || status || "Unknown";
    }
    if (messageEl) {
      if (message) {
        messageEl.textContent = "(" + message + ")";
        messageEl.classList.remove("hidden");
      } else {
        messageEl.textContent = "";
        messageEl.classList.add("hidden");
      }
    }
  }

  function setSourceBadge(card, source) {
    var sourceEl = card.querySelector("[data-integration-source]");
    if (!sourceEl) return;
    sourceEl.dataset.source = source;
    if (source === "store_override") {
      sourceEl.className =
        "px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400";
      sourceEl.textContent = "Using: Store override";
    } else {
      sourceEl.className =
        "px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
      sourceEl.textContent = "Using: Platform default";
    }
  }

  function setVerificationMeta(card, integration) {
    var lastVerifiedWrap = card.querySelector("[data-last-verified]");
    var lastVerifiedValue = card.querySelector("[data-last-verified-value]");
    var lastSyncWrap = card.querySelector("[data-last-sync]");
    var lastSyncValue = card.querySelector("[data-last-sync-value]");

    if (lastVerifiedWrap && lastVerifiedValue) {
      if (integration.lastVerifiedAt) {
        lastVerifiedValue.textContent = formatDateTime(integration.lastVerifiedAt);
        lastVerifiedWrap.classList.remove("hidden");
      } else {
        lastVerifiedValue.textContent = "";
        lastVerifiedWrap.classList.add("hidden");
      }
    }
    if (lastSyncWrap && lastSyncValue) {
      if (integration.lastSyncAt) {
        lastSyncValue.textContent = formatDateTime(integration.lastSyncAt);
        lastSyncWrap.classList.remove("hidden");
      } else {
        lastSyncValue.textContent = "";
        lastSyncWrap.classList.add("hidden");
      }
    }
  }

  function syncFormFields(card, integration) {
    var form = card.querySelector(".integration-form");
    if (!form) return;

    var secrets = integration && integration.secrets ? integration.secrets : {};
    form.querySelectorAll('input[type="password"]').forEach(function (input) {
      if (!input.dataset.defaultPlaceholder) {
        input.dataset.defaultPlaceholder = input.getAttribute("placeholder") || "";
      }
      var key = input.getAttribute("name");
      var masked = key ? secrets[key] : "";
      input.setAttribute("placeholder", masked || input.dataset.defaultPlaceholder || "");
      input.value = "";
    });

    var config = integration && integration.config ? integration.config : {};
    Object.keys(config).forEach(function (key) {
      var input = form.querySelector('[name="config_' + key + '"]');
      if (input) {
        input.value = String(config[key] == null ? "" : config[key]);
      }
    });

    var toggle = card.querySelector(".toggle-integration");
    if (toggle) {
      toggle.checked = !!integration.enabled;
    }
  }

  function setStoreActionVisibility(provider, storeId, source) {
    if (!storeId) return;
    var showOverride = source === "platform";
    document
      .querySelectorAll('.override-btn[data-provider="' + provider + '"][data-store-id="' + storeId + '"]')
      .forEach(function (btn) {
        btn.classList.toggle("hidden", !showOverride);
      });
    document
      .querySelectorAll('.revert-btn[data-provider="' + provider + '"][data-store-id="' + storeId + '"]')
      .forEach(function (btn) {
        btn.classList.toggle("hidden", showOverride);
      });
  }

  function applyIntegrationState(card, integration, storeId) {
    if (!card || !integration) return;
    var source = integration.source || "platform";
    var isStoreCard = !!storeId;
    var readOnly = isStoreCard && source === "platform";
    setReadonlyState(card, readOnly);
    setStatusBadge(card, integration.status, integration.statusMessage);
    setSourceBadge(card, source);
    setVerificationMeta(card, integration);
    syncFormFields(card, integration);
    setStoreActionVisibility(integration.provider, storeId, source);
  }

  function refreshIntegrationCard(provider, storeId) {
    return requestJson(
      getListUrl(storeId),
      { method: "GET", credentials: "same-origin" },
      "Could not refresh integration state"
    ).then(function (payload) {
      var list = Array.isArray(payload.integrations) ? payload.integrations : [];
      var integration = list.find(function (item) {
        return item.provider === provider;
      });
      if (!integration) return null;

      document
        .querySelectorAll('[data-provider="' + provider + '"]')
        .forEach(function (card) {
          if (normalizeStoreId(card.getAttribute("data-store-id")) !== normalizeStoreId(storeId)) return;
          applyIntegrationState(card, integration, normalizeStoreId(storeId));
        });
      return integration;
    });
  }

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

  // ─── UI interactions ────────────────────────────────────────
  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target) return;

    var visibilityBtn = target.closest(".toggle-visibility");
    if (visibilityBtn) {
      var input = visibilityBtn.previousElementSibling;
      if (!input || input.disabled) return;
      if (input.type === "password") {
        input.type = "text";
        visibilityBtn.textContent = "Hide";
      } else {
        input.type = "password";
        visibilityBtn.textContent = "Show";
      }
      return;
    }

    var verifyBtn = target.closest(".verify-btn");
    if (verifyBtn) {
      var provider = verifyBtn.getAttribute("data-provider");
      var card = verifyBtn.closest("[data-provider]");
      var storeId = normalizeStoreId(card ? card.getAttribute("data-store-id") : "");
      var url = storeId
        ? "/api/integrations/store/" + storeId + "/" + provider + "/verify"
        : "/api/integrations/" + provider + "/verify";
      var idleText = verifyBtn.textContent || "Verify Connection";
      verifyBtn.textContent = "Verifying...";
      verifyBtn.disabled = true;

      requestJson(url, { method: "POST", credentials: "same-origin" }, "Verification failed")
        .then(function (data) {
          showFlash(
            data.success ? data.message : "Verification failed: " + data.message,
            data.success ? "success" : "warning"
          );
          return refreshIntegrationCard(provider, storeId);
        })
        .catch(function (err) {
          showFlash("Error: " + err.message, "error");
        })
        .finally(function () {
          verifyBtn.textContent = idleText;
          verifyBtn.disabled = card && card.dataset.readOnly === "true";
        });
      return;
    }

    var revertBtn = target.closest(".revert-btn");
    if (revertBtn) {
      if (!confirm("Revert to platform default? Your store-specific key will be deleted.")) return;
      var revertProvider = revertBtn.getAttribute("data-provider");
      var revertStoreId = normalizeStoreId(revertBtn.getAttribute("data-store-id"));
      revertBtn.disabled = true;
      requestJson(
        "/api/integrations/store/" + revertStoreId + "/" + revertProvider,
        { method: "DELETE", credentials: "same-origin" },
        "Failed to revert integration"
      )
        .then(function () {
          showFlash("Reverted to platform default", "success");
          return refreshIntegrationCard(revertProvider, revertStoreId);
        })
        .catch(function (err) {
          showFlash("Error: " + err.message, "error");
        })
        .finally(function () {
          revertBtn.disabled = false;
        });
      return;
    }

    var overrideBtn = target.closest(".override-btn");
    if (overrideBtn) {
      var overrideProvider = overrideBtn.getAttribute("data-provider");
      var overrideStoreId = normalizeStoreId(overrideBtn.getAttribute("data-store-id"));
      overrideBtn.disabled = true;
      requestJson(
        "/api/integrations/store/" + overrideStoreId + "/" + overrideProvider,
        {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: true, secrets: {}, config: {} }),
        },
        "Failed to create store override"
      )
        .then(function () {
          showFlash("Store override enabled. Add your keys and save.", "success");
          return refreshIntegrationCard(overrideProvider, overrideStoreId);
        })
        .catch(function (err) {
          showFlash("Error: " + err.message, "error");
        })
        .finally(function () {
          overrideBtn.disabled = false;
        });
    }
  });

  // ─── Form Submission ────────────────────────────────────────
  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!form || !form.classList || !form.classList.contains("integration-form")) return;
    event.preventDefault();
    if (form.closest("[data-read-only='true']")) return;

    var provider = form.getAttribute("data-provider");
    var storeId = normalizeStoreId(form.getAttribute("data-store-id"));
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
    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving...";
    }

    requestJson(
      url,
      {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: toggle ? toggle.checked : true,
          secrets: secrets,
          config: config,
        }),
      },
      "Failed to save integration"
    )
      .then(function (data) {
        if (data.verification && data.verification.success) {
          showFlash(data.verification.message || "Connected successfully!", "success");
        } else if (data.verification) {
          showFlash("Saved but verification failed: " + data.verification.message, "warning");
        } else {
          showFlash("Saved!", "success");
        }
        return refreshIntegrationCard(provider, storeId);
      })
      .catch(function (err) {
        showFlash("Error: " + err.message, "error");
      })
      .finally(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Save Changes";
        }
      });
  });
})();
