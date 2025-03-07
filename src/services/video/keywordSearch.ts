
import { supabase } from '@/integrations/supabase/client';
import { VideoSearchResult } from './types';

export async function searchVideosByKeyword(keyword: string): Promise<VideoSearchResult> {
  console.log("%c [DB QUERY] Searching for videos with keyword: " + keyword, "background: #ff9e00; color: black; padding: 2px; border-radius: 4px;");
  
  try {
    // Clean and normalize the keyword for search
    const normalizedKeyword = keyword.trim();
    console.log("%c [DB QUERY] Normalized keyword: " + normalizedKeyword, "background: #ff9e00; color: black; padding: 2px; border-radius: 4px;");
    
    // Construct the query to search in multiple tag columns
    let query = supabase
      .from('Videos')
      .select('*');
    
    // Build both exact and case-insensitive conditions
    const exactQuery = `video_tag1.eq.${normalizedKeyword},video_tag2.eq.${normalizedKeyword},video_tag3.eq.${normalizedKeyword}`;
    const icontainsQuery = `video_tag1.ilike.%${normalizedKeyword}%,video_tag2.ilike.%${normalizedKeyword}%,video_tag3.ilike.%${normalizedKeyword}%`;
    
    query = query.or(exactQuery + ',' + icontainsQuery);
    
    // Generate query string for logging (without toSql method)
    const queryString = `SELECT * FROM "Videos" WHERE ${exactQuery} OR ${icontainsQuery}`;
    console.log("%c [DB QUERY] SQL query: " + queryString, "background: #ff9e00; color: black; padding: 2px; border-radius: 4px;");
    
    // Execute the query
    const { data, error } = await query;
    
    console.log("%c [DB QUERY] Query results:", "background: #ff9e00; color: black; padding: 2px; border-radius: 4px;");
    console.log("%c [DB QUERY] Data:", "background: #ff9e00; color: black; padding: 2px; border-radius: 4px;", data);
    console.log("%c [DB QUERY] Error:", "background: #ff9e00; color: black; padding: 2px; border-radius: 4px;", error);
    
    if (error) {
      console.error('Error searching for videos:', error);
      return {
        success: false,
        errorReason: error.message,
        searchDetails: {
          keywordUsed: normalizedKeyword,
          matchType: 'none',
          searchMethod: 'database error'
        },
        rawQuery: queryString
      };
    }
    
    if (!data || data.length === 0) {
      console.log("%c [DB QUERY] No matching videos found for keyword: " + normalizedKeyword, "background: #ff9e00; color: black; padding: 2px; border-radius: 4px;");
      
      // Try a more lenient search with case-insensitive partial matching
      console.log("%c [DB QUERY] Trying more lenient search...", "background: #ff9e00; color: black; padding: 2px; border-radius: 4px;");
      
      const lenientQuery = supabase
        .from('Videos')
        .select('*')
        .or(`video_tag1.ilike.%${normalizedKeyword.toLowerCase()}%,video_tag2.ilike.%${normalizedKeyword.toLowerCase()}%,video_tag3.ilike.%${normalizedKeyword.toLowerCase()}%`);
      
      // Generate lenient query string for logging
      const lenientQueryString = `SELECT * FROM "Videos" WHERE video_tag1 ILIKE %${normalizedKeyword.toLowerCase()}% OR video_tag2 ILIKE %${normalizedKeyword.toLowerCase()}% OR video_tag3 ILIKE %${normalizedKeyword.toLowerCase()}%`;
      console.log("%c [DB QUERY] Lenient SQL query: " + lenientQueryString, "background: #ff9e00; color: black; padding: 2px; border-radius: 4px;");
      
      const { data: lenientData, error: lenientError } = await lenientQuery;
      
      console.log("%c [DB QUERY] Lenient query results:", "background: #ff9e00; color: black; padding: 2px; border-radius: 4px;");
      console.log("%c [DB QUERY] Lenient data:", "background: #ff9e00; color: black; padding: 2px; border-radius: 4px;", lenientData);
      
      if (lenientError) {
        return {
          success: false,
          errorReason: lenientError.message,
          searchDetails: {
            keywordUsed: normalizedKeyword,
            matchType: 'none',
            searchMethod: 'lenient search error'
          },
          rawQuery: lenientQueryString
        };
      }
      
      if (!lenientData || lenientData.length === 0) {
        return {
          success: false,
          errorReason: 'No videos found',
          searchDetails: {
            keywordUsed: normalizedKeyword,
            matchType: 'none',
            searchMethod: 'both exact and lenient search'
          },
          rawQuery: lenientQueryString
        };
      }
      
      console.log("%c [DB QUERY] Found videos with lenient search:", "background: #ff9e00; color: black; padding: 2px; border-radius: 4px;", lenientData);
      return {
        success: true,
        data: lenientData,
        searchDetails: {
          keywordUsed: normalizedKeyword,
          matchType: 'partial',
          searchMethod: 'lenient search'
        },
        rawQuery: lenientQueryString
      };
    }
    
    console.log("%c [DB QUERY] Found videos:", "background: #ff9e00; color: black; padding: 2px; border-radius: 4px;", data);
    return {
      success: true,
      data,
      searchDetails: {
        keywordUsed: normalizedKeyword,
        matchType: 'exact',
        searchMethod: 'primary search'
      },
      rawQuery: queryString
    };
  } catch (error) {
    console.error('Exception in searchVideosByKeyword:', error);
    return {
      success: false,
      errorReason: error instanceof Error ? error.message : 'Unknown error',
      searchDetails: {
        keywordUsed: keyword,
        matchType: 'none',
        searchMethod: 'exception'
      },
      rawQuery: 'Error: Query construction failed'
    };
  }
}
