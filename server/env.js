// Loaded first (before db.js) so DATABASE_URL etc. exist by the time anything reads them.
// ESM evaluates imports before the importing module's body, so env loading must live
// in its own module that other server modules import at the very top.
import dotenv from 'dotenv'

// Local dev secrets. dotenv never overrides vars already in process.env, so on Render
// (where these come from the dashboard) both calls are harmless no-ops.
dotenv.config({ path: '.env.local' })
dotenv.config()
