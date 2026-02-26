/**
 * Variant availability checking — disables Add to Cart when selected
 * variant is out of stock, grays out unavailable option buttons.
 * Loaded on product detail pages.
 */
(function () {
  "use strict";

  function initVariantSelector() {
    var selector = document.querySelector("[data-variant-selector]");
    if (!selector) return;

    var raw = selector.getAttribute("data-variants-json");
    if (!raw) return;

    var variants;
    try {
      variants = JSON.parse(raw);
    } catch (_) {
      return;
    }

    if (!variants || variants.length === 0) return;

    var addToCartBtn = selector.querySelector("[data-add-to-cart]");
    if (!addToCartBtn) return;

    // Store the original button child nodes
    var originalChildren = Array.from(addToCartBtn.childNodes).map(function (n) {
      return n.cloneNode(true);
    });

    // Build a lookup map: variantId -> variant data
    var variantMap = {};
    variants.forEach(function (v) {
      variantMap[v.id] = v;
    });

    function createSvgIcon(d) {
      var icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("class", "w-5 h-5 mr-2");
      icon.setAttribute("fill", "none");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("stroke", "currentColor");
      var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("stroke-width", "2");
      path.setAttribute("d", d);
      icon.appendChild(path);
      return icon;
    }

    function buildPriceDisplay(container, priceNum, compareNum) {
      // Clear existing content safely
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      var wrapper = document.createElement("div");
      wrapper.className = "flex items-center gap-2 flex-wrap";

      var isOnSale = compareNum !== null && compareNum > priceNum;

      // Current price
      var priceSpan = document.createElement("span");
      priceSpan.className =
        "text-2xl font-bold " + (isOnSale ? "text-red-600" : "text-gray-900");
      priceSpan.textContent = "$" + priceNum.toFixed(2);
      wrapper.appendChild(priceSpan);

      if (isOnSale) {
        // Strikethrough compare price
        var compareSpan = document.createElement("span");
        compareSpan.className = "text-base text-gray-400 line-through";
        compareSpan.textContent = "$" + compareNum.toFixed(2);
        wrapper.appendChild(compareSpan);

        // Savings badge
        var savingsPercent = Math.round(
          ((compareNum - priceNum) / compareNum) * 100
        );
        var badge = document.createElement("span");
        badge.className =
          "text-xs px-2 py-1 bg-red-100 text-red-700 font-semibold rounded-full";
        badge.textContent = "Save " + savingsPercent + "%";
        wrapper.appendChild(badge);
      }

      container.appendChild(wrapper);
    }

    function updateButtonState(variantId) {
      var variant = variantMap[variantId];
      if (!variant) return;

      var isUnavailable =
        variant.availableForSale === false ||
        (variant.inventoryQuantity !== null &&
          variant.inventoryQuantity !== undefined &&
          variant.inventoryQuantity <= 0);

      if (isUnavailable) {
        addToCartBtn.disabled = true;
        // Build out-of-stock button content with DOM methods
        while (addToCartBtn.firstChild) {
          addToCartBtn.removeChild(addToCartBtn.firstChild);
        }
        addToCartBtn.appendChild(createSvgIcon("M6 18L18 6M6 6l12 12"));
        addToCartBtn.appendChild(document.createTextNode("Out of Stock"));
        addToCartBtn.classList.add("opacity-60", "cursor-not-allowed");
      } else {
        addToCartBtn.disabled = false;
        while (addToCartBtn.firstChild) {
          addToCartBtn.removeChild(addToCartBtn.firstChild);
        }
        originalChildren.forEach(function (n) {
          addToCartBtn.appendChild(n.cloneNode(true));
        });
        addToCartBtn.classList.remove("opacity-60", "cursor-not-allowed");
      }

      // Update price display
      var priceDisplay = selector.querySelector("[data-price-display]");
      if (priceDisplay && variant.price !== undefined) {
        var priceNum = parseFloat(variant.price);
        var compareNum = variant.compareAtPrice
          ? parseFloat(variant.compareAtPrice)
          : null;
        buildPriceDisplay(priceDisplay, priceNum, compareNum);
      }
    }

    // Gray out variant option labels that are unavailable
    function grayOutUnavailableOptions() {
      var radios = selector.querySelectorAll("[data-variant-radio]");
      radios.forEach(function (radio) {
        var variant = variantMap[radio.value];
        if (!variant) return;

        var label = radio.closest("label");
        if (!label) return;

        var isUnavailable =
          variant.availableForSale === false ||
          (variant.inventoryQuantity !== null &&
            variant.inventoryQuantity !== undefined &&
            variant.inventoryQuantity <= 0);

        var optionDiv = label.querySelector("div");
        if (!optionDiv) return;

        if (isUnavailable) {
          radio.disabled = true;
          optionDiv.classList.add("opacity-50", "line-through");
          // Add "Sold out" indicator if not already present
          if (!label.querySelector("[data-sold-out]")) {
            var badge = document.createElement("span");
            badge.setAttribute("data-sold-out", "");
            badge.className =
              "ml-2 text-[10px] font-semibold text-red-500 uppercase";
            badge.textContent = "Sold out";
            var titleSpan = optionDiv.querySelector("span");
            if (titleSpan && titleSpan.parentNode) {
              titleSpan.parentNode.insertBefore(badge, titleSpan.nextSibling);
            }
          }
        }
      });

      // Same for select dropdowns
      var selectEl = selector.querySelector("[data-variant-select]");
      if (selectEl) {
        var options = selectEl.querySelectorAll("option");
        options.forEach(function (opt) {
          var variant = variantMap[opt.value];
          if (!variant) return;
          var isUnavailable =
            variant.availableForSale === false ||
            (variant.inventoryQuantity !== null &&
              variant.inventoryQuantity !== undefined &&
              variant.inventoryQuantity <= 0);
          if (isUnavailable) {
            opt.disabled = true;
            if (opt.textContent.indexOf("(Sold out)") === -1) {
              opt.textContent += " (Sold out)";
            }
          }
        });
      }
    }

    // Listen for variant radio changes
    selector.addEventListener("change", function (e) {
      var radio = e.target.closest("[data-variant-radio]");
      var selectEl = e.target.closest("[data-variant-select]");

      if (radio) {
        updateButtonState(radio.value);
      } else if (selectEl) {
        updateButtonState(selectEl.value);
      }
    });

    // Initial state
    grayOutUnavailableOptions();

    // Check if the default selected variant is unavailable
    var checkedRadio = selector.querySelector("[data-variant-radio]:checked");
    if (checkedRadio) {
      updateButtonState(checkedRadio.value);
    } else {
      var selectEl = selector.querySelector("[data-variant-select]");
      if (selectEl) {
        updateButtonState(selectEl.value);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", initVariantSelector);
})();
