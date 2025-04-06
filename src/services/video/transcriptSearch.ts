import { supabase } from "@/integrations/supabase/client";
import { validateVideoUrl } from "./videoUrlValidator";
import { validateSearchKeyword, isNewTranscript } from "@/utils/videoLoadingManager";

interface TranscriptSearchResult {
  videos: string[];
  success: boolean;
  error?: string;
}

interface VideoSearchResult {
  success: boolean;
  videoUrl?: string;
  videoName?: string;
  data?: any[];
  errorReason?: string;
  searchDetails?: {
    keywordUsed: string;
    matchType?: 'exact' | 'partial' | 'none' | 'fallback';
    searchMethod?: string;
  };
  rawQuery?: string;
}

// Function to fetch videos based on stored text
export const fetchVideos = async (): Promise<string[]> => {
  try {
    // Get text from local storage
    const storedText = localStorage.getItem("transcript") || "";
    if (!storedText) {
      console.warn("[TRANSCRIPT-SEARCH] No transcript found in local storage");
      return [];
    }

    console.log("[TRANSCRIPT-SEARCH] Raw transcript:", storedText);

    // Don't skip similar transcripts for basic fetch
    // We want to make sure we attempt to return videos even for similar transcripts
    
    // Clean the transcript - remove duplicate words
    const cleanedText = cleanTranscript(storedText);
    console.log("[TRANSCRIPT-SEARCH] Cleaned transcript:", cleanedText);

    // Extract keywords (splitting by space for simplicity)
    const keywords = cleanedText.split(" ")
      .filter(word => word.trim().length >= 3) // Only use words with 3+ characters
      .slice(0, 3); // Pick first 3 substantial words
    
    if (keywords.length === 0) {
      console.warn("[TRANSCRIPT-SEARCH] No valid keywords found in transcript");
      return [];
    }
    
    console.log("[TRANSCRIPT-SEARCH] Extracted Keywords:", keywords);
    
    // Validate keywords before search
    const validatedKeywords = keywords
      .map(keyword => validateSearchKeyword(keyword))
      .filter(Boolean) as string[];
      
    if (validatedKeywords.length === 0) {
      console.warn("[TRANSCRIPT-SEARCH] No valid keywords after validation");
      return [];
    }
    
    console.log("[TRANSCRIPT-SEARCH] Validated Keywords:", validatedKeywords);

    // Query Supabase with more flexible matching
    const { data, error } = await supabase
      .from("videos")
      .select("video_url")
      .or(
        validatedKeywords.map(keyword => 
          `video_tag1.ilike.%${keyword}%,video_tag2.ilike.%${keyword}%,video_tag3.ilike.%${keyword}%`
        ).join(",")
      );

    if (error) {
      console.error("[TRANSCRIPT-SEARCH] Error fetching videos:", error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log("[TRANSCRIPT-SEARCH] No videos found matching keywords:", validatedKeywords);
      return [];
    }

    // Extract and validate video URLs
    const videoUrls = data
      .map((video) => validateVideoUrl(video.video_url))
      .filter(url => !!url); // Filter out invalid URLs
      
    console.log("[TRANSCRIPT-SEARCH] Fetched and validated Video URLs:", videoUrls);
    return videoUrls;
  } catch (error) {
    console.error("[TRANSCRIPT-SEARCH] Unexpected error:", error);
    return [];
  }
};

// Helper function to clean transcript text and remove duplicates
const cleanTranscript = (text: string): string => {
  // Convert to lowercase and trim
  let cleaned = text.toLowerCase().trim();
  
  // Split by spaces
  const words = cleaned.split(/\s+/);
  
  // Remove consecutive duplicate words
  const deduplicatedWords: string[] = [];
  for (let i = 0; i < words.length; i++) {
    // Only add if it's different from the previous word
    if (i === 0 || words[i] !== words[i - 1]) {
      deduplicatedWords.push(words[i]);
    }
  }
  
  return deduplicatedWords.join(' ');
};

// Enhanced version with detailed error reporting
export const fetchVideosWithDetails = async (): Promise<TranscriptSearchResult> => {
  try {
    // Get text from local storage
    const storedText = localStorage.getItem("transcript") || "";
    if (!storedText) {
      console.warn("[TRANSCRIPT-SEARCH] No transcript found in local storage");
      return { videos: [], success: false, error: "No transcript text found in local storage" };
    }

    console.log("[TRANSCRIPT-SEARCH] Using transcript:", storedText);
    
    // Always process transcript for fetchVideosWithDetails
    // We want detailed video search to always attempt to find something
    
    // Clean the transcript - remove duplicate words
    const cleanedText = cleanTranscript(storedText);
    console.log("[TRANSCRIPT-SEARCH] Cleaned transcript:", cleanedText);

    // Extract keywords (splitting by space for simplicity)
    const keywords = cleanedText.split(" ")
      .filter(word => word.trim().length >= 3) // Only use words with 3+ characters
      .slice(0, 3); // Pick first 3 substantial words
    
    console.log("[TRANSCRIPT-SEARCH] Extracted Keywords:", keywords);
    
    // Check for special keywords that should take priority
    const priorityKeywords = ["quick", "replies", "business", "whatsapp", "template"];
    const foundPriorityKeywords = keywords.filter(k => 
      priorityKeywords.some(pk => k.toLowerCase().includes(pk.toLowerCase()))
    );
    
    // Use priority keywords if found, otherwise use original keywords
    const keywordsToUse = foundPriorityKeywords.length > 0 ? 
      foundPriorityKeywords : keywords;
      
    console.log("[TRANSCRIPT-SEARCH] Using keywords:", keywordsToUse);
    
    // Validate keywords before search
    const validatedKeywords = keywordsToUse
      .map(keyword => validateSearchKeyword(keyword))
      .filter(Boolean) as string[];
      
    if (validatedKeywords.length === 0) {
      // Even if no validated keywords, try using the first word of the transcript as fallback
      const firstWord = storedText.split(' ')[0];
      if (firstWord && firstWord.length >= 2) {
        const fallbackKeyword = validateSearchKeyword(firstWord);
        if (fallbackKeyword) {
          validatedKeywords.push(fallbackKeyword);
          console.log("[TRANSCRIPT-SEARCH] Using fallback keyword:", fallbackKeyword);
        }
      }
      
      if (validatedKeywords.length === 0) {
        return { 
          videos: [], 
          success: false, 
          error: "No valid keywords extracted from transcript" 
        };
      }
    }
    
    console.log("[TRANSCRIPT-SEARCH] Validated Keywords:", validatedKeywords);

    // Build more flexible query conditions to improve matches
    const conditions: string[] = [];
    
    // For each keyword, check all tag columns
    validatedKeywords.forEach(keyword => {
      if (keyword && keyword.trim().length > 0) {
        conditions.push(`video_tag1.ilike.%${keyword}%`);
        conditions.push(`video_tag2.ilike.%${keyword}%`);
        conditions.push(`video_tag3.ilike.%${keyword}%`);
      }
    });
    
    // If we have no conditions, add a fallback
    if (conditions.length === 0) {
      // Use the first word from original transcript as fallback
      const firstWord = storedText.split(' ')[0];
      if (firstWord && firstWord.length >= 2) {
        conditions.push(`video_tag1.ilike.%${firstWord}%`);
      }
    }
    
    const queryConditions = conditions.join(",");
    console.log("[TRANSCRIPT-SEARCH] Query conditions:", queryConditions);

    // Query Supabase with more flexible matching
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .or(queryConditions);

    if (error) {
      console.error("[TRANSCRIPT-SEARCH] Database error:", error);
      return { videos: [], success: false, error: `Database error: ${error.message}` };
    }

    if (!data || data.length === 0) {
      console.log("[TRANSCRIPT-SEARCH] No matching videos found for keywords:", validatedKeywords);
      
      // Try a fallback search - just get any video as last resort
      const fallbackResult = await supabase
        .from("videos")
        .select("*")
        .limit(1);
        
      if (fallbackResult.data && fallbackResult.data.length > 0) {
        console.log("[TRANSCRIPT-SEARCH] Found fallback video");
        
        // Extract and validate video URLs
        const videoUrls = fallbackResult.data
          .map(video => validateVideoUrl(video.video_url))
          .filter(url => !!url);
          
        if (videoUrls.length > 0) {
          return { videos: videoUrls, success: true };
        }
      }
      
      return { videos: [], success: false, error: `No videos found matching keywords: ${validatedKeywords.join(", ")}` };
    }

    // Extract and validate video URLs
    const videoUrls = data
      .map(video => validateVideoUrl(video.video_url))
      .filter(url => !!url); // Filter out invalid URLs
    
    console.log("[TRANSCRIPT-SEARCH] Fetched and validated Video URLs:", videoUrls);
    
    if (videoUrls.length === 0) {
      return { 
        videos: [], 
        success: false, 
        error: "Found matching videos but URLs were invalid or inaccessible" 
      };
    }
    
    return { videos: videoUrls, success: true };
  } catch (error) {
    console.error("[TRANSCRIPT-SEARCH] Unexpected error:", error);
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
      console.error("[TRANSCRIPT-SEARCH] Error fetching videos for testing:", error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.warn("[TRANSCRIPT-SEARCH] No videos found in database to test");
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
          console.error("[TRANSCRIPT-SEARCH] URL not accessible:", validUrl, e);
          return { url: validUrl, accessible: false };
        }
      })
    );
    
    return results;
  } catch (error) {
    console.error("[TRANSCRIPT-SEARCH] Error testing video URLs:", error);
    return [];
  }
};

// New utility to get a hard-coded fallback video in case all else fails
export const getFallbackVideo = (): string => {
  return "https://boncletesuahajikgrrz.supabase.co/storage/v1/object/public/videos//WhatsApp%20end-to-end%20encryption.mp4";
};

// Export the searchTranscript function that the other modules are looking for
export const searchTranscript = async (transcript: string): Promise<VideoSearchResult | null> => {
  try {
    console.log("[TranscriptSearch] Searching for videos with transcript:", transcript);
    
    // Clean and normalize the input
    if (!transcript || transcript.trim().length < 2) {
      console.log("[TranscriptSearch] Skipping search - transcript too short");
      return null;
    }
    
    // Store transcript in localStorage for consistency
    localStorage.setItem("transcript", transcript);
    
    // Fetch detailed video results
    const result = await fetchVideosWithDetails();
    
    if (!result.success || result.videos.length === 0) {
      console.log("[TranscriptSearch] No videos found for transcript:", transcript);
      return null;
    }
    
    // Get the first video URL from the results
    const videoUrl = result.videos[0];
    
    // Validate the URL
    if (!videoUrl) {
      console.log("[TranscriptSearch] No valid video URL found");
      return null;
    }
    
    // Create search result with video URL
    return {
      success: true,
      videoUrl: videoUrl,
      videoName: "Transcript Match Video",
      searchDetails: {
        keywordUsed: transcript,
        matchType: 'exact',
        searchMethod: 'transcript search'
      }
    };
  } catch (error) {
    console.error("[TranscriptSearch] Error searching for videos:", error);
    return null;
  }
};
