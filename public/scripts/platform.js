// Platform store management client-side logic

document.addEventListener("DOMContentLoaded", () => {
  let flashTimeout;
  const flashId = "platform-flash-banner";
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
      const data = {
        name: createForm.querySelector('[name="name"]').value,
        slug: createForm.querySelector('[name="slug"]').value,
      };
      try {
        const res = await fetch("/api/platform/stores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (res.ok) {
          window.location.href = "/platform/dashboard";
        } else {
          showFlash(json.error || "Failed to create store");
        }
      } catch {
        showFlash("Network error");
      }
    });
  }

  // Branding form
  const brandingForm = document.getElementById("branding-form");
  if (brandingForm) {
    const storeId = brandingForm.dataset.storeId;
    brandingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const res = await fetch("/api/platform/stores/" + storeId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: brandingForm.querySelector('[name="name"]').value,
          primaryColor: brandingForm.querySelector('[name="primaryColor"]').value,
          secondaryColor: brandingForm.querySelector('[name="secondaryColor"]').value,
        }),
      });
      if (res.ok) location.reload();
      else showFlash("Failed to save");
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
        location.reload();
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
          showFlash("Logo updated", "success");
          setTimeout(() => location.reload(), 500);
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
        location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        showFlash(data.error || "Failed to send invitation");
      }
    });
  }
});
