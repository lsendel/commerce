(function () {
  "use strict";

  var form = document.getElementById("workflow-form");
  var statusEl = document.getElementById("workflow-status");
  var errorEl = document.getElementById("workflow-error");
  var listEl = document.getElementById("workflows-list");
  var previewEl = document.getElementById("workflow-preview");

  var createBtn = document.getElementById("workflow-create-btn");
  var resetBtn = document.getElementById("workflow-reset-btn");
  var refreshBtn = document.getElementById("workflow-refresh-btn");
  var clearPreviewBtn = document.getElementById("workflow-clear-preview");

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
    statusEl.className = isError ? "text-xs text-red-600" : "text-xs text-gray-500";
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

  function collectCreatePayload() {
    if (!form) return null;

    var fd = new FormData(form);
    var payload = {
      name: String(fd.get("name") || "").trim(),
      description: String(fd.get("description") || "").trim() || undefined,
      triggerType: "abandoned_checkout",
      triggerConfig: {
        idleMinutes: Math.max(15, Math.min(10080, Math.trunc(toNumber(fd.get("idleMinutes"), 60)))),
        lookbackMinutes: Math.max(15, Math.min(43200, Math.trunc(toNumber(fd.get("lookbackMinutes"), 10080)))),
        maxCandidates: Math.max(10, Math.min(500, Math.trunc(toNumber(fd.get("maxCandidates"), 120)))),
      },
      actionType: "checkout_recovery_message",
      actionConfig: {
        channel: String(fd.get("channel") || "email"),
        stage: String(fd.get("stage") || "recovery_1h"),
        incentiveCode: String(fd.get("incentiveCode") || "").trim() || undefined,
        maxPerRun: Math.max(1, Math.min(200, Math.trunc(toNumber(fd.get("maxPerRun"), 40)))),
      },
      isActive: fd.get("isActive") === "on",
    };

    if (!payload.name) {
      throw new Error("Workflow name is required.");
    }

    return payload;
  }

  function renderWorkflows(workflows) {
    if (!listEl) return;

    if (!Array.isArray(workflows) || workflows.length === 0) {
      listEl.innerHTML = '<p class="text-sm text-gray-400">No workflows configured yet.</p>';
      return;
    }

    listEl.innerHTML = workflows
      .map(function (workflow) {
        var active = Boolean(workflow.isActive);
        var statusClass = active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-gray-100 text-gray-700";
        var toggleClass = active
          ? "border-amber-300 bg-amber-50 text-amber-700"
          : "border-emerald-300 bg-emerald-50 text-emerald-700";

        var description = workflow.description
          ? '<p class="text-xs text-gray-600 mt-1">' + escapeHtml(workflow.description) + "</p>"
          : "";

        return (
          '<div class="rounded-lg border border-gray-200 px-3 py-2" data-workflow-id="' +
          escapeHtml(workflow.id) +
          '">' +
          '<div class="flex items-center justify-between gap-3">' +
          '<p class="font-medium text-gray-900">' +
          escapeHtml(workflow.name) +
          "</p>" +
          '<span class="rounded-full px-2 py-0.5 text-xs font-semibold ' +
          statusClass +
          '">' +
          (active ? "active" : "paused") +
          "</span>" +
          "</div>" +
          '<p class="text-xs text-gray-500 mt-0.5">idle ' +
          escapeHtml(String(workflow.triggerConfig.idleMinutes || 0)) +
          'm · lookback ' +
          escapeHtml(String(workflow.triggerConfig.lookbackMinutes || 0)) +
          'm · channel ' +
          escapeHtml(String(workflow.actionConfig.channel || "email")) +
          ' · stage ' +
          escapeHtml(String(workflow.actionConfig.stage || "recovery_1h")) +
          "</p>" +
          description +
          '<p class="text-xs text-gray-400 mt-1">Last run: ' +
          escapeHtml(workflow.lastRunAt ? formatDateTime(workflow.lastRunAt) : "never") +
          "</p>" +
          '<div class="mt-2 flex items-center gap-2 flex-wrap">' +
          '<button type="button" class="workflow-preview-btn rounded-md border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700" data-workflow-id="' +
          escapeHtml(workflow.id) +
          '">Preview</button>' +
          '<button type="button" class="workflow-run-btn rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700" data-workflow-id="' +
          escapeHtml(workflow.id) +
          '">Run Now</button>' +
          '<button type="button" class="workflow-dry-run-btn rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700" data-workflow-id="' +
          escapeHtml(workflow.id) +
          '">Dry Run</button>' +
          '<button type="button" class="workflow-toggle-btn rounded-md border px-2 py-1 text-xs font-semibold ' +
          toggleClass +
          '" data-workflow-id="' +
          escapeHtml(workflow.id) +
          '" data-next-active="' +
          (active ? "false" : "true") +
          '">' +
          (active ? "Pause" : "Activate") +
          "</button>" +
          '<button type="button" class="workflow-delete-btn rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700" data-workflow-id="' +
          escapeHtml(workflow.id) +
          '">Delete</button>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderPreview(preview) {
    if (!previewEl) return;

    if (!preview) {
      previewEl.innerHTML = "Select a workflow and click Preview to inspect candidate carts.";
      return;
    }

    var sample = Array.isArray(preview.sample) ? preview.sample : [];
    var warnings = Array.isArray(preview.warnings) ? preview.warnings : [];

    var sampleHtml = sample.length === 0
      ? '<p class="text-sm text-gray-500">No sample carts available.</p>'
      :
          '<div class="space-y-2">' +
          sample
            .map(function (row) {
              return (
                '<div class="rounded-lg border border-gray-200 px-3 py-2">' +
                '<p class="text-sm font-medium text-gray-900">' + escapeHtml(row.userEmail) + "</p>" +
                '<p class="text-xs text-gray-500">cart ' + escapeHtml(row.cartId) + ' · ' + escapeHtml(String(row.itemCount)) + ' item(s)</p>' +
                '<p class="text-xs text-gray-500">updated ' + escapeHtml(formatDateTime(row.updatedAt)) + "</p>" +
                "</div>"
              );
            })
            .join("") +
          "</div>";

    var warningsHtml = warnings.length > 0
      ? '<div class="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">' + escapeHtml(warnings.join(" ")) + "</div>"
      : "";

    previewEl.innerHTML =
      '<p class="text-xs text-gray-500">Matched candidates: ' + escapeHtml(String(preview.matchedCount || 0)) + "</p>" +
      '<div class="mt-2">' + sampleHtml + "</div>" +
      warningsHtml;
  }

  async function loadWorkflows() {
    var payload = await requestJson("/api/admin/workflows?limit=100", {
      method: "GET",
      credentials: "same-origin",
    });
    renderWorkflows(payload.workflows || []);
  }

  async function createWorkflow() {
    clearError();
    setStatus("Creating workflow...", false);
    if (createBtn) createBtn.disabled = true;

    try {
      var payload = collectCreatePayload();
      await requestJson("/api/admin/workflows", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await loadWorkflows();
      setStatus("Workflow created.", false);
    } catch (err) {
      var message = err && err.message ? err.message : "Failed to create workflow.";
      showError(message);
      setStatus(message, true);
    } finally {
      if (createBtn) createBtn.disabled = false;
    }
  }

  async function toggleWorkflow(workflowId, isActive) {
    clearError();
    setStatus((isActive ? "Activating" : "Pausing") + " workflow...", false);

    try {
      await requestJson("/api/admin/workflows/" + encodeURIComponent(workflowId) + "/toggle", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: isActive }),
      });
      await loadWorkflows();
      setStatus("Workflow updated.", false);
    } catch (err) {
      var message = err && err.message ? err.message : "Failed to update workflow.";
      showError(message);
      setStatus(message, true);
    }
  }

  async function previewWorkflow(workflowId) {
    clearError();
    setStatus("Building workflow preview...", false);

    try {
      var payload = await requestJson("/api/admin/workflows/" + encodeURIComponent(workflowId) + "/preview", {
        method: "POST",
        credentials: "same-origin",
      });
      renderPreview(payload.preview || null);
      setStatus("Preview ready.", false);
    } catch (err) {
      var message = err && err.message ? err.message : "Failed to preview workflow.";
      showError(message);
      setStatus(message, true);
    }
  }

  async function runWorkflow(workflowId, dryRun) {
    clearError();
    setStatus(dryRun ? "Running dry-run..." : "Running workflow now...", false);

    try {
      var payload = await requestJson("/api/admin/workflows/" + encodeURIComponent(workflowId) + "/run", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: dryRun }),
      });

      var run = payload.run || {};
      renderPreview({
        matchedCount: run.matchedCount || 0,
        warnings: run.warnings || [],
        sample: Array.isArray(run.sample)
          ? run.sample.map(function (row) {
              return {
                cartId: row.cartId,
                userId: "",
                userEmail: row.userEmail,
                userPhone: null,
                userName: row.userEmail,
                itemCount: row.itemCount,
                updatedAt: new Date().toISOString(),
              };
            })
          : [],
      });

      await loadWorkflows();

      setStatus(
        (dryRun ? "Dry-run complete." : "Workflow run complete.") +
          " matched=" +
          String(run.matchedCount || 0) +
          ", prepared=" +
          String(run.preparedCount || 0) +
          ", enqueued=" +
          String(run.enqueuedCount || 0),
        false,
      );
    } catch (err) {
      var message = err && err.message ? err.message : "Failed to run workflow.";
      showError(message);
      setStatus(message, true);
    }
  }

  async function deleteWorkflow(workflowId) {
    clearError();
    setStatus("Deleting workflow...", false);

    try {
      await requestJson("/api/admin/workflows/" + encodeURIComponent(workflowId), {
        method: "DELETE",
        credentials: "same-origin",
      });
      await loadWorkflows();
      setStatus("Workflow deleted.", false);
    } catch (err) {
      var message = err && err.message ? err.message : "Failed to delete workflow.";
      showError(message);
      setStatus(message, true);
    }
  }

  if (createBtn) {
    createBtn.addEventListener("click", function () {
      createWorkflow();
    });
  }

  if (resetBtn && form) {
    resetBtn.addEventListener("click", function () {
      form.reset();
      var activeInput = document.getElementById("workflow-is-active");
      if (activeInput) activeInput.checked = true;
      clearError();
      setStatus("Form reset.", false);
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      clearError();
      setStatus("Refreshing workflows...", false);
      loadWorkflows()
        .then(function () {
          setStatus("Workflows refreshed.", false);
        })
        .catch(function (err) {
          var message = err && err.message ? err.message : "Failed to refresh workflows.";
          showError(message);
          setStatus(message, true);
        });
    });
  }

  if (clearPreviewBtn) {
    clearPreviewBtn.addEventListener("click", function () {
      renderPreview(null);
      setStatus("Preview cleared.", false);
    });
  }

  if (listEl) {
    listEl.addEventListener("click", function (event) {
      var target = event.target;
      if (!target) return;

      var previewBtn = target.closest(".workflow-preview-btn");
      if (previewBtn) {
        var previewId = previewBtn.getAttribute("data-workflow-id");
        if (previewId) previewWorkflow(previewId);
        return;
      }

      var runBtn = target.closest(".workflow-run-btn");
      if (runBtn) {
        var runId = runBtn.getAttribute("data-workflow-id");
        if (runId && window.confirm("Run this workflow now and enqueue notifications?")) {
          runWorkflow(runId, false);
        }
        return;
      }

      var dryRunBtn = target.closest(".workflow-dry-run-btn");
      if (dryRunBtn) {
        var dryRunId = dryRunBtn.getAttribute("data-workflow-id");
        if (dryRunId) runWorkflow(dryRunId, true);
        return;
      }

      var toggleBtn = target.closest(".workflow-toggle-btn");
      if (toggleBtn) {
        var toggleId = toggleBtn.getAttribute("data-workflow-id");
        var nextActive = toggleBtn.getAttribute("data-next-active") === "true";
        if (toggleId) toggleWorkflow(toggleId, nextActive);
        return;
      }

      var deleteBtn = target.closest(".workflow-delete-btn");
      if (deleteBtn) {
        var deleteId = deleteBtn.getAttribute("data-workflow-id");
        if (deleteId && window.confirm("Delete this workflow? This cannot be undone.")) {
          deleteWorkflow(deleteId);
        }
      }
    });
  }

  loadWorkflows().catch(function (err) {
    var message = err && err.message ? err.message : "Failed to load workflows.";
    showError(message);
    setStatus(message, true);
  });
})();
