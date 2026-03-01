(function () {
  "use strict";

  var variantCount = 1;
  var container = document.getElementById("variants-container");
  var addBtn = document.getElementById("add-variant-btn");
  var form = document.getElementById("create-product-form");
  var errorEl = document.getElementById("form-error");
  var successEl = document.getElementById("form-success");
  var draftBtn = document.getElementById("save-draft-btn");
  var autoFillBtn = document.getElementById("auto-fill-btn");
  var pipelineStatusEl = document.getElementById("pipeline-status");
  var draftVariantPayload = null;

  function createVariantRow(index) {
    var row = document.createElement("div");
    row.className =
      "variant-row flex items-end gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 mt-3";

    var titleDiv = document.createElement("div");
    titleDiv.className = "flex-1";
    var titleLabel = document.createElement("label");
    titleLabel.className = "block text-xs font-medium text-gray-600 mb-1";
    titleLabel.textContent = "Title";
    var titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.name = "variant-title-" + index;
    titleInput.required = true;
    titleInput.className =
      "w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm";
    titleInput.placeholder = "e.g. Large Canvas 16x20";
    titleDiv.appendChild(titleLabel);
    titleDiv.appendChild(titleInput);

    var priceDiv = document.createElement("div");
    priceDiv.className = "w-28";
    var priceLabel = document.createElement("label");
    priceLabel.className = "block text-xs font-medium text-gray-600 mb-1";
    priceLabel.textContent = "Price ($)";
    var priceInput = document.createElement("input");
    priceInput.type = "text";
    priceInput.name = "variant-price-" + index;
    priceInput.required = true;
    priceInput.pattern = "^\\d+(\\.\\d{1,2})?$";
    priceInput.className =
      "w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm";
    priceInput.placeholder = "49.99";
    priceDiv.appendChild(priceLabel);
    priceDiv.appendChild(priceInput);

    var removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "text-red-500 hover:text-red-700 pb-1.5";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", function () {
      row.remove();
    });

    row.appendChild(titleDiv);
    row.appendChild(priceDiv);
    row.appendChild(removeBtn);
    return row;
  }

  function setPipelineStatus(message, isError) {
    if (!pipelineStatusEl) return;
    pipelineStatusEl.textContent = message || "";
    pipelineStatusEl.className = isError
      ? "text-xs text-red-600"
      : "text-xs text-gray-500";
  }

  function buildVariantRowsFromDraft(variants) {
    if (!container) return;
    container.innerHTML = "";
    for (var i = 0; i < variants.length; i++) {
      var row = createVariantRow(i);
      var titleInput = row.querySelector('[name^="variant-title-"]');
      var priceInput = row.querySelector('[name^="variant-price-"]');
      if (titleInput) titleInput.value = variants[i].title || "";
      if (priceInput) priceInput.value = variants[i].price || "";
      container.appendChild(row);
    }
    variantCount = variants.length;
  }

  if (addBtn && container) {
    addBtn.addEventListener("click", function () {
      container.appendChild(createVariantRow(variantCount));
      variantCount++;
    });
  }

  function collectFormData(availableForSale) {
    var artJobId = form.querySelector('[name="artJobId"]').value;
    var name = form.querySelector('[name="name"]').value.trim();
    var description = form.querySelector('[name="description"]').value.trim();
    var type = form.querySelector('[name="type"]').value;
    var placementArea = form.querySelector('[name="placementArea"]').value;
    var providerSelect = form.querySelector('[name="providerId"]');
    var providerId = providerSelect ? providerSelect.value : "";

    var variants = [];
    var rows = container.querySelectorAll(".variant-row");
    for (var i = 0; i < rows.length; i++) {
      var titleInput = rows[i].querySelector('[name^="variant-title-"]');
      var priceInput = rows[i].querySelector('[name^="variant-price-"]');
      if (titleInput && priceInput && titleInput.value.trim()) {
        var v = {
          title: titleInput.value.trim(),
          price: priceInput.value.trim(),
        };
        var meta =
          draftVariantPayload &&
          Array.isArray(draftVariantPayload) &&
          draftVariantPayload[i]
            ? draftVariantPayload[i]
            : null;
        if (meta && typeof meta === "object") {
          if (meta.digitalAssetKey) v.digitalAssetKey = meta.digitalAssetKey;
          if (meta.fulfillmentProvider) {
            v.fulfillmentProvider = meta.fulfillmentProvider;
          }
          if (typeof meta.estimatedProductionDays === "number") {
            v.estimatedProductionDays = meta.estimatedProductionDays;
          }
        }
        if (providerId) {
          v.providerId = providerId;
          if (providerSelect && providerSelect.selectedOptions[0]) {
            var selectedText = providerSelect.selectedOptions[0].textContent || "";
            var typeMatch = selectedText.match(/\(([^)]+)\)\s*$/);
            var providerType = typeMatch && typeMatch[1] ? typeMatch[1].trim().toLowerCase() : "";
            if (providerType) {
              v.fulfillmentProvider = providerType;
            }
          }
        }
        variants.push(v);
      }
    }

    var imageUrl = form.querySelector("img")
      ? form.querySelector("img").src
      : null;
    var placements =
      imageUrl && placementArea
        ? [{ area: placementArea, imageUrl: imageUrl }]
        : [];
    var imageUrls = imageUrl ? [imageUrl] : [];

    return {
      artJobId: artJobId,
      name: name,
      description: description || undefined,
      type: type,
      availableForSale: availableForSale,
      variants: variants,
      placements: placements.length > 0 ? placements : undefined,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    };
  }

  async function autoFillFromPipeline() {
    if (!form || !autoFillBtn) return;
    var artJobInput = form.querySelector('[name="artJobId"]');
    var typeInput = form.querySelector('[name="type"]');
    var providerSelect = form.querySelector('[name="providerId"]');
    var nameInput = form.querySelector('[name="name"]');
    var descriptionInput = form.querySelector('[name="description"]');
    var placementInput = form.querySelector('[name="placementArea"]');
    if (!artJobInput || !typeInput || !nameInput || !descriptionInput) return;

    var artJobId = artJobInput.value;
    var productType = typeInput.value || "physical";
    var providerId = providerSelect ? providerSelect.value : "";

    autoFillBtn.disabled = true;
    setPipelineStatus("Generating draft from artwork...", false);
    try {
      var resp = await fetch("/api/admin/products/from-art/copilot-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artJobId: artJobId,
          productType: productType,
          providerId: providerId || undefined,
        }),
      });
      var payload = await resp.json().catch(function () {
        return {};
      });
      if (!resp.ok || !payload || !payload.draft) {
        var message = payload.error || payload.message || "Failed to generate product draft.";
        throw new Error(message);
      }

      var draft = payload.draft;
      nameInput.value = draft.name || "";
      descriptionInput.value = draft.description || "";
      if (typeInput && draft.type) typeInput.value = draft.type;
      if (placementInput && draft.placements && draft.placements[0] && draft.placements[0].area) {
        placementInput.value = draft.placements[0].area;
      }

      draftVariantPayload = Array.isArray(draft.variants) ? draft.variants : null;
      if (draftVariantPayload && draftVariantPayload.length > 0) {
        buildVariantRowsFromDraft(draftVariantPayload);
      }

      var warnings = Array.isArray(draft.warnings) ? draft.warnings : [];
      if (warnings.length > 0) {
        setPipelineStatus("Draft generated with warnings: " + warnings.join(" "), false);
      } else {
        setPipelineStatus("Draft generated and applied to the form.", false);
      }
    } catch (err) {
      setPipelineStatus(err && err.message ? err.message : "Failed to generate draft.", true);
    } finally {
      autoFillBtn.disabled = false;
    }
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
    successEl.classList.add("hidden");
  }

  function showSuccess(msg) {
    successEl.textContent = msg;
    successEl.classList.remove("hidden");
    errorEl.classList.add("hidden");
  }

  async function submitProduct(availableForSale) {
    errorEl.classList.add("hidden");
    successEl.classList.add("hidden");

    var data = collectFormData(availableForSale);
    if (!data.name) {
      showError("Product name is required.");
      return;
    }
    if (data.variants.length === 0) {
      showError("At least one variant is required.");
      return;
    }

    try {
      var resp = await fetch("/api/admin/products/from-art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!resp.ok) {
        var err = await resp.json().catch(function () {
          return { error: "Request failed" };
        });
        showError(err.error || err.message || "Failed to create product.");
        return;
      }

      var result = await resp.json();
      showSuccess("Product created successfully! Redirecting...");
      setTimeout(function () {
        window.location.href = "/products/" + result.product.slug;
      }, 1000);
    } catch (e) {
      showError("Network error. Please try again.");
    }
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      submitProduct(true);
    });
  }

  if (draftBtn) {
    draftBtn.addEventListener("click", function () {
      submitProduct(false);
    });
  }

  if (autoFillBtn) {
    autoFillBtn.addEventListener("click", function () {
      autoFillFromPipeline();
    });
  }
})();
