(function () {
  "use strict";

  // ─── Shared helpers ────────────────────────────────────────
  function flash(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("hidden");
    setTimeout(function () {
      el.classList.add("hidden");
    }, 4000);
  }

  function formData(form) {
    var data = {};
    new FormData(form).forEach(function (v, k) {
      if (v !== "") data[k] = v;
    });
    return data;
  }

  // ─── Product form (edit page) ──────────────────────────────
  var productForm = document.getElementById("product-form");
  if (productForm) {
    productForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var id = productForm.dataset.productId;
      var data = formData(productForm);

      // Convert checkbox values
      if ("availableForSale" in data) {
        data.availableForSale = true;
      } else {
        data.availableForSale = false;
      }

      var isNew = !id || id === "new";
      var url = isNew ? "/api/admin/products" : "/api/admin/products/" + id;
      var method = isNew ? "POST" : "PATCH";

      fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("Save failed");
          return r.json();
        })
        .then(function (product) {
          flash("product-success", "Product saved.");
          if (isNew && product.id) {
            setTimeout(function () {
              location.href = "/admin/products/" + product.id;
            }, 600);
          }
        })
        .catch(function () {
          flash("product-error", "Failed to save product.");
        });
    });
  }

  // ─── SEO form ──────────────────────────────────────────────
  var seoForm = document.getElementById("seo-form");
  if (seoForm) {
    seoForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var id = document.getElementById("product-form")
        ? document.getElementById("product-form").dataset.productId
        : null;
      if (!id) return;

      var data = formData(seoForm);
      fetch("/api/admin/products/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("Save failed");
          flash("product-success", "SEO updated.");
        })
        .catch(function () {
          flash("product-error", "Failed to save SEO.");
        });
    });

    // Live SERP preview
    var seoTitle = seoForm.querySelector('[name="seoTitle"]');
    var seoDesc = seoForm.querySelector('[name="seoDescription"]');
    var serpTitle = document.getElementById("serp-title");
    var serpDesc = document.getElementById("serp-desc");

    if (seoTitle && serpTitle) {
      seoTitle.addEventListener("input", function () {
        serpTitle.textContent = seoTitle.value || "Page Title";
      });
    }
    if (seoDesc && serpDesc) {
      seoDesc.addEventListener("input", function () {
        serpDesc.textContent = seoDesc.value || "Page description will appear here.";
      });
    }
  }

  // ─── Variant CRUD ──────────────────────────────────────────
  var variantForm = document.getElementById("variant-form");
  if (variantForm) {
    var productId =
      document.getElementById("product-form") &&
      document.getElementById("product-form").dataset.productId;

    // Edit button pre-populates form
    document.querySelectorAll(".btn-edit-variant").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var row = btn.closest("[data-variant-row]");
        variantForm.querySelector('[name="variantId"]').value =
          row.dataset.id || "";
        variantForm.querySelector('[name="title"]').value =
          row.dataset.title || "";
        variantForm.querySelector('[name="price"]').value =
          row.dataset.price || "";
        variantForm.querySelector('[name="sku"]').value =
          row.dataset.sku || "";
        variantForm.querySelector('[name="compareAtPrice"]').value =
          row.dataset.compareAtPrice || "";
        variantForm.querySelector('[name="inventoryQuantity"]').value =
          row.dataset.inventoryQuantity || "0";

        var providerSelect = variantForm.querySelector(
          '[name="fulfillmentProvider"]',
        );
        if (providerSelect) {
          providerSelect.value = row.dataset.fulfillmentProvider || "";
        }

        document
          .getElementById("variant-form-title")
          .textContent = "Edit Variant";
        variantForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });

    // Delete variant
    document.querySelectorAll(".btn-delete-variant").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var row = btn.closest("[data-variant-row]");
        if (!confirm('Delete variant "' + row.dataset.title + '"?')) return;
        fetch(
          "/api/admin/products/" +
            productId +
            "/variants/" +
            row.dataset.id,
          { method: "DELETE" },
        )
          .then(function (r) {
            if (!r.ok) throw new Error("Delete failed");
            row.remove();
            flash("product-success", "Variant deleted.");
          })
          .catch(function () {
            flash("product-error", "Failed to delete variant.");
          });
      });
    });

    // Save variant (create or update)
    variantForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var variantId = variantForm.querySelector('[name="variantId"]').value;
      var data = formData(variantForm);
      delete data.variantId;

      if (data.inventoryQuantity) {
        data.inventoryQuantity = parseInt(data.inventoryQuantity, 10);
      }

      var url;
      var method;
      if (variantId) {
        url =
          "/api/admin/products/" +
          productId +
          "/variants/" +
          variantId;
        method = "PATCH";
      } else {
        url = "/api/admin/products/" + productId + "/variants";
        method = "POST";
      }

      fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("Save failed");
          flash(
            "product-success",
            variantId ? "Variant updated." : "Variant added.",
          );
          setTimeout(function () {
            location.reload();
          }, 600);
        })
        .catch(function () {
          flash("product-error", "Failed to save variant.");
        });
    });

    // Reset variant form
    var btnResetVariant = document.getElementById("btn-reset-variant");
    if (btnResetVariant) {
      btnResetVariant.addEventListener("click", function () {
        variantForm.reset();
        variantForm.querySelector('[name="variantId"]').value = "";
        document
          .getElementById("variant-form-title")
          .textContent = "Add Variant";
      });
    }
  }

  // ─── Image management ──────────────────────────────────────
  var imageForm = document.getElementById("image-form");
  if (imageForm) {
    var pid =
      document.getElementById("product-form") &&
      document.getElementById("product-form").dataset.productId;

    imageForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var url = imageForm.querySelector('[name="url"]').value;
      var altText = imageForm.querySelector('[name="altText"]').value;
      if (!url) return;

      // Collect existing images from DOM
      var images = [];
      document.querySelectorAll("[data-image-card]").forEach(function (card) {
        images.push({
          url: card.dataset.url,
          altText: card.dataset.altText || undefined,
        });
      });
      images.push({ url: url, altText: altText || undefined });

      fetch("/api/admin/products/" + pid + "/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: images }),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("Save failed");
          flash("product-success", "Image added.");
          setTimeout(function () {
            location.reload();
          }, 600);
        })
        .catch(function () {
          flash("product-error", "Failed to save images.");
        });
    });

    // Remove image
    document.querySelectorAll(".btn-remove-image").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = btn.closest("[data-image-card]");
        var images = [];
        document.querySelectorAll("[data-image-card]").forEach(function (c) {
          if (c !== card) {
            images.push({
              url: c.dataset.url,
              altText: c.dataset.altText || undefined,
            });
          }
        });

        fetch("/api/admin/products/" + pid + "/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: images }),
        })
          .then(function (r) {
            if (!r.ok) throw new Error("Remove failed");
            card.remove();
            flash("product-success", "Image removed.");
          })
          .catch(function () {
            flash("product-error", "Failed to remove image.");
          });
      });
    });
  }
})();
