
import { supabase } from "@/integrations/supabase/client";

export async function queryVideosWithCatalogTag() {
  console.log("Running direct catalog query...");
  
  // Let's try a simple count query first to verify there's data
  const { count, error: countError } = await supabase
    .from('Videos')
    .select('*', { count: 'exact', head: true });
  
  console.log("Total records in Videos table:", count);
  console.log("Count error:", countError);
  
  // Original query with better logging
  const { data, error } = await supabase
    .from('Videos')
    .select('*')
    .or('video_tag1.eq.catalog,video_tag2.eq.catalog,video_tag3.eq.catalog');
  
  console.log("Direct catalog query results:", data);
  console.log("Direct catalog query error:", error);
  
  // Try without the OR filter to see if we can get any data
  const { data: allData, error: allError } = await supabase
    .from('Videos')
    .select('*');
    
  console.log("All videos query results:", allData);
  console.log("All videos query error:", allError);
  
  // Check for case sensitivity issues
  const { data: caseInsensitiveData, error: caseInsensitiveError } = await supabase
    .from('Videos')
    .select('*')
    .or('video_tag1.ilike.%catalog%,video_tag2.ilike.%catalog%,video_tag3.ilike.%catalog%');
  
  console.log("Case insensitive catalog query results:", caseInsensitiveData);
  console.log("Case insensitive catalog query error:", caseInsensitiveError);
  
  return { success: !error, data, error };
}
