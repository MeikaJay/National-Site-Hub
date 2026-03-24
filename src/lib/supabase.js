import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://oglbamdzajbfsghtnphf.supabase.co";
const supabaseAnonKey = "sb_publishable_4IyvfbxyULrA79HgGlYDdw_rHtDdNtB";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);