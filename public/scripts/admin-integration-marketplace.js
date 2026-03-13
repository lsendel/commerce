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

  function statusBadgeClass(status) {
    if (status === "connected") return "rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700";
    if (status === "error") return "rounded-full px-2 py-0.5 text-xs font-semibold bg-rose-100 text-rose-700";
    if (status === "pending_verification") return "rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700";
    if (status === "disconnected") return "rounded-full px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700";
    return "rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700";
  }

  function renderMetaBadges(app) {
    var pieces = [];
    pieces.push(
      '<span class="rounded-full px-2 py-0.5 font-semibold ' +
        (app.installed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700") +
        '">' +
        (app.installed ? (app.source === "platform" ? "platform default" : "installed") : "not installed") +
        "</span>"
    );
    if (app.enabled) {
      pieces.push('<span class="rounded-full bg-cyan-100 text-cyan-700 px-2 py-0.5 font-semibold">enabled</span>');
    }
    if (app.hasSecretsConfigured) {
      pieces.push('<span class="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 font-semibold">keys configured</span>');
    }
    return pieces.join("");
  }

  function renderActions(app) {
    var provider = app.provider;
    var actions = [];
    actions.push(
      '<a href="' +
        app.docsUrl +
        '" target="_blank" rel="noreferrer" class="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">Docs</a>'
    );

    if (!app.installed || app.source === "platform") {
      actions.push(
        '<button type="button" class="marketplace-install-btn rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700" data-provider="' +
          provider +
          '">' +
          (app.source === "platform" ? "Install Override" : "Install") +
          "</button>"
      );
    } else {
      actions.push(
        '<button type="button" class="marketplace-verify-btn rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700" data-provider="' +
          provider +
          '">Verify</button>'
      );
      actions.push(
        '<button type="button" class="marketplace-uninstall-btn rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700" data-provider="' +
          provider +
          '">Uninstall</button>'
      );
    }

    if (app.kind === "partner") {
      actions.push(
        '<button type="button" class="marketplace-onboard-btn rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700" data-provider="' +
          provider +
          '">Partner Onboard</button>'
      );
      actions.push(
        '<button type="button" class="marketplace-contract-verify-btn rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700" data-provider="' +
          provider +
          '">Contract Verify</button>'
      );
    }

    return actions.join("");
  }

  function applyCardState(app) {
    if (!gridEl || !app || !app.provider) return;
    var card = gridEl.querySelector('[data-provider="' + app.provider + '"]');
    if (!card) return;

    var statusBadge = card.querySelector("[data-marketplace-status-badge]");
    if (statusBadge) {
      statusBadge.className = statusBadgeClass(app.status);
      statusBadge.textContent = app.status;
    }

    var metaRoot = card.querySelector("[data-marketplace-meta]");
    if (metaRoot) {
      metaRoot.innerHTML = renderMetaBadges(app);
    }

    var statusMessage = card.querySelector("[data-marketplace-status-message]");
    if (statusMessage) {
      if (app.statusMessage) {
        statusMessage.textContent = app.statusMessage;
        statusMessage.classList.remove("hidden");
      } else {
        statusMessage.textContent = "";
        statusMessage.classList.add("hidden");
      }
    }

    var lastVerified = card.querySelector("[data-marketplace-last-verified]");
    if (lastVerified) {
      if (app.lastVerifiedAt) {
        lastVerified.textContent = "Verified: " + app.lastVerifiedAt;
        lastVerified.classList.remove("hidden");
      } else {
        lastVerified.textContent = "";
        lastVerified.classList.add("hidden");
      }
    }

    var actionsRoot = card.querySelector("[data-marketplace-actions]");
    if (actionsRoot) {
      actionsRoot.innerHTML = renderActions(app);
    }
  }

  async function refreshMarketplaceApps() {
    var payload = await requestJson("/api/admin/integration-marketplace/apps", {
      method: "GET",
      credentials: "same-origin",
    });
    var apps = payload && Array.isArray(payload.apps) ? payload.apps : [];
    apps.forEach(applyCardState);
    return apps;
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
      await refreshMarketplaceApps();
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
      await refreshMarketplaceApps();
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
      if (payload.app) applyCardState(payload.app);
      else await refreshMarketplaceApps();
    } catch (err) {
      var message = err && err.message ? err.message : "Failed to verify app.";
      showError(message);
      setStatus(message, true);
    }
  }

  function parseCapabilities(input) {
    var allowed = {
      catalog_sync: true,
      order_submission: true,
      order_tracking: true,
      webhook_events: true,
    };
    if (!input) {
      return ["catalog_sync", "order_submission", "order_tracking", "webhook_events"];
    }
    var normalized = input
      .split(",")
      .map(function (item) {
        return item.trim();
      })
      .filter(function (item) {
        return allowed[item];
      });
    if (!normalized.length) {
      return ["catalog_sync", "order_submission", "order_tracking", "webhook_events"];
    }
    return Array.from(new Set(normalized));
  }

  async function loadPartnerOnboarding(provider) {
    return requestJson(
      "/api/admin/integration-marketplace/partners/" + encodeURIComponent(provider) + "/onboarding",
      {
        method: "GET",
        credentials: "same-origin",
      },
    );
  }

  async function completePartnerOnboarding(provider, payload) {
    return requestJson(
      "/api/admin/integration-marketplace/partners/" +
        encodeURIComponent(provider) +
        "/onboarding/complete",
      {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  }

  async function verifyPartnerContract(provider) {
    return requestJson(
      "/api/admin/integration-marketplace/partners/" +
        encodeURIComponent(provider) +
        "/contract-verify",
      {
        method: "POST",
        credentials: "same-origin",
      },
    );
  }

  async function onboardPartner(provider) {
    clearError();
    setStatus("Loading partner onboarding wizard for " + provider + "...", false);

    try {
      var onboardingPayload = await loadPartnerOnboarding(provider);
      var partner = onboardingPayload && onboardingPayload.partner ? onboardingPayload.partner : null;
      if (!partner) {
        throw new Error("Partner onboarding context not found.");
      }

      var contactEmail = window.prompt(
        "Partner contact email (" + provider + ")",
        partner.contactEmail || "",
      );
      if (contactEmail === null) {
        setStatus("Partner onboarding cancelled.", false);
        return;
      }
      contactEmail = contactEmail.trim();
      if (!contactEmail) {
        throw new Error("Contact email is required.");
      }

      var callbackUrl = window.prompt(
        "Callback URL (optional)",
        partner.callbackUrl || "",
      );
      if (callbackUrl === null) {
        setStatus("Partner onboarding cancelled.", false);
        return;
      }
      callbackUrl = callbackUrl.trim();

      var webhookUrl = window.prompt(
        "Webhook URL (optional)",
        partner.webhookUrl || "",
      );
      if (webhookUrl === null) {
        setStatus("Partner onboarding cancelled.", false);
        return;
      }
      webhookUrl = webhookUrl.trim();

      var capabilityDefault = (partner.requestedCapabilities || []).join(",");
      var requestedCapabilitiesRaw = window.prompt(
        "Requested capabilities (comma-separated: catalog_sync,order_submission,order_tracking,webhook_events)",
        capabilityDefault || "catalog_sync,order_submission,order_tracking,webhook_events",
      );
      if (requestedCapabilitiesRaw === null) {
        setStatus("Partner onboarding cancelled.", false);
        return;
      }
      var requestedCapabilities = parseCapabilities(requestedCapabilitiesRaw);

      var configuredSecrets = Array.isArray(partner.configuredSecrets)
        ? partner.configuredSecrets
        : [];
      var requiredSecrets = Array.isArray(partner.requiredSecrets)
        ? partner.requiredSecrets
        : [];
      var secrets = {};

      for (var i = 0; i < requiredSecrets.length; i += 1) {
        var secretKey = requiredSecrets[i];
        var alreadyConfigured = configuredSecrets.indexOf(secretKey) !== -1;
        var promptLabel = alreadyConfigured
          ? "Secret " + secretKey + " already configured. Enter new value to rotate or leave blank to keep current."
          : "Enter value for required secret " + secretKey;
        var secretValue = window.prompt(promptLabel, "");
        if (secretValue === null) {
          setStatus("Partner onboarding cancelled.", false);
          return;
        }
        secretValue = secretValue.trim();
        if (secretValue) {
          secrets[secretKey] = secretValue;
        } else if (!alreadyConfigured) {
          throw new Error("Missing required secret: " + secretKey);
        }
      }

      setStatus("Submitting onboarding for " + provider + "...", false);
      var completionPayload = await completePartnerOnboarding(provider, {
        enabled: true,
        contactEmail: contactEmail,
        callbackUrl: callbackUrl || null,
        webhookUrl: webhookUrl || null,
        requestedCapabilities: requestedCapabilities,
        secrets: secrets,
      });

      var onboarding = completionPayload.onboarding || {};
      var verification = completionPayload.verification || {};
      setStatus(
        "Onboarding " +
          provider +
          " complete. Verification: " +
          (verification.success ? "connected" : "failed") +
          ". Contract score: " +
          (onboarding.contractVerification ? onboarding.contractVerification.scorePercent : "n/a") +
          "%",
        !verification.success,
      );
      await refreshMarketplaceApps();
    } catch (err) {
      var message = err && err.message ? err.message : "Partner onboarding failed.";
      showError(message);
      setStatus(message, true);
    }
  }

  async function runContractVerification(provider) {
    clearError();
    setStatus("Running partner contract verification for " + provider + "...", false);

    try {
      var payload = await verifyPartnerContract(provider);
      var verification = payload.contractVerification || {};
      var failedChecks = Array.isArray(verification.checks)
        ? verification.checks.filter(function (check) {
            return check && check.severity === "error" && !check.passed;
          })
        : [];

      if (verification.verified) {
        setStatus(
          "Partner contract verified for " +
            provider +
            " (" +
            verification.scorePercent +
            "%).",
          false,
        );
      } else {
        setStatus(
          "Partner contract verification failed for " +
            provider +
            " (" +
            verification.scorePercent +
            "%). Blocking checks: " +
            failedChecks.length +
            ".",
          true,
        );
      }
      await refreshMarketplaceApps();
    } catch (err) {
      var message = err && err.message ? err.message : "Partner contract verification failed.";
      showError(message);
      setStatus(message, true);
    }
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      clearError();
      setStatus("Refreshing marketplace...", false);
      refreshMarketplaceApps()
        .then(function () {
          setStatus("Marketplace refreshed.", false);
        })
        .catch(function (err) {
          var message = err && err.message ? err.message : "Failed to refresh marketplace.";
          showError(message);
          setStatus(message, true);
        });
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
        return;
      }

      var onboardBtn = target.closest(".marketplace-onboard-btn");
      if (onboardBtn) {
        var onboardProviderId = onboardBtn.getAttribute("data-provider");
        if (onboardProviderId) {
          onboardPartner(onboardProviderId);
        }
        return;
      }

      var contractVerifyBtn = target.closest(".marketplace-contract-verify-btn");
      if (contractVerifyBtn) {
        var contractVerifyProviderId = contractVerifyBtn.getAttribute("data-provider");
        if (contractVerifyProviderId) {
          runContractVerification(contractVerifyProviderId);
        }
      }
    });
  }
})();
