
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
    
    // First attempt: Try exact match with ilike for each tag column individually
    // This is more reliable than using the .or() method with complex conditions
    const exactMatchResults = await Promise.all([
      supabase.from('Videos').select('*').ilike('video_tag1', trimmedKeyword),
      supabase.from('Videos').select('*').ilike('video_tag2', trimmedKeyword),
      supabase.from('Videos').select('*').ilike('video_tag3', trimmedKeyword)
    ]);
    
    // Combine results from all three queries
    const exactMatches = exactMatchResults
      .filter(result => !result.error && result.data && result.data.length > 0)
      .flatMap(result => result.data || []);
    
    console.log("DEBUG: Exact match results:", exactMatches);
    
    if (exactMatches.length > 0) {
      console.log("Found exact matches in video tags:", exactMatches);
      return {
        success: true,
        data: exactMatches,
        searchDetails: {
          keywordUsed: trimmedKeyword,
          matchType: 'exact',
          searchMethod: "individual tag exact match"
        }
      };
    }
    
    // Second attempt: Try case-insensitive partial match (contains) for each tag
    console.log(`DEBUG: Searching for partial matches with keyword "${trimmedKeyword}"`);
    
    const partialMatchResults = await Promise.all([
      supabase.from('Videos').select('*').ilike('video_tag1', `%${trimmedKeyword}%`),
      supabase.from('Videos').select('*').ilike('video_tag2', `%${trimmedKeyword}%`),
      supabase.from('Videos').select('*').ilike('video_tag3', `%${trimmedKeyword}%`)
    ]);
    
    // Combine results from all three queries
    const partialMatches = partialMatchResults
      .filter(result => !result.error && result.data && result.data.length > 0)
      .flatMap(result => result.data || []);
    
    console.log("DEBUG: Partial match results:", partialMatches);
    
    if (partialMatches.length > 0) {
      console.log("Found partial matches in video tags:", partialMatches);
      return {
        success: true,
        data: partialMatches,
        searchDetails: {
          keywordUsed: trimmedKeyword,
          matchType: 'partial',
          searchMethod: "individual tag partial match"
        }
      };
    }
    
    // Third attempt: Try with lowercase keyword
    const lowercaseKeyword = trimmedKeyword.toLowerCase();
    if (lowercaseKeyword !== trimmedKeyword) {
      console.log(`DEBUG: Trying again with lowercase keyword "${lowercaseKeyword}"`);
      
      const lowercaseResults = await Promise.all([
        supabase.from('Videos').select('*').ilike('video_tag1', `%${lowercaseKeyword}%`),
        supabase.from('Videos').select('*').ilike('video_tag2', `%${lowercaseKeyword}%`),
        supabase.from('Videos').select('*').ilike('video_tag3', `%${lowercaseKeyword}%`)
      ]);
      
      const lowercaseMatches = lowercaseResults
        .filter(result => !result.error && result.data && result.data.length > 0)
        .flatMap(result => result.data || []);
      
      console.log("DEBUG: Lowercase match results:", lowercaseMatches);
      
      if (lowercaseMatches.length > 0) {
        console.log("Found matches using lowercase keyword:", lowercaseMatches);
        return {
          success: true,
          data: lowercaseMatches,
          searchDetails: {
            keywordUsed: lowercaseKeyword,
            matchType: 'partial',
            searchMethod: "lowercase search"
          }
        };
      }
    }
    
    // If no matches found after trying all approaches, log and return error
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
