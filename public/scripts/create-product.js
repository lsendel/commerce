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
  var providerSelect = document.querySelector('[name="providerId"]');
  var providerConfigPanel = document.getElementById("provider-config-panel");
  var providerConfigHint = document.getElementById("provider-config-hint");
  var providerProductIdWrap = document.getElementById("provider-product-id-wrap");
  var mockupToggleWrap = document.getElementById("mockup-toggle-wrap");
  var mockupToggle = document.getElementById("generate-mockup-on-publish");

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getSelectedProviderOption() {
    if (!providerSelect || !providerSelect.selectedOptions || !providerSelect.selectedOptions[0]) {
      return null;
    }
    return providerSelect.selectedOptions[0];
  }

  function getSelectedProviderType() {
    var option = getSelectedProviderOption();
    if (!option) return "";
    var dataType = option.getAttribute("data-provider-type");
    if (dataType) {
      return String(dataType).trim().toLowerCase();
    }

    var label = option.textContent || "";
    var typeMatch = label.match(/\(([^)]+)\)\s*$/);
    return typeMatch && typeMatch[1] ? String(typeMatch[1]).trim().toLowerCase() : "";
  }

  function updateProviderFieldsVisibility() {
    var hasProvider = !!(providerSelect && providerSelect.value);
    var providerType = getSelectedProviderType();
    var isPrintful = providerType === "printful";

    if (providerConfigPanel) {
      providerConfigPanel.classList.toggle("hidden", !hasProvider);
    }
    if (providerProductIdWrap) {
      providerProductIdWrap.classList.toggle("hidden", !hasProvider);
    }
    if (mockupToggleWrap) {
      mockupToggleWrap.classList.toggle("hidden", !isPrintful);
      mockupToggleWrap.classList.toggle("flex", isPrintful);
    }
    if (mockupToggle && !isPrintful) {
      mockupToggle.checked = false;
    }
    if (providerConfigHint) {
      providerConfigHint.textContent = hasProvider
        ? (isPrintful
            ? "Map the Printful catalog ids now so checkout fulfillment and mockup generation work without manual relinking."
            : "Map the provider catalog ids now so each variant can be fulfilled automatically after checkout.")
        : "Add provider catalog ids so each variant can be fulfilled automatically after checkout.";
    }

    var mappingFields = document.querySelectorAll(".provider-mapping-field");
    for (var i = 0; i < mappingFields.length; i++) {
      mappingFields[i].classList.toggle("hidden", !hasProvider);
    }
  }

  function createVariantRow(index) {
    var row = document.createElement("div");
    row.className =
      "variant-row grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 mt-3 md:grid-cols-[minmax(0,2fr)_120px_140px_180px_140px_auto] md:items-end";
    row.innerHTML =
      '<div class="md:col-span-1">' +
        '<label class="block text-xs font-medium text-gray-600 mb-1">Title</label>' +
        '<input type="text" name="variant-title-' + index + '" required class="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm" placeholder="e.g. Large Canvas 16x20" />' +
      "</div>" +
      "<div>" +
        '<label class="block text-xs font-medium text-gray-600 mb-1">Price ($)</label>' +
        '<input type="text" name="variant-price-' + index + '" required pattern="^\\d+(\\.\\d{1,2})?$" class="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm" placeholder="49.99" />' +
      "</div>" +
      "<div>" +
        '<label class="block text-xs font-medium text-gray-600 mb-1">Compare at ($)</label>' +
        '<input type="text" name="variant-compare-at-price-' + index + '" pattern="^\\d+(\\.\\d{1,2})?$" class="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm" placeholder="59.99" />' +
      "</div>" +
      '<div class="provider-mapping-field hidden">' +
        '<label class="block text-xs font-medium text-gray-600 mb-1">Provider Variant ID</label>' +
        '<input type="text" name="variant-external-id-' + index + '" class="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm" placeholder="e.g. 4012" />' +
      "</div>" +
      '<div class="provider-mapping-field hidden">' +
        '<label class="block text-xs font-medium text-gray-600 mb-1">Cost ($)</label>' +
        '<input type="text" name="variant-cost-price-' + index + '" pattern="^\\d+(\\.\\d{1,2})?$" class="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm" placeholder="14.50" />' +
      "</div>" +
      '<div class="flex items-end justify-end">' +
        '<button type="button" class="text-red-500 hover:text-red-700 pb-1.5">Remove</button>' +
      "</div>";

    var removeBtn = row.querySelector("button");
    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        row.remove();
      });
    }

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
      var compareAtInput = row.querySelector('[name^="variant-compare-at-price-"]');
      var externalIdInput = row.querySelector('[name^="variant-external-id-"]');
      var costPriceInput = row.querySelector('[name^="variant-cost-price-"]');

      if (titleInput) titleInput.value = variants[i].title || "";
      if (priceInput) priceInput.value = variants[i].price || "";
      if (compareAtInput) compareAtInput.value = variants[i].compareAtPrice || "";
      if (externalIdInput) externalIdInput.value = variants[i].externalVariantId || "";
      if (costPriceInput) costPriceInput.value = variants[i].costPrice || "";

      container.appendChild(row);
    }

    variantCount = variants.length;
    updateProviderFieldsVisibility();
  }

  if (addBtn && container) {
    addBtn.addEventListener("click", function () {
      container.appendChild(createVariantRow(variantCount));
      variantCount++;
      updateProviderFieldsVisibility();
    });
  }

  function collectFormData(availableForSale) {
    var artJobId = form.querySelector('[name="artJobId"]').value;
    var name = form.querySelector('[name="name"]').value.trim();
    var description = form.querySelector('[name="description"]').value.trim();
    var type = form.querySelector('[name="type"]').value;
    var placementArea = form.querySelector('[name="placementArea"]').value;
    var providerId = providerSelect ? providerSelect.value : "";
    var providerType = getSelectedProviderType();
    var providerProductIdInput = form.querySelector('[name="providerProductId"]');
    var providerProductId = providerProductIdInput
      ? providerProductIdInput.value.trim()
      : "";

    var variants = [];
    var rows = container.querySelectorAll(".variant-row");

    for (var i = 0; i < rows.length; i++) {
      var titleInput = rows[i].querySelector('[name^="variant-title-"]');
      var priceInput = rows[i].querySelector('[name^="variant-price-"]');
      var compareAtInput = rows[i].querySelector('[name^="variant-compare-at-price-"]');
      var externalIdInput = rows[i].querySelector('[name^="variant-external-id-"]');
      var costPriceInput = rows[i].querySelector('[name^="variant-cost-price-"]');

      if (titleInput && priceInput && titleInput.value.trim()) {
        var v = {
          title: titleInput.value.trim(),
          price: priceInput.value.trim(),
        };

        if (compareAtInput && compareAtInput.value.trim()) {
          v.compareAtPrice = compareAtInput.value.trim();
        }

        var meta =
          draftVariantPayload &&
          Array.isArray(draftVariantPayload) &&
          draftVariantPayload[i]
            ? draftVariantPayload[i]
            : null;

        if (meta && typeof meta === "object") {
          if (meta.digitalAssetKey) v.digitalAssetKey = meta.digitalAssetKey;
          if (meta.fulfillmentProvider) v.fulfillmentProvider = meta.fulfillmentProvider;
          if (typeof meta.estimatedProductionDays === "number") {
            v.estimatedProductionDays = meta.estimatedProductionDays;
          }
          if (meta.compareAtPrice && !v.compareAtPrice) {
            v.compareAtPrice = meta.compareAtPrice;
          }
          if (meta.externalVariantId && externalIdInput && !externalIdInput.value.trim()) {
            externalIdInput.value = meta.externalVariantId;
          }
          if (meta.costPrice && costPriceInput && !costPriceInput.value.trim()) {
            costPriceInput.value = meta.costPrice;
          }
        }

        if (providerId) {
          v.providerId = providerId;
          if (providerType) {
            v.fulfillmentProvider = providerType;
          }
        }
        if (providerProductId) {
          v.externalProductId = providerProductId;
        }
        if (externalIdInput && externalIdInput.value.trim()) {
          v.externalVariantId = externalIdInput.value.trim();
        }
        if (costPriceInput && costPriceInput.value.trim()) {
          v.costPrice = costPriceInput.value.trim();
        }

        variants.push(v);
      }
    }

    var previewImage = form.querySelector("img");
    var imageUrl = previewImage ? previewImage.src : null;
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

  function getMockupRequest(productId, data) {
    if (!productId || !data || !data.imageUrls || !data.imageUrls[0]) return null;
    if (getSelectedProviderType() !== "printful") return null;
    if (!mockupToggle || !mockupToggle.checked) return null;

    var printfulProductId = null;
    for (var i = 0; i < data.variants.length; i++) {
      var candidate = data.variants[i].externalProductId;
      if (candidate && /^\d+$/.test(String(candidate))) {
        printfulProductId = Number(candidate);
        break;
      }
    }
    if (!printfulProductId) return null;

    return {
      productId: productId,
      imageUrl: data.imageUrls[0],
      printfulProductId: printfulProductId,
      waitAndApply: true,
      timeoutMs: 120000,
      pollIntervalMs: 2000,
    };
  }

  async function generateMockup(productId, data) {
    var request = getMockupRequest(productId, data);
    if (!request) return null;

    var resp = await fetch(
      "/api/admin/products/" + encodeURIComponent(productId) + "/mockup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      },
    );
    var payload = await resp.json().catch(function () {
      return {};
    });

    if (!resp.ok) {
      throw new Error(payload.error || payload.message || "Failed to generate mockups.");
    }

    return payload;
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
    successEl.classList.add("hidden");
  }

  function showSuccess(msg, asHtml) {
    if (asHtml) {
      successEl.innerHTML = msg;
    } else {
      successEl.textContent = msg;
    }
    successEl.classList.remove("hidden");
    errorEl.classList.add("hidden");
  }

  async function submitProduct(availableForSale) {
    errorEl.classList.add("hidden");
    successEl.classList.add("hidden");

    var publishBtn = form ? form.querySelector('button[type="submit"]') : null;
    var publishText = publishBtn ? publishBtn.textContent : "";
    var draftText = draftBtn ? draftBtn.textContent : "";
    var didSucceed = false;

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
      if (publishBtn) {
        publishBtn.disabled = true;
        publishBtn.textContent = "Publishing...";
      }
      if (draftBtn) {
        draftBtn.disabled = true;
        if (!availableForSale) {
          draftBtn.textContent = "Saving...";
        }
      }

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
      var slug = result && result.product && result.product.slug
        ? String(result.product.slug)
        : "";
      var productId = result && result.product && result.product.id
        ? String(result.product.id)
        : "";
      var mockupHtml = "";

      if (productId) {
        showSuccess("Product created. Finalizing post-publish automation...");
        try {
          var mockupResult = await generateMockup(productId, data);
          if (mockupResult && mockupResult.status === "completed") {
            mockupHtml =
              '<div class="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">' +
              "Printful mockups were generated and applied to the storefront gallery." +
              "</div>";
          } else if (mockupResult && mockupResult.status === "pending") {
            mockupHtml =
              '<div class="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">' +
              escapeHtml(mockupResult.message || "Mockup generation is still processing in Printful.") +
              "</div>";
          }
        } catch (mockupError) {
          mockupHtml =
            '<div class="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">' +
            "Product published, but mockups still need attention: " +
            escapeHtml(
              mockupError && mockupError.message
                ? mockupError.message
                : "Unknown mockup error.",
            ) +
            "</div>";
        }
      }

      if (slug) {
        var productPath = "/products/" + encodeURIComponent(slug);
        var adminPath = productId
          ? "/admin/products/" + encodeURIComponent(productId)
          : "/admin/products";
        var successHtml =
          '<div class="font-medium">Product created successfully.</div>' +
          '<div class="mt-2 flex flex-wrap gap-2">' +
          '<a href="' + escapeHtml(productPath) + '" class="inline-flex items-center rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">View Product</a>' +
          '<a href="' + escapeHtml(adminPath) + '" class="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100">Open Admin Editor</a>' +
          "</div>" +
          mockupHtml;
        showSuccess(successHtml, true);
      } else {
        showSuccess("Product created successfully." + (mockupHtml ? " Post-publish tasks were also attempted." : ""));
      }

      didSucceed = true;
    } catch (e) {
      showError("Network error. Please try again.");
    } finally {
      if (!didSucceed) {
        if (publishBtn) {
          publishBtn.disabled = false;
          publishBtn.textContent = publishText || "Publish Product";
        }
        if (draftBtn) {
          draftBtn.disabled = false;
          draftBtn.textContent = draftText || "Save as Draft";
        }
      }
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

  if (providerSelect) {
    providerSelect.addEventListener("change", updateProviderFieldsVisibility);
  }

  updateProviderFieldsVisibility();
})();
