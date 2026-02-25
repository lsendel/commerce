// Affiliate program client-side logic

document.addEventListener("DOMContentLoaded", () => {
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
        window.location.href = "/affiliates/dashboard";
      } else {
        const data = await res.json();
        alert(data.error || "Registration failed");
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
      else alert("Failed to create link");
    });
  }
});
