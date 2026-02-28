/**
 * Auth form handling — loaded on login/register pages.
 * Vanilla JS, async/await, fetch API.
 */
(function () {
  "use strict";

  // ─── Login Form ──────────────────────────────────────────────────────────────

  function initLoginForm() {
    var form = document.querySelector("[data-login-form]");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      clearErrors(form);

      var email = form.querySelector('[name="email"]');
      var password = form.querySelector('[name="password"]');
      var submitBtn = form.querySelector('[type="submit"]');

      if (!email || !password) return;

      var emailVal = email.value.trim();
      var passwordVal = password.value;

      // Client-side validation
      if (!emailVal) {
        showFieldError(email, "Email is required");
        return;
      }
      if (!passwordVal) {
        showFieldError(password, "Password is required");
        return;
      }

      submitBtn.disabled = true;
      submitBtn._origChildren = Array.from(submitBtn.childNodes).map(function (n) {
        return n.cloneNode(true);
      });
      submitBtn.textContent = "";
      submitBtn.appendChild(createSpinnerSvg("w-4 h-4 mr-1.5 inline"));
      submitBtn.appendChild(document.createTextNode(" Signing in..."));

      try {
        var sessionId = getAnalyticsSessionId();
        var res = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(sessionId ? { "x-session-id": sessionId } : {}),
          },
          credentials: "same-origin",
          body: JSON.stringify({ email: emailVal, password: passwordVal }),
        });

        if (!res.ok) {
          var errData = await res.json().catch(function () {
            return {};
          });
          throw new Error(errData.error || "Invalid email or password");
        }

        // Success — redirect
        var redirectUrl = getRedirectUrl() || "/account";
        window.location.href = redirectUrl;
      } catch (err) {
        submitBtn.disabled = false;
        restoreButton(submitBtn);
        showFormError(form, err.message || "Login failed. Please try again.");
      }
    });
  }

  // ─── Register Form ──────────────────────────────────────────────────────────

  function initRegisterForm() {
    var form = document.querySelector("[data-register-form]");
    if (!form) return;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      clearErrors(form);

      var name = form.querySelector('[name="name"]');
      var email = form.querySelector('[name="email"]');
      var password = form.querySelector('[name="password"]');
      var confirmPassword = form.querySelector('[name="confirmPassword"]');
      var submitBtn = form.querySelector('[type="submit"]');

      if (!email || !password) return;

      var nameVal = name ? name.value.trim() : "";
      var emailVal = email.value.trim();
      var passwordVal = password.value;
      var confirmVal = confirmPassword ? confirmPassword.value : passwordVal;

      // Client-side validation
      if (name && !nameVal) {
        showFieldError(name, "Name is required");
        return;
      }
      if (!emailVal) {
        showFieldError(email, "Email is required");
        return;
      }
      if (!passwordVal) {
        showFieldError(password, "Password is required");
        return;
      }
      if (passwordVal.length < 8) {
        showFieldError(password, "Password must be at least 8 characters");
        return;
      }
      if (confirmPassword && passwordVal !== confirmVal) {
        showFieldError(confirmPassword, "Passwords do not match");
        return;
      }

      submitBtn.disabled = true;
      submitBtn._origChildren = Array.from(submitBtn.childNodes).map(function (n) {
        return n.cloneNode(true);
      });
      submitBtn.textContent = "";
      submitBtn.appendChild(createSpinnerSvg("w-4 h-4 mr-1.5 inline"));
      submitBtn.appendChild(document.createTextNode(" Creating account..."));

      try {
        var payload = { email: emailVal, password: passwordVal };
        if (nameVal) payload.name = nameVal;
        var sessionId = getAnalyticsSessionId();

        var res = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(sessionId ? { "x-session-id": sessionId } : {}),
          },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          var errData = await res.json().catch(function () {
            return {};
          });
          throw new Error(errData.error || "Registration failed");
        }

        // Success — redirect
        var redirectUrl = getRedirectUrl() || "/account";
        window.location.href = redirectUrl;
      } catch (err) {
        submitBtn.disabled = false;
        restoreButton(submitBtn);
        showFormError(form, err.message || "Registration failed. Please try again.");
      }
    });
  }

  // ─── Logout Button ──────────────────────────────────────────────────────────

  function initLogoutButton() {
    document.addEventListener("click", async function (e) {
      var btn = e.target.closest("[data-logout-btn]");
      if (!btn) return;

      e.preventDefault();

      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
        });
      } catch (_) {
        // Even if logout request fails, redirect to home
      }

      window.location.href = "/";
    });
  }

  // ─── Spinner Helper ──────────────────────────────────────────────────────────

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

  function restoreButton(btn) {
    if (!btn._origChildren) return;
    btn.textContent = "";
    btn._origChildren.forEach(function (n) {
      btn.appendChild(n);
    });
    delete btn._origChildren;
  }

  // ─── Error Helpers ──────────────────────────────────────────────────────────

  function showFieldError(input, message) {
    // Add error styling to input
    input.classList.add("border-red-400");
    input.classList.remove("border-gray-300");

    // Create or update error message
    var existingError = input.parentElement.querySelector("[data-field-error]");
    if (existingError) {
      existingError.textContent = message;
      return;
    }

    var errorEl = document.createElement("p");
    errorEl.className = "text-xs text-red-500 mt-1";
    errorEl.setAttribute("data-field-error", "");
    errorEl.textContent = message;

    // Insert after the input (or after its wrapper)
    input.parentElement.appendChild(errorEl);
  }

  function showFormError(form, message) {
    var existing = form.querySelector("[data-form-error]");
    if (existing) {
      // Update text content safely
      var msgSpan = existing.querySelector("span");
      if (msgSpan) {
        msgSpan.textContent = message;
      } else {
        existing.textContent = message;
      }
      existing.classList.remove("hidden");
      return;
    }

    var errorEl = document.createElement("div");
    errorEl.className =
      "flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-sm text-red-600 mb-4";
    errorEl.setAttribute("data-form-error", "");

    // Build icon using DOM
    var icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "w-4 h-4 shrink-0");
    icon.setAttribute("fill", "none");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    var iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    iconPath.setAttribute("stroke-linecap", "round");
    iconPath.setAttribute("stroke-linejoin", "round");
    iconPath.setAttribute(
      "d",
      "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
    );
    icon.appendChild(iconPath);

    var textSpan = document.createElement("span");
    textSpan.textContent = message;

    errorEl.appendChild(icon);
    errorEl.appendChild(textSpan);

    // Insert at top of form
    form.insertBefore(errorEl, form.firstChild);
  }

  function clearErrors(form) {
    // Remove field errors
    form.querySelectorAll("[data-field-error]").forEach(function (el) {
      el.remove();
    });

    // Remove form-level error
    var formError = form.querySelector("[data-form-error]");
    if (formError) formError.classList.add("hidden");

    // Reset input borders
    form.querySelectorAll("input").forEach(function (input) {
      input.classList.remove("border-red-400");
      input.classList.add("border-gray-300");
    });
  }

  function getRedirectUrl() {
    var params = new URLSearchParams(window.location.search);
    var redirect = params.get("redirect");
    // Only allow relative URLs to prevent open redirect
    if (redirect && redirect.startsWith("/")) {
      return redirect;
    }
    return null;
  }

  function getAnalyticsSessionId() {
    var key = "petm8-analytics-session";
    try {
      return sessionStorage.getItem(key) || localStorage.getItem(key) || "";
    } catch (_) {
      return "";
    }
  }

  // ─── Init ────────────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    initLoginForm();
    initRegisterForm();
    initLogoutButton();
  });
})();
