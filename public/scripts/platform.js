// Platform store management client-side logic

document.addEventListener("DOMContentLoaded", () => {
  let flashTimeout;
  const flashId = "platform-flash-banner";
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

  function buildStorefrontUrl(slug) {
    if (!slug || typeof slug !== "string") {
      return window.location.origin + "/products";
    }
    const hostname = window.location.hostname;
    const hostParts = hostname.split(".");
    if (hostParts.length < 2) {
      return window.location.origin + "/products";
    }
    let baseHostname = hostname;
    if (hostParts.length > 2) {
      baseHostname = hostParts.slice(1).join(".");
    }
    const port = window.location.port ? ":" + window.location.port : "";
    return window.location.protocol + "//" + slug + "." + baseHostname + port + "/products";
  }

  function revealCreateStoreSuccess(data) {
    const successCard = document.getElementById("create-store-success");
    if (!successCard) return;

    const nameEl = document.getElementById("create-store-success-name");
    const slugEl = document.getElementById("create-store-success-slug");
    const storefrontLink = document.getElementById("create-storefront-link");
    const dashboardLink = document.getElementById("create-store-dashboard-link");
    const settingsLink = document.getElementById("create-store-settings-link");

    if (nameEl) {
      nameEl.textContent = data.name ? String(data.name) : "Your store";
    }
    if (slugEl) {
      slugEl.textContent = data.slug ? String(data.slug) : "--";
    }
    if (storefrontLink && data.slug) {
      storefrontLink.setAttribute("href", buildStorefrontUrl(String(data.slug)));
    }
    if (dashboardLink) {
      dashboardLink.setAttribute("href", "/platform/dashboard");
    }
    if (settingsLink) {
      settingsLink.setAttribute("href", "/platform/settings");
    }

    successCard.classList.remove("hidden");
  }

  function renderPendingInvitation(invitation) {
    return (
      '<li class="flex items-center justify-between py-2 border-b border-amber-200 dark:border-amber-700 last:border-0" data-invitation-id="' +
      escapeHtml(invitation.id || "") +
      '">' +
      "<div>" +
      '<span class="text-sm font-medium text-gray-900 dark:text-gray-100">' +
      escapeHtml(invitation.email || "") +
      "</span>" +
      '<span class="ml-2 text-xs bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200 px-2 py-0.5 rounded">' +
      escapeHtml(invitation.role || "staff") +
      "</span>" +
      "</div>" +
      '<span class="text-xs text-gray-500">Expires ' +
      escapeHtml(formatDate(invitation.expiresAt)) +
      "</span>" +
      "</li>"
    );
  }

  function ensurePendingInvitationList() {
    let section = document.getElementById("pending-invitations-section");
    let list = document.getElementById("pending-invitations-list");
    if (section && list) return list;

    const inviteCard = document.getElementById("invite-member-form")?.closest("div");
    if (!inviteCard || !inviteCard.parentNode) return null;

    section = document.createElement("div");
    section.id = "pending-invitations-section";
    section.className =
      "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-6 mb-6";
    section.innerHTML =
      '<h2 class="text-lg font-semibold mb-3 text-amber-800 dark:text-amber-200">Pending Invitations</h2>' +
      '<ul id="pending-invitations-list" class="space-y-2"></ul>';
    inviteCard.parentNode.insertBefore(section, inviteCard.nextSibling);
    return document.getElementById("pending-invitations-list");
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

  // Create store form
  const createForm = document.getElementById("create-store-form");
  if (createForm) {
    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nameInput = createForm.querySelector('[name="name"]');
      const slugInput = createForm.querySelector('[name="slug"]');
      const primaryColorInput = createForm.querySelector('[name="primaryColor"]');
      const secondaryColorInput = createForm.querySelector('[name="secondaryColor"]');
      const logoInput = createForm.querySelector('[name="logo"]');
      const submitBtn = createForm.querySelector('button[type="submit"]');
      const data = {
        name: nameInput ? nameInput.value.trim() : "",
        slug: slugInput ? slugInput.value.trim().toLowerCase() : "",
      };
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Creating...";
      }
      try {
        const res = await fetch("/api/platform/stores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          const warnings = [];

          const brandingPayload = {};
          const primaryColor = primaryColorInput ? primaryColorInput.value : "";
          const secondaryColor = secondaryColorInput ? secondaryColorInput.value : "";
          if (primaryColor) brandingPayload.primaryColor = primaryColor;
          if (secondaryColor) brandingPayload.secondaryColor = secondaryColor;

          if (json.id && Object.keys(brandingPayload).length > 0) {
            const brandingRes = await fetch("/api/platform/stores/" + json.id, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(brandingPayload),
            });
            if (!brandingRes.ok) {
              warnings.push("Brand colors were not saved.");
            }
          }

          const logoFile = logoInput && logoInput.files ? logoInput.files[0] : null;
          if (json.id && logoFile) {
            const formData = new FormData();
            formData.append("logo", logoFile);
            const logoRes = await fetch("/api/platform/stores/" + json.id + "/logo", {
              method: "POST",
              body: formData,
            });
            if (!logoRes.ok) {
              warnings.push("Logo upload failed.");
            }
          }

          createForm.classList.add("hidden");
          revealCreateStoreSuccess({
            id: json.id,
            slug: json.slug || data.slug,
            name: data.name,
          });

          if (warnings.length > 0) {
            showFlash("Store created. " + warnings.join(" "), "success");
          } else {
            showFlash("Store created successfully", "success");
          }
        } else {
          showFlash(json.error || "Failed to create store");
        }
      } catch {
        showFlash("Network error");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Create Store";
        }
      }
    });
  }

  // Branding form
  const brandingForm = document.getElementById("branding-form");
  if (brandingForm) {
    const storeId = brandingForm.dataset.storeId;
    brandingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        name: brandingForm.querySelector('[name="name"]').value,
        primaryColor: brandingForm.querySelector('[name="primaryColor"]').value,
        secondaryColor: brandingForm.querySelector('[name="secondaryColor"]').value,
      };
      const submitBtn = brandingForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving...";
      }
      try {
        const res = await fetch("/api/platform/stores/" + storeId, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showFlash(data.error || "Failed to save");
          return;
        }
        const primaryValue = document.getElementById("primary-color-value");
        const secondaryValue = document.getElementById("secondary-color-value");
        if (primaryValue) primaryValue.textContent = payload.primaryColor;
        if (secondaryValue) secondaryValue.textContent = payload.secondaryColor;
        showFlash("Branding saved", "success");
      } catch {
        showFlash("Network error");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Save Branding";
        }
      }
    });
  }

  // Stripe Connect button
  const connectBtn = document.getElementById("connect-stripe-btn");
  if (connectBtn) {
    const storeId = connectBtn.dataset.storeId;
    connectBtn.addEventListener("click", async () => {
      const res = await fetch(
        "/api/platform/stores/" + storeId + "/connect/onboard",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }
      );
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else showFlash("Failed to start Stripe onboarding");
    });
  }

  // Remove member buttons
  document.querySelectorAll(".remove-member").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.userId;
      const storeId = btn.dataset.storeId;
      if (!confirm("Remove this member?")) return;
      const res = await fetch(
        "/api/platform/stores/" + storeId + "/members/" + userId,
        { method: "DELETE" }
      );
      if (res.ok) {
        const row = btn.closest("tr");
        if (row) row.remove();
        showFlash("Member removed", "success");
      } else {
        showFlash("Failed to remove member");
      }
    });
  });

  // Logo upload
  const logoForm = document.getElementById("logo-upload-form");
  if (logoForm) {
    const storeId = logoForm.dataset.storeId;
    const fileInput = logoForm.querySelector('input[name="logo"]');
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("logo", file);
      try {
        const res = await fetch("/api/platform/stores/" + storeId + "/logo", {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const preview = document.getElementById("store-logo-preview");
          if (preview && data.logoUrl) {
            preview.textContent = "";
            const img = document.createElement("img");
            img.src = data.logoUrl;
            img.alt = "Store logo";
            img.className = "w-full h-full object-cover";
            preview.appendChild(img);
          }
          showFlash("Logo updated", "success");
        } else {
          const data = await res.json().catch(() => ({}));
          showFlash(data.error || "Failed to upload logo");
        }
      } catch {
        showFlash("Network error");
      }
    });
  }

  // Invite member form
  const inviteMemberForm = document.getElementById("invite-member-form");
  if (inviteMemberForm) {
    const storeId = inviteMemberForm.dataset.storeId;
    inviteMemberForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const res = await fetch(
        "/api/platform/stores/" + storeId + "/invite",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: inviteMemberForm.querySelector('[name="email"]').value,
            role: inviteMemberForm.querySelector('[name="role"]').value,
          }),
        }
      );
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const invitation = data.invitation;
        if (invitation) {
          const list = ensurePendingInvitationList();
          if (list) {
            list.insertAdjacentHTML("afterbegin", renderPendingInvitation(invitation));
          }
        }
        inviteMemberForm.reset();
        showFlash("Invitation sent", "success");
      } else {
        const data = await res.json().catch(() => ({}));
        showFlash(data.error || "Failed to send invitation");
      }
    });
  }
});
