
import { supabase } from "@/integrations/supabase/client";
import { validateVideoUrl } from "./videoUrlValidator";
import { validateSearchKeyword } from "@/utils/videoLoadingManager";
import { toast } from "@/hooks/use-toast";

interface SearchAndPlayResult {
  success: boolean;
  errorDetails?: string;
  video?: {
    id: number;
    video_url: string;
    video_name: string;
    keyword: string;
  };
}

// Track recent searches to prevent duplicates
const recentSearches = new Set<string>();
const RECENT_SEARCH_TIMEOUT = 5000; // 5 seconds

/**
 * Search for videos with the given keyword and play the first match
 */
export const searchAndPlayVideo = async (keyword: string): Promise<SearchAndPlayResult> => {
  console.log(`[SearchAndPlay] Searching for video with keyword: "${keyword}"`);
  
  // Check if this is a very recent search (within 5 seconds)
  if (recentSearches.has(keyword)) {
    console.log(`[SearchAndPlay] Skipping duplicate search for: "${keyword}" (searched recently)`);
    return {
      success: false,
      errorDetails: "Duplicate search request - please wait before searching for the same term again"
    };
  }
  
  // Add to recent searches and remove after timeout
  recentSearches.add(keyword);
  setTimeout(() => {
    recentSearches.delete(keyword);
  }, RECENT_SEARCH_TIMEOUT);
  
  try {
    // Validate the keyword
    const validKeyword = validateSearchKeyword(keyword);
    if (!validKeyword) {
      console.error(`[SearchAndPlay] Invalid keyword: "${keyword}"`);
      return { 
        success: false,
        errorDetails: "Invalid search keyword" 
      };
    }
    
    console.log(`[SearchAndPlay] Searching with validated keyword: "${validKeyword}"`);
    
    // Query Supabase for videos matching the keyword
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .or(
        `video_tag1.ilike.%${validKeyword}%,` +
        `video_tag2.ilike.%${validKeyword}%,` +
        `video_tag3.ilike.%${validKeyword}%,` +
        `video_name.ilike.%${validKeyword}%`
      )
      .limit(5);
      
    if (error) {
      console.error(`[SearchAndPlay] Database error:`, error);
      return { 
        success: false,
        errorDetails: `Database error: ${error.message}` 
      };
    }
    
    if (!data || data.length === 0) {
      console.log(`[SearchAndPlay] No videos found for keyword: "${validKeyword}"`);
      
      // Try a broader search with just part of the keyword
      if (validKeyword.length > 3) {
        const partialKeyword = validKeyword.substring(0, Math.ceil(validKeyword.length / 2));
        console.log(`[SearchAndPlay] Trying broader search with: "${partialKeyword}"`);
        
        const { data: broaderData } = await supabase
          .from("videos")
          .select("*")
          .or(
            `video_tag1.ilike.%${partialKeyword}%,` +
            `video_tag2.ilike.%${partialKeyword}%,` +
            `video_tag3.ilike.%${partialKeyword}%,` +
            `video_name.ilike.%${partialKeyword}%`
          )
          .limit(1);
          
        if (broaderData && broaderData.length > 0) {
          // Found a video with broader search
          const video = broaderData[0];
          const validatedUrl = validateVideoUrl(video.video_url);
          
          if (validatedUrl) {
            console.log(`[SearchAndPlay] Found video with broader search:`, video.video_name);
            return {
              success: true,
              video: {
                id: video.id,
                video_url: validatedUrl,
                video_name: video.video_name || "Video",
                keyword: validKeyword
              }
            };
          }
        }
      }
      
      return { 
        success: false,
        errorDetails: `No videos found matching: ${validKeyword}` 
      };
    }
    
    console.log(`[SearchAndPlay] Found ${data.length} videos for keyword: "${validKeyword}"`);
    
    // Filter to only include videos with valid URLs
    const validVideos = data
      .map(video => ({
        ...video,
        video_url: validateVideoUrl(video.video_url)
      }))
      .filter(video => !!video.video_url);
      
    if (validVideos.length === 0) {
      console.error(`[SearchAndPlay] Found videos but URLs were invalid`);
      return { 
        success: false,
        errorDetails: "Found matching videos but URLs were invalid" 
      };
    }
    
    // Use the first valid video
    const selectedVideo = validVideos[0];
    console.log(`[SearchAndPlay] Selected video: "${selectedVideo.video_name}" (ID: ${selectedVideo.id})`);
    
    return {
      success: true,
      video: {
        id: selectedVideo.id,
        video_url: selectedVideo.video_url,
        video_name: selectedVideo.video_name || "Video",
        keyword: validKeyword
      }
    };
    
  } catch (error) {
    console.error(`[SearchAndPlay] Unexpected error:`, error);
    return { 
      success: false,
      errorDetails: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};
