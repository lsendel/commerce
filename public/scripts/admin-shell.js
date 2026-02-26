/**
 * Admin shell interactions — sidebar toggle, dropdown close.
 */
(function () {
  "use strict";

  var sidebar = document.getElementById("admin-sidebar");
  var overlay = document.getElementById("admin-sidebar-overlay");
  var toggleBtn = document.getElementById("admin-sidebar-toggle");

  function openSidebar() {
    if (!sidebar || !overlay) return;
    sidebar.classList.remove("hidden");
    sidebar.classList.add("fixed", "inset-y-0", "left-0", "z-50", "flex", "flex-col", "w-64");
    overlay.classList.remove("hidden");
  }

  function closeSidebar() {
    if (!sidebar || !overlay) return;
    sidebar.classList.add("hidden");
    sidebar.classList.remove("fixed", "inset-y-0", "left-0", "z-50", "flex", "flex-col", "w-64");
    overlay.classList.add("hidden");
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      var isHidden = sidebar && sidebar.classList.contains("hidden");
      if (isHidden) {
        openSidebar();
      } else {
        closeSidebar();
      }
    });
  }

  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }

  // Close sidebar on Escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay && !overlay.classList.contains("hidden")) {
      closeSidebar();
    }
  });

  // Close user dropdown on outside click
  var dropdown = document.getElementById("admin-user-dropdown");
  if (dropdown) {
    document.addEventListener("click", function (e) {
      if (!dropdown.contains(e.target)) {
        dropdown.removeAttribute("open");
      }
    });
  }
})();
