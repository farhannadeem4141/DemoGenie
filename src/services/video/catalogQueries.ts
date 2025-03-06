
import { supabase } from "@/integrations/supabase/client";

export async function queryVideosWithCatalogTag() {
  console.log("Running direct catalog query...");
  
  const { data, error } = await supabase
    .from('Videos')
    .select('*')
    .or('video_tag1.eq.catalog,video_tag2.eq.catalog,video_tag3.eq.catalog');
  
  console.log("Direct catalog query results:", data);
  console.log("Direct catalog query error:", error);
  
  // Let's try a simple select to verify connection
  const { data: allData, error: allError } = await supabase
    .from('Videos')
    .select('*');
    
  console.log("All videos query results:", allData);
  console.log("All videos query error:", allError);
  
  return { success: !error, data, error };
}
