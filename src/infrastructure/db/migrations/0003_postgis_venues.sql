-- Custom migration: PostGIS extension + spatial column
-- Note: Neon requires PostGIS to be enabled per-project via the Neon console.
-- The venue repository's findNearby() uses raw SQL with lat/lng DECIMAL columns
-- as a fallback until PostGIS is configured.

-- Uncomment below once PostGIS is enabled on the Neon project:
-- CREATE EXTENSION IF NOT EXISTS postgis;
-- ALTER TABLE venues ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);
-- CREATE INDEX IF NOT EXISTS venues_location_gist_idx ON venues USING GIST (location);
