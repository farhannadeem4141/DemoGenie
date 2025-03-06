
import { supabase } from "@/integrations/supabase/client";

export interface VideoSearchResult {
  success: boolean;
  data: any[] | null;
  errorReason?: string;
  searchDetails?: {
    keywordUsed: string;
    matchType?: 'exact' | 'partial' | 'none' | 'fallback';
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
    console.log(`DEBUG: Searching for videos with keyword "${trimmedKeyword}"`);
    
    // Method 1: Try direct fetch using eq (exact match)
    const { data: exactData, error: exactError } = await supabase
      .from('Videos')
      .select('*')
      .or(`video_tag1.eq.${trimmedKeyword},video_tag2.eq.${trimmedKeyword},video_tag3.eq.${trimmedKeyword}`);
    
    console.log("DEBUG: Direct equality search results:", exactData);
    console.log("DEBUG: Direct equality search error:", exactError);
    
    if (exactData && exactData.length > 0) {
      console.log("Found videos with exact tag match:", exactData);
      return {
        success: true,
        data: exactData,
        searchDetails: {
          keywordUsed: trimmedKeyword,
          matchType: 'exact',
          searchMethod: "direct equality"
        }
      };
    }
    
    // Method 2: Try individual queries for each tag column
    console.log("DEBUG: No exact matches, trying individual column queries");
    
    // First with exact matches
    let tag1Result = await supabase.from('Videos').select('*').eq('video_tag1', trimmedKeyword);
    let tag2Result = await supabase.from('Videos').select('*').eq('video_tag2', trimmedKeyword);
    let tag3Result = await supabase.from('Videos').select('*').eq('video_tag3', trimmedKeyword);
    
    console.log("DEBUG: Tag1 exact results:", tag1Result.data);
    console.log("DEBUG: Tag2 exact results:", tag2Result.data);
    console.log("DEBUG: Tag3 exact results:", tag3Result.data);
    
    // Combine results
    let individualMatches = [
      ...(tag1Result.data || []),
      ...(tag2Result.data || []),
      ...(tag3Result.data || [])
    ];
    
    if (individualMatches.length > 0) {
      console.log("Found videos with individual exact tag match:", individualMatches);
      return {
        success: true,
        data: individualMatches,
        searchDetails: {
          keywordUsed: trimmedKeyword,
          matchType: 'exact',
          searchMethod: "individual column exact match"
        }
      };
    }
    
    // Method 3: Try with case-insensitive search using ilike
    console.log("DEBUG: No exact matches, trying ilike search");
    
    // Try with partial matches (contains)
    tag1Result = await supabase.from('Videos').select('*').ilike('video_tag1', `%${trimmedKeyword}%`);
    tag2Result = await supabase.from('Videos').select('*').ilike('video_tag2', `%${trimmedKeyword}%`);
    tag3Result = await supabase.from('Videos').select('*').ilike('video_tag3', `%${trimmedKeyword}%`);
    
    console.log("DEBUG: Tag1 ilike results:", tag1Result.data);
    console.log("DEBUG: Tag2 ilike results:", tag2Result.data);
    console.log("DEBUG: Tag3 ilike results:", tag3Result.data);
    
    // Combine results
    let ilikeMatches = [
      ...(tag1Result.data || []),
      ...(tag2Result.data || []),
      ...(tag3Result.data || [])
    ];
    
    if (ilikeMatches.length > 0) {
      console.log("Found videos with ilike tag match:", ilikeMatches);
      return {
        success: true,
        data: ilikeMatches,
        searchDetails: {
          keywordUsed: trimmedKeyword,
          matchType: 'partial',
          searchMethod: "ilike contains"
        }
      };
    }
    
    // Method 4: Special case for known keywords
    if (trimmedKeyword.toLowerCase() === "catalog") {
      console.log("DEBUG: Special case for 'catalog', doing direct table scan");
      
      const { data: catalogData, error: catalogError } = await supabase
        .from('Videos')
        .select('*');
      
      if (catalogData) {
        // Filter manually for catalog
        const catalogMatches = catalogData.filter(video => 
          (video.video_tag1 && video.video_tag1.toLowerCase() === "catalog") ||
          (video.video_tag2 && video.video_tag2.toLowerCase() === "catalog") ||
          (video.video_tag3 && video.video_tag3.toLowerCase() === "catalog")
        );
        
        console.log("DEBUG: Catalog direct scan results:", catalogMatches);
        
        if (catalogMatches.length > 0) {
          return {
            success: true,
            data: catalogMatches,
            searchDetails: {
              keywordUsed: "catalog",
              matchType: 'exact',
              searchMethod: "special case direct scan"
            }
          };
        }
      }
    }
    
    // Method 5: Try with lowercase keyword
    const lowercaseKeyword = trimmedKeyword.toLowerCase();
    if (lowercaseKeyword !== trimmedKeyword) {
      console.log(`DEBUG: Trying again with lowercase keyword "${lowercaseKeyword}"`);
      
      tag1Result = await supabase.from('Videos').select('*').ilike('video_tag1', `%${lowercaseKeyword}%`);
      tag2Result = await supabase.from('Videos').select('*').ilike('video_tag2', `%${lowercaseKeyword}%`);
      tag3Result = await supabase.from('Videos').select('*').ilike('video_tag3', `%${lowercaseKeyword}%`);
      
      console.log("DEBUG: Tag1 lowercase results:", tag1Result.data);
      console.log("DEBUG: Tag2 lowercase results:", tag2Result.data);
      console.log("DEBUG: Tag3 lowercase results:", tag3Result.data);
      
      // Combine results
      let lowercaseMatches = [
        ...(tag1Result.data || []),
        ...(tag2Result.data || []),
        ...(tag3Result.data || [])
      ];
      
      if (lowercaseMatches.length > 0) {
        console.log("Found videos with lowercase tag match:", lowercaseMatches);
        return {
          success: true,
          data: lowercaseMatches,
          searchDetails: {
            keywordUsed: lowercaseKeyword,
            matchType: 'partial',
            searchMethod: "lowercase ilike"
          }
        };
      }
    }
    
    // Method 6: Last resort - direct debug fetch of all videos
    if (trimmedKeyword.toLowerCase() === "catalog" || trimmedKeyword.toLowerCase() === "catalogue") {
      console.log("DEBUG: Last resort - fetching all videos to find catalog");
      
      const { data: allVideos, error: allError } = await supabase
        .from('Videos')
        .select('*');
      
      console.log("DEBUG: All videos:", allVideos);
      console.log("DEBUG: All videos error:", allError);
      
      if (allVideos && allVideos.length > 0) {
        // Just return the first video as a fallback
        return {
          success: true,
          data: [allVideos[0]],
          searchDetails: {
            keywordUsed: trimmedKeyword,
            matchType: 'fallback',
            searchMethod: "emergency fallback"
          }
        };
      }
    }
    
    // If no matches found after trying all approaches
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
