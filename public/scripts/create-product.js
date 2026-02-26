(function () {
  "use strict";

  var variantCount = 1;
  var container = document.getElementById("variants-container");
  var addBtn = document.getElementById("add-variant-btn");
  var form = document.getElementById("create-product-form");
  var errorEl = document.getElementById("form-error");
  var successEl = document.getElementById("form-success");
  var draftBtn = document.getElementById("save-draft-btn");

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
        if (providerId) {
          v.fulfillmentProvider = providerSelect
            ? providerSelect.selectedOptions[0].textContent
                .replace(/\s*\(.*\)$/, "")
                .trim()
            : "";
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
})();
