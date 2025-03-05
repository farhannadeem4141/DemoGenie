
import { supabase } from "@/integrations/supabase/client";

export interface VideoSearchResult {
  success: boolean;
  data: any[] | null;
  errorReason?: string;
  searchDetails?: {
    keywordUsed: string;
    matchType?: 'exact' | 'partial' | 'none';
    searchMethod?: string;
  };
}

export async function searchVideosByKeyword(keyword: string): Promise<VideoSearchResult> {
  if (!keyword) {
    return { 
      success: false, 
      data: [], 
      errorReason: "No keyword provided",
      searchDetails: {
        keywordUsed: "",
        matchType: 'none',
        searchMethod: "empty search"
      }
    };
  }
  
  console.log("Searching videos with keyword:", keyword);
  
  try {
    // Normalize the keyword - only trim extra spaces but preserve case
    const trimmedKeyword = keyword.trim();
    
    // Try exact matches first (case-insensitive)
    const { data: exactMatches, error: exactMatchError } = await supabase
      .from('Videos')
      .select('*')
      .or(`video_tag1.ilike.${trimmedKeyword},video_tag2.ilike.${trimmedKeyword},video_tag3.ilike.${trimmedKeyword}`);
    
    if (exactMatchError) {
      console.error('Error searching videos (exact match):', exactMatchError);
      return {
        success: false,
        data: null,
        errorReason: `Database error during exact match search: ${exactMatchError.message}`,
        searchDetails: {
          keywordUsed: trimmedKeyword,
          matchType: 'none',
          searchMethod: "exact match"
        }
      };
    } 
    
    if (exactMatches && exactMatches.length > 0) {
      console.log("Found exact matches in video tags:", exactMatches);
      return {
        success: true,
        data: exactMatches,
        searchDetails: {
          keywordUsed: trimmedKeyword,
          matchType: 'exact',
          searchMethod: "tag exact match"
        }
      };
    }
    
    // If no exact matches, try partial matches (case-insensitive)
    const { data: partialMatches, error: partialMatchError } = await supabase
      .from('Videos')
      .select('*')
      .or(`video_tag1.ilike.%${trimmedKeyword}%,video_tag2.ilike.%${trimmedKeyword}%,video_tag3.ilike.%${trimmedKeyword}%`);
    
    if (partialMatchError) {
      console.error('Error searching videos (partial match):', partialMatchError);
      return {
        success: false,
        data: null,
        errorReason: `Database error during partial match search: ${partialMatchError.message}`,
        searchDetails: {
          keywordUsed: trimmedKeyword,
          matchType: 'none',
          searchMethod: "partial match"
        }
      };
    } 
    
    if (partialMatches && partialMatches.length > 0) {
      console.log("Found partial matches in video tags:", partialMatches);
      return {
        success: true,
        data: partialMatches,
        searchDetails: {
          keywordUsed: trimmedKeyword,
          matchType: 'partial',
          searchMethod: "tag partial match"
        }
      };
    }
    
    // If no matches found, log and return error
    console.log("No matches found for keyword:", trimmedKeyword);
    return {
      success: false,
      data: [],
      errorReason: `No videos found with tag matching "${trimmedKeyword}"`,
      searchDetails: {
        keywordUsed: trimmedKeyword,
        matchType: 'none',
        searchMethod: "exhausted all search methods"
      }
    };
  } catch (error: any) {
    console.error("Error in searchVideosByKeyword:", error);
    return {
      success: false,
      data: [],
      errorReason: `Unexpected error during search: ${error.message || "Unknown error"}`,
      searchDetails: {
        keywordUsed: keyword,
        matchType: 'none',
        searchMethod: "error occurred"
      }
    };
  }
}
