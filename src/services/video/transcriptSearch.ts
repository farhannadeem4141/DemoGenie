import { supabase } from "@/integrations/supabase/client";
import { validateVideoUrl } from "./videoUrlValidator";
import { useToast } from "@/hooks/use-toast";
import { validateSearchKeyword } from "@/utils/videoLoadingManager";

interface TranscriptSearchResult {
  videos: string[];
  success: boolean;
  error?: string;
}

// Function to fetch videos based on stored text
export const fetchVideos = async (): Promise<string[]> => {
  try {
    // Get text from local storage
    const storedText = localStorage.getItem("transcript") || "";
    if (!storedText) {
      console.warn("No transcript found in local storage");
      return [];
    }

    // Extract keywords (splitting by space for simplicity)
    const keywords = storedText.split(" ")
      .filter(word => word.trim().length >= 3) // Only use words with 3+ characters
      .slice(0, 3); // Pick first 3 substantial words
    
    if (keywords.length === 0) {
      console.warn("No valid keywords found in transcript");
      return [];
    }
    
    console.log("Extracted Keywords:", keywords);
    
    // Validate keywords before search
    const validatedKeywords = keywords
      .map(keyword => validateSearchKeyword(keyword))
      .filter(Boolean) as string[];
      
    if (validatedKeywords.length === 0) {
      console.warn("No valid keywords after validation");
      return [];
    }
    
    console.log("Validated Keywords:", validatedKeywords);

    // Query Supabase
    const { data, error } = await supabase
      .from("videos")
      .select("video_url")
      .or(
        validatedKeywords.map((keyword, index) => 
          `video_tag${index + 1}.ilike.%${keyword}%`
        ).join(", ")
      );

    if (error) {
      console.error("Error fetching videos:", error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log("No videos found matching keywords:", validatedKeywords);
      return [];
    }

    // Extract and validate video URLs
    const videoUrls = data
      .map((video) => validateVideoUrl(video.video_url))
      .filter(url => !!url); // Filter out invalid URLs
      
    console.log("Fetched and validated Video URLs:", videoUrls);
    return videoUrls;
  } catch (error) {
    console.error("Unexpected error:", error);
    return [];
  }
};

// Enhanced version with detailed error reporting
export const fetchVideosWithDetails = async (): Promise<TranscriptSearchResult> => {
  try {
    // Get text from local storage
    const storedText = localStorage.getItem("transcript") || "";
    if (!storedText) {
      console.warn("No transcript found in local storage");
      return { videos: [], success: false, error: "No transcript text found in local storage" };
    }

    console.log("Transcript Search: Using transcript:", storedText);

    // Extract keywords (splitting by space for simplicity)
    const keywords = storedText.split(" ")
      .filter(word => word.trim().length >= 3) // Only use words with 3+ characters
      .slice(0, 3); // Pick first 3 substantial words
    
    console.log("Transcript Search: Extracted Keywords:", keywords);
    
    // Validate keywords before search
    const validatedKeywords = keywords
      .map(keyword => validateSearchKeyword(keyword))
      .filter(Boolean) as string[];
      
    if (validatedKeywords.length === 0) {
      return { 
        videos: [], 
        success: false, 
        error: "No valid keywords extracted from transcript" 
      };
    }
    
    console.log("Transcript Search: Validated Keywords:", validatedKeywords);

    // Build the OR query conditions
    const conditions = validatedKeywords
      .filter(k => k && k.trim().length > 0)
      .map((keyword, index) => {
        // Use modulo to cycle through the 3 tag columns if we have more than 3 keywords
        const tag = `video_tag${(index % 3) + 1}`;
        return `${tag}.ilike.%${keyword}%`;
      })
      .join(", ");
    
    console.log("Transcript Search: Query conditions:", conditions);

    // Query Supabase
    const { data, error } = await supabase
      .from("videos")
      .select("video_url")
      .or(conditions);

    if (error) {
      console.error("Transcript Search: Database error:", error);
      return { videos: [], success: false, error: `Database error: ${error.message}` };
    }

    if (!data || data.length === 0) {
      console.log("Transcript Search: No matching videos found for keywords:", validatedKeywords);
      return { videos: [], success: false, error: `No videos found matching keywords: ${validatedKeywords.join(", ")}` };
    }

    // Extract and validate video URLs
    const videoUrls = data
      .map(video => validateVideoUrl(video.video_url))
      .filter(url => !!url); // Filter out invalid URLs
    
    console.log("Transcript Search: Fetched and validated Video URLs:", videoUrls);
    
    if (videoUrls.length === 0) {
      return { 
        videos: [], 
        success: false, 
        error: "Found matching videos but URLs were invalid or inaccessible" 
      };
    }
    
    return { videos: videoUrls, success: true };
  } catch (error) {
    console.error("Transcript Search: Unexpected error:", error);
    return { 
      videos: [], 
      success: false, 
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// New function to test if the video URLs are accessible directly in the browser
export const testVideoUrls = async (): Promise<{url: string, accessible: boolean}[]> => {
  try {
    // Get all videos from database
    const { data, error } = await supabase
      .from("videos")
      .select("video_url");
      
    if (error) {
      console.error("Error fetching videos for testing:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.warn("No videos found in database to test");
      return [];
    }
    
    // Test each URL and return results
    const results = await Promise.all(
      data.map(async (video) => {
        const validUrl = validateVideoUrl(video.video_url);
        if (!validUrl) {
          return { url: video.video_url, accessible: false };
        }
        
        // Use fetch to test if the URL is accessible
        try {
          const response = await fetch(validUrl, { 
            method: 'HEAD',
            mode: 'no-cors' // This allows checking URLs even with CORS restrictions
          });
          
          return { url: validUrl, accessible: true };
        } catch (e) {
          console.error("URL not accessible:", validUrl, e);
          return { url: validUrl, accessible: false };
        }
      })
    );
    
    return results;
  } catch (error) {
    console.error("Error testing video URLs:", error);
    return [];
  }
};
