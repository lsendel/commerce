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
    var answer = window.prompt("Type \"refund\" for a return refund, or \"exchange\" for an instant exchange.", "refund");
    if (!answer) return null;
    var normalized = String(answer).trim().toLowerCase();
    if (normalized !== "refund" && normalized !== "exchange") {
      notify('Please type "refund" or "exchange".', "warning");
      return null;
    }
    return normalized;
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

        var mode = askMode();
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
          window.location.href = result.exchangeCart.redirectUrl;
          return;
        }

        btn.textContent = "Submitted";
        setTimeout(function () {
          window.location.reload();
        }, 1400);
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
