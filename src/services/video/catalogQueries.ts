
import { supabase } from "@/integrations/supabase/client";
import { VideoSearchResult } from "./types";

export async function queryVideosWithCatalogTag(): Promise<VideoSearchResult> {
  console.log("Running catalog tag query...");
  
  try {
    // First check if the Videos table exists and has any data
    const { count, error: countError } = await supabase
      .from('Videos')
      .select('*', { count: 'exact', head: true });
    
    console.log("Total records in Videos table:", count);
    
    if (countError) {
      console.error("Error counting videos:", countError);
      return {
        success: false,
        data: [],
        errorReason: `Database error: ${countError.message}`,
        searchDetails: {
          keywordUsed: "catalog",
          matchType: 'none',
          searchMethod: "table verification failed"
        }
      };
    }
    
    if (count === 0) {
      console.log("Videos table exists but is empty");
      return {
        success: false,
        data: [],
        errorReason: "No videos found in database",
        searchDetails: {
          keywordUsed: "catalog",
          matchType: 'none',
          searchMethod: "empty table"
        }
      };
    }
    
    // Try with case-insensitive search for "catalog" in all tag columns
    const { data: catalogData, error: catalogError } = await supabase
      .from('Videos')
      .select('*')
      .or('video_tag1.ilike.%catalog%,video_tag2.ilike.%catalog%,video_tag3.ilike.%catalog%');
    
    console.log("Catalog search results:", catalogData);
    
    if (catalogError) {
      console.error("Error searching for catalog videos:", catalogError);
      return {
        success: false,
        data: [],
        errorReason: `Search error: ${catalogError.message}`,
        searchDetails: {
          keywordUsed: "catalog",
          matchType: 'none',
          searchMethod: "ilike search failed"
        }
      };
    }
    
    if (!catalogData || catalogData.length === 0) {
      // If no videos found with catalog tag, get the first video as fallback
      const { data: firstVideo, error: firstVideoError } = await supabase
        .from('Videos')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (firstVideoError || !firstVideo) {
        console.error("Error fetching fallback video:", firstVideoError);
        return {
          success: false,
          data: [],
          errorReason: "No videos found with catalog tag and fallback video fetch failed",
          searchDetails: {
            keywordUsed: "catalog",
            matchType: 'fallback',
            searchMethod: "fallback fetch failed"
          }
        };
      }
      
      console.log("No catalog videos found, using first video as fallback:", firstVideo);
      return {
        success: true,
        data: [firstVideo],
        searchDetails: {
          keywordUsed: "catalog",
          matchType: 'fallback',
          searchMethod: "first video fallback"
        }
      };
    }
    
    return {
      success: true,
      data: catalogData,
      searchDetails: {
        keywordUsed: "catalog",
        matchType: 'partial',
        searchMethod: "ilike catalog search"
      }
    };
  } catch (error: any) {
    console.error("Unexpected error in queryVideosWithCatalogTag:", error);
    return {
      success: false,
      data: [],
      errorReason: `Unexpected error: ${error.message || "Unknown error"}`,
      searchDetails: {
        keywordUsed: "catalog",
        matchType: 'none',
        searchMethod: "exception caught"
      }
    };
  }
}
