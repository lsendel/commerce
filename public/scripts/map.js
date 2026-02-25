// MapLibre GL JS venue map initialization

document.addEventListener("DOMContentLoaded", () => {
  const mapContainer = document.getElementById("venue-map");
  if (!mapContainer || typeof maplibregl === "undefined") return;

  const venuesData = JSON.parse(mapContainer.dataset.venues || "[]");
  const zoom = Number(mapContainer.dataset.zoom || "12");

  if (venuesData.length === 0) {
    const msg = document.createElement("p");
    msg.className = "flex items-center justify-center h-full text-gray-500";
    msg.textContent = "No venue locations available";
    mapContainer.appendChild(msg);
    return;
  }

  // Calculate center from venues
  const center = venuesData.reduce(
    (acc, v) => [acc[0] + v.lng / venuesData.length, acc[1] + v.lat / venuesData.length],
    [0, 0]
  );

  const map = new maplibregl.Map({
    container: "venue-map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: center,
    zoom: zoom,
  });

  map.addControl(new maplibregl.NavigationControl());

  // Add markers for each venue
  venuesData.forEach((venue) => {
    const popupEl = document.createElement("div");
    popupEl.className = "p-2";

    const title = document.createElement("h3");
    title.className = "font-semibold text-sm";
    title.textContent = venue.name;
    popupEl.appendChild(title);

    if (venue.address) {
      const addr = document.createElement("p");
      addr.className = "text-xs text-gray-600";
      addr.textContent = venue.address;
      popupEl.appendChild(addr);
    }

    if (venue.slug) {
      const link = document.createElement("a");
      link.href = "/venues/" + encodeURIComponent(venue.slug);
      link.className = "text-xs text-indigo-600";
      link.textContent = "View details";
      popupEl.appendChild(link);
    }

    const popup = new maplibregl.Popup({ offset: 25 }).setDOMContent(popupEl);

    new maplibregl.Marker()
      .setLngLat([venue.lng, venue.lat])
      .setPopup(popup)
      .addTo(map);
  });

  // Fit bounds if multiple venues
  if (venuesData.length > 1) {
    const bounds = new maplibregl.LngLatBounds();
    venuesData.forEach((v) => bounds.extend([v.lng, v.lat]));
    map.fitBounds(bounds, { padding: 50 });
  }

  // "Near Me" button
  const nearMeBtn = document.getElementById("near-me-btn");
  if (nearMeBtn) {
    nearMeBtn.addEventListener("click", () => {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
      }

      nearMeBtn.textContent = "Locating...";
      nearMeBtn.disabled = true;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          map.flyTo({ center: [longitude, latitude], zoom: 13 });

          // Add user marker
          const userPopupEl = document.createElement("p");
          userPopupEl.className = "text-sm font-medium";
          userPopupEl.textContent = "You are here";

          new maplibregl.Marker({ color: "#4F46E5" })
            .setLngLat([longitude, latitude])
            .setPopup(new maplibregl.Popup().setDOMContent(userPopupEl))
            .addTo(map);

          try {
            const res = await fetch(
              "/api/venues/nearby?lat=" + latitude + "&lng=" + longitude + "&r=50"
            );
            const data = await res.json();
            nearMeBtn.textContent =
              data.venues && data.venues.length > 0
                ? data.venues.length + " venues nearby"
                : "No venues nearby";
          } catch {
            nearMeBtn.textContent = "Find Near Me";
          }
          nearMeBtn.disabled = false;
        },
        () => {
          alert("Unable to get your location");
          nearMeBtn.textContent = "Find Near Me";
          nearMeBtn.disabled = false;
        }
      );
    });
  }
});
