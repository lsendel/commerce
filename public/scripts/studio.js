/**
 * AI Studio interactivity — loaded on studio pages.
 * Vanilla JS, async/await, fetch API.
 */
(function () {
  "use strict";

  var ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  var MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  var POLL_INTERVAL = 2000; // 2 seconds

  var studioState = {
    selectedFile: null,
    selectedPetId: null,
    selectedTemplateId: null,
    customPrompt: "",
    jobId: null,
    pollTimer: null,
  };

  // ─── File Upload Handling ────────────────────────────────────────────────────

  function initUploadZone() {
    var zone = document.querySelector("[data-upload-zone]");
    if (!zone) return;

    var input = zone.querySelector("[data-upload-input]");
    var idle = zone.querySelector("[data-upload-idle]");
    var preview = zone.querySelector("[data-upload-preview]");
    var previewImg = zone.querySelector("[data-upload-preview-img]");
    var errorEl = zone.querySelector("[data-upload-error]");
    var changeBtn = zone.querySelector("[data-upload-change]");
    var dragOverlay = zone.querySelector("[data-upload-drag-overlay]");

    if (!input) return;

    // Click on change button triggers input
    if (changeBtn) {
      changeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        input.value = "";
        input.click();
      });
    }

    // File selection via input
    input.addEventListener("change", function () {
      if (input.files && input.files.length > 0) {
        handleFile(input.files[0]);
      }
    });

    // Drag and drop
    zone.addEventListener("dragover", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (dragOverlay) {
        dragOverlay.classList.remove("hidden");
        dragOverlay.classList.add("flex");
      }
    });

    zone.addEventListener("dragleave", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (dragOverlay) {
        dragOverlay.classList.add("hidden");
        dragOverlay.classList.remove("flex");
      }
    });

    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (dragOverlay) {
        dragOverlay.classList.add("hidden");
        dragOverlay.classList.remove("flex");
      }

      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    });

    function handleFile(file) {
      // Clear error
      if (errorEl) {
        errorEl.classList.add("hidden");
        errorEl.textContent = "";
      }

      // Validate type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        showUploadError("Please upload a JPEG, PNG, or WebP image.");
        return;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        showUploadError("File is too large. Maximum size is 10 MB.");
        return;
      }

      studioState.selectedFile = file;

      // Show preview
      var reader = new FileReader();
      reader.onload = function (evt) {
        if (previewImg) {
          previewImg.src = evt.target.result;
        }
        if (idle) {
          idle.classList.add("hidden");
          idle.classList.remove("flex");
        }
        if (preview) {
          preview.classList.remove("hidden");
          preview.classList.add("flex");
        }
      };
      reader.readAsDataURL(file);

      updateGenerateButton();
    }

    function showUploadError(msg) {
      if (errorEl) {
        errorEl.textContent = msg;
        errorEl.classList.remove("hidden");
      }
      studioState.selectedFile = null;
      updateGenerateButton();
    }
  }

  // ─── Pet Profile Selector ───────────────────────────────────────────────────

  function initPetSelector() {
    document.addEventListener("click", function (e) {
      var petBtn = e.target.closest("[data-pet-option]");
      if (!petBtn) return;

      e.preventDefault();

      var petId = petBtn.getAttribute("data-pet-id");
      var photoUrl = petBtn.getAttribute("data-pet-photo-url");

      studioState.selectedPetId = petId;

      // Update hidden input
      var hiddenInput = document.querySelector("[data-selected-pet-id]");
      if (hiddenInput) hiddenInput.value = petId;

      // Highlight selected pet
      document.querySelectorAll("[data-pet-option]").forEach(function (btn) {
        btn.classList.remove("border-brand-500", "ring-2", "ring-brand-200");
        btn.classList.add("border-gray-200");
      });
      petBtn.classList.add("border-brand-500", "ring-2", "ring-brand-200");
      petBtn.classList.remove("border-gray-200");

      // If pet has a photo, show it in preview
      if (photoUrl) {
        var previewImg = document.querySelector("[data-upload-preview-img]");
        var idle = document.querySelector("[data-upload-idle]");
        var previewDiv = document.querySelector("[data-upload-preview]");

        if (previewImg) previewImg.src = photoUrl;
        if (idle) {
          idle.classList.add("hidden");
          idle.classList.remove("flex");
        }
        if (previewDiv) {
          previewDiv.classList.remove("hidden");
          previewDiv.classList.add("flex");
        }
      }

      updateGenerateButton();
    });

    // "Use different photo" button
    var newPhotoBtn = document.querySelector("[data-use-new-photo]");
    if (newPhotoBtn) {
      newPhotoBtn.addEventListener("click", function () {
        studioState.selectedPetId = null;
        var hiddenInput = document.querySelector("[data-selected-pet-id]");
        if (hiddenInput) hiddenInput.value = "";

        // Deselect all pets
        document.querySelectorAll("[data-pet-option]").forEach(function (btn) {
          btn.classList.remove("border-brand-500", "ring-2", "ring-brand-200");
          btn.classList.add("border-gray-200");
        });

        // Reset upload zone to idle
        var idle = document.querySelector("[data-upload-idle]");
        var previewDiv = document.querySelector("[data-upload-preview]");
        if (idle) {
          idle.classList.remove("hidden");
          idle.classList.add("flex");
        }
        if (previewDiv) {
          previewDiv.classList.add("hidden");
          previewDiv.classList.remove("flex");
        }

        studioState.selectedFile = null;
        updateGenerateButton();
      });
    }
  }

  // ─── Template Selection ──────────────────────────────────────────────────────

  function initTemplatePicker() {
    document.addEventListener("click", function (e) {
      var card = e.target.closest("[data-template-card]");
      if (!card) return;

      e.preventDefault();

      var templateId = card.getAttribute("data-template-id");
      studioState.selectedTemplateId = templateId;

      // Update hidden input
      var hiddenInput = document.querySelector("[data-selected-template-id]");
      if (hiddenInput) hiddenInput.value = templateId;

      // Highlight selected template
      document.querySelectorAll("[data-template-card]").forEach(function (c) {
        c.classList.remove("border-brand-500", "shadow-md", "ring-2", "ring-brand-200");
        c.classList.add("border-gray-200");
      });
      card.classList.add("border-brand-500", "shadow-md", "ring-2", "ring-brand-200");
      card.classList.remove("border-gray-200");

      updateGenerateButton();
    });

    // Track custom prompt changes
    var promptEl = document.querySelector("[data-custom-prompt]");
    if (promptEl) {
      promptEl.addEventListener("input", function () {
        studioState.customPrompt = promptEl.value;
      });
    }

    // Pre-select template from URL params
    var params = new URLSearchParams(window.location.search);
    var preselected = params.get("templateId");
    if (preselected) {
      var preCard = document.querySelector(
        '[data-template-card][data-template-id="' + preselected + '"]'
      );
      if (preCard) {
        preCard.click();
      }
    }
  }

  // ─── Generate Button ─────────────────────────────────────────────────────────

  function updateGenerateButton() {
    var btn = document.querySelector("[data-generate-btn]");
    if (!btn) return;

    var hasPhoto = studioState.selectedFile !== null || studioState.selectedPetId !== null;
    var hasTemplate = studioState.selectedTemplateId !== null;

    btn.disabled = !(hasPhoto && hasTemplate);
  }

  function initGenerateButton() {
    document.addEventListener("click", async function (e) {
      var btn = e.target.closest("[data-generate-btn]");
      if (!btn || btn.disabled) return;

      e.preventDefault();

      var errorEl = document.querySelector("[data-generate-error]");
      if (errorEl) {
        errorEl.classList.add("hidden");
        errorEl.textContent = "";
      }

      btn.disabled = true;
      btn._origChildren = Array.from(btn.childNodes).map(function (n) {
        return n.cloneNode(true);
      });
      btn.textContent = "";
      var spinSvg = createSpinnerSvg("w-5 h-5 mr-2");
      btn.appendChild(spinSvg);
      btn.appendChild(document.createTextNode(" Generating..."));

      try {
        var payload = {
          templateId: studioState.selectedTemplateId,
        };

        if (studioState.selectedPetId) {
          payload.petProfileId = studioState.selectedPetId;
        }

        if (studioState.customPrompt) {
          payload.customPrompt = studioState.customPrompt;
        }

        var res = await fetch("/api/studio/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          var errData = await res.json().catch(function () {
            return {};
          });
          throw new Error(errData.error || "Generation failed");
        }

        var data = await res.json();
        studioState.jobId = data.id || data.jobId;

        // Show progress section, hide form sections
        showSection("progress");
        hideSection("pet");
        hideSection("upload");
        hideSection("template");
        hideSection("submit");

        // Update progress component job ID
        var progressEl = document.querySelector("[data-generation-progress]");
        if (progressEl) {
          progressEl.setAttribute("data-job-id", studioState.jobId);
        }

        // Start polling
        startPolling();
      } catch (err) {
        btn.disabled = false;
        if (btn._origChildren) {
          btn.textContent = "";
          btn._origChildren.forEach(function (n) {
            btn.appendChild(n);
          });
          delete btn._origChildren;
        }
        if (errorEl) {
          errorEl.textContent = err.message || "Generation failed. Please try again.";
          errorEl.classList.remove("hidden");
        }
      }
    });
  }

  function createSpinnerSvg(cls) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "animate-spin " + cls);
    svg.setAttribute("fill", "none");
    svg.setAttribute("viewBox", "0 0 24 24");
    var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "opacity-25");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "10");
    circle.setAttribute("stroke", "currentColor");
    circle.setAttribute("stroke-width", "4");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "opacity-75");
    path.setAttribute("fill", "currentColor");
    path.setAttribute(
      "d",
      "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    );
    svg.appendChild(circle);
    svg.appendChild(path);
    return svg;
  }

  // ─── Job Polling ─────────────────────────────────────────────────────────────

  function startPolling() {
    if (studioState.pollTimer) {
      clearInterval(studioState.pollTimer);
    }

    studioState.pollTimer = setInterval(async function () {
      await pollJobStatus();
    }, POLL_INTERVAL);

    // Also run immediately
    pollJobStatus();
  }

  async function pollJobStatus() {
    if (!studioState.jobId) return;

    try {
      var res = await fetch(
        "/api/studio/jobs/" + encodeURIComponent(studioState.jobId),
        { credentials: "same-origin" }
      );

      if (!res.ok) return;
      var data = await res.json();

      updateProgressUI(data);

      if (data.status === "completed" || data.status === "done") {
        clearInterval(studioState.pollTimer);
        studioState.pollTimer = null;
        showResult(data);
      } else if (data.status === "failed" || data.status === "error") {
        clearInterval(studioState.pollTimer);
        studioState.pollTimer = null;
        showProgressError(data.errorMessage || data.error || "Generation failed. Please try again.");
      }
    } catch (_) {
      // Silently retry on next interval
    }
  }

  function updateProgressUI(data) {
    // Map status to step key
    var stepMap = {
      queued: "upload",
      uploading: "upload",
      processing: "style",
      generating: "generate",
      completed: "done",
      done: "done",
      failed: "generate",
    };
    var currentStep = stepMap[data.status] || "generate";

    // Update step visuals
    var stepKeys = ["upload", "style", "generate", "done"];
    var currentIdx = stepKeys.indexOf(currentStep);

    stepKeys.forEach(function (key, i) {
      var stepEl = document.querySelector('[data-step="' + key + '"]');
      if (!stepEl) return;

      var circleEl = stepEl.querySelector("div");
      var labelEl = stepEl.querySelector("span");

      if (!circleEl) return;

      if (i < currentIdx) {
        // Complete
        circleEl.className =
          "relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 bg-brand-500 border-brand-500 text-white";
        // Replace content with checkmark
        while (circleEl.firstChild) circleEl.removeChild(circleEl.firstChild);
        var checkSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        checkSvg.setAttribute("class", "w-5 h-5");
        checkSvg.setAttribute("fill", "none");
        checkSvg.setAttribute("viewBox", "0 0 24 24");
        checkSvg.setAttribute("stroke", "currentColor");
        checkSvg.setAttribute("stroke-width", "2.5");
        var checkPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        checkPath.setAttribute("stroke-linecap", "round");
        checkPath.setAttribute("stroke-linejoin", "round");
        checkPath.setAttribute("d", "M4.5 12.75l6 6 9-13.5");
        checkSvg.appendChild(checkPath);
        circleEl.appendChild(checkSvg);
        if (labelEl) {
          labelEl.className = "text-xs font-medium whitespace-nowrap text-brand-600";
        }
      } else if (i === currentIdx) {
        // Active
        circleEl.className =
          "relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 bg-white border-brand-500 text-brand-500";
        if (!circleEl.querySelector(".animate-ping")) {
          var pingSpan = document.createElement("span");
          pingSpan.className = "absolute inset-0 rounded-full animate-ping bg-brand-400/30";
          circleEl.appendChild(pingSpan);
        }
        if (labelEl) {
          labelEl.className = "text-xs font-medium whitespace-nowrap text-brand-600";
        }
      } else {
        // Pending
        circleEl.className =
          "relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 bg-white border-gray-300 text-gray-400";
        var ping = circleEl.querySelector(".animate-ping");
        if (ping) ping.remove();
        if (labelEl) {
          labelEl.className = "text-xs font-medium whitespace-nowrap text-gray-400";
        }
      }
    });

    // Update status text
    var statusEl = document.querySelector("[data-progress-status]");
    if (statusEl) {
      var messages = {
        queued: "Queued, waiting to start...",
        uploading: "Uploading your pet's photo...",
        processing: "Applying art style...",
        generating: "Generating your artwork...",
        completed: "Your artwork is ready!",
        done: "Your artwork is ready!",
      };
      statusEl.textContent = messages[data.status] || "Processing...";
    }

    // Update ETA
    var etaEl = document.querySelector("[data-progress-eta]");
    if (etaEl && data.estimatedSeconds !== undefined) {
      etaEl.textContent = "Estimated: ~" + data.estimatedSeconds + "s remaining";
    }
  }

  function showProgressError(message) {
    var errorEl = document.querySelector("[data-progress-error]");
    var statusContainer = document.querySelector("[data-progress-status]");

    if (errorEl) {
      errorEl.textContent = message;
      if (errorEl.parentElement) {
        errorEl.parentElement.classList.remove("hidden");
      }
    }

    // Hide spinner and status
    if (statusContainer && statusContainer.parentElement) {
      statusContainer.parentElement.classList.add("hidden");
    }
    var etaEl = document.querySelector("[data-progress-eta]");
    if (etaEl) etaEl.classList.add("hidden");
  }

  // ─── Show Result ─────────────────────────────────────────────────────────────

  function showResult(data) {
    hideSection("progress");
    showSection("result");

    var resultSection = document.querySelector('[data-step-section="result"]');
    if (!resultSection) return;

    // Update art preview image
    var artImage = resultSection.querySelector("[data-art-image]");
    var artPreviewArea = resultSection.querySelector("[data-art-preview]");

    var imageUrl =
      data.resultImageUrl ||
      data.resultUrl ||
      data.imageUrl ||
      data.outputUrl;

    if (imageUrl && artImage) {
      artImage.src = imageUrl;
      artImage.classList.remove("hidden");
    }

    // Check if result is SVG — render using safe DOM methods
    if (data.svgMarkup) {
      var svgContainer = resultSection.querySelector("[data-art-svg-container]");
      if (svgContainer) {
        // Parse SVG safely via DOMParser
        var parser = new DOMParser();
        var svgDoc = parser.parseFromString(data.svgMarkup, "image/svg+xml");
        var svgEl = svgDoc.documentElement;
        if (svgEl && svgEl.tagName === "svg") {
          while (svgContainer.firstChild) svgContainer.removeChild(svgContainer.firstChild);
          svgContainer.appendChild(document.importNode(svgEl, true));
        }
      }
    }

    // Update download button
    var downloadBtn = resultSection.querySelector("[data-download-art]");
    if (downloadBtn && imageUrl) {
      downloadBtn.setAttribute("data-download-url", imageUrl);
    }

    // Update art preview job ID
    if (artPreviewArea) {
      artPreviewArea.setAttribute("data-job-id", studioState.jobId || "");
    }

    // Update "View Full Preview" link
    var links = resultSection.parentElement
      ? resultSection.parentElement.querySelectorAll("a")
      : [];
    links.forEach(function (link) {
      if (link.href && link.href.indexOf("studio/preview") !== -1 && studioState.jobId) {
        link.href = "/studio/preview/" + studioState.jobId;
      }
    });
  }

  // ─── Download Handler ───────────────────────────────────────────────────────

  function initDownloadButton() {
    document.addEventListener("click", async function (e) {
      var btn = e.target.closest("[data-download-art]");
      if (!btn) return;

      e.preventDefault();

      var url = btn.getAttribute("data-download-url");

      // If we have an SVG container, download the SVG
      var svgContainer = document.querySelector("[data-art-svg-container]");
      if (svgContainer) {
        var svgEl = svgContainer.querySelector("svg");
        if (svgEl) {
          var svgData = new XMLSerializer().serializeToString(svgEl);
          var blob = new Blob([svgData], { type: "image/svg+xml" });
          triggerDownload(blob, "petm8-artwork.svg");
          return;
        }
      }

      // Otherwise download the image URL
      if (url) {
        try {
          var res = await fetch(url);
          var blob = await res.blob();
          var ext = blob.type.split("/")[1] || "png";
          triggerDownload(blob, "petm8-artwork." + ext);
        } catch (_) {
          // Fallback: open in new tab
          window.open(url, "_blank");
        }
      }
    });
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─── Section Helpers ─────────────────────────────────────────────────────────

  function showSection(name) {
    var el = document.querySelector('[data-step-section="' + name + '"]');
    if (el) el.classList.remove("hidden");
  }

  function hideSection(name) {
    var el = document.querySelector('[data-step-section="' + name + '"]');
    if (el) el.classList.add("hidden");
  }

  // ─── Init ────────────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    initUploadZone();
    initPetSelector();
    initTemplatePicker();
    initGenerateButton();
    initDownloadButton();

    // If there is an existing job in progress (server-rendered), start polling
    var progressEl = document.querySelector("[data-generation-progress]");
    if (progressEl) {
      var jobId = progressEl.getAttribute("data-job-id");
      if (jobId && jobId !== "") {
        studioState.jobId = jobId;
        startPolling();
      }
    }
  });
})();
