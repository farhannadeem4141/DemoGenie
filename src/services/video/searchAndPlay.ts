
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
    
    // Extract individual words for better matching
    const keywordParts = validKeyword.split(/\s+/).filter(word => word.length >= 2);
    console.log(`[SearchAndPlay] Extracted keyword parts: ${JSON.stringify(keywordParts)}`);
    
    // Try direct match first
    const { data: exactMatches, error: exactMatchError } = await supabase
      .from("videos")
      .select("*")
      .or(
        `video_tag1.ilike.%${validKeyword}%,` +
        `video_tag2.ilike.%${validKeyword}%,` +
        `video_tag3.ilike.%${validKeyword}%,` +
        `video_name.ilike.%${validKeyword}%`
      )
      .limit(5);
      
    if (exactMatchError) {
      console.error(`[SearchAndPlay] Database error on exact match:`, exactMatchError);
    }
    
    // If we found exact matches, use them
    if (exactMatches && exactMatches.length > 0) {
      console.log(`[SearchAndPlay] Found ${exactMatches.length} exact matches`);
      
      // Filter to only include videos with valid URLs
      const validVideos = exactMatches
        .map(video => ({
          ...video,
          video_url: validateVideoUrl(video.video_url)
        }))
        .filter(video => !!video.video_url);
        
      if (validVideos.length > 0) {
        const selectedVideo = validVideos[0];
        console.log(`[SearchAndPlay] Selected exact match: "${selectedVideo.video_name}" (ID: ${selectedVideo.id})`);
        
        return {
          success: true,
          video: {
            id: selectedVideo.id,
            video_url: selectedVideo.video_url,
            video_name: selectedVideo.video_name || "Video",
            keyword: validKeyword
          }
        };
      }
    }
    
    // If no exact matches, try individual word matching with expanded search
    if (keywordParts.length > 0) {
      console.log(`[SearchAndPlay] No exact matches, trying individual keywords`);
      
      // Build a query that checks for each individual word
      const wordConditions = keywordParts.map(word => {
        const stemmedWord = word.length > 4 ? word.substring(0, Math.ceil(word.length * 0.75)) : word;
        return `video_tag1.ilike.%${stemmedWord}%,video_tag2.ilike.%${stemmedWord}%,video_tag3.ilike.%${stemmedWord}%,video_name.ilike.%${stemmedWord}%`;
      });
      
      const wordQuery = wordConditions.join(',');
      console.log(`[SearchAndPlay] Advanced search query conditions: ${wordQuery}`);
      
      const { data: wordMatches, error: wordMatchError } = await supabase
        .from("videos")
        .select("*")
        .or(wordQuery)
        .limit(5);
        
      if (wordMatchError) {
        console.error(`[SearchAndPlay] Database error on word match:`, wordMatchError);
      }
      
      if (wordMatches && wordMatches.length > 0) {
        console.log(`[SearchAndPlay] Found ${wordMatches.length} matches with individual words`);
        
        // Filter to only include videos with valid URLs
        const validVideos = wordMatches
          .map(video => ({
            ...video,
            video_url: validateVideoUrl(video.video_url)
          }))
          .filter(video => !!video.video_url);
          
        if (validVideos.length > 0) {
          const selectedVideo = validVideos[0];
          console.log(`[SearchAndPlay] Selected word match: "${selectedVideo.video_name}" (ID: ${selectedVideo.id})`);
          
          return {
            success: true,
            video: {
              id: selectedVideo.id,
              video_url: selectedVideo.video_url,
              video_name: selectedVideo.video_name || "Video",
              keyword: validKeyword
            }
          };
        }
      }
    }
    
    // If still no matches, try a broader search with just part of the keyword
    if (validKeyword.length > 3) {
      const partialKeyword = validKeyword.substring(0, Math.ceil(validKeyword.length / 2));
      console.log(`[SearchAndPlay] Trying broader search with: "${partialKeyword}"`);
      
      const { data: broaderData, error: broaderError } = await supabase
        .from("videos")
        .select("*")
        .or(
          `video_tag1.ilike.%${partialKeyword}%,` +
          `video_tag2.ilike.%${partialKeyword}%,` +
          `video_tag3.ilike.%${partialKeyword}%,` +
          `video_name.ilike.%${partialKeyword}%`
        )
        .limit(1);
        
      if (broaderError) {
        console.error(`[SearchAndPlay] Database error on broader match:`, broaderError);
      }
        
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
    
    // Special case for specific keywords based on common inputs
    const knownKeywordMap: Record<string, string[]> = {
      'ad': ['advertise', 'advertising', 'advertisement'],
      'adver': ['advertise', 'advertising', 'advertisement'],
      'advertis': ['advertise', 'advertising', 'advertisement'],
    };
    
    // Check if any of our keywords match known patterns
    for (const keywordPart of keywordParts) {
      const lowercasePart = keywordPart.toLowerCase();
      if (knownKeywordMap[lowercasePart]) {
        const mappedKeywords = knownKeywordMap[lowercasePart];
        console.log(`[SearchAndPlay] Found mapped keywords for '${lowercasePart}':`, mappedKeywords);
        
        // Try each mapped keyword
        for (const mappedKeyword of mappedKeywords) {
          console.log(`[SearchAndPlay] Trying mapped keyword: "${mappedKeyword}"`);
          
          const { data: mappedData } = await supabase
            .from("videos")
            .select("*")
            .or(
              `video_tag1.ilike.%${mappedKeyword}%,` +
              `video_tag2.ilike.%${mappedKeyword}%,` +
              `video_tag3.ilike.%${mappedKeyword}%,` +
              `video_name.ilike.%${mappedKeyword}%`
            )
            .limit(1);
            
          if (mappedData && mappedData.length > 0) {
            const video = mappedData[0];
            const validatedUrl = validateVideoUrl(video.video_url);
            
            if (validatedUrl) {
              console.log(`[SearchAndPlay] Found video with mapped keyword '${mappedKeyword}':`, video.video_name);
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
      }
    }
    
    // Last resort - get any available video
    console.log(`[SearchAndPlay] No specific matches found, trying to fetch any available video as last resort`);
    const { data: anyData } = await supabase
      .from("videos")
      .select("*")
      .limit(1);
      
    if (anyData && anyData.length > 0) {
      const video = anyData[0];
      const validatedUrl = validateVideoUrl(video.video_url);
      
      if (validatedUrl) {
        console.log(`[SearchAndPlay] Using available video as fallback:`, video.video_name);
        return {
          success: true,
          video: {
            id: video.id,
            video_url: validatedUrl,
            video_name: video.video_name || "Video (Fallback)",
            keyword: validKeyword
          }
        };
      }
    }
    
    // If we get here, we couldn't find any videos
    console.log(`[SearchAndPlay] No videos found for any attempt with keyword: "${validKeyword}"`);
    return { 
      success: false,
      errorDetails: `No videos found matching: ${validKeyword}` 
    };
    
  } catch (error) {
    console.error(`[SearchAndPlay] Unexpected error:`, error);
    return { 
      success: false,
      errorDetails: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};
