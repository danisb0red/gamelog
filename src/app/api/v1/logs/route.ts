/**
 * `POST /api/v1/logs` — writing a log.
 *
 * Deliberately a re-export rather than a reimplementation. The original handler
 * already does the validation, the lazy game cache, the profile upsert and the
 * rating-aggregate refresh, and it now accepts a Bearer token like every other
 * route. Copying that logic under /v1 would create two places to fix a bug.
 */
export { POST, GET } from "../../logs/route";
export const dynamic = "force-dynamic";
