
import { supabase } from "@/integrations/supabase/client";

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
    const keywords = storedText.split(" ").slice(0, 3); // Pick first 3 words
    console.log("Extracted Keywords:", keywords);

    // Query Supabase
    const { data, error } = await supabase
      .from("videos")
      .select("video_url")
      .or(
        `video_tag1.ilike.%${keywords[0]}%, video_tag2.ilike.%${keywords[1]}%, video_tag3.ilike.%${keywords[2]}%`
      );

    if (error) {
      console.error("Error fetching videos:", error);
      return [];
    }

    // Extract video URLs
    const videoUrls = data.map((video) => video.video_url);
    console.log("Fetched Video URLs:", videoUrls);
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

    // Extract keywords (splitting by space for simplicity)
    const keywords = storedText.split(" ").slice(0, 3); // Pick first 3 words
    console.log("Transcript Search: Extracted Keywords:", keywords);

    if (keywords.length === 0 || (keywords.length === 1 && keywords[0].trim() === "")) {
      return { videos: [], success: false, error: "No valid keywords extracted from transcript" };
    }

    // Build the OR query conditions
    const conditions = keywords
      .filter(k => k && k.trim().length > 0)
      .map((keyword, index) => {
        const tag = `video_tag${index + 1}`;
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
      console.log("Transcript Search: No matching videos found for keywords:", keywords);
      return { videos: [], success: false, error: `No videos found matching keywords: ${keywords.join(", ")}` };
    }

    // Extract video URLs
    const videoUrls = data.map((video) => video.video_url).filter(url => url);
    console.log("Transcript Search: Fetched Video URLs:", videoUrls);
    
    if (videoUrls.length === 0) {
      return { videos: [], success: false, error: "Found matching videos but URLs were empty" };
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
