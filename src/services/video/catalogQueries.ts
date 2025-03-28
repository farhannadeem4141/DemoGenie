
import { supabase } from "@/integrations/supabase/client";
import { VideoSearchResult } from "./types";

export async function queryVideosWithCatalogTag(): Promise<VideoSearchResult> {
  console.log("Running catalog tag query...");
  
  try {
    // First check if the Videos table exists and has any data
    const { count, error: countError } = await supabase
      .from('videos')
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
      console.log("Videos table exists but is empty - adding a sample video");
      
      // Add a sample catalog video since the table is empty
      const { data: newVideo, error: insertError } = await supabase
        .from('videos')
        .insert({
          video_name: 'WhatsApp Catalog Feature',
          video_url: 'https://aalbdeydgpallvcmmsvq.supabase.co/storage/v1/object/sign/DemoGenie/What%20is%20WhatsApp.mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJEZW1vR2VuaWUvV2hhdCBpcyBXaGF0c0FwcC5tcDQiLCJpYXQiOjE3NDExMDI1OTEsImV4cCI6MTc3MjYzODU5MX0.285hWWaFnlZJ8wLkuYaAyf_sLH0wjDzxv4kgXsGEzO4',
          video_tag1: 'catalog',
          video_tag2: 'whatsapp business',
          video_tag3: 'product showcase'
        })
        .select()
        .single();
      
      if (insertError) {
        console.error("Error adding sample video:", insertError);
        return {
          success: false,
          data: [],
          errorReason: `Failed to add sample video: ${insertError.message}`,
          searchDetails: {
            keywordUsed: "catalog",
            matchType: 'none',
            searchMethod: "sample video insert failed"
          }
        };
      }
      
      console.log("Added sample catalog video:", newVideo);
      return {
        success: true,
        data: [newVideo],
        searchDetails: {
          keywordUsed: "catalog",
          matchType: 'exact',
          searchMethod: "new sample video created"
        }
      };
    }
    
    // Try with case-insensitive search for "catalog" in all tag columns
    const { data: catalogData, error: catalogError } = await supabase
      .from('videos')
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
        .from('videos')
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

// Utility function to add a test video with specified tags
export async function addTestVideo(
  videoName: string, 
  videoUrl: string, 
  tag1: string, 
  tag2?: string, 
  tag3?: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('videos')
      .insert({
        video_name: videoName,
        video_url: videoUrl,
        video_tag1: tag1,
        video_tag2: tag2,
        video_tag3: tag3
      });
    
    if (error) {
      console.error("Error adding test video:", error);
      return false;
    }
    
    console.log("Successfully added test video:", videoName);
    return true;
  } catch (error) {
    console.error("Exception when adding test video:", error);
    return false;
  }
}
