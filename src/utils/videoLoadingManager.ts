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
      return true;
    }
    
    // If there's an active lock, queue this request
    if (this.isProcessing || this.currentLock) {
      this.debug(`Lock acquisition failed for ${requestId}, already locked by ${this.currentLock}`);
      return false;
    }
    
    // Acquire lock
    this.isProcessing = true;
    this.currentLock = requestId;
    this.pendingRequests.add(requestId);
    
    // Set a safety timeout to auto-release lock after 15 seconds
    this.lockTimeout = setTimeout(() => {
      this.debug(`Force-releasing stale lock: ${this.currentLock}`);
      this.releaseVideoLoadingLock(this.currentLock || '');
    }, 15000);
    
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
    if (this.requestQueue.length > 0) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        this.debug(`Processing next queued request: ${nextRequest.name}`);
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
  }

  public queueVideoRequest(video: { id: number, url: string, name: string, keyword: string }): void {
    // Check if this video is already in the queue
    const isDuplicate = this.requestQueue.some(req => 
      req.id === video.id && req.url === video.url
    );
    
    if (isDuplicate) {
      this.debug(`Skipping duplicate video request: ${video.name}`);
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
  }

  public isProcessingVideo(): boolean {
    return this.isProcessing;
  }

  public resetVideoLoadingState(): void {
    // Only reset if it's been more than 2 seconds since the last reset
    const now = Date.now();
    if (now - this.lastResetTime < 2000) {
      this.debug('Skipping reset, too soon since last reset');
      return;
    }
    
    // Only reset if we don't have active requests
    if (this.requestQueue.length === 0 && this.pendingRequests.size === 0) {
      this.debug('Clearing stale video requests. Before:', this.pendingRequests.size);
      this.isProcessing = false;
      this.currentLock = null;
      
      if (this.lockTimeout) {
        clearTimeout(this.lockTimeout);
        this.lockTimeout = null;
      }
      
      this.lastResetTime = now;
    } else {
      this.debug('Not resetting - active requests exist', { 
        queueLength: this.requestQueue.length, 
        pendingRequests: this.pendingRequests.size 
      });
    }
  }

  public clearStaleLocks(): void {
    this.debug('Clearing stale video requests. Before:', this.pendingRequests.size);
    this.isProcessing = false;
    this.currentLock = null;
    
    // Only keep recent requests in queue (less than 30 seconds old)
    const now = Date.now();
    this.requestQueue = this.requestQueue.filter(req => now - req.requestTime < 30000);
    this.debug('Updated queue length after cleanup:', this.requestQueue.length);
    
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
      this.lockTimeout = null;
    }
  }

  // Keep track of recently processed transcripts to avoid duplicates
  public isNewTranscript(transcript: string): boolean {
    if (!transcript) return false;
    
    // Clean and lowercase for comparison
    const cleanedTranscript = transcript.toLowerCase().trim();
    
    // Check if this transcript is too similar to recent ones
    for (const recent of this.lastTranscripts) {
      // Simple similarity check - if they share 80% of words
      const words1 = new Set(cleanedTranscript.split(/\s+/));
      const words2 = new Set(recent.split(/\s+/));
      
      // Calculate overlap percentage
      const commonWords = [...words1].filter(word => words2.has(word));
      const overlapPercentage = commonWords.length / Math.min(words1.size, words2.size);
      
      if (overlapPercentage > 0.8) {
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
    this.videoElementReady = ready;
    this.debug(`Video element ready state set to: ${ready}`);
  }

  public isVideoElementReady(): boolean {
    return this.videoElementReady;
  }

  // Check if a video is already in the queue
  public isVideoAlreadyQueued(id: number, url: string): boolean {
    return this.requestQueue.some(req => req.id === id && req.url === url) || 
           (this.isProcessing && this.currentLock && this.currentLock.includes(`video-${id}`));
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
