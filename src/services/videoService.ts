
import { supabase } from "@/integrations/supabase/client";

export async function searchVideosByKeyword(keyword: string): Promise<any[]> {
  if (!keyword) return [];
  
  console.log("Searching videos with keyword:", keyword);
  
  try {
    // Normalize the keyword - remove extra spaces and convert to lowercase
    const normalizedKeyword = keyword.toLowerCase().trim();
    
    // First try an exact match on any of the three tags
    const { data: exactMatches, error: exactMatchError } = await supabase
      .from('Videos')
      .select('*')
      .or(`video_tag1.ilike.${normalizedKeyword},video_tag2.ilike.${normalizedKeyword},video_tag3.ilike.${normalizedKeyword}`);
    
    if (exactMatchError) {
      console.error('Error searching videos (exact match):', exactMatchError);
    } else if (exactMatches && exactMatches.length > 0) {
      console.log("Found exact matches in video tags:", exactMatches);
      return exactMatches;
    }
    
    // If no exact matches, try partial matches
    const { data: partialMatches, error: partialMatchError } = await supabase
      .from('Videos')
      .select('*')
      .or(`video_tag1.ilike.%${normalizedKeyword}%,video_tag2.ilike.%${normalizedKeyword}%,video_tag3.ilike.%${normalizedKeyword}%`);
    
    if (partialMatchError) {
      console.error('Error searching videos (partial match):', partialMatchError);
    } else if (partialMatches && partialMatches.length > 0) {
      console.log("Found partial matches in video tags:", partialMatches);
      return partialMatches;
    }
    
    // If no matches found, log and return empty array
    console.log("No matches found for keyword:", normalizedKeyword);
    return [];
  } catch (error) {
    console.error("Error in searchVideosByKeyword:", error);
    return [];
  }
}
