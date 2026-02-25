/**
 * Booking interactivity — loaded on booking/event pages.
 * Vanilla JS, async/await, fetch API.
 */
(function () {
  "use strict";

  var state = {
    productId: "",
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(), // 0-indexed
    selectedDate: null, // "YYYY-MM-DD"
    selectedSlotId: null,
    slots: [], // availability slots for selected date
    personTypes: {}, // { personTypeId: { name, price, quantity } }
  };

  // ─── Calendar ────────────────────────────────────────────────────────────────

  function initCalendar() {
    var calendar = document.querySelector("[data-booking-calendar]");
    if (!calendar) return;

    state.productId = calendar.getAttribute("data-product-id") || "";

    // Navigation buttons
    document.addEventListener("click", function (e) {
      var prevBtn = e.target.closest("[data-calendar-prev]");
      var nextBtn = e.target.closest("[data-calendar-next]");

      if (prevBtn) {
        e.preventDefault();
        state.currentMonth--;
        if (state.currentMonth < 0) {
          state.currentMonth = 11;
          state.currentYear--;
        }
        renderCalendar();
        fetchAvailabilityForMonth();
      }

      if (nextBtn) {
        e.preventDefault();
        state.currentMonth++;
        if (state.currentMonth > 11) {
          state.currentMonth = 0;
          state.currentYear++;
        }
        renderCalendar();
        fetchAvailabilityForMonth();
      }
    });

    // Day click
    document.addEventListener("click", function (e) {
      var dayBtn = e.target.closest("[data-calendar-day]");
      if (!dayBtn) return;

      e.preventDefault();
      if (dayBtn.disabled) return;

      var dateStr = dayBtn.getAttribute("data-calendar-day");
      state.selectedDate = dateStr;

      // Highlight selected day
      document.querySelectorAll("[data-calendar-day]").forEach(function (d) {
        d.classList.remove("bg-brand-500", "text-white");
        d.classList.add("hover:bg-gray-100");
      });
      dayBtn.classList.add("bg-brand-500", "text-white");
      dayBtn.classList.remove("hover:bg-gray-100");

      fetchSlotsForDate(dateStr);
    });

    renderCalendar();
    fetchAvailabilityForMonth();
  }

  function renderCalendar() {
    var monthLabel = document.querySelector("[data-calendar-month-label]");
    var grid = document.querySelector("[data-calendar-grid]");
    if (!monthLabel || !grid) return;

    var monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    monthLabel.textContent = monthNames[state.currentMonth] + " " + state.currentYear;

    // Build day cells using DOM methods
    var firstDay = new Date(state.currentYear, state.currentMonth, 1).getDay();
    var daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    // Clear grid
    while (grid.firstChild) {
      grid.removeChild(grid.firstChild);
    }

    // Day-of-week headers
    var dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    dayHeaders.forEach(function (d) {
      var header = document.createElement("div");
      header.className = "text-center text-xs font-medium text-gray-500 py-2";
      header.textContent = d;
      grid.appendChild(header);
    });

    // Empty cells before first day
    for (var i = 0; i < firstDay; i++) {
      grid.appendChild(document.createElement("div"));
    }

    // Day cells
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr =
        state.currentYear +
        "-" +
        String(state.currentMonth + 1).padStart(2, "0") +
        "-" +
        String(d).padStart(2, "0");
      var cellDate = new Date(state.currentYear, state.currentMonth, d);
      var isPast = cellDate < today;
      var isSelected = state.selectedDate === dateStr;
      var isToday = cellDate.getTime() === today.getTime();

      var wrapper = document.createElement("div");
      wrapper.className = "flex items-center justify-center";

      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = String(d);

      var baseClass =
        "w-10 h-10 rounded-full text-sm font-medium transition-colors duration-150 flex items-center justify-center mx-auto";

      if (isPast) {
        btn.disabled = true;
        btn.className = baseClass + " text-gray-300 cursor-not-allowed";
      } else {
        btn.setAttribute("data-calendar-day", dateStr);
        var activeClass = isSelected
          ? " bg-brand-500 text-white"
          : isToday
            ? " bg-brand-100 text-brand-700 hover:bg-brand-200"
            : " text-gray-700 hover:bg-gray-100";
        btn.className = baseClass + activeClass;
      }

      wrapper.appendChild(btn);
      grid.appendChild(wrapper);
    }
  }

  async function fetchAvailabilityForMonth() {
    if (!state.productId) return;

    var dateFrom =
      state.currentYear + "-" + String(state.currentMonth + 1).padStart(2, "0") + "-01";
    var lastDay = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
    var dateTo =
      state.currentYear +
      "-" +
      String(state.currentMonth + 1).padStart(2, "0") +
      "-" +
      String(lastDay).padStart(2, "0");

    try {
      var res = await fetch(
        "/api/bookings/availability?productId=" +
          encodeURIComponent(state.productId) +
          "&dateFrom=" +
          encodeURIComponent(dateFrom) +
          "&dateTo=" +
          encodeURIComponent(dateTo),
        { credentials: "same-origin" }
      );

      if (!res.ok) return;
      var data = await res.json();

      // Highlight dates with availability
      var availableDates = new Set();
      var items = data.items || data.data || data;
      if (Array.isArray(items)) {
        items.forEach(function (slot) {
          if (slot.date) {
            availableDates.add(slot.date.substring(0, 10));
          } else if (slot.startTime) {
            availableDates.add(slot.startTime.substring(0, 10));
          }
        });
      }

      document.querySelectorAll("[data-calendar-day]").forEach(function (btn) {
        var date = btn.getAttribute("data-calendar-day");
        if (availableDates.has(date)) {
          btn.classList.add("ring-2", "ring-brand-300");
        }
      });
    } catch (_) {}
  }

  // ─── Slots ───────────────────────────────────────────────────────────────────

  async function fetchSlotsForDate(dateStr) {
    var slotsContainer = document.querySelector("[data-booking-slots]");
    if (!slotsContainer) return;

    // Show loading spinner using DOM methods
    while (slotsContainer.firstChild) {
      slotsContainer.removeChild(slotsContainer.firstChild);
    }
    var loadingDiv = document.createElement("div");
    loadingDiv.className = "flex items-center justify-center py-8";
    var spinner = createSpinnerSvg("w-6 h-6 text-brand-500");
    loadingDiv.appendChild(spinner);
    slotsContainer.appendChild(loadingDiv);

    try {
      var res = await fetch(
        "/api/bookings/availability?productId=" +
          encodeURIComponent(state.productId) +
          "&dateFrom=" +
          encodeURIComponent(dateStr) +
          "&dateTo=" +
          encodeURIComponent(dateStr),
        { credentials: "same-origin" }
      );

      if (!res.ok) throw new Error("Failed to load slots");
      var data = await res.json();

      state.slots = data.items || data.data || data;
      if (!Array.isArray(state.slots)) state.slots = [];

      renderSlots(slotsContainer);
    } catch (err) {
      while (slotsContainer.firstChild) {
        slotsContainer.removeChild(slotsContainer.firstChild);
      }
      var msg = document.createElement("p");
      msg.className = "text-sm text-gray-500 text-center py-4";
      msg.textContent = "No available slots for this date.";
      slotsContainer.appendChild(msg);
    }
  }

  function renderSlots(container) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    if (state.slots.length === 0) {
      var msg = document.createElement("p");
      msg.className = "text-sm text-gray-500 text-center py-4";
      msg.textContent = "No available slots for this date.";
      container.appendChild(msg);
      return;
    }

    var gridDiv = document.createElement("div");
    gridDiv.className = "grid grid-cols-2 sm:grid-cols-3 gap-2";

    state.slots.forEach(function (slot) {
      var time = "";
      if (slot.startTime) {
        var d = new Date(slot.startTime);
        time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      var capacity =
        slot.remainingCapacity !== undefined ? slot.remainingCapacity : slot.capacity;
      var isFull = capacity !== undefined && capacity <= 0;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-slot-id", slot.id);
      if (isFull) btn.disabled = true;

      btn.className =
        "flex flex-col items-center px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-150 " +
        (isFull
          ? "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50"
          : "border-gray-200 text-gray-700 hover:border-brand-400 hover:bg-brand-50 cursor-pointer");

      var timeSpan = document.createElement("span");
      timeSpan.className = "font-semibold";
      timeSpan.textContent = time || "Available";
      btn.appendChild(timeSpan);

      if (capacity !== undefined) {
        var capSpan = document.createElement("span");
        capSpan.className = "text-xs text-gray-400";
        capSpan.textContent = capacity + " spots";
        btn.appendChild(capSpan);
      }

      gridDiv.appendChild(btn);
    });

    container.appendChild(gridDiv);

    // Slot selection handler
    container.querySelectorAll("[data-slot-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.selectedSlotId = btn.getAttribute("data-slot-id");

        // Highlight selected
        container.querySelectorAll("[data-slot-id]").forEach(function (s) {
          s.classList.remove("border-brand-500", "bg-brand-50");
          s.classList.add("border-gray-200");
        });
        btn.classList.add("border-brand-500", "bg-brand-50");
        btn.classList.remove("border-gray-200");

        showBookingForm();
      });
    });
  }

  function createSpinnerSvg(cls) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "animate-spin " + cls);
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

  // ─── Booking Form ────────────────────────────────────────────────────────────

  function showBookingForm() {
    var formSection = document.querySelector("[data-booking-form]");
    if (!formSection) return;

    formSection.classList.remove("hidden");

    // Scroll to form
    formSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function initPersonTypeControls() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-person-qty]");
      if (!btn) return;

      e.preventDefault();

      var action = btn.getAttribute("data-person-qty"); // "inc" or "dec"
      var typeId = btn.getAttribute("data-person-type-id");
      var priceStr = btn.getAttribute("data-person-price") || "0";
      var nameStr = btn.getAttribute("data-person-name") || "Person";
      var display = document.querySelector(
        '[data-person-qty-display][data-person-type-id="' + typeId + '"]'
      );
      var currentQty = display ? parseInt(display.textContent, 10) : 0;
      var newQty = action === "inc" ? currentQty + 1 : Math.max(0, currentQty - 1);

      if (display) {
        display.textContent = String(newQty);
      }

      state.personTypes[typeId] = {
        name: nameStr,
        price: parseFloat(priceStr),
        quantity: newQty,
      };

      updateBookingTotals();
    });
  }

  function updateBookingTotals() {
    var totalEl = document.querySelector("[data-booking-total]");
    if (!totalEl) return;

    var total = 0;
    Object.keys(state.personTypes).forEach(function (typeId) {
      var pt = state.personTypes[typeId];
      total += pt.price * pt.quantity;
    });

    totalEl.textContent = "$" + total.toFixed(2);

    // Enable/disable add to cart
    var addBtn = document.querySelector("[data-booking-add-to-cart]");
    if (addBtn) {
      var hasAny = Object.values(state.personTypes).some(function (pt) {
        return pt.quantity > 0;
      });
      addBtn.disabled = !hasAny;
    }
  }

  // ─── Add Booking to Cart ─────────────────────────────────────────────────────

  function initBookingAddToCart() {
    document.addEventListener("click", async function (e) {
      var btn = e.target.closest("[data-booking-add-to-cart]");
      if (!btn) return;

      e.preventDefault();
      if (btn.disabled) return;

      if (!state.selectedSlotId) {
        if (window.showToast) window.showToast("Please select a time slot", "error");
        return;
      }

      var personTypeQuantities = [];
      Object.keys(state.personTypes).forEach(function (typeId) {
        var pt = state.personTypes[typeId];
        if (pt.quantity > 0) {
          personTypeQuantities.push({
            personTypeId: typeId,
            quantity: pt.quantity,
          });
        }
      });

      if (personTypeQuantities.length === 0) {
        if (window.showToast) window.showToast("Please add at least one person", "error");
        return;
      }

      btn.disabled = true;
      var originalText = btn.textContent;
      btn.textContent = "";
      btn.appendChild(createSpinnerSvg("w-4 h-4"));
      btn.appendChild(document.createTextNode(" Adding..."));

      try {
        var res = await fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            availabilityId: state.selectedSlotId,
            personTypeQuantities: personTypeQuantities,
          }),
        });

        if (!res.ok) {
          var errData = await res.json().catch(function () {
            return {};
          });
          throw new Error(errData.error || "Failed to add booking to cart");
        }

        if (window.updateCartBadge) await window.updateCartBadge();
        if (window.showToast) window.showToast("Booking added to cart!", "success");
      } catch (err) {
        if (window.showToast) window.showToast(err.message || "Could not add booking", "error");
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  }

  // ─── Init ────────────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    initCalendar();
    initPersonTypeControls();
    initBookingAddToCart();
  });
})();
