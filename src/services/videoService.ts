
import { supabase } from "@/integrations/supabase/client";

export async function searchVideosByKeyword(keyword: string): Promise<any[]> {
  if (!keyword) return [];
  
  console.log("Searching videos with keyword:", keyword);
  
  try {
    // Normalize the keyword - trim extra spaces but preserve case for matching
    const trimmedKeyword = keyword.trim();
    
    // Try exact matches first (case-insensitive)
    const { data: exactMatches, error: exactMatchError } = await supabase
      .from('Videos')
      .select('*')
      .or(`video_tag1.ilike.${trimmedKeyword},video_tag2.ilike.${trimmedKeyword},video_tag3.ilike.${trimmedKeyword}`);
    
    if (exactMatchError) {
      console.error('Error searching videos (exact match):', exactMatchError);
    } else if (exactMatches && exactMatches.length > 0) {
      console.log("Found exact matches in video tags:", exactMatches);
      return exactMatches;
    }
    
    // If no exact matches, try partial matches (case-insensitive)
    const { data: partialMatches, error: partialMatchError } = await supabase
      .from('Videos')
      .select('*')
      .or(`video_tag1.ilike.%${trimmedKeyword}%,video_tag2.ilike.%${trimmedKeyword}%,video_tag3.ilike.%${trimmedKeyword}%`);
    
    if (partialMatchError) {
      console.error('Error searching videos (partial match):', partialMatchError);
    } else if (partialMatches && partialMatches.length > 0) {
      console.log("Found partial matches in video tags:", partialMatches);
      return partialMatches;
    }
    
    // If no matches found, log and return empty array
    console.log("No matches found for keyword:", trimmedKeyword);
    return [];
  } catch (error) {
    console.error("Error in searchVideosByKeyword:", error);
    return [];
  }
}
