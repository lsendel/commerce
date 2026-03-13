(function () {
  "use strict";

  var form = document.getElementById("pricing-experiment-form");
  var statusEl = document.getElementById("pricing-status");
  var errorEl = document.getElementById("pricing-form-error");
  var proposalEl = document.getElementById("pricing-proposal");
  var preflightEl = document.getElementById("pricing-preflight");
  var experimentsEl = document.getElementById("pricing-experiments");
  var performanceEl = document.getElementById("pricing-performance");

  var proposeBtn = document.getElementById("pricing-propose-btn");
  var preflightBtn = document.getElementById("pricing-preflight-btn");
  var startBtn = document.getElementById("pricing-start-btn");
  var refreshBtn = document.getElementById("pricing-refresh-btn");
  var clearProposalBtn = document.getElementById("pricing-clear-proposal");

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
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || "");
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatPercent(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return "n/a";
    }
    var rounded = Math.round(Number(value) * 100) / 100;
    return rounded + "%";
  }

  function setStatus(message, isError) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.className = isError ? "text-xs text-red-600" : "text-xs text-gray-500";
  }

  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }

  function clearError() {
    if (!errorEl) return;
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }

  async function requestJson(url, options) {
    var response = await fetch(url, options);
    var payload = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      var err = new Error(parseError(payload, "Request failed."));
      err.payload = payload;
      err.status = response.status;
      throw err;
    }

    return payload;
  }

  function toNumber(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function collectFormValues() {
    if (!form) {
      return null;
    }

    var fd = new FormData(form);
    var name = String(fd.get("name") || "").trim();
    var maxVariants = Math.max(1, Math.min(30, Math.trunc(toNumber(fd.get("maxVariants"), 8))));
    var minDeltaPercent = Math.max(-20, Math.min(0, toNumber(fd.get("minDeltaPercent"), -10)));
    var maxDeltaPercent = Math.max(0, Math.min(20, toNumber(fd.get("maxDeltaPercent"), 10)));
    var autoApply = fd.get("autoApply") === "on";
    var discountTypeRaw = String(fd.get("discountType") || "").trim();
    var discountType =
      discountTypeRaw === "percentage_off" || discountTypeRaw === "fixed_amount"
        ? discountTypeRaw
        : "";
    var discountValue = Math.max(0, Math.min(5000, toNumber(fd.get("discountValue"), 0)));
    var discountStackable = fd.get("discountStackable") === "on";

    var variantIdsRaw = String(fd.get("variantIds") || "").trim();
    var variantIds = variantIdsRaw
      ? variantIdsRaw
          .split(",")
          .map(function (part) {
            return part.trim();
          })
          .filter(Boolean)
      : [];

    var proposalBody = {
      maxVariants: maxVariants,
      minDeltaPercent: minDeltaPercent,
      maxDeltaPercent: maxDeltaPercent,
    };

    if (variantIds.length > 0) {
      proposalBody.variantIds = variantIds;
    }

    var discountScenario = null;
    if (discountType) {
      discountScenario = {
        strategyType: discountType,
        value: discountValue,
        stackable: discountStackable,
      };
    }

    return {
      name: name,
      autoApply: autoApply,
      maxVariants: maxVariants,
      minDeltaPercent: minDeltaPercent,
      maxDeltaPercent: maxDeltaPercent,
      variantIds: variantIds,
      discountScenario: discountScenario,
      proposalBody: proposalBody,
    };
  }

  function riskLevelClass(level) {
    if (level === "high") return "bg-rose-100 text-rose-700";
    if (level === "medium") return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  }

  function renderPreflight(preflight) {
    if (!preflightEl) return;

    if (!preflight) {
      preflightEl.classList.add("hidden");
      preflightEl.innerHTML = "";
      return;
    }

    var risk = preflight.risk || {};
    var findings = preflight.findings || {};
    var summary = preflight.proposalSummary || {};
    var blockers = Array.isArray(findings.blockers) ? findings.blockers : [];
    var warnings = Array.isArray(findings.warnings) ? findings.warnings : [];
    var recommendations = Array.isArray(findings.recommendations)
      ? findings.recommendations
      : [];
    var level = String(risk.level || "low");

    var blockersList =
      blockers.length > 0
        ? '<ul class="mt-1 list-disc pl-4 space-y-1 text-xs">' +
          blockers
            .map(function (item) {
              return "<li>" + escapeHtml(item) + "</li>";
            })
            .join("") +
          "</ul>"
        : '<p class="text-xs text-emerald-700 mt-1">No blocking risks detected.</p>';

    var warningsList =
      warnings.length > 0
        ? '<ul class="mt-1 list-disc pl-4 space-y-1 text-xs">' +
          warnings
            .slice(0, 6)
            .map(function (item) {
              return "<li>" + escapeHtml(item) + "</li>";
            })
            .join("") +
          "</ul>"
        : '<p class="text-xs text-gray-600 mt-1">No warnings.</p>';

    var recommendationList =
      recommendations.length > 0
        ? '<ul class="mt-1 list-disc pl-4 space-y-1 text-xs">' +
          recommendations
            .slice(0, 5)
            .map(function (item) {
              return "<li>" + escapeHtml(item) + "</li>";
            })
            .join("") +
          "</ul>"
        : '<p class="text-xs text-gray-600 mt-1">No recommendation changes.</p>';

    preflightEl.classList.remove("hidden");
    preflightEl.innerHTML =
      '<div class="flex items-center justify-between gap-3 flex-wrap">' +
      '<p class="font-semibold">Preflight Risk Summary</p>' +
      '<span class="rounded-full px-2 py-0.5 text-xs font-semibold ' +
      riskLevelClass(level) +
      '">' +
      "Risk " +
      escapeHtml(level) +
      " · score " +
      escapeHtml(String(risk.score || 0)) +
      "</span>" +
      "</div>" +
      '<p class="mt-1 text-xs text-amber-900">' +
      "Assignments " +
      escapeHtml(String(summary.assignmentsCount || 0)) +
      ", markdown share " +
      escapeHtml(String(summary.markdownShare || 0)) +
      ", avg delta " +
      escapeHtml(formatPercent(summary.avgDeltaPercent || 0)) +
      "</p>" +
      '<div class="mt-3 grid md:grid-cols-3 gap-3">' +
      '<div class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2">' +
      '<p class="text-xs font-semibold text-rose-800">Blockers</p>' +
      blockersList +
      "</div>" +
      '<div class="rounded-md border border-amber-200 bg-white px-3 py-2">' +
      '<p class="text-xs font-semibold text-amber-800">Warnings</p>' +
      warningsList +
      "</div>" +
      '<div class="rounded-md border border-sky-200 bg-white px-3 py-2">' +
      '<p class="text-xs font-semibold text-sky-800">Recommendations</p>' +
      recommendationList +
      "</div>" +
      "</div>";
  }

  function renderProposal(proposal) {
    if (!proposalEl) return;

    if (!proposal || !Array.isArray(proposal.assignments)) {
      proposalEl.innerHTML = "No proposal generated yet.";
      return;
    }

    var assignments = proposal.assignments;
    var warnings = Array.isArray(proposal.warnings) ? proposal.warnings : [];

    if (assignments.length === 0) {
      proposalEl.innerHTML =
        '<div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">No eligible assignments under current guardrails.</div>' +
        (warnings.length > 0
          ? '<p class="mt-2 text-xs text-amber-700">' + escapeHtml(warnings.join(" ")) + "</p>"
          : "");
      return;
    }

    var guardrails = proposal.guardrails || {};
    var guardrailText =
      "Guardrails: " +
      escapeHtml(String(guardrails.minDeltaPercent)) +
      "% to " +
      escapeHtml(String(guardrails.maxDeltaPercent)) +
      "% across up to " +
      escapeHtml(String(guardrails.maxVariants)) +
      " variants.";

    var rows = assignments
      .map(function (assignment) {
        return (
          '<div class="rounded-lg border border-gray-200 px-3 py-2">' +
          '<div class="flex items-start justify-between gap-3">' +
          '<div>' +
          '<p class="font-medium text-gray-900">' +
          escapeHtml(assignment.productName) +
          ' · ' +
          escapeHtml(assignment.variantTitle) +
          "</p>" +
          '<p class="text-xs text-gray-500 mt-0.5">' +
          "Variant " +
          escapeHtml(assignment.variantId) +
          "</p>" +
          '<p class="text-xs text-gray-500 mt-1">' +
          "Baseline $" +
          escapeHtml(Number(assignment.baselinePrice).toFixed(2)) +
          " -> Proposed $" +
          escapeHtml(Number(assignment.proposedPrice).toFixed(2)) +
          "</p>" +
          '<p class="text-xs text-gray-600 mt-1">' +
          escapeHtml(assignment.rationale) +
          "</p>" +
          "</div>" +
          '<span class="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-700">' +
          escapeHtml(formatPercent(assignment.deltaPercent)) +
          "</span>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    var warningsBlock = warnings.length > 0
      ? '<div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">' + escapeHtml(warnings.join(" ")) + "</div>"
      : "";

    proposalEl.innerHTML =
      '<p class="text-xs text-gray-500">' + escapeHtml(guardrailText) + "</p>" +
      '<div class="mt-2 space-y-2">' + rows + "</div>" +
      (warningsBlock ? '<div class="mt-2">' + warningsBlock + "</div>" : "");
  }

  function renderExperiments(experiments) {
    if (!experimentsEl) return;

    if (!Array.isArray(experiments) || experiments.length === 0) {
      experimentsEl.innerHTML = '<p class="text-sm text-gray-400">No pricing experiments yet.</p>';
      return;
    }

    experimentsEl.innerHTML = experiments
      .map(function (experiment) {
        var running = experiment.status === "running";
        var statusClass = running
          ? "bg-emerald-100 text-emerald-700"
          : "bg-gray-100 text-gray-700";

        return (
          '<div class="rounded-lg border border-gray-200 px-3 py-2" data-experiment-id="' +
          escapeHtml(experiment.experimentId) +
          '">' +
          '<div class="flex items-center justify-between gap-3">' +
          '<p class="font-medium text-gray-900">' +
          escapeHtml(experiment.name || "Pricing Experiment") +
          "</p>" +
          '<span class="rounded-full px-2 py-0.5 text-xs font-semibold ' +
          statusClass +
          '">' +
          escapeHtml(experiment.status) +
          "</span>" +
          "</div>" +
          '<p class="text-xs text-gray-500 mt-0.5">' +
          escapeHtml(String(experiment.assignmentsCount || 0)) +
          " variants · avg delta " +
          escapeHtml(formatPercent(experiment.avgDeltaPercent || 0)) +
          " · started " +
          escapeHtml(formatDateTime(experiment.startedAt)) +
          "</p>" +
          '<div class="mt-2 flex items-center gap-2">' +
          (running
            ? '<button type="button" class="pricing-stop-btn rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700" data-experiment-id="' +
              escapeHtml(experiment.experimentId) +
              '">Stop + Restore</button>'
            : "") +
          '<button type="button" class="pricing-performance-btn rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700" data-experiment-id="' +
          escapeHtml(experiment.experimentId) +
          '">View Performance</button>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderPerformance(performance) {
    if (!performanceEl) return;

    if (!performance) {
      performanceEl.classList.add("hidden");
      performanceEl.innerHTML = "";
      return;
    }

    var pre = performance.preWindow || {};
    var post = performance.postWindow || {};
    var lifts = performance.lifts || {};

    performanceEl.classList.remove("hidden");
    performanceEl.innerHTML =
      '<div class="flex items-center justify-between gap-3 flex-wrap">' +
      '<p class="font-semibold">Experiment Performance</p>' +
      '<p class="text-xs">Window ' + escapeHtml(String(performance.windowDays)) + ' days</p>' +
      "</div>" +
      '<div class="mt-2 grid md:grid-cols-2 gap-3 text-xs">' +
      '<div class="rounded-md border border-indigo-200 bg-white/70 px-3 py-2">' +
      '<p class="font-semibold text-indigo-900">Pre window</p>' +
      '<p>Units: ' + escapeHtml(String(pre.units || 0)) + '</p>' +
      '<p>Revenue: $' + escapeHtml(Number(pre.revenue || 0).toFixed(2)) + '</p>' +
      '<p>Orders: ' + escapeHtml(String(pre.orderCount || 0)) + '</p>' +
      '</div>' +
      '<div class="rounded-md border border-indigo-200 bg-white/70 px-3 py-2">' +
      '<p class="font-semibold text-indigo-900">Post window</p>' +
      '<p>Units: ' + escapeHtml(String(post.units || 0)) + '</p>' +
      '<p>Revenue: $' + escapeHtml(Number(post.revenue || 0).toFixed(2)) + '</p>' +
      '<p>Orders: ' + escapeHtml(String(post.orderCount || 0)) + '</p>' +
      '</div>' +
      '</div>' +
      '<div class="mt-2 rounded-md border border-indigo-200 bg-white/70 px-3 py-2 text-xs">' +
      '<p class="font-semibold text-indigo-900">Lift</p>' +
      '<p>Units: ' + escapeHtml(formatPercent(lifts.unitsPercent)) + '</p>' +
      '<p>Revenue: ' + escapeHtml(formatPercent(lifts.revenuePercent)) + '</p>' +
      '<p>Orders: ' + escapeHtml(formatPercent(lifts.orderCountPercent)) + '</p>' +
      '</div>';
  }

  async function loadExperiments() {
    var payload = await requestJson("/api/admin/pricing-experiments?limit=20", {
      method: "GET",
      credentials: "same-origin",
    });

    renderExperiments(payload.experiments || []);
  }

  async function generateProposal() {
    var values = collectFormValues();
    if (!values) return;

    clearError();
    setStatus("Generating pricing proposal...", false);
    if (proposeBtn) proposeBtn.disabled = true;

    try {
      var payload = await requestJson("/api/admin/pricing-experiments/propose", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values.proposalBody),
      });

      renderProposal(payload.proposal);
      renderPreflight(null);
      setStatus("Proposal ready.", false);
    } catch (err) {
      showError(err && err.message ? err.message : "Failed to generate proposal.");
      setStatus("Failed to generate proposal.", true);
    } finally {
      if (proposeBtn) proposeBtn.disabled = false;
    }
  }

  async function startExperiment() {
    var values = collectFormValues();
    if (!values) return;

    if (!values.name) {
      showError("Experiment name is required.");
      setStatus("Enter an experiment name.", true);
      return;
    }

    clearError();
    setStatus("Running preflight checks...", false);
    if (startBtn) startBtn.disabled = true;
    if (preflightBtn) preflightBtn.disabled = true;

    try {
      var preflight = await runPreflight(values);
      var blockers =
        preflight && preflight.findings && Array.isArray(preflight.findings.blockers)
          ? preflight.findings.blockers
          : [];

      if (blockers.length > 0 || (preflight && preflight.risk && preflight.risk.level === "high")) {
        showError("Preflight blocked this rollout. Resolve blockers before start.");
        setStatus("Preflight blocked start.", true);
        return;
      }

      setStatus("Starting experiment and applying assignments...", false);
      var body = {
        name: values.name,
        autoApply: values.autoApply,
        maxVariants: values.maxVariants,
        minDeltaPercent: values.minDeltaPercent,
        maxDeltaPercent: values.maxDeltaPercent,
      };

      if (values.variantIds.length > 0) {
        body.variantIds = values.variantIds;
      }
      if (values.discountScenario) {
        body.discountScenario = values.discountScenario;
      }

      var payload = await requestJson("/api/admin/pricing-experiments/start", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      var experiment = payload.experiment || {};
      renderProposal({
        assignments: experiment.assignments || [],
        warnings: [],
        guardrails: experiment.guardrails || {
          minDeltaPercent: values.minDeltaPercent,
          maxDeltaPercent: values.maxDeltaPercent,
          maxVariants: values.maxVariants,
        },
      });
      renderPerformance(null);
      renderPreflight(experiment.preflight || preflight || null);
      await loadExperiments();

      setStatus(
        "Experiment started: " +
          String(experiment.name || values.name) +
          " (" +
          String(experiment.appliedCount || 0) +
          " variants applied).",
        false,
      );
    } catch (err) {
      if (err && err.payload && err.payload.preflight) {
        renderPreflight(err.payload.preflight);
      }
      showError(err && err.message ? err.message : "Failed to start experiment.");
      setStatus("Failed to start experiment.", true);
    } finally {
      if (startBtn) startBtn.disabled = false;
      if (preflightBtn) preflightBtn.disabled = false;
    }
  }

  async function runPreflight(values) {
    var payloadValues = values || collectFormValues();
    if (!payloadValues) return null;

    clearError();
    setStatus("Running preflight risk checks...", false);
    if (preflightBtn) preflightBtn.disabled = true;

    try {
      var body = {
        autoApply: payloadValues.autoApply,
        maxVariants: payloadValues.maxVariants,
        minDeltaPercent: payloadValues.minDeltaPercent,
        maxDeltaPercent: payloadValues.maxDeltaPercent,
      };
      if (payloadValues.variantIds.length > 0) {
        body.variantIds = payloadValues.variantIds;
      }
      if (payloadValues.discountScenario) {
        body.discountScenario = payloadValues.discountScenario;
      }

      var payload = await requestJson("/api/admin/pricing-experiments/preflight", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      var preflight = payload.preflight || null;
      renderPreflight(preflight);
      if (preflight && preflight.risk && preflight.risk.level === "high") {
        setStatus("Preflight completed with high risk.", true);
      } else {
        setStatus("Preflight completed.", false);
      }
      return preflight;
    } catch (err) {
      showError(err && err.message ? err.message : "Preflight request failed.");
      setStatus("Preflight failed.", true);
      throw err;
    } finally {
      if (preflightBtn) preflightBtn.disabled = false;
    }
  }

  async function stopExperiment(experimentId) {
    if (!experimentId) return;

    clearError();
    setStatus("Stopping experiment and restoring baseline prices...", false);

    try {
      await requestJson("/api/admin/pricing-experiments/" + encodeURIComponent(experimentId) + "/stop", {
        method: "POST",
        credentials: "same-origin",
      });
      await loadExperiments();
      renderPerformance(null);
      setStatus("Experiment stopped and baseline prices restored.", false);
    } catch (err) {
      showError(err && err.message ? err.message : "Failed to stop experiment.");
      setStatus("Failed to stop experiment.", true);
    }
  }

  async function viewPerformance(experimentId) {
    if (!experimentId) return;

    clearError();
    setStatus("Loading performance window...", false);

    try {
      var payload = await requestJson(
        "/api/admin/pricing-experiments/" + encodeURIComponent(experimentId) + "/performance?windowDays=14",
        {
          method: "GET",
          credentials: "same-origin",
        },
      );
      renderPerformance(payload.performance || null);
      setStatus("Performance loaded.", false);
    } catch (err) {
      showError(err && err.message ? err.message : "Failed to load performance.");
      setStatus("Failed to load performance.", true);
    }
  }

  if (proposeBtn) {
    proposeBtn.addEventListener("click", function () {
      generateProposal();
    });
  }

  if (startBtn) {
    startBtn.addEventListener("click", function () {
      startExperiment();
    });
  }

  if (preflightBtn) {
    preflightBtn.addEventListener("click", function () {
      runPreflight().catch(function () {
        return undefined;
      });
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      clearError();
      setStatus("Refreshing experiment list...", false);
      loadExperiments()
        .then(function () {
          setStatus("Experiment list refreshed.", false);
        })
        .catch(function (err) {
          var message = err && err.message ? err.message : "Failed to refresh experiment list.";
          showError(message);
          setStatus(message, true);
        });
    });
  }

  if (clearProposalBtn) {
    clearProposalBtn.addEventListener("click", function () {
      renderProposal(null);
      renderPreflight(null);
      renderPerformance(null);
      setStatus("Proposal cleared.", false);
      clearError();
    });
  }

  if (experimentsEl) {
    experimentsEl.addEventListener("click", function (event) {
      var target = event.target;
      if (!target) return;

      var stopBtn = target.closest(".pricing-stop-btn");
      if (stopBtn) {
        var stopId = stopBtn.getAttribute("data-experiment-id");
        if (stopId && window.confirm("Stop this experiment and restore baseline prices?")) {
          stopExperiment(stopId);
        }
        return;
      }

      var performanceBtn = target.closest(".pricing-performance-btn");
      if (performanceBtn) {
        var perfId = performanceBtn.getAttribute("data-experiment-id");
        if (perfId) {
          viewPerformance(perfId);
        }
      }
    });
  }

  loadExperiments().catch(function (err) {
    var message = err && err.message ? err.message : "Failed to load pricing experiments.";
    showError(message);
    setStatus(message, true);
  });
})();
