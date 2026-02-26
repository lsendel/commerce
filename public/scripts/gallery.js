/**
 * Product image gallery — keyboard nav, thumbnails, prev/next arrows.
 * Loaded on product detail pages.
 */
(function () {
  "use strict";

  function initGallery() {
    var gallery = document.querySelector("[data-image-gallery]");
    if (!gallery) return;

    var raw = gallery.getAttribute("data-gallery-images");
    if (!raw) return;

    var images;
    try {
      images = JSON.parse(raw);
    } catch (_) {
      return;
    }

    if (!images || images.length < 2) return;

    var currentIndex = 0;
    var mainImg = gallery.querySelector("[data-gallery-main]");
    var prevBtn = gallery.querySelector("[data-gallery-prev]");
    var nextBtn = gallery.querySelector("[data-gallery-next]");
    var counter = gallery.querySelector("[data-gallery-counter]");
    var thumbContainer = gallery.querySelector("[data-gallery-thumbs]");

    if (!mainImg) return;

    function goTo(index) {
      if (index < 0) index = images.length - 1;
      if (index >= images.length) index = 0;

      // Fade transition
      mainImg.style.opacity = "0";

      setTimeout(function () {
        mainImg.src = images[index].url;
        mainImg.alt = images[index].alt || "";
        mainImg.style.opacity = "1";
      }, 150);

      currentIndex = index;

      // Update counter
      if (counter) {
        counter.textContent = String(index + 1);
      }

      // Update thumbnail active states
      if (thumbContainer) {
        var thumbs = thumbContainer.querySelectorAll("[data-gallery-thumb]");
        thumbs.forEach(function (thumb) {
          var thumbIdx = parseInt(thumb.getAttribute("data-gallery-thumb"), 10);
          if (thumbIdx === index) {
            thumb.className = thumb.className
              .replace("border-gray-200", "border-brand-500")
              .replace("hover:border-gray-300", "ring-2 ring-brand-200");
            if (thumb.className.indexOf("border-brand-500") === -1) {
              thumb.className = thumb.className.replace(
                /border-\S+/g,
                "border-brand-500"
              );
            }
            if (thumb.className.indexOf("ring-2") === -1) {
              thumb.className += " ring-2 ring-brand-200";
            }
          } else {
            thumb.className = thumb.className
              .replace("border-brand-500", "border-gray-200")
              .replace("ring-2 ring-brand-200", "hover:border-gray-300")
              .replace("ring-2", "")
              .replace("ring-brand-200", "");
          }
        });
      }
    }

    // Prev/Next buttons
    if (prevBtn) {
      prevBtn.addEventListener("click", function (e) {
        e.preventDefault();
        goTo(currentIndex - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function (e) {
        e.preventDefault();
        goTo(currentIndex + 1);
      });
    }

    // Thumbnail clicks
    if (thumbContainer) {
      thumbContainer.addEventListener("click", function (e) {
        var thumb = e.target.closest("[data-gallery-thumb]");
        if (!thumb) return;
        var idx = parseInt(thumb.getAttribute("data-gallery-thumb"), 10);
        if (!isNaN(idx)) {
          goTo(idx);
        }
      });
    }

    // Keyboard navigation
    document.addEventListener("keydown", function (e) {
      // Only handle if gallery is visible / in viewport
      if (!gallery.offsetParent) return;

      // Don't intercept if user is typing in an input
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(currentIndex - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(currentIndex + 1);
      }
    });

    // Touch/swipe support
    var touchStartX = 0;
    var touchEndX = 0;
    var mainContainer = mainImg.parentElement;

    if (mainContainer) {
      mainContainer.addEventListener(
        "touchstart",
        function (e) {
          touchStartX = e.changedTouches[0].screenX;
        },
        { passive: true }
      );

      mainContainer.addEventListener(
        "touchend",
        function (e) {
          touchEndX = e.changedTouches[0].screenX;
          var diff = touchStartX - touchEndX;
          if (Math.abs(diff) > 50) {
            if (diff > 0) {
              goTo(currentIndex + 1);
            } else {
              goTo(currentIndex - 1);
            }
          }
        },
        { passive: true }
      );
    }
  }

  document.addEventListener("DOMContentLoaded", initGallery);
})();
