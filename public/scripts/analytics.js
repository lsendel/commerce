/**
 * Lightweight page-level analytics hooks.
 * Relies on window.petm8Track being defined by layout.
 */
(function () {
  "use strict";

  function trackOnce(key, cb) {
    try {
      var storageKey = "petm8-track-once:" + key;
      if (sessionStorage.getItem(storageKey) === "1") return;
      cb();
      sessionStorage.setItem(storageKey, "1");
    } catch (_) {
      cb();
    }
  }

  function initCatalogTracking() {
    if (!window.petm8Track) return;
    if (window.location.pathname !== "/products") return;

    var params = new URLSearchParams(window.location.search);
    var search = (params.get("search") || "").trim();
    var collection = (params.get("collection") || "").trim();
    var totalProducts = 0;

    var root = document.getElementById("product-list-root");
    if (root && root.dataset && root.dataset.total) {
      totalProducts = Number(root.dataset.total) || 0;
    }

    if (search) {
      trackOnce(
        "search:" + window.location.pathname + "?" + params.toString(),
        function () {
          window.petm8Track("search", {
            query: search,
            resultsCount: totalProducts,
          });
        },
      );
    }

    if (collection) {
      trackOnce(
        "collection_view:" + window.location.pathname + "?" + params.toString(),
        function () {
          window.petm8Track("collection_view", {
            collectionSlug: collection,
            resultsCount: totalProducts,
          });
        },
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCatalogTracking, {
      once: true,
    });
  } else {
    initCatalogTracking();
  }
})();
