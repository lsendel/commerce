import type { FC } from "hono/jsx";

interface VenueListProps {
  venues: any[];
}

export const VenueListPage: FC<VenueListProps> = ({ venues }) => {
  return (
    <div class="max-w-6xl mx-auto py-8 px-4">
      <h1 class="text-3xl font-bold mb-8">Venues</h1>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Map */}
        <div
          id="venue-map"
          class="h-96 lg:h-full min-h-[400px] rounded-lg border bg-gray-100"
          data-venues={JSON.stringify(
            venues
              .filter((v: any) => v.latitude && v.longitude)
              .map((v: any) => ({
                id: v.id,
                name: v.name,
                lat: Number(v.latitude),
                lng: Number(v.longitude),
                address: v.address,
                slug: v.slug,
              })),
          )}
        />

        {/* List */}
        <div class="space-y-4">
          <div class="mb-4">
            <button
              id="near-me-btn"
              class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
            >
              Find Near Me
            </button>
          </div>

          {venues.map((v: any) => (
            <a
              href={`/venues/${v.slug}`}
              class="block bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <h3 class="font-semibold text-lg">{v.name}</h3>
              <p class="text-sm text-gray-600 mt-1">
                {v.address}, {v.city}
                {v.state ? `, ${v.state}` : ""}, {v.country}
              </p>
              {v.capacity && (
                <p class="text-xs text-gray-500 mt-1">
                  Capacity: {v.capacity}
                </p>
              )}
              {v.amenities && (v.amenities as string[]).length > 0 && (
                <div class="flex gap-1 mt-2">
                  {(v.amenities as string[]).slice(0, 4).map((a: string) => (
                    <span class="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </a>
          ))}
          {venues.length === 0 && (
            <p class="text-gray-500 text-center py-8">No venues found.</p>
          )}
        </div>
      </div>

      <script src="https://unpkg.com/maplibre-gl@3/dist/maplibre-gl.js" />
      <link
        rel="stylesheet"
        href="https://unpkg.com/maplibre-gl@3/dist/maplibre-gl.css"
      />
      <script src="/scripts/map.js" />
    </div>
  );
};
