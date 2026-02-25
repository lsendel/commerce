// Platform store management client-side logic

document.addEventListener("DOMContentLoaded", () => {
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
          window.location.href =
            "/platform/stores/" + json.id + "/dashboard";
        } else {
          alert(json.error || "Failed to create store");
        }
      } catch {
        alert("Network error");
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
      else alert("Failed to save");
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
      else alert("Failed to start Stripe onboarding");
    });
  }

  // Remove member buttons
  document.querySelectorAll(".remove-member").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const userId = btn.dataset.userId;
      const storeId = btn.dataset.storeId;
      if (!confirm("Remove this member?")) return;
      await fetch(
        "/api/platform/stores/" + storeId + "/members/" + userId,
        { method: "DELETE" }
      );
      location.reload();
    });
  });

  // Add member form
  const addMemberForm = document.getElementById("add-member-form");
  if (addMemberForm) {
    const storeId = addMemberForm.dataset.storeId;
    addMemberForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const res = await fetch(
        "/api/platform/stores/" + storeId + "/members",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: addMemberForm.querySelector('[name="email"]').value,
            role: addMemberForm.querySelector('[name="role"]').value,
          }),
        }
      );
      if (res.ok) location.reload();
      else alert("Failed to add member");
    });
  }
});
