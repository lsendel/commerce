import type { FC } from "hono/jsx";

interface VenueDetailProps {
  venue: any;
  events: any[];
}

export const VenueDetailPage: FC<VenueDetailProps> = ({ venue, events }) => {
  return (
    <div class="max-w-4xl mx-auto py-8 px-4">
      <a href="/venues" class="text-indigo-600 hover:underline text-sm mb-4 block">
        &larr; All Venues
      </a>

      <h1 class="text-3xl font-bold mb-2">{venue.name}</h1>
      <p class="text-gray-600 mb-6">
        {venue.address}, {venue.city}
        {venue.state ? `, ${venue.state}` : ""}, {venue.country}{" "}
        {venue.postalCode}
      </p>

      {/* Map */}
      {venue.latitude && venue.longitude && (
        <div
          id="venue-map"
          class="h-64 rounded-lg border bg-gray-100 mb-6"
          data-venues={JSON.stringify([
            {
              id: venue.id,
              name: venue.name,
              lat: Number(venue.latitude),
              lng: Number(venue.longitude),
              address: venue.address,
            },
          ])}
          data-zoom="15"
        />
      )}

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Details */}
        <div class="space-y-4">
          {venue.description && (
            <div>
              <h2 class="text-lg font-semibold mb-2">About</h2>
              <p class="text-gray-700">{venue.description}</p>
            </div>
          )}

          {venue.capacity && (
            <div>
              <h3 class="text-sm font-medium text-gray-500">Capacity</h3>
              <p>{venue.capacity} people</p>
            </div>
          )}

          {venue.amenities && (venue.amenities as string[]).length > 0 && (
            <div>
              <h3 class="text-sm font-medium text-gray-500 mb-2">Amenities</h3>
              <div class="flex flex-wrap gap-2">
                {(venue.amenities as string[]).map((a: string) => (
                  <span class="bg-gray-100 px-3 py-1 rounded-full text-sm">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div class="space-y-1">
            {venue.contactEmail && (
              <p class="text-sm">
                <span class="text-gray-500">Email:</span>{" "}
                <a
                  href={`mailto:${venue.contactEmail}`}
                  class="text-indigo-600"
                >
                  {venue.contactEmail}
                </a>
              </p>
            )}
            {venue.contactPhone && (
              <p class="text-sm">
                <span class="text-gray-500">Phone:</span> {venue.contactPhone}
              </p>
            )}
          </div>
        </div>

        {/* Events at this venue */}
        <div>
          <h2 class="text-lg font-semibold mb-4">Events at This Venue</h2>
          {events.length === 0 ? (
            <p class="text-gray-500 text-sm">No upcoming events.</p>
          ) : (
            <ul class="space-y-3">
              {events.map((e: any) => (
                <li>
                  <a
                    href={`/events/${e.slug}`}
                    class="block bg-white border rounded-lg p-3 hover:shadow-md transition-shadow"
                  >
                    <h3 class="font-medium">{e.name}</h3>
                    <p class="text-sm text-gray-500 mt-1">
                      {e.nextDate ?? "See schedule"}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
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
