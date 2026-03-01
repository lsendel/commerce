/**
 * Cart interactivity — loaded on every page via layout.
 * Vanilla JS, async/await, fetch API.
 *
 * Phase B features:
 *   B1 — Slide-out cart drawer (open/close/toggle, load items, render)
 *   B2 — Optimistic cart updates (instant UI, rollback on error)
 *   B3 — Loading/spinner states (CSS spinner, button disable)
 *   B4 — Toast integration (via global window.showToast from toast.js)
 *   B5 — Checkout error handling (empty cart, Stripe errors, loading)
 */
(function () {
  "use strict";

  // ─── Spinner helpers ────────────────────────────────────────────────────────

  function createSpinner(sizeClass) {
    var el = document.createElement("span");
    el.className = "spinner" + (sizeClass ? " " + sizeClass : "");
    el.setAttribute("aria-hidden", "true");
    return el;
  }

  function setButtonLoading(btn, text) {
    btn._originalChildren = Array.from(btn.childNodes).map(function (n) {
      return n.cloneNode(true);
    });
    btn.textContent = "";
    btn.appendChild(createSpinner("spinner--sm"));
    var spacer = document.createTextNode(" " + text);
    btn.appendChild(spacer);
    btn.disabled = true;
    btn.classList.add("btn--loading");
  }

  function restoreButton(btn) {
    if (!btn._originalChildren) return;
    btn.textContent = "";
    btn._originalChildren.forEach(function (n) {
      btn.appendChild(n);
    });
    delete btn._originalChildren;
    btn.disabled = false;
    btn.classList.remove("btn--loading");
  }

  // ─── SVG helper (safe DOM, no innerHTML) ────────────────────────────────────

  function createSvgIcon(pathD, size) {
    var s = size || 16;
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(s));
    svg.setAttribute("height", String(s));
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("d", pathD);
    svg.appendChild(path);
    return svg;
  }

  // ─── Cart Count Badge ──────────────────────────────────────────────────────

  var _cachedCartData = null;

  async function fetchCartData() {
    var res = await fetch("/api/cart", { credentials: "same-origin" });
    if (!res.ok) return null;
    var data = await res.json();
    _cachedCartData = data;
    return data;
  }

  function getCartCountFromData(data) {
    if (!data || !data.items || !Array.isArray(data.items)) return 0;
    return data.items.reduce(function (sum, item) {
      return sum + (item.quantity || 0);
    }, 0);
  }

  async function updateCartBadge() {
    try {
      var data = await fetchCartData();
      if (!data) return;
      var count = getCartCountFromData(data);
      setCartCount(count);
    } catch (_) {
      // Silently fail
    }
  }

  function setCartCount(count) {
    var badges = document.querySelectorAll("[data-cart-count]");
    badges.forEach(function (badge) {
      badge.textContent = count > 0 ? String(count) : "";
      if (count > 0) {
        badge.classList.remove("hidden");
        badge.classList.remove("scale-0", "opacity-0");
        badge.classList.add("scale-100", "opacity-100");
      } else {
        badge.classList.add("hidden");
      }
    });
  }

  /** Optimistically bump badge count by delta without a server round-trip */
  function optimisticBadgeDelta(delta) {
    var badges = document.querySelectorAll("[data-cart-count]");
    badges.forEach(function (badge) {
      var current = parseInt(badge.textContent, 10) || 0;
      var next = Math.max(0, current + delta);
      badge.textContent = next > 0 ? String(next) : "";
      if (next > 0) {
        badge.classList.remove("hidden", "scale-0", "opacity-0");
        badge.classList.add("scale-100", "opacity-100");
      } else {
        badge.classList.add("hidden");
      }
    });
  }

  function getApiErrorMessage(payload, fallback) {
    var defaultMessage = fallback || "Request failed";
    if (!payload || typeof payload !== "object") return defaultMessage;
    if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
    if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
    if (payload.error && payload.error.issues && payload.error.issues[0] && payload.error.issues[0].message) {
      return payload.error.issues[0].message;
    }
    if (payload.issues && payload.issues[0] && payload.issues[0].message) {
      return payload.issues[0].message;
    }
    return defaultMessage;
  }

  function normalizeCheckoutResponse(payload) {
    if (!payload || typeof payload !== "object") return null;
    var url =
      typeof payload.url === "string"
        ? payload.url
        : typeof payload.checkoutUrl === "string"
          ? payload.checkoutUrl
          : null;
    var deliveryPromise = null;
    if (
      payload.deliveryPromise &&
      typeof payload.deliveryPromise === "object" &&
      typeof payload.deliveryPromise.minDays === "number" &&
      typeof payload.deliveryPromise.maxDays === "number"
    ) {
      deliveryPromise = payload.deliveryPromise;
    }
    return { url: url, deliveryPromise: deliveryPromise };
  }

  function getCheckoutStockElements() {
    return {
      panel: document.querySelector("[data-checkout-stock-panel]"),
      headline: document.querySelector("[data-checkout-stock-headline]"),
      badge: document.querySelector("[data-checkout-stock-badge]"),
      list: document.querySelector("[data-checkout-stock-list]"),
    };
  }

  function renderCheckoutStockPanel(validation) {
    var els = getCheckoutStockElements();
    if (!els.panel || !els.headline || !els.badge || !els.list) return;

    var problems = validation && Array.isArray(validation.problems) ? validation.problems : [];
    var blockers = problems.filter(function (p) {
      return p.type === "out_of_stock" || p.type === "unavailable" || p.type === "expired_slot";
    });
    var advisories = problems.filter(function (p) {
      return p.type === "low_stock" || p.type === "price_changed";
    });

    els.panel.classList.remove("hidden");
    els.list.textContent = "";
    els.badge.className =
      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";

    if (blockers.length > 0) {
      els.panel.className = "rounded-xl border border-red-200 bg-red-50 px-3 py-2";
      els.headline.textContent = "Checkout blocked: resolve stock issues";
      els.headline.className = "text-xs font-medium text-red-700";
      els.badge.classList.add("bg-red-200", "text-red-800");
      els.badge.textContent = "Blocked";
      blockers.slice(0, 3).forEach(function (problem) {
        var li = document.createElement("li");
        li.className = "text-xs text-red-700";
        li.textContent = "\u2022 " + (problem.message || "Item unavailable");
        els.list.appendChild(li);
      });
      return;
    }

    if (advisories.length > 0) {
      els.panel.className = "rounded-xl border border-amber-200 bg-amber-50 px-3 py-2";
      els.headline.textContent = "Stock check: review before checkout";
      els.headline.className = "text-xs font-medium text-amber-800";
      els.badge.classList.add("bg-amber-200", "text-amber-900");
      els.badge.textContent = "Warning";
      advisories.slice(0, 3).forEach(function (problem) {
        var li = document.createElement("li");
        li.className = "text-xs text-amber-800";
        li.textContent = "\u2022 " + (problem.message || "Cart advisory");
        els.list.appendChild(li);
      });
      return;
    }

    els.panel.className = "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2";
    els.headline.textContent = "Stock check passed";
    els.headline.className = "text-xs font-medium text-emerald-700";
    els.badge.classList.add("bg-emerald-200", "text-emerald-800");
    els.badge.textContent = "Ready";
    var li = document.createElement("li");
    li.className = "text-xs text-emerald-700";
    li.textContent = "\u2022 All cart items are currently available.";
    els.list.appendChild(li);
  }

  async function runCheckoutPreflight(options) {
    var config = options || {};
    var silent = !!config.silent;

    try {
      var res = await fetch("/api/cart/validate", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!res.ok) {
        var dataErr = await res.json().catch(function () {
          return {};
        });
        var message = getApiErrorMessage(dataErr, "Could not validate cart for checkout");
        if (!silent) showToast(message, "error");
        return { canProceed: false, blockers: [], advisories: [], validation: null };
      }

      var validation = await res.json();
      renderCheckoutStockPanel(validation);

      var problems = Array.isArray(validation.problems) ? validation.problems : [];
      var blockers = problems.filter(function (p) {
        return p.type === "out_of_stock" || p.type === "unavailable" || p.type === "expired_slot";
      });
      var advisories = problems.filter(function (p) {
        return p.type === "low_stock" || p.type === "price_changed";
      });

      if (blockers.length > 0) {
        if (window.petm8Track) {
          window.petm8Track("checkout_preflight_blocked", {
            blockerCount: blockers.length,
          });
        }
        if (!silent) {
          showToast(blockers[0].message || "Checkout blocked due to stock availability", "error");
        }
        return { canProceed: false, blockers: blockers, advisories: advisories, validation: validation };
      }

      if (advisories.length > 0 && !silent) {
        if (window.petm8Track) {
          window.petm8Track("checkout_preflight_warning", {
            advisoryCount: advisories.length,
          });
        }
        showToast(advisories[0].message || "Low-stock warning before checkout", "warning");
      }

      return { canProceed: true, blockers: blockers, advisories: advisories, validation: validation };
    } catch (_) {
      if (!silent) {
        showToast("Could not validate cart for checkout. Please try again.", "error");
      }
      return { canProceed: false, blockers: [], advisories: [], validation: null };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // B1: Cart Drawer
  // ═══════════════════════════════════════════════════════════════════════════

  var drawerOpen = false;

  function getDrawerElements() {
    return {
      drawer: document.getElementById("cart-drawer"),
      backdrop: document.getElementById("cart-drawer-backdrop"),
      body: document.getElementById("cart-drawer-body"),
      footer: document.getElementById("cart-drawer-footer"),
      loading: document.getElementById("cart-drawer-loading"),
      subtotal: document.getElementById("cart-drawer-subtotal"),
      checkoutBtn: document.getElementById("cart-drawer-checkout"),
      closeBtn: document.getElementById("cart-drawer-close"),
    };
  }

  var drawerTriggerEl = null;

  function openDrawer() {
    var els = getDrawerElements();
    if (!els.drawer || drawerOpen) return;
    drawerOpen = true;
    drawerTriggerEl = document.activeElement;
    document.body.classList.add("cart-drawer-open");
    els.backdrop.classList.add("cart-drawer-backdrop--open");
    els.drawer.classList.add("cart-drawer--open");
    els.drawer.setAttribute("aria-hidden", "false");

    // Focus the close button for keyboard accessibility
    if (els.closeBtn) {
      setTimeout(function () {
        els.closeBtn.focus();
      }, 100);
    }

    loadDrawerItems();
  }

  function closeDrawer() {
    var els = getDrawerElements();
    if (!els.drawer || !drawerOpen) return;
    drawerOpen = false;
    document.body.classList.remove("cart-drawer-open");
    els.backdrop.classList.remove("cart-drawer-backdrop--open");
    els.drawer.classList.remove("cart-drawer--open");
    els.drawer.setAttribute("aria-hidden", "true");

    // Return focus to the element that triggered the drawer
    if (drawerTriggerEl && typeof drawerTriggerEl.focus === "function") {
      drawerTriggerEl.focus();
      drawerTriggerEl = null;
    }
  }

  function toggleDrawer() {
    if (drawerOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }

  // Load items into drawer from API
  async function loadDrawerItems() {
    var els = getDrawerElements();
    if (!els.body) return;

    // Show loading spinner
    els.body.textContent = "";
    var loadingDiv = document.createElement("div");
    loadingDiv.className = "cart-drawer__loading";
    loadingDiv.appendChild(createSpinner("spinner--lg"));
    els.body.appendChild(loadingDiv);
    if (els.footer) els.footer.style.display = "none";

    try {
      var data = await fetchCartData();
      renderDrawerItems(data);
    } catch (_) {
      els.body.textContent = "";
      var errorDiv = document.createElement("div");
      errorDiv.className = "cart-drawer__empty";
      var errorText = document.createElement("p");
      errorText.className = "cart-drawer__empty-text";
      errorText.textContent = "Could not load cart";
      var errorSub = document.createElement("p");
      errorSub.className = "cart-drawer__empty-sub";
      errorSub.textContent = "Please try again later.";
      errorDiv.appendChild(errorText);
      errorDiv.appendChild(errorSub);
      els.body.appendChild(errorDiv);
    }
  }

  function renderDrawerItems(data) {
    var els = getDrawerElements();
    if (!els.body) return;

    var items = (data && data.items) || [];
    var subtotal = (data && data.subtotal) || 0;
    var count = getCartCountFromData(data);

    setCartCount(count);

    els.body.textContent = "";

    if (items.length === 0) {
      // Empty state
      var emptyDiv = document.createElement("div");
      emptyDiv.className = "cart-drawer__empty";

      var icon = createSvgIcon(
        "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
        48
      );
      icon.setAttribute("class", "cart-drawer__empty-icon");
      emptyDiv.appendChild(icon);

      var title = document.createElement("p");
      title.className = "cart-drawer__empty-text";
      title.textContent = "Your cart is empty";
      emptyDiv.appendChild(title);

      var sub = document.createElement("p");
      sub.className = "cart-drawer__empty-sub";
      sub.textContent = "Browse products and add something you love!";
      emptyDiv.appendChild(sub);

      var shopLink = document.createElement("a");
      shopLink.href = "/products";
      shopLink.className = "cart-drawer__view-cart";
      shopLink.style.marginTop = "1rem";
      shopLink.textContent = "Continue Shopping";
      emptyDiv.appendChild(shopLink);

      els.body.appendChild(emptyDiv);
      if (els.footer) els.footer.style.display = "none";
      return;
    }

    // Render items
    var itemsContainer = document.createElement("div");
    itemsContainer.className = "cart-drawer__items";
    itemsContainer.id = "cart-drawer-items";

    items.forEach(function (item) {
      itemsContainer.appendChild(buildDrawerItemElement(item));
    });

    els.body.appendChild(itemsContainer);

    // Show footer
    if (els.footer) {
      els.footer.style.display = "";
      if (els.subtotal) {
        els.subtotal.textContent = "$" + parseFloat(subtotal).toFixed(2);
      }
    }
  }

  function buildDrawerItemElement(item) {
    var row = document.createElement("div");
    row.className = "cart-drawer-item";
    row.setAttribute("data-drawer-item", item.id);

    // Image
    var variant = item.variant || {};
    var product = variant.product || {};
    var imgUrl = product.featuredImageUrl;

    if (imgUrl) {
      var img = document.createElement("img");
      img.className = "cart-drawer-item__img";
      img.src = imgUrl;
      img.alt = product.name || "";
      img.loading = "lazy";
      row.appendChild(img);
    } else {
      var placeholder = document.createElement("div");
      placeholder.className = "cart-drawer-item__img-placeholder";
      placeholder.appendChild(
        createSvgIcon(
          "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
          24
        )
      );
      row.appendChild(placeholder);
    }

    // Details
    var details = document.createElement("div");
    details.className = "cart-drawer-item__details";

    // Top row: name + remove
    var top = document.createElement("div");
    top.className = "cart-drawer-item__top";

    var nameWrap = document.createElement("div");
    var nameEl = document.createElement("p");
    nameEl.className = "cart-drawer-item__name";
    nameEl.textContent = product.name || "Product";
    nameWrap.appendChild(nameEl);

    if (variant.title) {
      var varEl = document.createElement("p");
      varEl.className = "cart-drawer-item__variant";
      varEl.textContent = variant.title;
      nameWrap.appendChild(varEl);
    }

    top.appendChild(nameWrap);

    // Remove button
    var removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "cart-drawer-item__remove";
    removeBtn.setAttribute("data-drawer-remove", item.id);
    removeBtn.setAttribute("aria-label", "Remove " + (product.name || "item"));
    removeBtn.appendChild(createSvgIcon("M6 18L18 6M6 6l12 12", 14));
    top.appendChild(removeBtn);

    details.appendChild(top);

    // Bottom row: quantity controls + price
    var bottom = document.createElement("div");
    bottom.className = "cart-drawer-item__bottom";

    var unitPrice = parseFloat(variant.price) || 0;

    // Quantity controls
    var qtyWrap = document.createElement("div");
    qtyWrap.className = "cart-drawer-item__qty";

    var decBtn = document.createElement("button");
    decBtn.type = "button";
    decBtn.className = "cart-drawer-item__qty-btn";
    decBtn.textContent = "\u2212"; // minus sign
    decBtn.setAttribute("data-drawer-qty", "dec");
    decBtn.setAttribute("data-item-id", item.id);
    decBtn.setAttribute("aria-label", "Decrease quantity");
    if (item.quantity <= 1) decBtn.disabled = true;

    var qtyValue = document.createElement("span");
    qtyValue.className = "cart-drawer-item__qty-value";
    qtyValue.setAttribute("data-drawer-qty-display", item.id);
    qtyValue.textContent = String(item.quantity);

    var incBtn = document.createElement("button");
    incBtn.type = "button";
    incBtn.className = "cart-drawer-item__qty-btn";
    incBtn.textContent = "+";
    incBtn.setAttribute("data-drawer-qty", "inc");
    incBtn.setAttribute("data-item-id", item.id);
    incBtn.setAttribute("aria-label", "Increase quantity");

    qtyWrap.appendChild(decBtn);
    qtyWrap.appendChild(qtyValue);
    qtyWrap.appendChild(incBtn);

    bottom.appendChild(qtyWrap);

    // Price
    var priceEl = document.createElement("span");
    priceEl.className = "cart-drawer-item__price";
    priceEl.setAttribute("data-drawer-item-price", item.id);
    priceEl.textContent = "$" + (unitPrice * item.quantity).toFixed(2);

    bottom.appendChild(priceEl);
    details.appendChild(bottom);

    row.appendChild(details);

    // Store unit price on the row for calculations
    row._unitPrice = unitPrice;

    return row;
  }

  // ─── Drawer event listeners ─────────────────────────────────────────────────

  function initDrawer() {
    // Open drawer on cart trigger click
    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-cart-trigger]");
      if (trigger) {
        e.preventDefault();
        e.stopPropagation();
        openDrawer();
        return;
      }
    });

    // Close button
    var closeBtn = document.getElementById("cart-drawer-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        closeDrawer();
      });
    }

    // Click backdrop to close
    var backdrop = document.getElementById("cart-drawer-backdrop");
    if (backdrop) {
      backdrop.addEventListener("click", function () {
        closeDrawer();
      });
    }

    // Escape key to close + focus trapping
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawerOpen) {
        closeDrawer();
        return;
      }
      // Focus trap: cycle Tab within the drawer
      if (e.key === "Tab" && drawerOpen) {
        var drawer = document.getElementById("cart-drawer");
        if (!drawer) return;
        var focusable = drawer.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    });

    // Drawer quantity controls (optimistic — B2)
    document.addEventListener("click", function (e) {
      var qtyBtn = e.target.closest("[data-drawer-qty]");
      if (!qtyBtn) return;

      e.preventDefault();
      var action = qtyBtn.getAttribute("data-drawer-qty");
      var itemId = qtyBtn.getAttribute("data-item-id");
      handleDrawerQtyChange(itemId, action);
    });

    // Drawer remove buttons (optimistic — B2)
    document.addEventListener("click", function (e) {
      var removeBtn = e.target.closest("[data-drawer-remove]");
      if (!removeBtn) return;

      e.preventDefault();
      var itemId = removeBtn.getAttribute("data-drawer-remove");
      handleDrawerRemove(itemId);
    });

    // Drawer checkout button (B5)
    document.addEventListener("click", function (e) {
      var checkoutBtn = e.target.closest("[data-drawer-checkout-btn]");
      if (!checkoutBtn) return;

      e.preventDefault();
      handleDrawerCheckout(checkoutBtn);
    });
  }

  // B2: Optimistic drawer quantity change
  async function handleDrawerQtyChange(itemId, action) {
    var qtyDisplay = document.querySelector(
      '[data-drawer-qty-display="' + itemId + '"]'
    );
    var priceDisplay = document.querySelector(
      '[data-drawer-item-price="' + itemId + '"]'
    );
    var row = document.querySelector('[data-drawer-item="' + itemId + '"]');
    if (!qtyDisplay) return;

    var currentQty = parseInt(qtyDisplay.textContent, 10) || 1;
    var newQty = action === "inc" ? currentQty + 1 : currentQty - 1;
    if (newQty < 1) return;

    var unitPrice = row ? row._unitPrice || 0 : 0;

    // Save state for rollback
    var savedQty = currentQty;

    // Optimistic update
    qtyDisplay.textContent = String(newQty);
    if (priceDisplay) {
      priceDisplay.textContent = "$" + (unitPrice * newQty).toFixed(2);
    }
    optimisticBadgeDelta(action === "inc" ? 1 : -1);
    recalcDrawerSubtotal();

    // Update dec button disabled state
    var decBtn = document.querySelector(
      '[data-drawer-qty="dec"][data-item-id="' + itemId + '"]'
    );
    if (decBtn) decBtn.disabled = newQty <= 1;

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

      // Refresh badge with actual server data
      await updateCartBadge();
    } catch (err) {
      // Rollback optimistic update
      qtyDisplay.textContent = String(savedQty);
      if (priceDisplay) {
        priceDisplay.textContent = "$" + (unitPrice * savedQty).toFixed(2);
      }
      optimisticBadgeDelta(action === "inc" ? -1 : 1);
      recalcDrawerSubtotal();
      if (decBtn) decBtn.disabled = savedQty <= 1;
      showToast(err.message || "Could not update quantity", "error");
    }
  }

  // B2: Optimistic drawer remove
  async function handleDrawerRemove(itemId) {
    var row = document.querySelector('[data-drawer-item="' + itemId + '"]');
    if (!row) return;

    // Save state for rollback
    var parent = row.parentNode;
    var nextSibling = row.nextSibling;
    var savedQty = 0;
    var qtyDisplay = row.querySelector(
      '[data-drawer-qty-display="' + itemId + '"]'
    );
    if (qtyDisplay) savedQty = parseInt(qtyDisplay.textContent, 10) || 1;

    // Optimistic: animate out and remove
    row.classList.add("cart-drawer-item--removing");
    optimisticBadgeDelta(-savedQty);

    var removedRow = row;
    setTimeout(function () {
      if (removedRow.parentNode) removedRow.parentNode.removeChild(removedRow);
      recalcDrawerSubtotal();
      checkDrawerEmpty();
    }, 200);

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

      showToast("Item removed", "info");
      await updateCartBadge();

      if (window.petm8Track) {
        window.petm8Track("remove_from_cart", { itemId: itemId });
      }
    } catch (err) {
      // Rollback: re-insert the row
      removedRow.classList.remove("cart-drawer-item--removing");
      if (parent) {
        if (nextSibling) {
          parent.insertBefore(removedRow, nextSibling);
        } else {
          parent.appendChild(removedRow);
        }
      }
      optimisticBadgeDelta(savedQty);
      recalcDrawerSubtotal();
      showToast(err.message || "Could not remove item", "error");
    }
  }

  function recalcDrawerSubtotal() {
    var items = document.querySelectorAll("[data-drawer-item]");
    var total = 0;
    items.forEach(function (row) {
      var itemId = row.getAttribute("data-drawer-item");
      var priceEl = row.querySelector(
        '[data-drawer-item-price="' + itemId + '"]'
      );
      if (priceEl) {
        var price = parseFloat(priceEl.textContent.replace("$", "")) || 0;
        total += price;
      }
    });

    var subtotalEl = document.getElementById("cart-drawer-subtotal");
    if (subtotalEl) {
      subtotalEl.textContent = "$" + total.toFixed(2);
    }
  }

  function checkDrawerEmpty() {
    var els = getDrawerElements();
    var items = document.querySelectorAll("[data-drawer-item]");
    if (items.length === 0) {
      renderDrawerItems({ items: [], subtotal: 0 });
    }
  }

  // B5: Drawer checkout with error handling
  async function handleDrawerCheckout(btn) {
    // Check if cart is empty
    var items = document.querySelectorAll("[data-drawer-item]");
    if (items.length === 0) {
      showToast("Your cart is empty. Add items before checking out.", "error");
      return;
    }

    var preflight = await runCheckoutPreflight({ silent: false });
    if (!preflight.canProceed) {
      return;
    }

    btn.disabled = true;
    var originalText = btn.textContent;
    btn.textContent = "";
    btn.appendChild(createSpinner("spinner--sm"));
    btn.appendChild(document.createTextNode(" Redirecting..."));
    btn.classList.add("btn--loading");

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
      var checkout = normalizeCheckoutResponse(data);
      if (window.petm8Track) {
        window.petm8Track("checkout_started", {
          cartHasUrl: !!(checkout && checkout.url),
          hasDeliveryPromise: !!(checkout && checkout.deliveryPromise),
        });
        if (checkout && checkout.deliveryPromise) {
          window.petm8Track("delivery_promise_checkout_window", {
            minDays: checkout.deliveryPromise.minDays,
            maxDays: checkout.deliveryPromise.maxDays,
            confidence: checkout.deliveryPromise.confidence || undefined,
          });
        }
      }
      if (checkout && checkout.url) {
        window.location.href = checkout.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = originalText || "Checkout";
      btn.classList.remove("btn--loading");
      showToast(err.message || "Checkout failed. Please try again.", "error");
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Add to Cart (with optimistic badge update — B2, spinner — B3)
  // ═══════════════════════════════════════════════════════════════════════════

  function initAddToCartButtons() {
    document.addEventListener("click", async function (e) {
      var btn = e.target.closest("[data-add-to-cart]");
      if (!btn) return;

      e.preventDefault();

      var variantId = btn.getAttribute("data-variant-id");
      var quantity = parseInt(btn.getAttribute("data-quantity") || "1", 10);
      var selector = btn.closest("[data-variant-selector]");

      if (!variantId && selector) {
        var checkedVariant = selector.querySelector(
          "[data-variant-radio]:checked"
        );
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
          var selectedSlot = selector.querySelector(
            "[data-slot-radio]:checked"
          );
          var bookingAvailabilityId = selectedSlot
            ? selectedSlot.getAttribute("data-slot-id") || selectedSlot.value
            : null;

          if (!bookingAvailabilityId) {
            showToast("Please select a booking slot", "error");
            return;
          }

          var personTypeQuantities = {};
          var totalParticipants = 0;
          selector
            .querySelectorAll("[data-person-qty]")
            .forEach(function (input) {
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

      // B3: Show spinner on button
      setButtonLoading(btn, "Adding...");

      // B2: Optimistic badge update
      optimisticBadgeDelta(payload.quantity);

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

        // Refresh with real data from server
        await updateCartBadge();
        showToast("Added to cart!", "success");

        // Screen reader announcement
        var announcer = document.getElementById("announcer");
        if (announcer) announcer.textContent = "Item added to cart";

        // If drawer is open, refresh its items
        if (drawerOpen) {
          loadDrawerItems();
        }

        if (window.petm8Track) {
          window.petm8Track("add_to_cart", {
            variantId: variantId,
            quantity: payload.quantity,
            bookingAvailabilityId: payload.bookingAvailabilityId || null,
          });
        }
      } catch (err) {
        // B2: Rollback optimistic badge
        optimisticBadgeDelta(-payload.quantity);
        showToast(err.message || "Could not add to cart", "error");
      } finally {
        restoreButton(btn);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cart Page: Quantity Controls (B2 optimistic updates)
  // ═══════════════════════════════════════════════════════════════════════════

  function initCartQuantityControls() {
    document.addEventListener("click", async function (e) {
      var btn = e.target.closest("[data-cart-qty]");
      if (!btn) return;

      e.preventDefault();

      var action = btn.getAttribute("data-cart-qty");
      var itemId = btn.getAttribute("data-item-id");
      var qtyDisplay = document.querySelector(
        '[data-cart-qty-display][data-item-id="' + itemId + '"]'
      );
      var currentQty = qtyDisplay ? parseInt(qtyDisplay.textContent, 10) : 1;
      var newQty = action === "inc" ? currentQty + 1 : currentQty - 1;

      if (newQty < 1) return;

      // B2: Save state for rollback
      var savedQty = currentQty;

      // B2: Optimistic update
      if (qtyDisplay) qtyDisplay.textContent = String(newQty);
      optimisticBadgeDelta(action === "inc" ? 1 : -1);

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

        await refreshCartPage();
        await updateCartBadge();
      } catch (err) {
        // B2: Rollback
        if (qtyDisplay) qtyDisplay.textContent = String(savedQty);
        optimisticBadgeDelta(action === "inc" ? -1 : 1);
        showToast(err.message || "Could not update quantity", "error");
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cart Page: Remove Item (B2 optimistic)
  // ═══════════════════════════════════════════════════════════════════════════

  function initCartRemoveButtons() {
    document.addEventListener("click", async function (e) {
      var btn = e.target.closest("[data-cart-remove]");
      if (!btn) return;

      e.preventDefault();

      var itemId = btn.getAttribute("data-item-id");
      var row = btn.closest("[data-cart-item]");

      // B2: Save state for rollback
      var parent = row ? row.parentNode : null;
      var nextSibling = row ? row.nextSibling : null;
      var savedQty = 0;
      var qtyDisplay = document.querySelector(
        '[data-cart-qty-display][data-item-id="' + itemId + '"]'
      );
      if (qtyDisplay)
        savedQty = parseInt(qtyDisplay.textContent, 10) || 1;

      // B2: Optimistic remove with animation
      if (row) {
        row.style.transition = "opacity 200ms, transform 200ms";
        row.style.opacity = "0";
        row.style.transform = "translateX(20px)";
        optimisticBadgeDelta(-savedQty);
      }
      btn.disabled = true;

      setTimeout(async function () {
        if (row && row.parentNode) row.parentNode.removeChild(row);
        checkEmptyCart();

        try {
          var res = await fetch(
            "/api/cart/items/" + encodeURIComponent(itemId),
            {
              method: "DELETE",
              credentials: "same-origin",
            }
          );

          if (!res.ok) {
            var errData = await res.json().catch(function () {
              return {};
            });
            throw new Error(errData.error || "Failed to remove item");
          }

          await refreshCartPage();
          await updateCartBadge();
          showToast("Item removed", "info");
          var announcer = document.getElementById("announcer");
          if (announcer) announcer.textContent = "Item removed from cart";
          if (window.petm8Track) {
            window.petm8Track("remove_from_cart", { itemId: itemId });
          }
        } catch (err) {
          // B2: Rollback — re-insert the row
          if (row && parent) {
            row.style.opacity = "1";
            row.style.transform = "translateX(0)";
            if (nextSibling) {
              parent.insertBefore(row, nextSibling);
            } else {
              parent.appendChild(row);
            }
            btn.disabled = false;
          }
          optimisticBadgeDelta(savedQty);
          showToast(err.message || "Could not remove item", "error");
        }
      }, 200);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cart Page: Checkout (B3 spinner, B5 error handling)
  // ═══════════════════════════════════════════════════════════════════════════

  function initCheckoutButton() {
    document.addEventListener("click", async function (e) {
      var btn = e.target.closest("[data-checkout-btn]");
      if (!btn) return;

      e.preventDefault();

      // B5: Check if cart is empty
      var cartItems = document.querySelectorAll("[data-cart-item]");
      if (cartItems.length === 0) {
        showToast(
          "Your cart is empty. Add items before checking out.",
          "error"
        );
        return;
      }

      var preflight = await runCheckoutPreflight({ silent: false });
      if (!preflight.canProceed) {
        return;
      }

      // B3: Show spinner
      setButtonLoading(btn, "Redirecting to checkout...");

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
        var checkout = normalizeCheckoutResponse(data);
        if (window.petm8Track) {
          window.petm8Track("checkout_started", {
            cartHasUrl: !!(checkout && checkout.url),
            hasDeliveryPromise: !!(checkout && checkout.deliveryPromise),
          });
          if (checkout && checkout.deliveryPromise) {
            window.petm8Track("delivery_promise_checkout_window", {
              minDays: checkout.deliveryPromise.minDays,
              maxDays: checkout.deliveryPromise.maxDays,
              confidence: checkout.deliveryPromise.confidence || undefined,
            });
          }
        }
        if (checkout && checkout.url) {
          window.location.href = checkout.url;
        } else {
          throw new Error("No checkout URL received");
        }
      } catch (err) {
        // B5: Better error handling
        restoreButton(btn);
        var errorMsg = err.message || "Checkout failed";
        showToast(errorMsg + ". Please try again.", "error");
      }
    });
  }

  // ─── Product Page Controls ───────────────────────────────────────────────

  function initProductPageControls() {
    document.addEventListener("click", function (e) {
      var qtyBtn = e.target.closest(
        "[data-qty-increment], [data-qty-decrement]"
      );
      if (qtyBtn) {
        e.preventDefault();
        var selector = qtyBtn.closest("[data-variant-selector]");
        if (!selector) return;
        var qtyInput = selector.querySelector("[data-qty-input]");
        if (!qtyInput) return;
        var current = parseInt(qtyInput.value || "1", 10) || 1;
        var next = qtyBtn.hasAttribute("data-qty-increment")
          ? current + 1
          : current - 1;
        qtyInput.value = String(Math.max(1, next));
        return;
      }

      var personBtn = e.target.closest(
        "[data-person-increment], [data-person-decrement]"
      );
      if (!personBtn) return;

      e.preventDefault();
      var personKey =
        personBtn.getAttribute("data-person-increment") ||
        personBtn.getAttribute("data-person-decrement");
      if (!personKey) return;
      var selector = personBtn.closest("[data-variant-selector]");
      if (!selector) return;
      var input = selector.querySelector(
        '[data-person-qty="' + personKey + '"]'
      );
      if (!input) return;

      var value = parseInt(input.value || "0", 10) || 0;
      var min = parseInt(input.getAttribute("min") || "0", 10) || 0;
      var max = parseInt(input.getAttribute("max") || "99", 10) || 99;
      var nextValue = personBtn.hasAttribute("data-person-increment")
        ? value + 1
        : value - 1;
      nextValue = Math.max(min, Math.min(max, nextValue));
      input.value = String(nextValue);
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

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
      } else if (totalEl && data.subtotal !== undefined) {
        totalEl.textContent = "$" + parseFloat(data.subtotal).toFixed(2);
      }

      // Update individual item prices
      if (data.items && Array.isArray(data.items)) {
        data.items.forEach(function (item) {
          var priceEl = document.querySelector(
            '[data-cart-item-price][data-item-id="' + item.id + '"]'
          );
          if (priceEl) {
            var unitPrice = parseFloat(item.variant ? item.variant.price : 0);
            var lineTotal = unitPrice * item.quantity;
            priceEl.textContent = "$" + lineTotal.toFixed(2);
          }
        });
      }

      runCheckoutPreflight({ silent: true });
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

  // ─── Expose to other scripts ────────────────────────────────────────────

  window.updateCartBadge = updateCartBadge;
  window.openCartDrawer = openDrawer;
  window.closeCartDrawer = closeDrawer;
  window.toggleCartDrawer = toggleDrawer;

  // ─── Init ─────────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    updateCartBadge();
    initDrawer();
    initAddToCartButtons();
    initCartQuantityControls();
    initCartRemoveButtons();
    initCheckoutButton();
    initProductPageControls();
    if (document.querySelector("[data-checkout-stock-panel]")) {
      runCheckoutPreflight({ silent: true });
    }
  });
})();
