(function () {
  "use strict";

  var form = document.getElementById("policy-config-form");
  var saveBtn = document.getElementById("policy-save-btn");
  var refreshBtn = document.getElementById("policy-refresh-btn");
  var statusEl = document.getElementById("policy-status");
  var errorEl = document.getElementById("policy-error");
  var violationsListEl = document.getElementById("policy-violations-list");

  function parseError(payload, fallback) {
    if (window.petm8GetApiErrorMessage) {
      return window.petm8GetApiErrorMessage(payload, fallback);
    }
    return (payload && (payload.error || payload.message)) || fallback;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDateTime(value) {
    if (!value) return "";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function setStatus(message, isError) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.className = isError ? "mt-3 text-xs text-red-600" : "mt-3 text-xs text-gray-500";
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

  function toNumber(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function renderViolations(violations) {
    if (!violationsListEl) return;

    if (!Array.isArray(violations) || violations.length === 0) {
      violationsListEl.innerHTML = '<p class="text-sm text-gray-400">No policy violations recorded.</p>';
      return;
    }

    violationsListEl.innerHTML = violations
      .map(function (violation) {
        var severity = violation.severity === "error" ? "error" : "warning";
        var severityClass = severity === "error"
          ? "bg-rose-100 text-rose-700"
          : "bg-amber-100 text-amber-700";

        return (
          '<article class="rounded-lg border border-gray-200 px-3 py-3">' +
          '<div class="flex items-center justify-between gap-3">' +
          '<p class="text-sm font-medium text-gray-900">' +
          escapeHtml((violation.domain || "") + " / " + (violation.action || "")) +
          "</p>" +
          '<span class="rounded-full px-2 py-0.5 text-xs font-semibold ' +
          severityClass +
          '">' +
          escapeHtml(severity) +
          "</span>" +
          "</div>" +
          '<p class="text-sm text-gray-700 mt-1">' +
          escapeHtml(violation.message || "") +
          "</p>" +
          '<p class="text-xs text-gray-400 mt-1">' +
          escapeHtml(formatDateTime(violation.createdAt)) +
          "</p>" +
          "</article>"
        );
      })
      .join("");
  }

  function applyPolicyToForm(policy) {
    if (!form || !policy || !policy.config) return;

    form.querySelector("#policy-max-variants").value = String(policy.config.pricing.maxVariants);
    form.querySelector("#policy-min-delta").value = String(policy.config.pricing.minDeltaPercent);
    form.querySelector("#policy-max-delta").value = String(policy.config.pricing.maxDeltaPercent);
    form.querySelector("#policy-allow-auto-apply").checked = Boolean(policy.config.pricing.allowAutoApply);

    form.querySelector("#policy-max-flat-rate").value = String(policy.config.shipping.maxFlatRate);
    form.querySelector("#policy-max-estimated-days").value = String(policy.config.shipping.maxEstimatedDays);

    form.querySelector("#policy-max-percentage-off").value = String(policy.config.promotions.maxPercentageOff);
    form.querySelector("#policy-max-fixed-amount").value = String(policy.config.promotions.maxFixedAmount);
    form.querySelector("#policy-max-campaign-days").value = String(policy.config.promotions.maxCampaignDays);
    form.querySelector("#policy-allow-stackable").checked = Boolean(policy.config.promotions.allowStackable);

    form.querySelector("#policy-is-active").checked = Boolean(policy.isActive);
    form.querySelector("#policy-mode").value = policy.config.enforcement.mode || "enforce";
  }

  function collectPayload() {
    if (!form) return null;

    return {
      pricing: {
        maxVariants: Math.max(1, Math.min(100, Math.trunc(toNumber(form.querySelector("#policy-max-variants").value, 20)))),
        minDeltaPercent: Math.max(-50, Math.min(-1, toNumber(form.querySelector("#policy-min-delta").value, -15))),
        maxDeltaPercent: Math.max(1, Math.min(50, toNumber(form.querySelector("#policy-max-delta").value, 15))),
        allowAutoApply: form.querySelector("#policy-allow-auto-apply").checked,
      },
      shipping: {
        maxFlatRate: Math.max(0, Math.min(1000, toNumber(form.querySelector("#policy-max-flat-rate").value, 120))),
        maxEstimatedDays: Math.max(0, Math.min(120, Math.trunc(toNumber(form.querySelector("#policy-max-estimated-days").value, 30)))),
      },
      promotions: {
        maxPercentageOff: Math.max(1, Math.min(100, toNumber(form.querySelector("#policy-max-percentage-off").value, 60))),
        maxFixedAmount: Math.max(0, Math.min(5000, toNumber(form.querySelector("#policy-max-fixed-amount").value, 250))),
        maxCampaignDays: Math.max(1, Math.min(365, Math.trunc(toNumber(form.querySelector("#policy-max-campaign-days").value, 120)))),
        allowStackable: form.querySelector("#policy-allow-stackable").checked,
      },
      enforcement: {
        mode: form.querySelector("#policy-mode").value === "monitor" ? "monitor" : "enforce",
      },
      isActive: form.querySelector("#policy-is-active").checked,
    };
  }

  async function loadData() {
    var payload = await requestJson("/api/admin/policies", {
      method: "GET",
      credentials: "same-origin",
    });

    var violationsPayload = await requestJson("/api/admin/policies/violations?limit=100", {
      method: "GET",
      credentials: "same-origin",
    });

    applyPolicyToForm(payload.policy);
    renderViolations(violationsPayload.violations || []);
  }

  async function savePolicy() {
    clearError();
    setStatus("Saving policy...", false);
    if (saveBtn) saveBtn.disabled = true;

    try {
      var payload = collectPayload();
      var response = await requestJson("/api/admin/policies", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      applyPolicyToForm(response.policy);
      await loadData();
      setStatus("Policy saved.", false);
    } catch (err) {
      var message = err && err.message ? err.message : "Failed to save policy.";
      showError(message);
      setStatus(message, true);
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      savePolicy();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      clearError();
      setStatus("Refreshing policy data...", false);
      loadData()
        .then(function () {
          setStatus("", false);
        })
        .catch(function (err) {
          var message = err && err.message ? err.message : "Failed to refresh policy data.";
          showError(message);
          setStatus(message, true);
        });
    });
  }
})();
