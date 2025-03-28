
import { supabase } from "@/integrations/supabase/client";

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
