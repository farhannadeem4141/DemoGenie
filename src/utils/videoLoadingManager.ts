
/**
 * Video loading state manager to prevent race conditions and ensure
 * proper loading sequence for videos
 */

type VideoLoadingState = {
  isProcessing: boolean;
  currentRequestId: string | null;
  pendingRequest: {
    id: number;
    url: string;
    name: string;
    keyword: string;
    requestId: string;
  } | null;
  lastProcessedTranscript: string;
  processingTimestamp: number;
  attemptCount: number;
  videoElementReady: boolean;
};

// Enhanced state tracking to handle transcript stability
const state: VideoLoadingState = {
  isProcessing: false,
  currentRequestId: null,
  pendingRequest: null,
  lastProcessedTranscript: "",
  processingTimestamp: 0,
  attemptCount: 0,
  videoElementReady: false
};

/**
 * Try to acquire a lock for video loading
 * @param requestId Unique ID for this request
 * @returns Whether the lock was acquired
 */
export const acquireVideoLoadingLock = (requestId: string): boolean => {
  // If another process has the lock, check if it's been too long (potential deadlock)
  if (state.isProcessing) {
    const now = Date.now();
    // If lock has been held for more than 10 seconds, force release it
    if (now - state.processingTimestamp > 10000) {
      console.log(`[VideoLoadingManager] Force releasing stale lock for request ${state.currentRequestId} after 10s`);
      state.isProcessing = false;
      state.currentRequestId = null;
    } else {
      console.log(`[VideoLoadingManager] Lock acquisition failed - already processing request ${state.currentRequestId}`);
      return false;
    }
  }
  
  state.isProcessing = true;
  state.currentRequestId = requestId;
  state.processingTimestamp = Date.now();
  console.log(`[VideoLoadingManager] Lock acquired for request ${requestId}`);
  return true;
};

/**
 * Release the video loading lock
 * @param requestId The request ID that should release the lock
 */
export const releaseVideoLoadingLock = (requestId: string): void => {
  if (state.currentRequestId !== requestId) {
    console.warn(`[VideoLoadingManager] Attempted to release lock with incorrect requestId. Expected ${state.currentRequestId}, got ${requestId}`);
    return;
  }
  
  state.isProcessing = false;
  state.currentRequestId = null;
  console.log(`[VideoLoadingManager] Lock released for request ${requestId}`);
  
  // Process pending request if exists
  if (state.pendingRequest) {
    const pendingRequest = state.pendingRequest;
    state.pendingRequest = null;
    
    console.log(`[VideoLoadingManager] Processing pending request for ${pendingRequest.name}`);
    
    // Dispatch event to process the pending request
    window.dispatchEvent(new CustomEvent('process_pending_video', {
      detail: pendingRequest
    }));
  }
};

/**
 * Queue a video request to be processed when the current one completes
 * @param videoData The video data to queue
 */
export const queueVideoRequest = (videoData: {
  id: number;
  url: string;
  name: string;
  keyword: string;
}): void => {
  const requestId = `video-request-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  state.pendingRequest = {
    ...videoData,
    requestId
  };
  
  console.log(`[VideoLoadingManager] Queued video request for ${videoData.name}`);
};

/**
 * Check if there's an active video loading process
 */
export const isProcessingVideo = (): boolean => {
  return state.isProcessing;
};

/**
 * Reset the video loading state (for use in error situations)
 */
export const resetVideoLoadingState = (): void => {
  console.log('[VideoLoadingManager] Resetting video loading state');
  state.isProcessing = false;
  state.currentRequestId = null;
  state.pendingRequest = null;
};

/**
 * Register that the video element is ready to receive content
 */
export const setVideoElementReady = (isReady: boolean): void => {
  state.videoElementReady = isReady;
  console.log(`[VideoLoadingManager] Video element ready state: ${isReady}`);
};

/**
 * Check if the video element is ready to receive content
 */
export const isVideoElementReady = (): boolean => {
  return state.videoElementReady;
};

/**
 * Check if transcript has already been processed to avoid duplicate processing
 * @param transcript The transcript to check
 * @returns Whether this is a new transcript
 */
export const isNewTranscript = (transcript: string): boolean => {
  // Skip very short transcripts that are likely just noise or partial speech
  if (transcript.length < 3 && !transcript.includes("ad") && !transcript.includes("in")) {
    console.log(`[VideoLoadingManager] Transcript too short (${transcript.length} chars), skipping`);
    return false;
  }
  
  // Skip if this is the same transcript we just processed (avoid double processing)
  if (transcript === state.lastProcessedTranscript) {
    console.log(`[VideoLoadingManager] Skipping duplicate transcript: "${transcript}"`);
    return false;
  }
  
  // Calculate similarity with the last processed transcript to detect minor changes
  if (state.lastProcessedTranscript && transcript.length > 0) {
    // If the last transcript is a prefix of the current one, it's likely just a continuation
    if (transcript.startsWith(state.lastProcessedTranscript) && 
        transcript.length - state.lastProcessedTranscript.length < 5) {
      console.log(`[VideoLoadingManager] Skipping incremental transcript update: "${transcript}"`);
      return false;
    }
  }
  
  // Update the last processed transcript
  state.lastProcessedTranscript = transcript;
  return true;
};

/**
 * Validate and improve a keyword for video search
 * @param keyword The original keyword from transcript
 * @returns Improved keyword or null if invalid
 */
export const validateSearchKeyword = (keyword: string): string | null => {
  if (!keyword) return null;
  
  // Trim and convert to lowercase for consistency
  const normalizedKeyword = keyword.trim().toLowerCase();
  
  // Reject keywords that are too short (less than 3 characters)
  if (normalizedKeyword.length < 3) {
    console.log(`[VideoLoadingManager] Keyword too short: "${keyword}"`);
    return null;
  }
  
  // List of stop words to filter out
  const stopWords = ['and', 'the', 'for', 'this', 'that', 'with', 'from', 'have', 'has', 
                    'been', 'being', 'was', 'were', 'are', 'you', 'your', 'our', 'their', 'its'];
  
  // Reject common stop words
  if (stopWords.includes(normalizedKeyword)) {
    console.log(`[VideoLoadingManager] Keyword is a stop word: "${keyword}"`);
    return null;
  }
  
  // Match against known high-value keywords (case-insensitive)
  const highValueKeywords = [
    "Quick Replies", 
    "Quick Reply",
    "Message Templates", 
    "WhatsApp Business",
    "Business Profile",
    "Templates",
    "Catalog"
  ];
  
  for (const highValue of highValueKeywords) {
    if (normalizedKeyword.includes(highValue.toLowerCase())) {
      console.log(`[VideoLoadingManager] Found high-value keyword match: "${highValue}"`);
      return highValue; // Return the properly capitalized version
    }
  }
  
  // If it's just "in" or "ad", these are likely partial words or noise
  if (normalizedKeyword === "in" || normalizedKeyword === "ad" || 
      normalizedKeyword === "an" || normalizedKeyword === "to" ||
      normalizedKeyword === "at" || normalizedKeyword === "on") {
    console.log(`[VideoLoadingManager] Keyword is likely noise: "${keyword}"`);
    return null;
  }
  
  // Allow the keyword if it passes all checks
  return keyword;
};

