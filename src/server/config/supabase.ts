import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/server/config/env";

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

export { supabase };
