
import { supabase } from "@/integrations/supabase/client";

export async function searchVideosByKeyword(keyword: string): Promise<any[]> {
  if (!keyword) return [];
  
  const { data, error } = await supabase
    .from('Videos')
    .select('*')
    .ilike('video_tag1', `%${keyword}%`);
    
  if (error) {
    console.error('Error searching videos:', error);
    return [];
  }
  
  return data || [];
}
