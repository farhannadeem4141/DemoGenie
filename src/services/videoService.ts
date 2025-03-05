
import { supabase } from "@/integrations/supabase/client";

export async function searchVideosByKeyword(keyword: string): Promise<any[]> {
  if (!keyword) return [];
  
  console.log("Searching videos with keyword:", keyword);
  
  // First try exact match on tag1
  let { data: exactMatches, error: exactMatchError } = await supabase
    .from('Videos')
    .select('*')
    .ilike('video_tag1', keyword);
  
  if (exactMatchError) {
    console.error('Error searching videos (exact match):', exactMatchError);
  }
  
  if (exactMatches && exactMatches.length > 0) {
    console.log("Found exact matches:", exactMatches);
    return exactMatches;
  }
  
  // Then try partial match on tag1
  const { data: partialMatches, error: partialMatchError } = await supabase
    .from('Videos')
    .select('*')
    .ilike('video_tag1', `%${keyword}%`);
    
  if (partialMatchError) {
    console.error('Error searching videos (partial match):', partialMatchError);
    return [];
  }
  
  console.log("Found partial matches:", partialMatches);
  return partialMatches || [];
}
