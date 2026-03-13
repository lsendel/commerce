// Affiliate program client-side logic

document.addEventListener("DOMContentLoaded", () => {
  let flashTimeout;
  const flashId = "affiliates-flash-banner";
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    const date = new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString();
  }

  function renderLinkRow(link) {
    return (
      '<tr data-affiliate-link-row data-link-id="' +
      escapeHtml(link.id) +
      '">' +
      '<td class="px-6 py-4 text-sm truncate max-w-xs text-gray-900 dark:text-gray-100">' +
      escapeHtml(link.targetUrl || "") +
      "</td>" +
      '<td class="px-6 py-4"><code class="text-xs bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">' +
      escapeHtml(link.shortCode || "") +
      "</code></td>" +
      '<td class="px-6 py-4 text-sm">' +
      Number(link.clickCount || 0) +
      "</td>" +
      '<td class="px-6 py-4 text-sm text-gray-500">' +
      escapeHtml(formatDate(link.createdAt)) +
      "</td>" +
      "</tr>"
    );
  }

  function showFlash(message, type = "error") {
    let banner = document.getElementById(flashId);
    if (!banner) {
      banner = document.createElement("div");
      banner.id = flashId;
      banner.className = "fixed top-4 right-4 z-50 max-w-sm rounded-lg px-4 py-3 text-sm font-medium shadow-lg";
      document.body.appendChild(banner);
    }
    banner.textContent = message;
    banner.classList.remove("bg-red-50", "text-red-700", "border", "border-red-200", "bg-emerald-50", "text-emerald-700", "border-emerald-200", "hidden");
    if (type === "success") {
      banner.classList.add("bg-emerald-50", "text-emerald-700", "border", "border-emerald-200");
    } else {
      banner.classList.add("bg-red-50", "text-red-700", "border", "border-red-200");
    }
    clearTimeout(flashTimeout);
    flashTimeout = setTimeout(() => banner.classList.add("hidden"), 4000);
  }

  function showAffiliateRegisterSuccess(data) {
    const successCard = document.getElementById("affiliate-register-success");
    if (!successCard) return;

    const codeEl = document.getElementById("affiliate-register-code");
    const storefrontRow = document.getElementById("affiliate-register-storefront-row");
    const storefrontLink = document.getElementById("affiliate-register-storefront-link");
    const referralCode = data && data.referralCode ? String(data.referralCode) : "--";
    const customSlug = data && data.customSlug ? String(data.customSlug) : "";

    if (codeEl) codeEl.textContent = referralCode;
    if (storefrontRow && storefrontLink) {
      if (customSlug) {
        storefrontLink.setAttribute("href", "/creators/" + encodeURIComponent(customSlug));
        storefrontRow.classList.remove("hidden");
      } else {
        storefrontRow.classList.add("hidden");
      }
    }
    successCard.classList.remove("hidden");
  }

  // Register form
  const registerForm = document.getElementById("affiliate-register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const slugInput = registerForm.querySelector('[name="customSlug"]');
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const slug = slugInput ? slugInput.value.trim() : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Registering...";
      }
      try {
        const res = await fetch("/api/affiliates/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customSlug: slug || undefined }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          registerForm.classList.add("hidden");
          showAffiliateRegisterSuccess(data.affiliate || {});
          showFlash("Affiliate profile created", "success");
        } else {
          showFlash(data.error || "Registration failed");
        }
      } catch {
        showFlash("Network error");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Register as Affiliate";
        }
      }
    });
  }

  // Create link form
  const createLinkForm = document.getElementById("create-link-form");
  if (createLinkForm) {
    createLinkForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const targetUrlInput = createLinkForm.querySelector('[name="targetUrl"]');
      const targetUrl = targetUrlInput ? targetUrlInput.value : "";
      const submitBtn = createLinkForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Creating...";
      }
      try {
        const res = await fetch("/api/affiliates/links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUrl }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showFlash(data.error || "Failed to create link");
          return;
        }

        const tbody = document.getElementById("affiliate-links-body");
        const emptyState = document.getElementById("affiliate-links-empty");
        if (tbody && data.link) {
          tbody.insertAdjacentHTML("afterbegin", renderLinkRow(data.link));
          if (emptyState) emptyState.classList.add("hidden");
        }
        if (targetUrlInput) targetUrlInput.value = "";
        showFlash("Tracking link created", "success");
      } catch {
        showFlash("Network error");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Create";
        }
      }
    });
  }
});
