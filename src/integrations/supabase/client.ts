
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://boncletesuahajikgrrz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbmNsZXRlc3VhaGFqaWtncnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTI2MTcwNzAsImV4cCI6MjAyODE5MzA3MH0.M2S3cWfzjovQK91nRQvGBEmM04yoLvuuPjw-QUU89mo";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
