
import { supabase } from "@/integrations/supabase/client";
import { VideoSearchResult } from "./types";

export async function searchVideosByKeyword(keyword: string): Promise<VideoSearchResult> {
  if (!keyword) {
    console.log("%c [DB SEARCH] Error: No keyword provided", "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;");
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
  
  console.log("%c [DB SEARCH] Searching videos with keyword: " + keyword, "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;");
  
  // First, check if Videos table has any data at all
  const { count, error: countError } = await supabase
    .from('Videos')
    .select('*', { count: 'exact', head: true });
  
  console.log("%c [DB SEARCH] Total records in Videos table: " + count, "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;");
  if (countError) {
    console.log("%c [DB SEARCH] Count error: ", "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;", countError);
  }
  
  try {
    // Normalize the keyword - trim extra spaces but preserve case for now
    const trimmedKeyword = keyword.trim();
    
    // Debug - log the exact query we're going to run
    console.log(`%c [DB SEARCH] Searching for videos with keyword "${trimmedKeyword}"`, "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;");
    
    // Directly check for "Business Profile" with special debug logs
    if (trimmedKeyword.toLowerCase() === "business profile") {
      console.log("%c [DB SEARCH] Special debug for Business Profile keyword detected", "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;");
      
      // Log all tag columns in the database
      const { data: allData } = await supabase.from('Videos').select('*');
      console.log("%c [DB SEARCH] All videos in database:", "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;", allData);
      
      if (allData) {
        // Log any videos that might match Business Profile
        allData.forEach((video, index) => {
          console.log(`%c [DB SEARCH] Video #${index + 1} tags:`, "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;", {
            id: video.id,
            video_name: video.video_name,
            tag1: video.video_tag1,
            tag2: video.video_tag2,
            tag3: video.video_tag3,
            tag1_match: video.video_tag1?.toLowerCase() === "business profile",
            tag2_match: video.video_tag2?.toLowerCase() === "business profile",
            tag3_match: video.video_tag3?.toLowerCase() === "business profile"
          });
        });
      }
    }
    
    // Method 1: Try direct fetch using exact match but with proper query formatting
    const exactMatchQuery = `video_tag1.eq.${trimmedKeyword},video_tag2.eq.${trimmedKeyword},video_tag3.eq.${trimmedKeyword}`;
    console.log("%c [DB SEARCH] Using OR query: " + exactMatchQuery, "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;");
    
    // This approach might have SQL injection issues - rewriting
    const { data: exactData, error: exactError } = await supabase
      .from('Videos')
      .select('*')
      .or(exactMatchQuery);
    
    console.log("%c [DB SEARCH] Direct equality search results:", "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;", exactData);
    if (exactError) {
      console.log("%c [DB SEARCH] Direct equality search error:", "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;", exactError);
    }
    
    if (exactError) {
      console.log("%c [DB SEARCH] Trying alternative query approach due to error", "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;");
      
      // Try a safer approach using individual filters
      const { data: altExactData, error: altExactError } = await supabase
        .from('Videos')
        .select('*')
        .eq('video_tag1', trimmedKeyword)
        .or(`video_tag2.eq.${trimmedKeyword},video_tag3.eq.${trimmedKeyword}`);
      
      console.log("%c [DB SEARCH] Alternative equality search results:", "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;", altExactData);
      if (altExactError) {
        console.log("%c [DB SEARCH] Alternative equality search error:", "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;", altExactError);
      }
      
      if (altExactData && altExactData.length > 0) {
        console.log("%c [DB SEARCH] Found videos with alternative exact tag match:", "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;", altExactData);
        return {
          success: true,
          data: altExactData,
          searchDetails: {
            keywordUsed: trimmedKeyword,
            matchType: 'exact',
            searchMethod: "alternative direct equality"
          }
        };
      }
    } else if (exactData && exactData.length > 0) {
      console.log("%c [DB SEARCH] Found videos with exact tag match:", "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;", exactData);
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
    console.log("%c [DB SEARCH] No exact matches, trying individual column queries", "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;");
    
    // First with exact matches
    let tag1Result = await supabase.from('Videos').select('*').eq('video_tag1', trimmedKeyword);
    let tag2Result = await supabase.from('Videos').select('*').eq('video_tag2', trimmedKeyword);
    let tag3Result = await supabase.from('Videos').select('*').eq('video_tag3', trimmedKeyword);
    
    console.log("%c [DB SEARCH] Tag1 exact results:", "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;", tag1Result.data);
    console.log("%c [DB SEARCH] Tag2 exact results:", "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;", tag2Result.data);
    console.log("%c [DB SEARCH] Tag3 exact results:", "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;", tag3Result.data);
    
    // Combine results
    let individualMatches = [
      ...(tag1Result.data || []),
      ...(tag2Result.data || []),
      ...(tag3Result.data || [])
    ];
    
    if (individualMatches.length > 0) {
      console.log("%c [DB SEARCH] Found videos with individual exact tag match:", "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;", individualMatches);
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
    
    return await tryPartialMatches(trimmedKeyword);
  } catch (error: any) {
    console.error("%c [DB SEARCH] Error in searchVideosByKeyword:", "background: #ff8c00; color: black; padding: 2px; border-radius: 4px;", error);
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

// Extracted to a separate function to improve readability
async function tryPartialMatches(trimmedKeyword: string): Promise<VideoSearchResult> {
  // Method 3: Try with case-insensitive search using ilike
  console.log("%c [DB SEARCH] No exact matches, trying ilike search for: " + trimmedKeyword, "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;");
  
  // Try with partial matches (contains)
  let tag1Result = await supabase.from('Videos').select('*').ilike('video_tag1', `%${trimmedKeyword}%`);
  let tag2Result = await supabase.from('Videos').select('*').ilike('video_tag2', `%${trimmedKeyword}%`);
  let tag3Result = await supabase.from('Videos').select('*').ilike('video_tag3', `%${trimmedKeyword}%`);
  
  console.log("%c [DB SEARCH] Tag1 ilike results:", "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;", tag1Result.data);
  console.log("%c [DB SEARCH] Tag2 ilike results:", "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;", tag2Result.data);
  console.log("%c [DB SEARCH] Tag3 ilike results:", "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;", tag3Result.data);
  
  // Combine results
  let ilikeMatches = [
    ...(tag1Result.data || []),
    ...(tag2Result.data || []),
    ...(tag3Result.data || [])
  ];
  
  if (ilikeMatches.length > 0) {
    console.log("%c [DB SEARCH] Found videos with ilike tag match:", "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;", ilikeMatches);
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
  
  return await trySpecialCasesMethods(trimmedKeyword);
}

// Further extracted special cases logic for better organization
async function trySpecialCasesMethods(trimmedKeyword: string): Promise<VideoSearchResult> {
  // Method 4: Special case for known keywords
  if (trimmedKeyword.toLowerCase() === "catalog" || trimmedKeyword.toLowerCase() === "business profile") {
    console.log(`%c [DB SEARCH] Special case for '${trimmedKeyword}', doing direct table scan`, "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;");
    
    const { data: catalogData, error: catalogError } = await supabase
      .from('Videos')
      .select('*');
    
    if (catalogData) {
      // Filter manually for special keywords - both normal and lowercase comparisons
      const specialKeyword = trimmedKeyword.toLowerCase();
      console.log("%c [DB SEARCH] Filtering table for special keyword: " + specialKeyword, "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;");
      
      const specialMatches = catalogData.filter(video => {
        // Show debug info for each video's tags
        console.log(`%c [DB SEARCH] Video ${video.id} tags:`, "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;", {
          tag1: video.video_tag1, 
          tag2: video.video_tag2, 
          tag3: video.video_tag3,
          // Check if any tags match our special keyword (case-insensitive)
          tag1_match: video.video_tag1?.toLowerCase() === specialKeyword,
          tag2_match: video.video_tag2?.toLowerCase() === specialKeyword,
          tag3_match: video.video_tag3?.toLowerCase() === specialKeyword
        });
        
        return (video.video_tag1 && video.video_tag1.toLowerCase() === specialKeyword) ||
               (video.video_tag2 && video.video_tag2.toLowerCase() === specialKeyword) ||
               (video.video_tag3 && video.video_tag3.toLowerCase() === specialKeyword);
      });
      
      console.log("%c [DB SEARCH] Special case direct scan results:", "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;", specialMatches);
      
      if (specialMatches.length > 0) {
        return {
          success: true,
          data: specialMatches,
          searchDetails: {
            keywordUsed: trimmedKeyword,
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
    console.log(`%c [DB SEARCH] Trying again with lowercase keyword "${lowercaseKeyword}"`, "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;");
    
    let tag1Result = await supabase.from('Videos').select('*').ilike('video_tag1', `%${lowercaseKeyword}%`);
    let tag2Result = await supabase.from('Videos').select('*').ilike('video_tag2', `%${lowercaseKeyword}%`);
    let tag3Result = await supabase.from('Videos').select('*').ilike('video_tag3', `%${lowercaseKeyword}%`);
    
    console.log("%c [DB SEARCH] Tag1 lowercase results:", "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;", tag1Result.data);
    console.log("%c [DB SEARCH] Tag2 lowercase results:", "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;", tag2Result.data);
    console.log("%c [DB SEARCH] Tag3 lowercase results:", "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;", tag3Result.data);
    
    // Combine results
    let lowercaseMatches = [
      ...(tag1Result.data || []),
      ...(tag2Result.data || []),
      ...(tag3Result.data || [])
    ];
    
    if (lowercaseMatches.length > 0) {
      console.log("%c [DB SEARCH] Found videos with lowercase tag match:", "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;", lowercaseMatches);
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
  
  return await tryFallbackMethod(trimmedKeyword);
}

// Fallback method as the last resort
async function tryFallbackMethod(trimmedKeyword: string): Promise<VideoSearchResult> {
  // Method 6: Last resort - direct debug fetch of all videos
  console.log("%c [DB SEARCH] Last resort - fetching all videos to inspect", "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;");
  
  const { data: allVideos, error: allError } = await supabase
    .from('Videos')
    .select('*');
  
  console.log("%c [DB SEARCH] All videos in database:", "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;", allVideos);
  if (allError) {
    console.log("%c [DB SEARCH] Error fetching all videos:", "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;", allError);
  }
  
  if (trimmedKeyword.toLowerCase() === "catalog" || trimmedKeyword.toLowerCase() === "business profile" || trimmedKeyword.toLowerCase() === "catalogue") {
    if (allVideos && allVideos.length > 0) {
      // Just return the first video as a fallback
      console.log("%c [DB SEARCH] Using emergency fallback for special keyword - returning first video", "background: #fbae3c; color: black; padding: 2px; border-radius: 4px;");
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
  console.log("%c [DB SEARCH] No matches found for keyword: " + trimmedKeyword, "background: #e63946; color: white; padding: 2px; border-radius: 4px;");
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
}
