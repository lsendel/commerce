(function () {
  "use strict";

  function notify(message, type) {
    if (!message) return;
    if (window.showToast) {
      window.showToast(message, type || "info");
      return;
    }
    if (type === "error") console.error(message);
    else console.log(message);
  }

  function getErrorMessage(payload, fallback) {
    if (payload && typeof payload === "object") {
      if (payload.error) return payload.error;
      if (payload.message) return payload.message;
    }
    return fallback;
  }

  function askMode() {
    return new Promise(function (resolve) {
      var existing = document.getElementById("return-mode-dialog");
      if (existing) existing.remove();

      var overlay = document.createElement("div");
      overlay.id = "return-mode-dialog";
      overlay.className = "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4";
      overlay.innerHTML =
        '<div class="w-full max-w-md rounded-xl bg-white shadow-xl">' +
        '<div class="p-5 border-b border-gray-100">' +
        '<h3 class="text-base font-semibold text-gray-900">Select Return Type</h3>' +
        '<p class="mt-1 text-sm text-gray-600">Choose refund or instant exchange for this order.</p>' +
        "</div>" +
        '<div class="p-5 space-y-3">' +
        '<button type="button" data-mode-choice="refund" class="w-full rounded-lg border border-gray-300 px-4 py-3 text-left hover:bg-gray-50">' +
        '<div class="text-sm font-medium text-gray-900">Refund</div>' +
        '<div class="text-xs text-gray-500 mt-1">Return items and refund to the original payment method.</div>' +
        "</button>" +
        '<button type="button" data-mode-choice="exchange" class="w-full rounded-lg border border-gray-300 px-4 py-3 text-left hover:bg-gray-50">' +
        '<div class="text-sm font-medium text-gray-900">Instant Exchange</div>' +
        '<div class="text-xs text-gray-500 mt-1">Swap for available variants and update cart immediately.</div>' +
        "</button>" +
        '<button type="button" data-mode-choice="cancel" class="w-full rounded-lg border border-transparent px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>' +
        "</div>" +
        "</div>";

      function close(choice) {
        document.removeEventListener("keydown", onKeydown);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(choice || null);
      }

      function onKeydown(event) {
        if (event.key === "Escape") close(null);
      }

      overlay.addEventListener("click", function (event) {
        if (event.target === overlay) close(null);
      });

      overlay.querySelectorAll("[data-mode-choice]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var choice = btn.getAttribute("data-mode-choice");
          if (choice === "refund" || choice === "exchange") {
            close(choice);
            return;
          }
          close(null);
        });
      });

      document.body.appendChild(overlay);
      document.addEventListener("keydown", onKeydown);

      var firstChoice = overlay.querySelector('[data-mode-choice="refund"]');
      if (firstChoice && typeof firstChoice.focus === "function") {
        firstChoice.focus();
      }
    });
  }

  function handleInlineCartNavigation(redirectUrl) {
    if (redirectUrl !== "/cart") return false;
    if (typeof window.updateCartBadge === "function") {
      Promise.resolve(window.updateCartBadge()).catch(function () {});
    }
    if (typeof window.openCartDrawer === "function") {
      window.openCartDrawer();
      return true;
    }
    return false;
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".return-exchange-btn");
    if (!btn) return;

    var orderId = btn.getAttribute("data-order-id");
    if (!orderId) return;

    btn.disabled = true;
    var idleText = btn.textContent || "Return/Exchange";
    btn.textContent = "Checking...";

    fetch("/api/orders/" + orderId + "/return-options", {
      method: "GET",
      headers: { Accept: "application/json" },
    })
      .then(function (resp) {
        return resp.json().then(function (data) {
          if (!resp.ok) throw new Error(getErrorMessage(data, "Failed to load return options."));
          return data;
        });
      })
      .then(function (options) {
        if (!options || options.eligible !== true) {
          throw new Error(options && options.reasonIfIneligible ? options.reasonIfIneligible : "This order is not eligible for return/exchange.");
        }

        return askMode().then(function (mode) {
          if (!mode) {
            throw new Error("Return/exchange cancelled.");
          }

          var items = Array.isArray(options.items)
            ? options.items.map(function (item) {
                return {
                  orderItemId: item.orderItemId,
                  quantity: Number(item.maxReturnableQuantity || item.quantityPurchased || 1),
                  exchangeVariantId: item.variantId || undefined,
                };
              })
            : [];

          if (mode === "exchange") {
            items = items.filter(function (item) {
              return Boolean(item.exchangeVariantId);
            });
            if (!items.length) {
              throw new Error("No exchangeable variants found for this order.");
            }
          }

          if (!items.length) {
            throw new Error("No return-eligible items found.");
          }

          btn.textContent = mode === "exchange" ? "Creating Exchange..." : "Submitting Return...";

          return fetch("/api/orders/" + orderId + "/returns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: mode,
              instantExchange: mode === "exchange",
              items: items,
            }),
          });
        });
      })
      .then(function (resp) {
        return resp.json().then(function (data) {
          if (!resp.ok && resp.status !== 207) {
            throw new Error(getErrorMessage(data, "Failed to submit return/exchange request."));
          }
          return data;
        });
      })
      .then(function (result) {
        notify(result.message || "Return/exchange request submitted.", result.exchangeCart && result.exchangeCart.failedLines && result.exchangeCart.failedLines.length > 0 ? "warning" : "success");

        if (result.exchangeCart && result.exchangeCart.updated && result.exchangeCart.redirectUrl) {
          var stayedInline = handleInlineCartNavigation(result.exchangeCart.redirectUrl);
          if (!stayedInline) {
            notify("Exchange cart updated. Use the cart icon to review exchange items.", "info");
          }
        }

        btn.textContent = "Submitted";
        btn.disabled = true;
        btn.classList.remove("text-brand-600", "hover:text-brand-700", "hover:bg-brand-50");
        btn.classList.add("text-gray-400", "bg-gray-50", "cursor-not-allowed");
        btn.setAttribute("title", "Return/exchange request submitted");
      })
      .catch(function (err) {
        var message = err && err.message ? err.message : "Network error. Please try again.";
        if (message !== "Return/exchange cancelled.") {
          notify(message, "error");
        }
        btn.disabled = false;
        btn.textContent = idleText;
      });
  });
})();
