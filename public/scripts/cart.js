/**
 * Cart interactivity — loaded on every page via layout.
 * Vanilla JS, async/await, fetch API.
 */
(function () {
  "use strict";

  // ─── Toast Notification ──────────────────────────────────────────────────────

  function showToast(message, type) {
    type = type || "success";
    var container = getOrCreateToastContainer();

    var toast = document.createElement("div");
    var baseClass =
      "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm " +
      "transform transition-all duration-300 translate-x-full opacity-0 ";
    var colorClass =
      type === "success"
        ? "bg-green-600 text-white"
        : type === "error"
          ? "bg-red-600 text-white"
          : "bg-gray-800 text-white";
    toast.className = baseClass + colorClass;

    // Build icon using DOM
    var icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "w-5 h-5 shrink-0");
    icon.setAttribute("fill", "none");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    var iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    iconPath.setAttribute("stroke-linecap", "round");
    iconPath.setAttribute("stroke-linejoin", "round");
    if (type === "success") {
      iconPath.setAttribute("d", "M4.5 12.75l6 6 9-13.5");
    } else if (type === "error") {
      iconPath.setAttribute(
        "d",
        "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      );
    }
    icon.appendChild(iconPath);

    var textSpan = document.createElement("span");
    textSpan.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(textSpan);
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(function () {
      toast.classList.remove("translate-x-full", "opacity-0");
      toast.classList.add("translate-x-0", "opacity-100");
    });

    // Auto-dismiss after 3s
    setTimeout(function () {
      toast.classList.add("translate-x-full", "opacity-0");
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 3000);
  }

  function getOrCreateToastContainer() {
    var existing = document.getElementById("toast-container");
    if (existing) return existing;

    var container = document.createElement("div");
    container.id = "toast-container";
    container.className = "fixed top-4 right-4 z-[9999] flex flex-col gap-2";
    document.body.appendChild(container);
    return container;
  }

  // ─── Spinner HTML (trusted static content) ───────────────────────────────────

  function createSpinner() {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "animate-spin w-4 h-4 mr-1.5");
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

  function setButtonLoading(btn, text) {
    btn._originalChildren = Array.from(btn.childNodes).map(function (n) {
      return n.cloneNode(true);
    });
    btn.textContent = "";
    btn.appendChild(createSpinner());
    btn.appendChild(document.createTextNode(text));
  }

  function restoreButton(btn) {
    if (!btn._originalChildren) return;
    btn.textContent = "";
    btn._originalChildren.forEach(function (n) {
      btn.appendChild(n);
    });
    delete btn._originalChildren;
  }

  // ─── Cart Count Badge ────────────────────────────────────────────────────────

  async function updateCartBadge() {
    try {
      var res = await fetch("/api/cart", { credentials: "same-origin" });
      if (!res.ok) return;
      var data = await res.json();
      var count = 0;
      if (data && data.items && Array.isArray(data.items)) {
        count = data.items.reduce(function (sum, item) {
          return sum + (item.quantity || 0);
        }, 0);
      }
      setCartCount(count);
    } catch (_) {
      // Silently fail — badge stays at previous value
    }
  }

  function setCartCount(count) {
    var badges = document.querySelectorAll("[data-cart-count]");
    badges.forEach(function (badge) {
      badge.textContent = count > 0 ? String(count) : "";
      if (count > 0) {
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    });
  }

  // ─── Add to Cart ─────────────────────────────────────────────────────────────

  function initAddToCartButtons() {
    document.addEventListener("click", async function (e) {
      var btn = e.target.closest("[data-add-to-cart]");
      if (!btn) return;

      e.preventDefault();

      var variantId = btn.getAttribute("data-variant-id");
      var quantity = parseInt(btn.getAttribute("data-quantity") || "1", 10);
      var selector = btn.closest("[data-variant-selector]");

      if (!variantId && selector) {
        var checkedVariant = selector.querySelector('[data-variant-radio]:checked');
        if (checkedVariant) {
          variantId = checkedVariant.value;
        } else {
          var variantSelect = selector.querySelector("[data-variant-select]");
          if (variantSelect) variantId = variantSelect.value;
        }
      }

      if (selector) {
        var qtyInput = selector.querySelector("[data-qty-input]");
        if (qtyInput) {
          quantity = Math.max(1, parseInt(qtyInput.value || "1", 10) || 1);
        }
      }

      if (!variantId) {
        showToast("Please select a product option", "error");
        return;
      }

      // Build payload
      var payload = { variantId: variantId, quantity: quantity };

      if (selector) {
        var productType = selector.getAttribute("data-product-type");
        if (productType === "bookable") {
          var selectedSlot = selector.querySelector("[data-slot-radio]:checked");
          var bookingAvailabilityId = selectedSlot
            ? selectedSlot.getAttribute("data-slot-id") || selectedSlot.value
            : null;

          if (!bookingAvailabilityId) {
            showToast("Please select a booking slot", "error");
            return;
          }

          var personTypeQuantities = {};
          var totalParticipants = 0;
          selector.querySelectorAll("[data-person-qty]").forEach(function (input) {
            var key = input.getAttribute("data-person-qty");
            var value = parseInt(input.value || "0", 10) || 0;
            if (value > 0) {
              personTypeQuantities[key] = value;
              totalParticipants += value;
            }
          });

          payload.bookingAvailabilityId = bookingAvailabilityId;
          payload.personTypeQuantities = personTypeQuantities;
          payload.quantity = Math.max(1, totalParticipants);
        }
      }

      // Check for booking-specific data
      var bookingData = btn.getAttribute("data-booking-data");
      if (bookingData) {
        try {
          var parsed = JSON.parse(bookingData);
          Object.assign(payload, parsed);
        } catch (_) {}
      }

      btn.disabled = true;
      setButtonLoading(btn, " Adding...");

      try {
        var res = await fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          var errData = await res.json().catch(function () {
            return {};
          });
          throw new Error(errData.error || "Failed to add to cart");
        }

        await updateCartBadge();
        showToast("Added to cart!", "success");
        if (window.petm8Track) {
          window.petm8Track("add_to_cart", {
            variantId: variantId,
            quantity: payload.quantity,
            bookingAvailabilityId: payload.bookingAvailabilityId || null,
          });
        }
      } catch (err) {
        showToast(err.message || "Could not add to cart", "error");
      } finally {
        btn.disabled = false;
        restoreButton(btn);
      }
    });
  }

  // ─── Cart Page: Quantity Controls ────────────────────────────────────────────

  function initCartQuantityControls() {
    document.addEventListener("click", async function (e) {
      var btn = e.target.closest("[data-cart-qty]");
      if (!btn) return;

      e.preventDefault();

      var action = btn.getAttribute("data-cart-qty"); // "inc" or "dec"
      var itemId = btn.getAttribute("data-item-id");
      var qtyDisplay = document.querySelector(
        '[data-cart-qty-display][data-item-id="' + itemId + '"]'
      );
      var currentQty = qtyDisplay ? parseInt(qtyDisplay.textContent, 10) : 1;
      var newQty = action === "inc" ? currentQty + 1 : currentQty - 1;

      if (newQty < 1) return;

      try {
        var res = await fetch("/api/cart/items/" + encodeURIComponent(itemId), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ quantity: newQty }),
        });

        if (!res.ok) {
          var errData = await res.json().catch(function () {
            return {};
          });
          throw new Error(errData.error || "Failed to update quantity");
        }

        if (qtyDisplay) {
          qtyDisplay.textContent = String(newQty);
        }

        // Re-fetch cart to update totals
        await refreshCartPage();
        await updateCartBadge();
      } catch (err) {
        showToast(err.message || "Could not update quantity", "error");
      }
    });
  }

  // ─── Cart Page: Remove Item ──────────────────────────────────────────────────

  function initCartRemoveButtons() {
    document.addEventListener("click", async function (e) {
      var btn = e.target.closest("[data-cart-remove]");
      if (!btn) return;

      e.preventDefault();

      var itemId = btn.getAttribute("data-item-id");

      btn.disabled = true;

      try {
        var res = await fetch("/api/cart/items/" + encodeURIComponent(itemId), {
          method: "DELETE",
          credentials: "same-origin",
        });

        if (!res.ok) {
          var errData = await res.json().catch(function () {
            return {};
          });
          throw new Error(errData.error || "Failed to remove item");
        }

        // Remove the row from the DOM
        var row = btn.closest("[data-cart-item]");
        if (row) {
          row.style.transition = "opacity 200ms, transform 200ms";
          row.style.opacity = "0";
          row.style.transform = "translateX(20px)";
          setTimeout(function () {
            row.remove();
            checkEmptyCart();
          }, 200);
        }

        await refreshCartPage();
        await updateCartBadge();
        showToast("Item removed", "info");
        if (window.petm8Track) {
          window.petm8Track("remove_from_cart", { itemId: itemId });
        }
      } catch (err) {
        btn.disabled = false;
        showToast(err.message || "Could not remove item", "error");
      }
    });
  }

  // ─── Cart Page: Checkout ─────────────────────────────────────────────────────

  function initCheckoutButton() {
    document.addEventListener("click", async function (e) {
      var btn = e.target.closest("[data-checkout-btn]");
      if (!btn) return;

      e.preventDefault();

      btn.disabled = true;
      setButtonLoading(btn, " Redirecting to checkout...");

      try {
        var res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({}),
        });

        if (!res.ok) {
          var errData = await res.json().catch(function () {
            return {};
          });
          throw new Error(errData.error || "Checkout failed");
        }

        var data = await res.json();
        if (window.petm8Track) {
          window.petm8Track("begin_checkout", { cartHasUrl: !!data.url });
        }
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("No checkout URL received");
        }
      } catch (err) {
        btn.disabled = false;
        restoreButton(btn);
        showToast(err.message || "Checkout failed", "error");
      }
    });
  }

  // ─── Product Page Controls ───────────────────────────────────────────────────

  function initProductPageControls() {
    document.addEventListener("click", function (e) {
      var qtyBtn = e.target.closest("[data-qty-increment], [data-qty-decrement]");
      if (qtyBtn) {
        e.preventDefault();
        var selector = qtyBtn.closest("[data-variant-selector]");
        if (!selector) return;
        var qtyInput = selector.querySelector("[data-qty-input]");
        if (!qtyInput) return;
        var current = parseInt(qtyInput.value || "1", 10) || 1;
        var next = qtyBtn.hasAttribute("data-qty-increment") ? current + 1 : current - 1;
        qtyInput.value = String(Math.max(1, next));
        return;
      }

      var personBtn = e.target.closest("[data-person-increment], [data-person-decrement]");
      if (!personBtn) return;

      e.preventDefault();
      var personKey = personBtn.getAttribute("data-person-increment") || personBtn.getAttribute("data-person-decrement");
      if (!personKey) return;
      var selector = personBtn.closest("[data-variant-selector]");
      if (!selector) return;
      var input = selector.querySelector('[data-person-qty="' + personKey + '"]');
      if (!input) return;

      var value = parseInt(input.value || "0", 10) || 0;
      var min = parseInt(input.getAttribute("min") || "0", 10) || 0;
      var max = parseInt(input.getAttribute("max") || "99", 10) || 99;
      var nextValue = personBtn.hasAttribute("data-person-increment") ? value + 1 : value - 1;
      nextValue = Math.max(min, Math.min(max, nextValue));
      input.value = String(nextValue);
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  async function refreshCartPage() {
    try {
      var res = await fetch("/api/cart", { credentials: "same-origin" });
      if (!res.ok) return;
      var data = await res.json();

      // Update subtotal
      var subtotalEl = document.querySelector("[data-cart-subtotal]");
      if (subtotalEl && data.subtotal !== undefined) {
        subtotalEl.textContent = "$" + parseFloat(data.subtotal).toFixed(2);
      }

      // Update total
      var totalEl = document.querySelector("[data-cart-total]");
      if (totalEl && data.total !== undefined) {
        totalEl.textContent = "$" + parseFloat(data.total).toFixed(2);
      }

      // Update individual item prices
      if (data.items && Array.isArray(data.items)) {
        data.items.forEach(function (item) {
          var priceEl = document.querySelector(
            '[data-cart-item-price][data-item-id="' + item.id + '"]'
          );
          if (priceEl && item.lineTotal !== undefined) {
            priceEl.textContent = "$" + parseFloat(item.lineTotal).toFixed(2);
          }
        });
      }
    } catch (_) {}
  }

  function checkEmptyCart() {
    var items = document.querySelectorAll("[data-cart-item]");
    if (items.length === 0) {
      var emptyState = document.querySelector("[data-cart-empty]");
      var cartContent = document.querySelector("[data-cart-content]");
      if (emptyState) emptyState.classList.remove("hidden");
      if (cartContent) cartContent.classList.add("hidden");
    }
  }

  // ─── Window-level toast for other scripts ────────────────────────────────────

  window.showToast = showToast;
  window.updateCartBadge = updateCartBadge;

  // ─── Init ────────────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    updateCartBadge();
    initAddToCartButtons();
    initCartQuantityControls();
    initCartRemoveButtons();
    initCheckoutButton();
    initProductPageControls();
  });
})();
