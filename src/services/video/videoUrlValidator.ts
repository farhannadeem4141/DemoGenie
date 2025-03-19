
/**
 * Utility for validating and sanitizing video URLs with enhanced logging
 */

// Helper to validate and sanitize video URLs with detailed logging
export const validateVideoUrl = (url: string): string => {
  console.log(`[URL VALIDATOR] Validating URL: ${url ? url.substring(0, 50) + "..." : "undefined or empty"}`);
  
  if (!url) {
    console.error(`[URL VALIDATOR] Empty URL provided`);
    return '';
  }
  
  // First check if it's a valid URL format
  try {
    console.log(`[URL VALIDATOR] Attempting to parse URL: ${url.substring(0, 50)}...`);
    new URL(url);
    console.log(`[URL VALIDATOR] URL format is valid`);
  } catch (e) {
    console.error(`[URL VALIDATOR] Invalid URL format: ${url}`);
    console.error(`[URL VALIDATOR] Error details:`, e);
    return '';
  }
  
  // Remove any query params that might be causing issues
  try {
    // If the URL contains extra spaces or line breaks, clean them
    url = url.trim().replace(/\n/g, '');
    console.log(`[URL VALIDATOR] Cleaned URL: ${url.substring(0, 50)}...`);
    
    // For Supabase storage URLs, ensure they're properly formatted
    if (url.includes('supabase.co/storage')) {
      console.log(`[URL VALIDATOR] Detected Supabase storage URL`);
      
      // Check if the URL has a valid token
      if (!url.includes('token=')) {
        console.error(`[URL VALIDATOR] Supabase URL missing token parameter`);
      } else {
        console.log(`[URL VALIDATOR] Supabase URL contains token parameter`);
        
        // Extract and validate token expiration if possible
        try {
          const tokenParam = url.split('token=')[1];
          const token = tokenParam.split('&')[0]; // Get the token value
          
          // Try to decode the JWT to check expiration
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const expiration = payload.exp * 1000; // Convert to milliseconds
            const now = Date.now();
            
            if (expiration < now) {
              console.error(`[URL VALIDATOR] Supabase token has expired! Exp: ${new Date(expiration).toISOString()}, Now: ${new Date(now).toISOString()}`);
            } else {
              const daysRemaining = Math.round((expiration - now) / (1000 * 60 * 60 * 24));
              console.log(`[URL VALIDATOR] Supabase token valid for ${daysRemaining} more days`);
            }
          }
        } catch (e) {
          console.warn(`[URL VALIDATOR] Could not validate token expiration:`, e);
        }
      }
      
      // Check if the URL is properly encoded
      const hasEncodedChars = url.includes('%20') || url.includes('%2F');
      console.log(`[URL VALIDATOR] URL has encoded characters: ${hasEncodedChars}`);
    }
    
    console.log(`[URL VALIDATOR] Final validated URL: ${url.substring(0, 50)}...`);
    return url;
  } catch (e) {
    console.error(`[URL VALIDATOR] Error sanitizing URL: ${e}`);
    return url; // Return original if sanitizing fails
  }
};

// Test if a video URL is likely to be playable
export const testVideoPlayability = async (url: string): Promise<boolean> => {
  console.log(`[URL VALIDATOR] Testing video playability for: ${url ? url.substring(0, 50) + "..." : "undefined or empty"}`);
  
  if (!url) {
    console.error(`[URL VALIDATOR] Cannot test playability of empty URL`);
    return false;
  }
  
  try {
    // Create a temporary video element to test playability
    const video = document.createElement('video');
    
    // Set up event listeners for success and failure
    return new Promise((resolve) => {
      let timeoutId: number;
      
      const onCanPlay = () => {
        console.log(`[URL VALIDATOR] Video CAN play (canplay event triggered)`);
        cleanup();
        resolve(true);
      };
      
      const onError = (e: Event) => {
        console.error(`[URL VALIDATOR] Video CANNOT play (error event triggered)`, e);
        if (video.error) {
          console.error(`[URL VALIDATOR] Video error code: ${video.error.code}, message: ${video.error.message}`);
        }
        cleanup();
        resolve(false);
      };
      
      const onTimeout = () => {
        console.warn(`[URL VALIDATOR] Video playability test timed out after 5 seconds`);
        cleanup();
        // If we timeout, we'll assume it might be playable
        // Many videos won't trigger canplay fast enough
        resolve(true);
      };
      
      const cleanup = () => {
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('error', onError);
        window.clearTimeout(timeoutId);
        video.src = ''; // Clear source
        video.load(); // Reset video element
      };
      
      // Register event handlers
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('error', onError);
      
      // Set a timeout in case neither event fires
      timeoutId = window.setTimeout(onTimeout, 5000);
      
      // Try to load the video
      console.log(`[URL VALIDATOR] Setting test video source to: ${url.substring(0, 50)}...`);
      video.preload = 'metadata';
      video.src = url;
      video.load();
      
      // Try to play (muted, will be auto-paused immediately)
      video.muted = true;
      video.play().catch(e => {
        console.warn(`[URL VALIDATOR] Play attempt was rejected (expected):`, e);
        // This is expected since we're just testing, not resolve here
      });
    });
  } catch (e) {
    console.error(`[URL VALIDATOR] Error testing video URL playability:`, e);
    return false;
  }
};

// Additional helper to extract the filename from a Supabase URL for better logging
export const extractFilenameFromUrl = (url: string): string => {
  try {
    if (!url) return 'unknown';
    
    if (url.includes('supabase.co/storage')) {
      // Try to extract the object path from the URL
      const objectPathMatch = url.match(/object\/[^/]+\/([^?]+)/);
      if (objectPathMatch && objectPathMatch[1]) {
        // Decode the URL-encoded filename
        return decodeURIComponent(objectPathMatch[1]);
      }
    }
    
    // For other URLs, extract the filename from the path
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    return pathParts[pathParts.length - 1] || 'unknown';
  } catch (e) {
    return 'error-extracting-filename';
  }
};
