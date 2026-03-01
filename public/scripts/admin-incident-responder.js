(function () {
  "use strict";

  var form = document.getElementById("incident-triage-form");
  var statusEl = document.getElementById("incident-status");
  var errorEl = document.getElementById("incident-form-error");
  var runbooksEl = document.getElementById("incident-runbooks");
  var historyEl = document.getElementById("incident-history");
  var historyRefreshBtn = document.getElementById("incident-history-refresh");

  var resultEl = document.getElementById("incident-result");
  var metaEl = document.getElementById("incident-meta");
  var escalationEl = document.getElementById("incident-escalation");
  var summaryEl = document.getElementById("incident-triage-summary");
  var rootCauseEl = document.getElementById("incident-root-cause");
  var runbookEl = document.getElementById("incident-runbook");
  var actionsEl = document.getElementById("incident-actions");
  var warningsEl = document.getElementById("incident-warnings");
  var ackActionsEl = document.getElementById("incident-ack-actions");

  var latestTriageId = null;

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

  function setStatus(message, isError) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.className = isError ? "text-sm text-red-600" : "text-sm text-gray-500";
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

  function renderRunbooks(runbooks) {
    if (!runbooksEl) return;
    if (!Array.isArray(runbooks) || runbooks.length === 0) {
      runbooksEl.innerHTML = '<p class="text-gray-400">No runbooks available.</p>';
      return;
    }

    runbooksEl.innerHTML = runbooks
      .map(function (runbook) {
        return (
          '<div class="rounded-lg border border-gray-200 px-3 py-2">' +
          '<p class="font-medium text-gray-800">' + escapeHtml(runbook.title) + "</p>" +
          '<p class="text-xs text-gray-500 mt-0.5">Rollback: ' + escapeHtml(runbook.rollbackCommand) + "</p>" +
          '<a class="text-xs text-indigo-600 hover:text-indigo-700" href="' +
          escapeHtml(runbook.url) +
          '">Open runbook surface</a>' +
          "</div>"
        );
      })
      .join("");
  }

  function renderHistory(history) {
    if (!historyEl) return;

    if (!Array.isArray(history) || history.length === 0) {
      historyEl.innerHTML = '<p class="text-gray-400">No triage history yet.</p>';
      return;
    }

    historyEl.innerHTML = history
      .map(function (entry) {
        var confidence = Math.round(Number(entry.confidence || 0) * 100);
        var statusBadge = entry.acknowledged
          ? '<span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">' +
            escapeHtml(entry.acknowledgedOutcome || "acknowledged") +
            "</span>"
          : '<span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">open</span>';

        var notes = entry.acknowledgedNotes
          ? '<p class="text-xs text-gray-500 mt-1">Notes: ' + escapeHtml(entry.acknowledgedNotes) + "</p>"
          : "";

        return (
          '<div class="rounded-lg border border-gray-200 px-3 py-2">' +
          '<div class="flex items-center justify-between gap-3">' +
          '<p class="font-medium text-gray-800">' +
          escapeHtml(entry.incidentType) +
          ' · ' +
          escapeHtml(String(entry.severity || "sev2").toUpperCase()) +
          "</p>" +
          statusBadge +
          "</div>" +
          '<p class="text-xs text-gray-500 mt-0.5">' +
          'Confidence ' +
          confidence +
          '% · Team ' +
          escapeHtml(entry.responseTeam) +
          ' · ' +
          formatDateTime(entry.createdAt) +
          "</p>" +
          (entry.acknowledgedAt
            ? '<p class="text-xs text-gray-500 mt-0.5">Acknowledged ' + formatDateTime(entry.acknowledgedAt) + "</p>"
            : "") +
          notes +
          "</div>"
        );
      })
      .join("");
  }

  async function loadRunbooks() {
    if (!runbooksEl) return;

    try {
      var res = await fetch("/api/admin/ops/incidents/runbooks", { credentials: "same-origin" });
      var payload = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) {
        throw new Error(parseError(payload, "Failed to load runbooks."));
      }
      renderRunbooks(payload.runbooks);
    } catch (err) {
      runbooksEl.innerHTML =
        '<p class="text-red-600">' +
        (err && err.message ? err.message : "Failed to load runbooks.") +
        "</p>";
    }
  }

  async function loadHistory() {
    if (!historyEl) return;

    try {
      var res = await fetch("/api/admin/ops/incidents/history?limit=12", {
        credentials: "same-origin",
      });
      var payload = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) {
        throw new Error(parseError(payload, "Failed to load history."));
      }
      renderHistory(payload.history);
    } catch (err) {
      historyEl.innerHTML =
        '<p class="text-red-600">' +
        (err && err.message ? err.message : "Failed to load history.") +
        "</p>";
    }
  }

  function renderTriage(result) {
    if (!resultEl) return;

    latestTriageId = result.triageId || null;
    resultEl.classList.remove("hidden");
    if (ackActionsEl) {
      ackActionsEl.classList.remove("hidden");
    }

    if (metaEl) {
      var createdAt = result.generatedAt ? formatDateTime(result.generatedAt) : "now";
      metaEl.textContent =
        "Type: " +
        String(result.incidentType || "unknown") +
        " | Severity: " +
        String(result.severity || "sev2") +
        " | Confidence: " +
        Math.round(Number(result.confidence || 0) * 100) +
        "% | " +
        createdAt;
    }

    if (escalationEl) {
      var pageOnCall = Boolean(result.escalation && result.escalation.pageOnCall);
      escalationEl.textContent = pageOnCall ? "Page on-call now" : "Team triage first";
      escalationEl.className = pageOnCall
        ? "rounded-full px-3 py-1 text-xs font-semibold bg-red-100 text-red-700"
        : "rounded-full px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700";
    }

    if (summaryEl) summaryEl.textContent = result.triageSummary || "";
    if (rootCauseEl) rootCauseEl.textContent = result.suspectedRootCause || "";
    if (runbookEl) {
      var runbook = result.runbook || {};
      runbookEl.innerHTML =
        '<a class="text-indigo-600 hover:text-indigo-700" href="' +
        escapeHtml(String(runbook.url || "#")) +
        '">' +
        escapeHtml(String(runbook.title || "Open runbook")) +
        "</a>" +
        '<span class="text-gray-500"> · Rollback: ' +
        escapeHtml(String(runbook.rollbackCommand || "n/a")) +
        "</span>";
    }

    if (actionsEl) {
      var actions = Array.isArray(result.recommendedActions) ? result.recommendedActions : [];
      actionsEl.innerHTML = actions
        .map(function (action) {
          var command = action.command
            ? '<div class="text-xs text-gray-500 mt-1"><code>' + escapeHtml(action.command) + "</code></div>"
            : "";
          return (
            '<li><span class="font-medium">' +
            escapeHtml(action.title) +
            "</span> - " +
            escapeHtml(action.detail) +
            ' <span class="text-xs uppercase text-gray-400">(' +
            escapeHtml(action.priority) +
            ")</span>" +
            command +
            "</li>"
          );
        })
        .join("");
    }

    if (warningsEl) {
      var warnings = Array.isArray(result.warnings) ? result.warnings : [];
      if (warnings.length > 0) {
        warningsEl.classList.remove("hidden");
        warningsEl.textContent = warnings.join(" ");
      } else {
        warningsEl.classList.add("hidden");
        warningsEl.textContent = "";
      }
    }
  }

  async function acknowledgeTriage(outcome) {
    if (!latestTriageId) {
      setStatus("No triage to acknowledge yet.", true);
      return;
    }

    setStatus("Saving incident outcome...", false);
    try {
      var res = await fetch("/api/admin/ops/incidents/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          triageId: latestTriageId,
          outcome: outcome,
        }),
      });
      var payload = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) {
        throw new Error(parseError(payload, "Failed to acknowledge triage outcome."));
      }

      setStatus("Outcome recorded.", false);
      loadHistory();
    } catch (err) {
      setStatus(err && err.message ? err.message : "Failed to acknowledge triage outcome.", true);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form) return;

    clearError();
    setStatus("Generating triage recommendation...", false);

    var submitButton = document.getElementById("incident-triage-btn");
    if (submitButton) submitButton.disabled = true;

    try {
      var fd = new FormData(form);
      var body = {
        summary: String(fd.get("summary") || "").trim(),
        signalType: String(fd.get("signalType") || "unknown"),
        severity: String(fd.get("severity") || "").trim() || undefined,
      };

      var res = await fetch("/api/admin/ops/incidents/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      var payload = await res.json().catch(function () {
        return {};
      });
      if (!res.ok) {
        throw new Error(parseError(payload, "Failed to generate triage recommendation."));
      }

      if (!payload || !payload.triage) {
        throw new Error("Invalid triage response payload.");
      }

      renderTriage(payload.triage);
      setStatus("Triage recommendation ready.", false);
      loadHistory();
    } catch (err) {
      var message = err && err.message ? err.message : "Failed to generate triage recommendation.";
      showError(message);
      setStatus(message, true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  }

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }

  document.querySelectorAll(".incident-ack-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      var outcome = button.getAttribute("data-outcome");
      if (!outcome) return;
      acknowledgeTriage(outcome);
    });
  });

  if (historyRefreshBtn) {
    historyRefreshBtn.addEventListener("click", function () {
      loadHistory();
    });
  }

  loadRunbooks();
  loadHistory();
})();
