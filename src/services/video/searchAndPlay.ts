
import { searchTranscript } from './transcriptSearch';
import { searchKeywords } from './keywordSearch';
import { validateVideoUrl } from './videoUrlValidator';
import { VideoSearchResult } from './types';

// Track recent searches to avoid duplicate processing
const recentSearches = new Map<string, { timestamp: number, result: VideoSearchResult | null }>();
const RECENT_SEARCH_EXPIRY = 30000; // 30 seconds

// Clean up old searches periodically
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  recentSearches.forEach((data, key) => {
    if (now - data.timestamp > RECENT_SEARCH_EXPIRY) {
      console.log(`[SearchAndPlay:search-${Date.now()}-${Math.random().toString(36).substring(2, 6)}] Removed "${key}" from recent searches list after timeout`);
      recentSearches.delete(key);
    }
  });
}, 60000);

export const searchAndPlay = async (transcript: string): Promise<VideoSearchResult | null> => {
  const searchId = `search-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  console.log(`[SearchAndPlay:${searchId}] 🔎 Starting search for: "${transcript}"`);
  
  // Skip processing if we've seen this exact transcript recently
  if (recentSearches.has(transcript)) {
    const cached = recentSearches.get(transcript);
    if (cached && Date.now() - cached.timestamp < RECENT_SEARCH_EXPIRY) {
      console.log(`[SearchAndPlay:${searchId}] Using cached result for "${transcript}"`);
      
      // If we have a cached result with a video, dispatch an event to play it
      if (cached.result?.videoUrl) {
        console.log(`[SearchAndPlay:${searchId}] 📣 Dispatching cached video play event: ${cached.result.videoName}`);
        dispatchVideoPlayEvent(cached.result.videoUrl, cached.result.videoName);
      }
      
      return cached.result;
    }
  }
  
  console.time(`[SearchAndPlay:${searchId}] Total search time`);
  
  try {
    // Primary search using transcript search
    console.log(`[SearchAndPlay:${searchId}] Trying transcript search first`);
    console.time(`[SearchAndPlay:${searchId}] Transcript search time`);
    let result = await searchTranscript(transcript);
    console.timeEnd(`[SearchAndPlay:${searchId}] Transcript search time`);
    
    // If no result from transcript search, try keyword search as fallback
    if (!result || !result.videoUrl) {
      console.log(`[SearchAndPlay:${searchId}] No result from transcript search, trying keyword search`);
      console.time(`[SearchAndPlay:${searchId}] Keyword search time`);
      result = await searchKeywords(transcript);
      console.timeEnd(`[SearchAndPlay:${searchId}] Keyword search time`);
    }
    
    if (result && result.videoUrl) {
      console.log(`[SearchAndPlay:${searchId}] ✅ Found video: ${result.videoName || "Unnamed Video"}`);
      
      // Ensure URL is valid and properly formatted
      const validUrl = validateVideoUrl(result.videoUrl);
      
      if (validUrl) {
        console.log(`[SearchAndPlay:${searchId}] 🔗 Validated URL: ${validUrl.substring(0, 50)}...`);
        result.videoUrl = validUrl;
        
        // Dispatch an event to notify that we have a video to play
        console.log(`[SearchAndPlay:${searchId}] 📣 Dispatching video play event`);
        dispatchVideoPlayEvent(result.videoUrl, result.videoName);
        
        // Also dispatch a more specific event for components that might be listening
        window.dispatchEvent(new CustomEvent('video_found', {
          detail: {
            videoUrl: result.videoUrl,
            videoName: result.videoName,
            searchId
          }
        }));
      } else {
        console.error(`[SearchAndPlay:${searchId}] ❌ Invalid video URL: ${result.videoUrl}`);
        result = null;
      }
    } else {
      console.log(`[SearchAndPlay:${searchId}] ❌ No video found for transcript`);
    }
    
    // Cache the result
    recentSearches.set(transcript, { timestamp: Date.now(), result });
    
    console.timeEnd(`[SearchAndPlay:${searchId}] Total search time`);
    return result;
  } catch (error) {
    console.error(`[SearchAndPlay:${searchId}] 💥 Error during search:`, error);
    console.timeEnd(`[SearchAndPlay:${searchId}] Total search time`);
    return null;
  }
};

// Helper to dispatch video play event
function dispatchVideoPlayEvent(videoUrl: string, videoName?: string) {
  try {
    console.log(`[SearchAndPlay] Dispatching video_play_request event`);
    window.dispatchEvent(new CustomEvent('video_play_request', {
      detail: {
        videoUrl,
        videoName
      }
    }));
    
    // Directly dispatch to parent documents too (if in iframe)
    try {
      if (window.parent && window.parent !== window) {
        console.log('[SearchAndPlay] Also dispatching to parent window (iframe support)');
        window.parent.dispatchEvent(new CustomEvent('video_play_request', {
          detail: {
            videoUrl,
            videoName
          }
        }));
      }
    } catch (e) {
      console.warn('[SearchAndPlay] Error dispatching to parent:', e);
    }
  } catch (e) {
    console.error('[SearchAndPlay] Error dispatching video event:', e);
  }
}
