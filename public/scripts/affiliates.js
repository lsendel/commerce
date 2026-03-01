// Affiliate program client-side logic

document.addEventListener("DOMContentLoaded", () => {
  let flashTimeout;
  const flashId = "affiliates-flash-banner";
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

  // Register form
  const registerForm = document.getElementById("affiliate-register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const slug = registerForm.querySelector('[name="customSlug"]').value;
      const res = await fetch("/api/affiliates/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customSlug: slug || undefined }),
      });
      if (res.ok) {
        window.location.href = "/affiliates";
      } else {
        const data = await res.json();
        showFlash(data.error || "Registration failed");
      }
    });
  }

  // Create link form
  const createLinkForm = document.getElementById("create-link-form");
  if (createLinkForm) {
    createLinkForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const res = await fetch("/api/affiliates/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl: createLinkForm.querySelector('[name="targetUrl"]').value,
        }),
      });
      if (res.ok) location.reload();
      else showFlash("Failed to create link");
    });
  }
});
