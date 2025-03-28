
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

export default {
  validateSearchKeyword,
  requestVideoLoad,
  completeVideoLoad,
  canLoadVideo,
  getVideoLoadingStatus
};
