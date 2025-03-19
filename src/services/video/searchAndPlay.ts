
import { supabase } from '@/integrations/supabase/client';
import { VideoSearchResult } from './types';
import { validateVideoUrl } from './videoUrlValidator';

interface VideoSearchDetails {
  success: boolean;
  errorDetails?: {
    step: string;
    message: string;
    technicalDetails?: any;
  };
  video?: {
    id: number;
    video_url: string;
    video_name: string; // Changed from optional to required
    keyword: string;
  };
}

export async function searchAndPlayVideo(keyword: string): Promise<VideoSearchDetails> {
  console.log("%c [VIDEO SEARCH] ========== SEARCH START ==========", "background: #4CAF50; color: white; padding: 4px; border-radius: 4px; font-weight: bold;");
  console.log("%c [VIDEO SEARCH] Starting search for keyword: " + keyword, "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;");
  
  // Define fallback video URL
  const fallbackVideoUrl = "https://boncletesuahajikgrrz.supabase.co/storage/v1/object/public/videos//How%20To%20Advertise.mp4";
  
  try {
    // Clean and normalize the keyword for search
    if (!keyword || keyword.trim() === '') {
      console.error("%c [VIDEO SEARCH] Invalid or empty keyword provided", "background: #f44336; color: white; padding: 2px; border-radius: 4px;");
      return {
        success: false,
        errorDetails: {
          step: 'input_validation',
          message: 'Invalid or empty keyword provided'
        }
      };
    }
    
    const normalizedKeyword = keyword.trim().toLowerCase();
    console.log("%c [VIDEO SEARCH] Normalized keyword: " + normalizedKeyword, "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;");
    
    // Special handling for "Quick replies" - log that we're explicitly testing for this keyword
    if (normalizedKeyword === "quick replies") {
      console.log("%c [VIDEO SEARCH] Special test case detected: Quick replies keyword", "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;");
    }
    
    // First perform a database health check
    const { count, error: dbCheckError } = await supabase
      .from('Videos')
      .select('*', { count: 'exact', head: true });
    
    if (dbCheckError) {
      console.error("%c [VIDEO SEARCH] Database connectivity error:", "background: #f44336; color: white; padding: 2px; border-radius: 4px;", dbCheckError);
      return {
        success: false,
        errorDetails: {
          step: 'database_connection',
          message: 'Could not connect to the database',
          technicalDetails: dbCheckError
        }
      };
    }
    
    console.log("%c [VIDEO SEARCH] Database check successful - found " + count + " total videos", "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;");
    
    // Construct the query to search in multiple tag columns
    let query = supabase
      .from('Videos')
      .select('*');
    
    // Build both exact and case-insensitive conditions
    const exactQuery = `video_tag1.eq.${normalizedKeyword},video_tag2.eq.${normalizedKeyword},video_tag3.eq.${normalizedKeyword}`;
    const icontainsQuery = `video_tag1.ilike.%${normalizedKeyword}%,video_tag2.ilike.%${normalizedKeyword}%,video_tag3.ilike.%${normalizedKeyword}%`;
    
    query = query.or(exactQuery + ',' + icontainsQuery);
    
    // Generate query string for logging
    const queryString = `SELECT * FROM "Videos" WHERE (${exactQuery}) OR (${icontainsQuery})`;
    console.log("%c [VIDEO SEARCH] SQL query: " + queryString, "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;");
    
    // Execute the query
    console.log("%c [VIDEO SEARCH] Executing database query...", "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;");
    const { data, error } = await query;
    
    if (error) {
      console.error("%c [VIDEO SEARCH] Query execution error:", "background: #f44336; color: white; padding: 2px; border-radius: 4px;", error);
      return {
        success: false,
        errorDetails: {
          step: 'database_query',
          message: 'Error executing database query',
          technicalDetails: error
        }
      };
    }
    
    // Log the results for debugging
    console.log("%c [VIDEO SEARCH] Query returned " + (data?.length || 0) + " results", "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;");
    
    if (data && data.length > 0) {
      console.log("%c [VIDEO SEARCH] Found matching videos:", "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;");
      console.table(data.map(v => ({ 
        id: v.id, 
        name: v.video_name, 
        url: v.video_url?.substring(0, 30) + '...',
        tag1: v.video_tag1,
        tag2: v.video_tag2,
        tag3: v.video_tag3
      })));
    } else {
      console.log("%c [VIDEO SEARCH] No direct matches found", "background: #ff9800; color: white; padding: 2px; border-radius: 4px;");
    }
    
    if (!data || data.length === 0) {
      console.log("%c [VIDEO SEARCH] No matching videos found for keyword: " + normalizedKeyword, "background: #ff9800; color: white; padding: 2px; border-radius: 4px;");
      
      // Try a more lenient search for partial matches
      console.log("%c [VIDEO SEARCH] Trying more lenient search...", "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;");
      
      const lenientQuery = supabase
        .from('Videos')
        .select('*')
        .or(`video_tag1.ilike.%${normalizedKeyword.toLowerCase()}%,video_tag2.ilike.%${normalizedKeyword.toLowerCase()}%,video_tag3.ilike.%${normalizedKeyword.toLowerCase()}%`);
      
      const { data: lenientData, error: lenientError } = await lenientQuery;
      
      if (lenientError) {
        console.error("%c [VIDEO SEARCH] Lenient search error:", "background: #f44336; color: white; padding: 2px; border-radius: 4px;", lenientError);
        return {
          success: false,
          errorDetails: {
            step: 'lenient_search',
            message: 'Error executing lenient search query',
            technicalDetails: lenientError
          }
        };
      }
      
      if (!lenientData || lenientData.length === 0) {
        console.log("%c [VIDEO SEARCH] Even lenient search returned no results", "background: #f44336; color: white; padding: 2px; border-radius: 4px;");
        console.log("%c [VIDEO SEARCH] Using fallback video instead...", "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;");
        
        // Use the fallback video URL directly instead of querying for a fallback
        const validatedFallbackUrl = validateVideoUrl(fallbackVideoUrl);
        
        if (!validatedFallbackUrl) {
          console.error("%c [VIDEO SEARCH] Fallback video has invalid URL:", "background: #f44336; color: white; padding: 2px; border-radius: 4px;", fallbackVideoUrl);
          return {
            success: false,
            errorDetails: {
              step: 'url_validation',
              message: `Fallback video has invalid URL: ${fallbackVideoUrl || 'empty'}`,
            }
          };
        }
        
        console.log("%c [VIDEO SEARCH] Using hardcoded fallback video as last resort", "background: #ff9800; color: white; padding: 2px; border-radius: 4px;");
        return {
          success: true,
          video: {
            id: 999,  // Use a dummy ID for the fallback video
            video_url: validatedFallbackUrl,
            video_name: 'How To Advertise',
            keyword: normalizedKeyword
          }
        };
      }
      
      console.log("%c [VIDEO SEARCH] Found videos with lenient search:", "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;");
      console.table(lenientData.map(v => ({ 
        id: v.id, 
        name: v.video_name, 
        url: v.video_url?.substring(0, 30) + '...',
        tag1: v.video_tag1,
        tag2: v.video_tag2,
        tag3: v.video_tag3
      })));
      
      // Validate and sanitize video URL
      const videoUrl = validateVideoUrl(lenientData[0].video_url);
      if (!videoUrl) {
        console.error("%c [VIDEO SEARCH] Found video has invalid URL:", "background: #f44336; color: white; padding: 2px; border-radius: 4px;", lenientData[0].video_url);
        return {
          success: false,
          errorDetails: {
            step: 'url_validation',
            message: `Invalid video URL: ${lenientData[0].video_url || 'empty'}`,
            technicalDetails: {
              record: lenientData[0]
            }
          }
        };
      }
      
      console.log("%c [VIDEO SEARCH] Successfully found and validated video with lenient search", "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;");
      // Return the first matching video - ensure video_name is always a string
      return {
        success: true,
        video: {
          id: lenientData[0].id,
          video_url: videoUrl,
          video_name: lenientData[0].video_name || `Video related to "${normalizedKeyword}"`,
          keyword: normalizedKeyword
        }
      };
    }
    
    // Validate and sanitize video URL for direct matches
    const videoUrl = validateVideoUrl(data[0].video_url);
    if (!videoUrl) {
      console.error("%c [VIDEO SEARCH] Found video has invalid URL:", "background: #f44336; color: white; padding: 2px; border-radius: 4px;", data[0].video_url);
      return {
        success: false,
        errorDetails: {
          step: 'url_validation',
          message: `Invalid video URL: ${data[0].video_url || 'empty'}`,
          technicalDetails: {
            record: data[0]
          }
        }
      };
    }
    
    console.log("%c [VIDEO SEARCH] Successfully found and validated video with direct search", "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;");
    // Return the first matching video - ensure video_name is always a string
    return {
      success: true,
      video: {
        id: data[0].id,
        video_url: videoUrl,
        video_name: data[0].video_name || `Video related to "${normalizedKeyword}"`,
        keyword: normalizedKeyword
      }
    };
  } catch (error) {
    console.error("%c [VIDEO SEARCH] Unexpected exception:", "background: #f44336; color: white; padding: 2px; border-radius: 4px;", error);
    return {
      success: false,
      errorDetails: {
        step: 'exception',
        message: 'Unexpected error during video search',
        technicalDetails: error instanceof Error ? error.message : error
      }
    };
  } finally {
    console.log("%c [VIDEO SEARCH] ========== SEARCH END ==========", "background: #4CAF50; color: white; padding: 4px; border-radius: 4px; font-weight: bold;");
  }
}
