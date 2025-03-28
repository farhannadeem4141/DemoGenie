
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
};

const state: VideoLoadingState = {
  isProcessing: false,
  currentRequestId: null,
  pendingRequest: null
};

/**
 * Try to acquire a lock for video loading
 * @param requestId Unique ID for this request
 * @returns Whether the lock was acquired
 */
export const acquireVideoLoadingLock = (requestId: string): boolean => {
  if (state.isProcessing) {
    console.log(`[VideoLoadingManager] Lock acquisition failed - already processing request ${state.currentRequestId}`);
    return false;
  }
  
  state.isProcessing = true;
  state.currentRequestId = requestId;
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
