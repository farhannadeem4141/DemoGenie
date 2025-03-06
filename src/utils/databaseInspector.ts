
import { supabase } from "@/integrations/supabase/client";

/**
 * Utility function to fetch all videos from the database
 * @returns Promise with the query result
 */
export async function inspectVideosTable() {
  console.log("Running database inspection on Videos table...");
  
  try {
    // Fetch all records from the Videos table
    const { data, error } = await supabase
      .from('Videos')
      .select('*');
    
    if (error) {
      console.error("Error fetching videos:", error);
      return { success: false, data: null, error };
    }
    
    // Log the results for inspection
    console.log("Videos table contents:", data);
    
    // Also log individual records in a more readable format
    if (data && data.length > 0) {
      console.log(`Found ${data.length} videos in the database:`);
      data.forEach((video, index) => {
        console.log(`\nVideo #${index + 1}:`);
        console.log(`ID: ${video.id}`);
        console.log(`Name: ${video.video_name}`);
        console.log(`URL: ${video.video_url}`);
        console.log(`Tags: ${video.video_tag1 || 'none'}, ${video.video_tag2 || 'none'}, ${video.video_tag3 || 'none'}`);
        console.log(`Created: ${video.created_at}`);
      });
    } else {
      console.log("No videos found in the database.");
    }
    
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error during database inspection:", error);
    return { success: false, data: null, error };
  }
}

/**
 * Utility function to search for videos with a specific tag value
 * @param tagValue The tag value to search for
 * @returns Promise with the query result
 */
export async function searchVideosByTagValue(tagValue: string) {
  console.log(`Searching videos with tag value: "${tagValue}"`);
  
  try {
    // Run a direct SQL query to find any videos with the specified tag
    const { data, error } = await supabase
      .from('Videos')
      .select('*')
      .or(`video_tag1.eq.${tagValue},video_tag2.eq.${tagValue},video_tag3.eq.${tagValue}`);
    
    console.log("Search results:", data);
    console.log("Search error:", error);
    
    // Also try an ilike search for case-insensitive matching
    const { data: ilikeData, error: ilikeError } = await supabase
      .from('Videos')
      .select('*')
      .or(`video_tag1.ilike.%${tagValue}%,video_tag2.ilike.%${tagValue}%,video_tag3.ilike.%${tagValue}%`);
    
    console.log("Case-insensitive search results:", ilikeData);
    console.log("Case-insensitive search error:", ilikeError);
    
    return { 
      exactMatch: { success: !error, data, error },
      partialMatch: { success: !ilikeError, data: ilikeData, error: ilikeError }
    };
  } catch (error) {
    console.error("Unexpected error during tag search:", error);
    return { 
      exactMatch: { success: false, data: null, error },
      partialMatch: { success: false, data: null, error }
    };
  }
}

// Run the inspection immediately when this module is imported
inspectVideosTable();

// Also run a specific search for "catalog" tag
searchVideosByTagValue("catalog");
