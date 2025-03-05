
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
    // Normalize the keyword - trim extra spaces but preserve case for now
    const trimmedKeyword = keyword.trim();
    
    // Debug - log the exact query we're going to run
    console.log(`DEBUG: Searching for exact matches with keyword "${trimmedKeyword}"`);
    
    // Try exact matches first (case-insensitive)
    // FIXED: Using proper SQL syntax with single quotes around the search term
    const { data: exactMatches, error: exactMatchError } = await supabase
      .from('Videos')
      .select('*')
      .or(`video_tag1.ilike.'${trimmedKeyword}',video_tag2.ilike.'${trimmedKeyword}',video_tag3.ilike.'${trimmedKeyword}'`);
    
    console.log("DEBUG: Exact match query response:", exactMatches);
    
    if (exactMatchError) {
      console.error('Error searching videos (exact match):', exactMatchError);
      
      // Let's try a simpler approach since there might be a syntax error
      console.log("Trying alternative exact match approach");
      const { data: altExactMatches, error: altError } = await supabase
        .from('Videos')
        .select('*')
        .ilike('video_tag1', trimmedKeyword);
      
      if (altError) {
        console.error('Error with alternative exact match approach:', altError);
        return {
          success: false,
          data: null,
          errorReason: `Database error during exact match search: ${exactMatchError.message}`,
          searchDetails: {
            keywordUsed: trimmedKeyword,
            matchType: 'none',
            searchMethod: "exact match failed"
          }
        };
      }
      
      if (altExactMatches && altExactMatches.length > 0) {
        console.log("Found exact matches using alternative approach:", altExactMatches);
        return {
          success: true,
          data: altExactMatches,
          searchDetails: {
            keywordUsed: trimmedKeyword,
            matchType: 'exact',
            searchMethod: "tag exact match (alternative)"
          }
        };
      }
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
    
    // Debug - log the exact query for partial matches
    console.log(`DEBUG: Searching for partial matches with keyword "${trimmedKeyword}"`);
    
    // FIXED: Using proper SQL syntax with single quotes around the search term
    // If no exact matches, try partial matches (case-insensitive)
    const { data: partialMatches, error: partialMatchError } = await supabase
      .from('Videos')
      .select('*')
      .or(`video_tag1.ilike.'%${trimmedKeyword}%',video_tag2.ilike.'%${trimmedKeyword}%',video_tag3.ilike.'%${trimmedKeyword}%'`);
    
    console.log("DEBUG: Partial match query response:", partialMatches);
    
    if (partialMatchError) {
      console.error('Error searching videos (partial match):', partialMatchError);
      
      // Try alternative partial match approach
      console.log("Trying alternative partial match approach");
      const { data: altPartialMatches, error: altPartialError } = await supabase
        .from('Videos')
        .select('*')
        .ilike('video_tag1', `%${trimmedKeyword}%`);
      
      if (altPartialError) {
        console.error('Error with alternative partial match approach:', altPartialError);
        return {
          success: false,
          data: null,
          errorReason: `Database error during partial match search: ${partialMatchError.message}`,
          searchDetails: {
            keywordUsed: trimmedKeyword,
            matchType: 'none',
            searchMethod: "partial match failed"
          }
        };
      }
      
      if (altPartialMatches && altPartialMatches.length > 0) {
        console.log("Found partial matches using alternative approach:", altPartialMatches);
        return {
          success: true,
          data: altPartialMatches,
          searchDetails: {
            keywordUsed: trimmedKeyword,
            matchType: 'partial',
            searchMethod: "tag partial match (alternative)"
          }
        };
      }
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
    
    // If still no matches found, try direct query on each tag column individually
    console.log("Trying individual column search as last resort");
    
    const individualResults = await Promise.all([
      supabase.from('Videos').select('*').ilike('video_tag1', trimmedKeyword),
      supabase.from('Videos').select('*').ilike('video_tag2', trimmedKeyword),
      supabase.from('Videos').select('*').ilike('video_tag3', trimmedKeyword)
    ]);
    
    const combinedResults = individualResults
      .filter(result => !result.error && result.data && result.data.length > 0)
      .flatMap(result => result.data || []);
    
    if (combinedResults.length > 0) {
      console.log("Found matches using individual column search:", combinedResults);
      return {
        success: true,
        data: combinedResults,
        searchDetails: {
          keywordUsed: trimmedKeyword,
          matchType: 'exact',
          searchMethod: "individual column search"
        }
      };
    }
    
    // Lastly, try partial match with individual columns
    const partialIndividualResults = await Promise.all([
      supabase.from('Videos').select('*').ilike('video_tag1', `%${trimmedKeyword}%`),
      supabase.from('Videos').select('*').ilike('video_tag2', `%${trimmedKeyword}%`),
      supabase.from('Videos').select('*').ilike('video_tag3', `%${trimmedKeyword}%`)
    ]);
    
    const combinedPartialResults = partialIndividualResults
      .filter(result => !result.error && result.data && result.data.length > 0)
      .flatMap(result => result.data || []);
    
    if (combinedPartialResults.length > 0) {
      console.log("Found matches using individual column partial search:", combinedPartialResults);
      return {
        success: true,
        data: combinedPartialResults,
        searchDetails: {
          keywordUsed: trimmedKeyword,
          matchType: 'partial',
          searchMethod: "individual column partial search"
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
