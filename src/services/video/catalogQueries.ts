
import { supabase } from "@/integrations/supabase/client";
import { VideoSearchResult } from "./types";
import { validateVideoUrl } from "./videoUrlValidator";

// Helper to generate public URL for video path
const getPublicVideoUrl = (videoPath: string): string | null => {
  try {
    if (!videoPath) return null;
    
    // If it's already a fully formed URL, validate and return it
    if (videoPath.startsWith('http')) {
      console.log("[URL GENERATOR] Processing existing URL:", videoPath);
      const validatedUrl = validateVideoUrl(videoPath);
      if (validatedUrl) {
        console.log("[URL GENERATOR] URL is already valid");
        return validatedUrl;
      } else {
        console.log("[URL GENERATOR] Existing URL is invalid, trying to generate new public URL");
      }
    }
    
    // Clean up the path if needed - remove any leading slashes
    const cleanPath = videoPath.replace(/^\/+/, '');
    console.log("[URL GENERATOR] Generating public URL for path:", cleanPath);
    
    // If it's a storage path, convert to public URL
    const { data } = supabase.storage.from("videos").getPublicUrl(cleanPath);
    
    if (!data || !data.publicUrl) {
      console.error("[URL GENERATOR] Failed to generate public URL for path:", cleanPath);
      return null;
    }
    
    console.log("[URL GENERATOR] Generated public URL:", data.publicUrl);
    const validatedUrl = validateVideoUrl(data.publicUrl);
    
    if (!validatedUrl) {
      console.error("[URL GENERATOR] Generated URL failed validation:", data.publicUrl);
    }
    
    return validatedUrl || data.publicUrl; // Return the URL even if validation fails as a fallback
  } catch (error) {
    console.error("[URL GENERATOR] Error generating public video URL:", error);
    return null;
  }
};

export async function queryVideosWithCatalogTag(): Promise<VideoSearchResult> {
  console.log("Running catalog tag query...");
  
  try {
    // First check if the videos table exists and has any data
    const { count, error: countError } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true });
    
    console.log("Total records in videos table:", count);
    
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
    
    if (count === 0 || count === null) {
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
      console.log("Sample video URL:", newVideo.video_url);
      
      // Validate and possibly convert the video URL
      const validatedUrl = validateVideoUrl(newVideo.video_url);
      if (!validatedUrl) {
        console.error("Sample video has invalid URL format:", newVideo.video_url);
        
        // Attempt to generate a public URL
        const publicUrl = getPublicVideoUrl(newVideo.video_url);
        if (publicUrl) {
          console.log("Generated public URL for sample video:", publicUrl);
          // Update the database with the public URL
          await supabase
            .from('videos')
            .update({ video_url: publicUrl })
            .eq('id', newVideo.id);
          
          // Update the returned object
          newVideo.video_url = publicUrl;
        }
      } else {
        console.log("Sample video URL is valid");
      }
      
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
      console.log("Fallback video URL:", firstVideo.video_url);
      
      // Validate and possibly convert the fallback video URL
      const validatedUrl = validateVideoUrl(firstVideo.video_url);
      if (!validatedUrl) {
        console.error("Fallback video has invalid URL format:", firstVideo.video_url);
        
        // Attempt to generate a public URL
        const publicUrl = getPublicVideoUrl(firstVideo.video_url);
        if (publicUrl) {
          console.log("Generated public URL for fallback video:", publicUrl);
          // Update the database with the public URL
          await supabase
            .from('videos')
            .update({ video_url: publicUrl })
            .eq('id', firstVideo.id);
          
          // Update the returned object
          firstVideo.video_url = publicUrl;
        }
      } else {
        console.log("Fallback video URL is valid");
      }
      
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
    
    // Process and validate all found catalog videos
    const validatedVideos = await Promise.all(catalogData.map(async (video) => {
      console.log(`Validating video URL for "${video.video_name}":`, video.video_url);
      
      // First try direct validation
      let validatedUrl = validateVideoUrl(video.video_url);
      
      if (!validatedUrl) {
        console.log(`Video "${video.video_name}" URL needs public URL generation`);
        
        // Attempt to generate a public URL
        const publicUrl = getPublicVideoUrl(video.video_url);
        if (publicUrl) {
          console.log(`Generated public URL for video "${video.video_name}":`, publicUrl);
          // Update the database with the public URL
          try {
            const { error: updateError } = await supabase
              .from('videos')
              .update({ video_url: publicUrl })
              .eq('id', video.id);
              
            if (updateError) {
              console.error(`Failed to update video URL in database:`, updateError);
            } else {
              console.log(`Successfully updated video URL in database for ID ${video.id}`);
            }
          } catch (updateErr) {
            console.error(`Exception updating video URL:`, updateErr);
          }
          
          // Update the returned object with the public URL
          return { ...video, video_url: publicUrl };
        }
      } else {
        console.log(`Video "${video.video_name}" URL is already valid`);
      }
      
      return video;
    }));
    
    return {
      success: true,
      data: validatedVideos,
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
    console.log(`Adding test video: ${videoName} with URL: ${videoUrl}`);
    
    // Validate the URL before attempting to add
    let finalUrl = videoUrl;
    const validatedUrl = validateVideoUrl(videoUrl);
    if (!validatedUrl) {
      console.error(`Invalid video URL format for test video "${videoName}":`, videoUrl);
      
      // Attempt to generate a public URL
      const publicUrl = getPublicVideoUrl(videoUrl);
      if (publicUrl) {
        console.log(`Generated public URL for test video "${videoName}":`, publicUrl);
        finalUrl = publicUrl;
      } else {
        return false;
      }
    }
    
    const { data, error } = await supabase
      .from('videos')
      .insert({
        video_name: videoName,
        video_url: finalUrl,
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
