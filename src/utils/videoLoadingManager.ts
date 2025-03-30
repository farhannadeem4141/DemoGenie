
/**
 * Video Loading Manager
 * 
 * This utility manages the video loading process to prevent race conditions
 * and ensure videos are properly loaded.
 */

// Cache of validated URLs to prevent repeated validation
const urlValidationCache = new Map<string, string>();

// Track if we're currently processing a video request
let isProcessingRequest = false;
let currentVideoUrl: string | null = null;

// Video element readiness state
let videoElementReady = false;

// Queue for pending video requests
type VideoRequest = {
  id: number;
  url: string;
  name: string;
  keyword: string;
};
const pendingVideoRequests: VideoRequest[] = [];

// Active locks
const activeLocks = new Map<string, number>();

// Keep track of processed transcripts to avoid duplicates
const processedTranscripts = new Set<string>();
const transcriptProcessedTimestamps = new Map<string, number>();

// Track video requests to prevent duplicates in queue
const activeVideoRequests = new Set<string>();

// Auto-release locks after timeout (milliseconds)
const LOCK_TIMEOUT = 10000; // 10 seconds

/**
 * Validate search keywords to prevent common issues
 */
export const validateSearchKeyword = (keyword: string): string | null => {
  if (!keyword) return null;
  
  // Convert to lowercase and trim
  const normalizedKeyword = keyword.toLowerCase().trim();
  
  // Skip very short keywords
  if (normalizedKeyword.length < 3) {
    console.log(`[Keyword Validation] Skipping short keyword: "${keyword}"`);
    return null;
  }
  
  // Skip common words that don't make good search terms
  const commonWords = ['the', 'and', 'for', 'but', 'not', 'you', 'all', 'any', 
                      'can', 'had', 'has', 'may', 'was', 'who', 'why', 'yes',
                      'are', 'from', 'have', 'here', 'with', 'this', 'that',
                      'what', 'when', 'where', 'which', 'there', 'because',
                      'to', 'in', 'on', 'at', 'of', 'is', 'was', 'been', 'be', 'am'];
                      
  if (commonWords.includes(normalizedKeyword)) {
    console.log(`[Keyword Validation] Skipping common word: "${keyword}"`);
    return null;
  }
  
  // Clean up the keyword by removing punctuation
  const cleanKeyword = normalizedKeyword.replace(/[^\w\s]/g, '');
  
  // Check if after cleanup we still have a valid keyword
  if (!cleanKeyword || cleanKeyword.length < 3) {
    console.log(`[Keyword Validation] Keyword invalid after cleanup: "${keyword}" → "${cleanKeyword}"`);
    return null;
  }
  
  // Check for high-value keywords that would be very relevant
  const priorityKeywords = ["quick", "replies", "business", "whatsapp", "template", "message"];
  for (const priority of priorityKeywords) {
    if (cleanKeyword.includes(priority)) {
      console.log(`[Keyword Validation] Found priority keyword: "${priority}" in "${cleanKeyword}"`);
      return priority; // Return the priority keyword directly
    }
  }
  
  console.log(`[Keyword Validation] Keyword valid: "${keyword}" → "${cleanKeyword}"`);
  return cleanKeyword;
};

/**
 * Request to load a video - prevents multiple concurrent video load requests
 */
export const requestVideoLoad = (videoUrl: string): boolean => {
  console.log(`[VideoLoadingManager] Video load requested: ${videoUrl ? videoUrl.substring(0, 30) + '...' : 'null'}`);
  
  if (isProcessingRequest) {
    console.warn('[VideoLoadingManager] Already processing a video set request, ignoring');
    return false;
  }
  
  if (!videoUrl) {
    console.warn('[VideoLoadingManager] Empty video URL provided');
    return false;
  }
  
  // Start processing
  isProcessingRequest = true;
  currentVideoUrl = videoUrl;
  
  console.log(`[VideoLoadingManager] Processing video load for: ${videoUrl.substring(0, 30)}...`);
  
  // After a timeout, reset the processing flag
  setTimeout(() => {
    console.log('[VideoLoadingManager] Resetting processing flag after timeout');
    isProcessingRequest = false;
    currentVideoUrl = null;
  }, 3000); // 3 second timeout
  
  return true;
};

/**
 * Complete a video load request
 */
export const completeVideoLoad = (): void => {
  console.log('[VideoLoadingManager] Video load completed');
  isProcessingRequest = false;
  currentVideoUrl = null;
};

/**
 * Check if we can proceed with loading a video
 */
export const canLoadVideo = (videoUrl: string): boolean => {
  if (isProcessingRequest && currentVideoUrl !== videoUrl) {
    console.warn(`[VideoLoadingManager] Cannot load video ${videoUrl.substring(0, 30)}... - already processing ${currentVideoUrl?.substring(0, 30)}...`);
    return false;
  }
  
  return true;
};

/**
 * Get the current status of video loading
 */
export const getVideoLoadingStatus = (): { isProcessing: boolean, currentUrl: string | null } => {
  return {
    isProcessing: isProcessingRequest,
    currentUrl: currentVideoUrl
  };
};

/**
 * Acquire a lock for processing a video request
 */
export const acquireVideoLoadingLock = (requestId: string): boolean => {
  if (isProcessingRequest) {
    console.log(`[VideoLoadingManager] Cannot acquire lock for ${requestId} - already processing`);
    return false;
  }
  
  console.log(`[VideoLoadingManager] Lock acquired for ${requestId}`);
  isProcessingRequest = true;
  activeLocks.set(requestId, Date.now());
  
  // Set automatic timeout to release lock in case of errors
  setTimeout(() => {
    if (activeLocks.has(requestId)) {
      console.warn(`[VideoLoadingManager] Auto-releasing stale lock for ${requestId} after ${LOCK_TIMEOUT}ms`);
      releaseVideoLoadingLock(requestId);
    }
  }, LOCK_TIMEOUT);
  
  return true;
};

/**
 * Release a video loading lock
 */
export const releaseVideoLoadingLock = (requestId: string): void => {
  console.log(`[VideoLoadingManager] Lock released for ${requestId}`);
  isProcessingRequest = false;
  activeLocks.delete(requestId);
  
  // Process any pending requests
  setTimeout(processPendingRequests, 500);
};

/**
 * Queue a video request for later processing
 * Returns true if video was added, false if it was a duplicate
 */
export const queueVideoRequest = (video: VideoRequest): boolean => {
  // Create a unique key for this video to check for duplicates
  const videoKey = `${video.id}-${video.url}`;
  
  // Check if this exact video is already in the activeVideoRequests set
  if (activeVideoRequests.has(videoKey)) {
    console.log(`[VideoLoadingManager] Ignoring duplicate video request: ${video.name}`);
    return false;
  }
  
  console.log(`[VideoLoadingManager] Queuing video request: ${video.name}`);
  
  // Check if this video is already in the queue
  const isDuplicate = pendingVideoRequests.some(v => 
    v.id === video.id && v.url === video.url
  );
  
  if (!isDuplicate) {
    // Add to the pending queue
    pendingVideoRequests.push(video);
    // Add to active tracking set
    activeVideoRequests.add(videoKey);
    console.log(`[VideoLoadingManager] Video queued: ${video.name}`);
    return true;
  } else {
    console.log(`[VideoLoadingManager] Video already in queue: ${video.name}`);
    return false;
  }
};

/**
 * Process any pending video requests
 */
export const processPendingRequests = (): void => {
  if (pendingVideoRequests.length === 0) return;
  
  if (isProcessingRequest) {
    console.log(`[VideoLoadingManager] Cannot process pending requests - already processing`);
    return;
  }
  
  const nextVideo = pendingVideoRequests.shift();
  if (nextVideo) {
    console.log(`[VideoLoadingManager] Processing pending video request: ${nextVideo.name}`);
    
    // Remove from active tracking
    const videoKey = `${nextVideo.id}-${nextVideo.url}`;
    activeVideoRequests.delete(videoKey);
    
    // Dispatch custom event to process this video
    window.dispatchEvent(new CustomEvent('process_pending_video', {
      detail: nextVideo
    }));
  }
};

/**
 * Check if a video request is currently being processed
 */
export const isProcessingVideo = (): boolean => {
  return isProcessingRequest;
};

/**
 * Reset the video loading state
 */
export const resetVideoLoadingState = (): void => {
  console.log('[VideoLoadingManager] Resetting video loading state');
  isProcessingRequest = false;
  currentVideoUrl = null;
  activeLocks.clear();
  
  // Also clear the active video tracking
  activeVideoRequests.clear();
};

/**
 * Check if a transcript is new and hasn't been processed recently
 */
export const isNewTranscript = (transcript: string): boolean => {
  if (!transcript) return false;
  
  // Clean and normalize the transcript
  const normalizedTranscript = transcript.toLowerCase().trim();
  
  // Check if we've seen this exact transcript before
  if (processedTranscripts.has(normalizedTranscript)) {
    const lastProcessedTime = transcriptProcessedTimestamps.get(normalizedTranscript) || 0;
    const timeSince = Date.now() - lastProcessedTime;
    
    // Don't process the same transcript if it was processed in the last 5 seconds
    if (timeSince < 5000) {
      console.log(`[VideoLoadingManager] Transcript already processed recently: "${normalizedTranscript.substring(0, 30)}..."`);
      return false;
    }
  }
  
  // Add to processed set with timestamp
  processedTranscripts.add(normalizedTranscript);
  transcriptProcessedTimestamps.set(normalizedTranscript, Date.now());
  
  // Keep the processed transcript set from growing too large
  if (processedTranscripts.size > 50) {
    const oldestTranscript = Array.from(processedTranscripts)[0];
    processedTranscripts.delete(oldestTranscript);
    transcriptProcessedTimestamps.delete(oldestTranscript);
  }
  
  return true;
};

/**
 * Check if a specific video is already being processed
 */
export const isVideoAlreadyQueued = (videoId: number, videoUrl: string): boolean => {
  const videoKey = `${videoId}-${videoUrl}`;
  return activeVideoRequests.has(videoKey);
};

/**
 * Clear all stale locks that have been held too long
 */
export const clearStaleLocks = (): void => {
  const now = Date.now();
  let staleLocksFound = false;
  
  activeLocks.forEach((timestamp, lockId) => {
    const timeSinceAcquired = now - timestamp;
    if (timeSinceAcquired > LOCK_TIMEOUT) {
      console.warn(`[VideoLoadingManager] Clearing stale lock: ${lockId} (held for ${timeSinceAcquired}ms)`);
      releaseVideoLoadingLock(lockId);
      staleLocksFound = true;
    }
  });
  
  if (staleLocksFound) {
    resetVideoLoadingState();
  }
};

/**
 * Set the readiness state of the video element
 */
export const setVideoElementReady = (isReady: boolean): void => {
  console.log(`[VideoLoadingManager] Video element ready state set to: ${isReady}`);
  videoElementReady = isReady;
  
  if (isReady && pendingVideoRequests.length > 0) {
    processPendingRequests();
  }
};

/**
 * Check if the video element is ready
 */
export const isVideoElementReady = (): boolean => {
  return videoElementReady;
};

// Set up periodic check for stale locks
setInterval(clearStaleLocks, LOCK_TIMEOUT);

export default {
  validateSearchKeyword,
  requestVideoLoad,
  completeVideoLoad,
  canLoadVideo,
  getVideoLoadingStatus,
  acquireVideoLoadingLock,
  releaseVideoLoadingLock,
  queueVideoRequest,
  processPendingRequests,
  isProcessingVideo,
  resetVideoLoadingState,
  isNewTranscript,
  setVideoElementReady,
  isVideoElementReady,
  isVideoAlreadyQueued,
  clearStaleLocks
};
