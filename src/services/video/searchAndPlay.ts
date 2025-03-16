
import { supabase } from '@/integrations/supabase/client';
import { VideoSearchResult } from './types';

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
  console.log("%c [VIDEO SEARCH] Starting search for keyword: " + keyword, "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;");
  
  try {
    // Clean and normalize the keyword for search
    if (!keyword || keyword.trim() === '') {
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
    const { data, error } = await query;
    
    // Log the results for debugging
    console.log("%c [VIDEO SEARCH] Query results:", "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;");
    console.log("%c [VIDEO SEARCH] Data:", "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;", data);
    console.log("%c [VIDEO SEARCH] Error:", "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;", error);
    
    if (error) {
      return {
        success: false,
        errorDetails: {
          step: 'database_query',
          message: 'Error executing database query',
          technicalDetails: error
        }
      };
    }
    
    if (!data || data.length === 0) {
      console.log("%c [VIDEO SEARCH] No matching videos found for keyword: " + normalizedKeyword, "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;");
      
      // Try a more lenient search for partial matches
      console.log("%c [VIDEO SEARCH] Trying more lenient search...", "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;");
      
      const lenientQuery = supabase
        .from('Videos')
        .select('*')
        .or(`video_tag1.ilike.%${normalizedKeyword.toLowerCase()}%,video_tag2.ilike.%${normalizedKeyword.toLowerCase()}%,video_tag3.ilike.%${normalizedKeyword.toLowerCase()}%`);
      
      const { data: lenientData, error: lenientError } = await lenientQuery;
      
      if (lenientError) {
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
        return {
          success: false,
          errorDetails: {
            step: 'no_results',
            message: `No videos found for keyword "${normalizedKeyword}" in any tags`,
            technicalDetails: {
              keyword: normalizedKeyword,
              searchMethod: 'both exact and lenient search'
            }
          }
        };
      }
      
      console.log("%c [VIDEO SEARCH] Found videos with lenient search:", "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;", lenientData);
      
      // Validate video URL
      if (!lenientData[0].video_url || !lenientData[0].video_url.startsWith('http')) {
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
      
      // Return the first matching video - ensure video_name is always a string
      return {
        success: true,
        video: {
          id: lenientData[0].id,
          video_url: lenientData[0].video_url,
          video_name: lenientData[0].video_name || `Video related to "${normalizedKeyword}"`,
          keyword: normalizedKeyword
        }
      };
    }
    
    console.log("%c [VIDEO SEARCH] Found videos:", "background: #4CAF50; color: white; padding: 2px; border-radius: 4px;", data);
    
    // Validate video URL
    if (!data[0].video_url || !data[0].video_url.startsWith('http')) {
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
    
    // Return the first matching video - ensure video_name is always a string
    return {
      success: true,
      video: {
        id: data[0].id,
        video_url: data[0].video_url,
        video_name: data[0].video_name || `Video related to "${normalizedKeyword}"`,
        keyword: normalizedKeyword
      }
    };
  } catch (error) {
    console.error('[VIDEO SEARCH] Exception in searchAndPlayVideo:', error);
    return {
      success: false,
      errorDetails: {
        step: 'exception',
        message: 'Unexpected error during video search',
        technicalDetails: error instanceof Error ? error.message : error
      }
    };
  }
}
