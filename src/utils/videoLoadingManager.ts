import { toast } from '@/hooks/use-toast';

// Video request queue typings
interface VideoRequest {
  id: number;
  url: string;
  name: string;
  keyword: string;
  requestTime: number;
  requestId: string;
}

// Video loading state manager
class VideoLoadingManagerClass {
  private isProcessing: boolean = false;
  private currentLock: string | null = null;
  private requestQueue: VideoRequest[] = [];
  private lastTranscripts: string[] = [];
  private videoElementReady: boolean = false;
  private pendingRequests: Set<string> = new Set();
  private lockTimeout: NodeJS.Timeout | null = null;
  private debugMode: boolean = true;
  private lastResetTime: number = 0;
  private processedVideoIds = new Set<string>();
  private lastTranscriptProcessTime: number = 0;
  private forceNextTranscriptProcess: boolean = false;

  constructor() {
    this.debug('VideoLoadingManager initialized');
  }

  private debug(message: string, data?: any) {
    if (this.debugMode) {
      const timestamp = new Date().toISOString();
      if (data) {
        console.log(`[VideoLoadingManager] ${message}`, data);
      } else {
        console.log(`[VideoLoadingManager] ${message}`);
      }
    }
  }

  public acquireVideoLoadingLock(requestId: string): boolean {
    // If already has lock with same ID, return true
    if (this.currentLock === requestId) {
      this.debug(`Already has lock: ${requestId}, returning true`);
      return true;
    }
    
    // If there's an active lock, queue this request
    if (this.isProcessing || this.currentLock) {
      this.debug(`Lock acquisition failed for ${requestId}, already locked by ${this.currentLock}`);
      
      // Special case: If request is for video player visibility, allow it to proceed
      if (requestId.includes('video-set') || requestId.includes('video-ready')) {
        this.debug(`Special case: Allowing video visibility request to proceed despite lock: ${requestId}`);
        return true;
      }
      
      return false;
    }
    
    // Acquire lock
    this.isProcessing = true;
    this.currentLock = requestId;
    this.pendingRequests.add(requestId);
    
    // Set a safety timeout to auto-release lock after 10 seconds (reduced from 15)
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
    }
    
    this.lockTimeout = setTimeout(() => {
      this.debug(`Force-releasing stale lock: ${this.currentLock}`);
      this.releaseVideoLoadingLock(this.currentLock || '');
    }, 10000);
    
    this.debug(`Lock acquired by ${requestId}`);
    return true;
  }

  public releaseVideoLoadingLock(requestId: string): void {
    if (this.currentLock !== requestId) {
      this.debug(`Attempted to release lock ${requestId} but current lock is ${this.currentLock}`);
      this.pendingRequests.delete(requestId); // Remove from pending anyway
      return;
    }
    
    this.debug(`Lock released by ${requestId}`);
    this.isProcessing = false;
    this.currentLock = null;
    this.pendingRequests.delete(requestId);
    
    // Clear timeout if it exists
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
      this.lockTimeout = null;
    }
    
    // Process next request in queue if available
    this.processNextQueuedRequest();
  }

  private processNextQueuedRequest(): void {
    if (this.requestQueue.length === 0) return;
    
    // Find a request that hasn't been processed recently
    let nextRequest: VideoRequest | undefined;
    let i = 0;
    
    while (i < this.requestQueue.length) {
      const request = this.requestQueue[i];
      const videoIdKey = `${request.id}-${request.url}`;
      
      // Skip if we've processed this video recently
      if (this.processedVideoIds.has(videoIdKey)) {
        this.debug(`Skipping recently processed video: ${request.name}`);
        this.requestQueue.splice(i, 1); // Remove from queue
      } else {
        nextRequest = request;
        this.requestQueue.splice(i, 1); // Remove from queue
        break;
      }
      
      i++;
    }
    
    if (nextRequest) {
      this.debug(`Processing next queued request: ${nextRequest.name}`);
      
      // Mark this video as processed
      const videoIdKey = `${nextRequest.id}-${nextRequest.url}`;
      this.processedVideoIds.add(videoIdKey);
      
      // Set a timeout to remove from processed set after 5 seconds (reduced from 10)
      setTimeout(() => {
        this.processedVideoIds.delete(videoIdKey);
        this.debug(`Removed ${nextRequest?.name} from processed videos list`);
      }, 5000);
      
      // Dispatch event to process this video
      window.dispatchEvent(new CustomEvent('process_pending_video', {
        detail: {
          id: nextRequest.id,
          url: nextRequest.url,
          name: nextRequest.name,
          keyword: nextRequest.keyword
        }
      }));
    }
  }

  public queueVideoRequest(video: { id: number, url: string, name: string, keyword: string }): void {
    // Generate a unique ID for this video
    const videoIdKey = `${video.id}-${video.url}`;
    
    // Check if this video is already in the queue
    const isDuplicate = this.requestQueue.some(req => 
      req.id === video.id && req.url === video.url
    );
    
    // Check if we've processed this video recently
    const recentlyProcessed = this.processedVideoIds.has(videoIdKey);
    
    if (isDuplicate || recentlyProcessed) {
      this.debug(`Skipping duplicate/recent video request: ${video.name}`);
      return;
    }
    
    // Add to queue
    const requestId = `queued-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.pendingRequests.add(requestId);
    
    this.requestQueue.push({
      ...video,
      requestTime: Date.now(),
      requestId
    });
    
    this.debug(`Video request queued: ${video.name}`, { queueLength: this.requestQueue.length });
    
    // If not currently processing, try to process next request
    if (!this.isProcessing && !this.currentLock) {
      this.processNextQueuedRequest();
    } else {
      // If we're processing but the queue is getting long, consider force releasing the lock
      if (this.requestQueue.length > 3) {
        this.debug(`Queue getting long (${this.requestQueue.length}), considering force release`);
        
        // Only force release if lock is older than 5 seconds
        if (this.currentLock && Date.now() - this.lastResetTime > 5000) {
          this.debug(`Force releasing lock due to queue buildup: ${this.currentLock}`);
          this.releaseVideoLoadingLock(this.currentLock);
        }
      }
    }
  }

  public isProcessingVideo(): boolean {
    return this.isProcessing;
  }

  public resetVideoLoadingState(): void {
    // Only reset if it's been more than 1 second since the last reset (reduced from 2)
    const now = Date.now();
    if (now - this.lastResetTime < 1000) {
      this.debug('Skipping reset, too soon since last reset');
      return;
    }
    
    this.debug('Clearing stale video requests. Before:', this.pendingRequests.size);
    this.isProcessing = false;
    this.currentLock = null;
    
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
      this.lockTimeout = null;
    }
    
    this.lastResetTime = now;
  }

  public clearStaleLocks(): void {
    this.debug('Clearing stale video requests. Before:', this.pendingRequests.size);
    
    // Only release lock if it's been more than 10 seconds (reduced from 15)
    const now = Date.now();
    let shouldRelease = false;
    
    if (this.currentLock && this.isProcessing) {
      const pendingRequestArray = Array.from(this.pendingRequests);
      const currentLockRequest = pendingRequestArray.find(id => id === this.currentLock);
      
      if (currentLockRequest) {
        const matchingQueueItem = this.requestQueue.find(req => req.requestId === currentLockRequest);
        if (matchingQueueItem && now - matchingQueueItem.requestTime > 10000) {
          shouldRelease = true;
          this.debug(`Force releasing stale lock ${this.currentLock} after 10 seconds`);
        }
      } else {
        shouldRelease = true;
        this.debug(`Force releasing orphaned lock ${this.currentLock}`);
      }
    }
    
    if (shouldRelease) {
      this.isProcessing = false;
      this.currentLock = null;
      
      if (this.lockTimeout) {
        clearTimeout(this.lockTimeout);
        this.lockTimeout = null;
      }
    }
    
    // Only keep recent requests in queue (less than 20 seconds old - reduced from 30)
    this.requestQueue = this.requestQueue.filter(req => now - req.requestTime < 20000);
    this.debug('Updated queue length after cleanup:', this.requestQueue.length);
    
    // If not processing and have items in queue, process next
    if (!this.isProcessing && !this.currentLock && this.requestQueue.length > 0) {
      this.processNextQueuedRequest();
    }
  }

  // Override transcript throttling if needed
  public forceProcessNextTranscript(): void {
    this.forceNextTranscriptProcess = true;
    this.debug('Force processing next transcript enabled');
  }

  // Keep track of recently processed transcripts to avoid duplicates
  public isNewTranscript(transcript: string): boolean {
    if (!transcript) return false;
    
    // If force processing is enabled, bypass throttling
    if (this.forceNextTranscriptProcess) {
      this.debug(`Force processing transcript - bypassing throttle checks`);
      this.forceNextTranscriptProcess = false;
      this.lastTranscriptProcessTime = Date.now();
      
      // Still update the recent transcripts list
      const cleanedTranscript = transcript.toLowerCase().trim();
      this.lastTranscripts.unshift(cleanedTranscript);
      this.lastTranscripts = this.lastTranscripts.slice(0, 3);
      
      return true;
    }
    
    // Rate limit transcript processing (no more than once per 1 second - reduced from 1.5)
    const now = Date.now();
    if (now - this.lastTranscriptProcessTime < 1000) {
      this.debug(`Throttling transcript processing, too soon since last process`);
      return false;
    }
    this.lastTranscriptProcessTime = now;
    
    // Clean and lowercase for comparison
    const cleanedTranscript = transcript.toLowerCase().trim();
    
    // Check if this transcript is too similar to recent ones
    for (const recent of this.lastTranscripts) {
      // Reduced similarity threshold to 70% (from 80%)
      const words1 = new Set(cleanedTranscript.split(/\s+/));
      const words2 = new Set(recent.split(/\s+/));
      
      // Calculate overlap percentage
      const commonWords = [...words1].filter(word => words2.has(word));
      const overlapPercentage = commonWords.length / Math.min(words1.size, words2.size);
      
      if (overlapPercentage > 0.7) {
        this.debug(`Transcript too similar to recent one: ${overlapPercentage.toFixed(2)} overlap`);
        return false;
      }
    }
    
    // Add to recent transcripts and keep only the last 3
    this.lastTranscripts.unshift(cleanedTranscript);
    this.lastTranscripts = this.lastTranscripts.slice(0, 3);
    
    return true;
  }

  // Validate search keywords
  public validateSearchKeyword(keyword: string): string | null {
    if (!keyword) return null;
    
    // Sanitize and perform basic validation
    let cleaned = keyword.trim().toLowerCase();
    
    // Remove non-alphanumeric chars except spaces
    cleaned = cleaned.replace(/[^\w\s]/gi, '');
    
    return cleaned.length >= 2 ? cleaned : null;
  }

  // Video player element state tracking
  public setVideoElementReady(ready: boolean): void {
    const wasReady = this.videoElementReady;
    this.videoElementReady = ready;
    this.debug(`Video element ready state set to: ${ready} (was: ${wasReady})`);
    
    // If the video element just became ready, we should force process any pending videos
    if (ready && !wasReady && this.requestQueue.length > 0) {
      this.debug(`Video element just became ready with ${this.requestQueue.length} pending requests, processing next`);
      if (this.currentLock) {
        this.debug(`Releasing current lock ${this.currentLock} to allow processing of pending video`);
        this.releaseVideoLoadingLock(this.currentLock);
      }
      this.processNextQueuedRequest();
    }
  }

  public isVideoElementReady(): boolean {
    return this.videoElementReady;
  }

  // Check if a video is already in the queue
  public isVideoAlreadyQueued(id: number, url: string): boolean {
    const videoIdKey = `${id}-${url}`;
    const inQueue = this.requestQueue.some(req => req.id === id && req.url === url);
    const recentlyProcessed = this.processedVideoIds.has(videoIdKey);
    const activelyProcessing = this.isProcessing && 
                              this.currentLock && 
                              this.currentLock.includes(`video-${id}`);
    
    return inQueue || recentlyProcessed || activelyProcessing;
  }
}

// Create a singleton instance
const VideoLoadingManager = new VideoLoadingManagerClass();

// Export the methods that should be accessible
export const acquireVideoLoadingLock = (requestId: string) => 
  VideoLoadingManager.acquireVideoLoadingLock(requestId);

export const releaseVideoLoadingLock = (requestId: string) => 
  VideoLoadingManager.releaseVideoLoadingLock(requestId);

export const queueVideoRequest = (video: { id: number, url: string, name: string, keyword: string }) => 
  VideoLoadingManager.queueVideoRequest(video);

export const isProcessingVideo = () => 
  VideoLoadingManager.isProcessingVideo();

export const resetVideoLoadingState = () => 
  VideoLoadingManager.resetVideoLoadingState();

export const clearStaleLocks = () => 
  VideoLoadingManager.clearStaleLocks();

export const isNewTranscript = (transcript: string) => 
  VideoLoadingManager.isNewTranscript(transcript);

export const validateSearchKeyword = (keyword: string) => 
  VideoLoadingManager.validateSearchKeyword(keyword);

export const setVideoElementReady = (ready: boolean) => 
  VideoLoadingManager.setVideoElementReady(ready);

export const isVideoElementReady = () => 
  VideoLoadingManager.isVideoElementReady();

export const isVideoAlreadyQueued = (id: number, url: string) => 
  VideoLoadingManager.isVideoAlreadyQueued(id, url);

export const forceProcessNextTranscript = () => 
  VideoLoadingManager.forceProcessNextTranscript();
