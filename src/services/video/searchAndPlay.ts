
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
  const searchId = `search-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[SearchAndPlay:${searchId}] 🔍 STARTED search for keyword: "${keyword}"`);
  console.time(`[SearchAndPlay:${searchId}] Total search duration`);
  
  // Check if this is a very recent search (within 5 seconds)
  if (recentSearches.has(keyword)) {
    console.log(`[SearchAndPlay:${searchId}] ⚠️ Skipping duplicate search for: "${keyword}" (searched recently)`);
    console.timeEnd(`[SearchAndPlay:${searchId}] Total search duration`);
    return {
      success: false,
      errorDetails: "Duplicate search request - please wait before searching for the same term again"
    };
  }
  
  // Add to recent searches and remove after timeout
  recentSearches.add(keyword);
  console.log(`[SearchAndPlay:${searchId}] Added "${keyword}" to recent searches`);
  setTimeout(() => {
    recentSearches.delete(keyword);
    console.log(`[SearchAndPlay:${searchId}] Removed "${keyword}" from recent searches list after timeout`);
  }, RECENT_SEARCH_TIMEOUT);
  
  try {
    console.log(`[SearchAndPlay:${searchId}] Step 1: Validating search keyword`);
    // Validate the keyword
    const validKeyword = validateSearchKeyword(keyword);
    if (!validKeyword) {
      console.error(`[SearchAndPlay:${searchId}] ❌ Invalid keyword: "${keyword}"`);
      console.timeEnd(`[SearchAndPlay:${searchId}] Total search duration`);
      return { 
        success: false,
        errorDetails: "Invalid search keyword" 
      };
    }
    
    console.log(`[SearchAndPlay:${searchId}] ✅ Valid keyword: "${validKeyword}"`);
    
    // Extract individual words for better matching
    console.log(`[SearchAndPlay:${searchId}] Step 2: Extracting keyword parts for matching`);
    const keywordParts = validKeyword.split(/\s+/).filter(word => word.length >= 2);
    console.log(`[SearchAndPlay:${searchId}] Extracted ${keywordParts.length} keyword parts: ${JSON.stringify(keywordParts)}`);
    
    // Try direct match first
    console.log(`[SearchAndPlay:${searchId}] Step 3: Attempting exact match search`);
    console.time(`[SearchAndPlay:${searchId}] Exact match query duration`);
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
    console.timeEnd(`[SearchAndPlay:${searchId}] Exact match query duration`);
      
    if (exactMatchError) {
      console.error(`[SearchAndPlay:${searchId}] ❌ Database error on exact match:`, exactMatchError);
    }
    
    // If we found exact matches, use them
    if (exactMatches && exactMatches.length > 0) {
      console.log(`[SearchAndPlay:${searchId}] ✅ Found ${exactMatches.length} exact matches`);
      
      // Filter to only include videos with valid URLs and pre-validate them
      console.log(`[SearchAndPlay:${searchId}] Step 4: Validating URLs for ${exactMatches.length} matches`);
      const validVideos = [];
      
      for (const video of exactMatches) {
        console.log(`[SearchAndPlay:${searchId}] Validating URL for video ID ${video.id}: "${video.video_name}"`);
        console.log(`[SearchAndPlay:${searchId}] URL before validation: ${video.video_url?.substring(0, 80)}${video.video_url?.length > 80 ? '...' : ''}`);
        
        const validatedUrl = validateVideoUrl(video.video_url);
        if (validatedUrl) {
          console.log(`[SearchAndPlay:${searchId}] ✅ Valid URL for video ID ${video.id}`);
          console.log(`[SearchAndPlay:${searchId}] URL after validation: ${validatedUrl.substring(0, 80)}${validatedUrl.length > 80 ? '...' : ''}`);
          validVideos.push({
            ...video,
            video_url: validatedUrl
          });
        } else {
          console.warn(`[SearchAndPlay:${searchId}] ⚠️ Video ID ${video.id} has invalid URL: ${video.video_url?.substring(0, 50)}...`);
        }
      }
        
      if (validVideos.length > 0) {
        const selectedVideo = validVideos[0];
        console.log(`[SearchAndPlay:${searchId}] Step 5: Selected exact match: "${selectedVideo.video_name}" (ID: ${selectedVideo.id})`);
        
        // Perform a test validation before returning
        console.log(`[SearchAndPlay:${searchId}] Performing final thorough URL validation`);
        const finalValidatedUrl = validateVideoUrl(selectedVideo.video_url, true);
        
        if (finalValidatedUrl) {
          console.log(`[SearchAndPlay:${searchId}] ✅ Final validated URL: ${finalValidatedUrl.substring(0, 80)}${finalValidatedUrl.length > 80 ? '...' : ''}`);
        } else {
          console.warn(`[SearchAndPlay:${searchId}] ⚠️ Final URL validation failed, using previous validation`);
        }
        
        console.timeEnd(`[SearchAndPlay:${searchId}] Total search duration`);
        console.log(`[SearchAndPlay:${searchId}] 🎯 COMPLETED successfully with exact match`);
        
        return {
          success: true,
          video: {
            id: selectedVideo.id,
            video_url: finalValidatedUrl || selectedVideo.video_url,
            video_name: selectedVideo.video_name || "Video",
            keyword: validKeyword
          }
        };
      }
    } else {
      console.log(`[SearchAndPlay:${searchId}] No exact matches found, trying alternative search methods`);
    }
    
    // If no exact matches, try individual word matching with expanded search
    if (keywordParts.length > 0) {
      console.log(`[SearchAndPlay:${searchId}] Step 6: Trying individual word matching`);
      
      // Build a query that checks for each individual word
      const wordConditions = keywordParts.map(word => {
        const stemmedWord = word.length > 4 ? word.substring(0, Math.ceil(word.length * 0.75)) : word;
        return `video_tag1.ilike.%${stemmedWord}%,video_tag2.ilike.%${stemmedWord}%,video_tag3.ilike.%${stemmedWord}%,video_name.ilike.%${stemmedWord}%`;
      });
      
      const wordQuery = wordConditions.join(',');
      console.log(`[SearchAndPlay:${searchId}] Word search conditions: ${wordQuery}`);
      
      console.time(`[SearchAndPlay:${searchId}] Word match query duration`);
      const { data: wordMatches, error: wordMatchError } = await supabase
        .from("videos")
        .select("*")
        .or(wordQuery)
        .limit(5);
      console.timeEnd(`[SearchAndPlay:${searchId}] Word match query duration`);
        
      if (wordMatchError) {
        console.error(`[SearchAndPlay:${searchId}] ❌ Database error on word match:`, wordMatchError);
      }
      
      if (wordMatches && wordMatches.length > 0) {
        console.log(`[SearchAndPlay:${searchId}] ✅ Found ${wordMatches.length} matches with individual words`);
        
        // Filter to only include videos with valid URLs and pre-validate them
        console.log(`[SearchAndPlay:${searchId}] Step 7: Validating URLs for ${wordMatches.length} word matches`);
        const validVideos = [];
        
        for (const video of wordMatches) {
          console.log(`[SearchAndPlay:${searchId}] Validating URL for video ID ${video.id}: "${video.video_name}"`);
          
          const validatedUrl = validateVideoUrl(video.video_url);
          if (validatedUrl) {
            console.log(`[SearchAndPlay:${searchId}] ✅ Valid URL for word match video ID ${video.id}`);
            validVideos.push({
              ...video,
              video_url: validatedUrl
            });
          } else {
            console.warn(`[SearchAndPlay:${searchId}] ⚠️ Video ID ${video.id} has invalid URL: ${video.video_url?.substring(0, 50)}...`);
          }
        }
          
        if (validVideos.length > 0) {
          const selectedVideo = validVideos[0];
          console.log(`[SearchAndPlay:${searchId}] Step 8: Selected word match: "${selectedVideo.video_name}" (ID: ${selectedVideo.id})`);
          
          // Perform a thorough validation before returning
          console.log(`[SearchAndPlay:${searchId}] Performing final thorough URL validation`);
          const finalValidatedUrl = validateVideoUrl(selectedVideo.video_url, true);
          
          if (finalValidatedUrl) {
            console.log(`[SearchAndPlay:${searchId}] ✅ Final validated URL: ${finalValidatedUrl.substring(0, 80)}${finalValidatedUrl.length > 80 ? '...' : ''}`);
          } else {
            console.warn(`[SearchAndPlay:${searchId}] ⚠️ Final URL validation failed, using previous validation`);
          }
          
          console.timeEnd(`[SearchAndPlay:${searchId}] Total search duration`);
          console.log(`[SearchAndPlay:${searchId}] 🎯 COMPLETED successfully with word match`);
          
          return {
            success: true,
            video: {
              id: selectedVideo.id,
              video_url: finalValidatedUrl || selectedVideo.video_url,
              video_name: selectedVideo.video_name || "Video",
              keyword: validKeyword
            }
          };
        }
      } else {
        console.log(`[SearchAndPlay:${searchId}] No word matches found, trying broader search`);
      }
    }
    
    // If still no matches, try a broader search with just part of the keyword
    if (validKeyword.length > 3) {
      const partialKeyword = validKeyword.substring(0, Math.ceil(validKeyword.length / 2));
      console.log(`[SearchAndPlay:${searchId}] Step 9: Trying broader search with: "${partialKeyword}"`);
      
      console.time(`[SearchAndPlay:${searchId}] Broader search query duration`);
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
      console.timeEnd(`[SearchAndPlay:${searchId}] Broader search query duration`);
        
      if (broaderError) {
        console.error(`[SearchAndPlay:${searchId}] ❌ Database error on broader match:`, broaderError);
      }
        
      if (broaderData && broaderData.length > 0) {
        // Found a video with broader search
        const video = broaderData[0];
        console.log(`[SearchAndPlay:${searchId}] ✅ Found video with broader search: "${video.video_name}" (ID: ${video.id})`);
        
        console.log(`[SearchAndPlay:${searchId}] Performing final thorough URL validation for broader match`);
        const validatedUrl = validateVideoUrl(video.video_url, true);
        
        if (validatedUrl) {
          console.log(`[SearchAndPlay:${searchId}] ✅ Valid URL for broader match: ${validatedUrl.substring(0, 80)}${validatedUrl.length > 80 ? '...' : ''}`);
          
          console.timeEnd(`[SearchAndPlay:${searchId}] Total search duration`);
          console.log(`[SearchAndPlay:${searchId}] 🎯 COMPLETED successfully with broader match`);
          
          return {
            success: true,
            video: {
              id: video.id,
              video_url: validatedUrl,
              video_name: video.video_name || "Video",
              keyword: validKeyword
            }
          };
        } else {
          console.warn(`[SearchAndPlay:${searchId}] ⚠️ URL validation failed for broader match`);
        }
      } else {
        console.log(`[SearchAndPlay:${searchId}] No videos found with broader search`);
      }
    }
    
    // Special case for specific keywords based on common inputs
    console.log(`[SearchAndPlay:${searchId}] Step 10: Checking known keyword mappings`);
    const knownKeywordMap: Record<string, string[]> = {
      'ad': ['advertise', 'advertising', 'advertisement', 'ad', 'ads'],
      'adver': ['advertise', 'advertising', 'advertisement', 'advert'],
      'advertis': ['advertise', 'advertising', 'advertisement'],
      'whatsapp': ['whatsapp', 'whats app', 'what app'],
      'security': ['security', 'secure', 'protection'],
      'encrypt': ['encryption', 'encrypted', 'secure'],
    };
    
    // Check if any of our keywords match known patterns
    for (const keywordPart of keywordParts) {
      const lowercasePart = keywordPart.toLowerCase();
      if (knownKeywordMap[lowercasePart]) {
        const mappedKeywords = knownKeywordMap[lowercasePart];
        console.log(`[SearchAndPlay:${searchId}] Found mapped keywords for '${lowercasePart}':`, mappedKeywords);
        
        // Try each mapped keyword
        for (const mappedKeyword of mappedKeywords) {
          console.log(`[SearchAndPlay:${searchId}] Trying mapped keyword: "${mappedKeyword}"`);
          
          console.time(`[SearchAndPlay:${searchId}] Mapped keyword query duration for "${mappedKeyword}"`);
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
          console.timeEnd(`[SearchAndPlay:${searchId}] Mapped keyword query duration for "${mappedKeyword}"`);
            
          if (mappedData && mappedData.length > 0) {
            const video = mappedData[0];
            console.log(`[SearchAndPlay:${searchId}] ✅ Found video with mapped keyword '${mappedKeyword}': "${video.video_name}" (ID: ${video.id})`);
            
            console.log(`[SearchAndPlay:${searchId}] Validating URL for mapped keyword match`);
            const validatedUrl = validateVideoUrl(video.video_url, true);
            
            if (validatedUrl) {
              console.log(`[SearchAndPlay:${searchId}] ✅ Valid URL for mapped keyword match: ${validatedUrl.substring(0, 80)}${validatedUrl.length > 80 ? '...' : ''}`);
              
              console.timeEnd(`[SearchAndPlay:${searchId}] Total search duration`);
              console.log(`[SearchAndPlay:${searchId}] 🎯 COMPLETED successfully with mapped keyword`);
              
              return {
                success: true,
                video: {
                  id: video.id,
                  video_url: validatedUrl,
                  video_name: video.video_name || "Video",
                  keyword: validKeyword
                }
              };
            } else {
              console.warn(`[SearchAndPlay:${searchId}] ⚠️ URL validation failed for mapped keyword match`);
            }
          } else {
            console.log(`[SearchAndPlay:${searchId}] No videos found for mapped keyword: ${mappedKeyword}`);
          }
        }
      }
    }
    
    // Try fixed demo videos if available
    console.log(`[SearchAndPlay:${searchId}] Step 11: Trying demo videos as fallback`);
    console.time(`[SearchAndPlay:${searchId}] Demo video query duration`);
    const { data: demoVideos } = await supabase
      .from("videos")
      .select("*")
      .or(`video_tag1.eq.demo,video_tag2.eq.demo,video_tag3.eq.demo`)
      .limit(1);
    console.timeEnd(`[SearchAndPlay:${searchId}] Demo video query duration`);
      
    if (demoVideos && demoVideos.length > 0) {
      const demoVideo = demoVideos[0];
      console.log(`[SearchAndPlay:${searchId}] ✅ Found demo video as fallback: "${demoVideo.video_name}" (ID: ${demoVideo.id})`);
      
      console.log(`[SearchAndPlay:${searchId}] Validating URL for demo video`);
      const validatedUrl = validateVideoUrl(demoVideo.video_url, true);
      
      if (validatedUrl) {
        console.log(`[SearchAndPlay:${searchId}] ✅ Valid URL for demo video: ${validatedUrl.substring(0, 80)}${validatedUrl.length > 80 ? '...' : ''}`);
        
        console.timeEnd(`[SearchAndPlay:${searchId}] Total search duration`);
        console.log(`[SearchAndPlay:${searchId}] 🎯 COMPLETED with demo video fallback`);
        
        return {
          success: true,
          video: {
            id: demoVideo.id,
            video_url: validatedUrl,
            video_name: demoVideo.video_name || "Demo Video",
            keyword: validKeyword
          }
        };
      } else {
        console.warn(`[SearchAndPlay:${searchId}] ⚠️ URL validation failed for demo video`);
      }
    } else {
      console.log(`[SearchAndPlay:${searchId}] No demo videos found`);
    }
    
    // Last resort - get any available video
    console.log(`[SearchAndPlay:${searchId}] Step 12: Last resort - trying any available video`);
    console.time(`[SearchAndPlay:${searchId}] Any video query duration`);
    const { data: anyData } = await supabase
      .from("videos")
      .select("*")
      .limit(1);
    console.timeEnd(`[SearchAndPlay:${searchId}] Any video query duration`);
      
    if (anyData && anyData.length > 0) {
      const video = anyData[0];
      console.log(`[SearchAndPlay:${searchId}] ✅ Found available video as last resort: "${video.video_name}" (ID: ${video.id})`);
      
      console.log(`[SearchAndPlay:${searchId}] Validating URL for last resort video`);
      const validatedUrl = validateVideoUrl(video.video_url, true);
      
      if (validatedUrl) {
        console.log(`[SearchAndPlay:${searchId}] ✅ Valid URL for last resort video: ${validatedUrl.substring(0, 80)}${validatedUrl.length > 80 ? '...' : ''}`);
        
        console.timeEnd(`[SearchAndPlay:${searchId}] Total search duration`);
        console.log(`[SearchAndPlay:${searchId}] 🎯 COMPLETED with last resort video`);
        
        return {
          success: true,
          video: {
            id: video.id,
            video_url: validatedUrl,
            video_name: video.video_name || "Video (Fallback)",
            keyword: validKeyword
          }
        };
      } else {
        console.warn(`[SearchAndPlay:${searchId}] ⚠️ URL validation failed for last resort video`);
      }
    }
    
    // If we get here, we couldn't find any videos
    console.log(`[SearchAndPlay:${searchId}] ❌ NO VIDEOS FOUND for any attempt with keyword: "${validKeyword}"`);
    console.timeEnd(`[SearchAndPlay:${searchId}] Total search duration`);
    
    // Generate a toast notification for better user feedback
    toast({
      title: "No videos found",
      description: `We couldn't find any videos matching "${validKeyword}". Please try a different search term.`,
      variant: "destructive"
    });
    
    return { 
      success: false,
      errorDetails: `No videos found matching: ${validKeyword}` 
    };
    
  } catch (error) {
    console.error(`[SearchAndPlay:${searchId}] ❌ UNEXPECTED ERROR:`, error);
    console.timeEnd(`[SearchAndPlay:${searchId}] Total search duration`);
    
    // Generate a toast notification for better user feedback
    toast({
      title: "Error searching for videos",
      description: error instanceof Error ? error.message : "An unexpected error occurred",
      variant: "destructive"
    });
    
    return { 
      success: false,
      errorDetails: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};
