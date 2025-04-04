
/**
 * Utility for validating and sanitizing video URLs with enhanced logging
 */

// Helper to validate and sanitize video URLs with detailed logging
export const validateVideoUrl = (url: string, thorough: boolean = false): string => {
  console.log(`[URL VALIDATOR] Validating URL: ${url ? url.substring(0, 50) + "..." : "undefined or empty"}`);
  
  if (!url) {
    console.error(`[URL VALIDATOR] Empty URL provided`);
    return '';
  }
  
  // Clean up the URL first - remove any whitespace, line breaks
  let cleanedUrl = url.trim().replace(/\n/g, '');
  
  // Fix common URL format issues
  // Fix double slashes in the path (except after protocol)
  if (cleanedUrl.includes('//storage/v1/object/public/')) {
    console.log('[URL VALIDATOR] Fixing double slash in Supabase URL path');
    cleanedUrl = cleanedUrl.replace('//storage/v1/object/public/', '/storage/v1/object/public/');
  }
  
  if (cleanedUrl.includes('//videos//')) {
    console.log('[URL VALIDATOR] Fixing double slash in videos path');
    cleanedUrl = cleanedUrl.replace('//videos//', '/videos/');
  }
  
  // Fix missing protocol
  if (cleanedUrl.startsWith('www.')) {
    console.log('[URL VALIDATOR] Adding missing https:// to URL');
    cleanedUrl = 'https://' + cleanedUrl;
  }
  
  // Check for relative URLs that need to be converted to absolute
  if (cleanedUrl.startsWith('/') && !cleanedUrl.startsWith('//')) {
    console.log('[URL VALIDATOR] Converting relative URL to absolute URL');
    // Use window.location.origin if available, otherwise fall back to a default
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    cleanedUrl = origin + cleanedUrl;
  }
  
  // Fix other common issues
  cleanedUrl = cleanedUrl
    // Convert encoded spaces back to normal spaces then re-encode properly
    .replace(/%20/g, ' ')
    // Fix spaces in URLs
    .replace(/\s+/g, '%20')
    // Remove duplicate https:// or http:// if present
    .replace(/(https?:\/\/)+/g, '$1');
  
  // First check if it's a valid URL format
  try {
    console.log(`[URL VALIDATOR] Attempting to parse URL: ${cleanedUrl.substring(0, 50)}...`);
    new URL(cleanedUrl);
    console.log(`[URL VALIDATOR] URL format is valid`);
  } catch (e) {
    console.error(`[URL VALIDATOR] Invalid URL format: ${cleanedUrl}`);
    console.error(`[URL VALIDATOR] Error details:`, e);
    return '';
  }
  
  // Enhance URL validation for specific sources
  try {
    // For Supabase storage URLs, ensure they're properly formatted
    if (cleanedUrl.includes('supabase.co/storage')) {
      console.log(`[URL VALIDATOR] Detected Supabase storage URL`);
      
      // Check if the URL has a valid token
      if (!cleanedUrl.includes('token=') && !cleanedUrl.includes('/public/')) {
        console.error(`[URL VALIDATOR] Supabase URL missing token parameter or not public`);
        // Try to fix by attempting to construct a public URL
        if (cleanedUrl.includes('/object/')) {
          const pathMatch = cleanedUrl.match(/\/object\/([^?]+)/);
          if (pathMatch && pathMatch[1]) {
            const publicPath = pathMatch[1];
            console.log(`[URL VALIDATOR] Attempting to fix by using public path: ${publicPath}`);
            // This is a basic fix that may need to be customized based on your Supabase setup
            const bucketName = publicPath.split('/')[0];
            const objectPath = publicPath.split('/').slice(1).join('/');
            
            const fixedUrl = `${cleanedUrl.split('/object/')[0]}/public/${bucketName}/${objectPath}`;
            console.log(`[URL VALIDATOR] Fixed URL to public path: ${fixedUrl}`);
            cleanedUrl = fixedUrl;
          }
        }
      }
      
      // Add direct URL test if thorough validation requested
      if (thorough) {
        console.log(`[URL VALIDATOR] Performing thorough validation on Supabase URL`);
        // We could add additional Supabase-specific checks here
      }
    }
    
    // Ensure proper video file extensions for direct file links
    const fileExtensionMatch = cleanedUrl.match(/\.(mp4|webm|ogg|mov)(\?|$)/i);
    if (!fileExtensionMatch && !cleanedUrl.includes('supabase.co') && !cleanedUrl.includes('object') && !cleanedUrl.includes('bucket')) {
      console.warn(`[URL VALIDATOR] URL may not point to a valid video file (no recognized extension)`);
      
      // If it looks like it might be a video URL but without extension, try to append .mp4
      if (cleanedUrl.includes('video') || cleanedUrl.includes('media')) {
        console.log(`[URL VALIDATOR] URL appears to be a video link, trying to ensure it has a file extension`);
        
        // Add .mp4 extension if there's no file extension and no query parameters
        if (!cleanedUrl.includes('.') || cleanedUrl.lastIndexOf('.') < cleanedUrl.lastIndexOf('/')) {
          if (!cleanedUrl.includes('?')) {
            cleanedUrl += '.mp4';
            console.log(`[URL VALIDATOR] Added .mp4 extension to URL: ${cleanedUrl}`);
          }
        }
      }
    }
    
    // Add cache busting parameter to prevent caching issues
    if (thorough && !cleanedUrl.includes('cb=')) {
      const separator = cleanedUrl.includes('?') ? '&' : '?';
      cleanedUrl = `${cleanedUrl}${separator}cb=${Date.now()}`;
      console.log(`[URL VALIDATOR] Added cache busting parameter: ${cleanedUrl.substring(0, 70)}...`);
    }
    
    console.log(`[URL VALIDATOR] Final validated URL: ${cleanedUrl.substring(0, 50)}...`);
    return cleanedUrl;
  } catch (e) {
    console.error(`[URL VALIDATOR] Error sanitizing URL: ${e}`);
    return cleanedUrl; // Return cleaned url if sanitizing fails
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
    video.crossOrigin = "anonymous"; // Add CORS attribute
    
    // Set up event listeners for success and failure
    return new Promise((resolve) => {
      let timeoutId: number;
      
      const onCanPlay = () => {
        console.log(`[URL VALIDATOR] Video CAN play (canplay event triggered)`);
        cleanup();
        resolve(true);
      };
      
      const onLoadedMetadata = () => {
        console.log(`[URL VALIDATOR] Video metadata loaded successfully`);
        // If metadata loads, the video is likely playable
        // This is often more reliable than waiting for canplay
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
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onError);
        window.clearTimeout(timeoutId);
        video.src = ''; // Clear source
        video.load(); // Reset video element
      };
      
      // Register event handlers
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('loadedmetadata', onLoadedMetadata);
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

// Helper function to manually test video URL in console
export const manualTestVideoUrl = (url: string) => {
  console.log("[MANUAL TEST] Testing video URL:", url);
  
  // Step 1: Validate URL format
  try {
    const validUrl = validateVideoUrl(url);
    console.log("[MANUAL TEST] URL validation result:", validUrl ? "VALID" : "INVALID");
    
    if (!validUrl) {
      return {
        isValid: false,
        reason: "URL failed validation check"
      };
    }
    
    // Step 2: Create a test video element
    const testVideo = document.createElement('video');
    testVideo.style.position = 'fixed';
    testVideo.style.top = '0';
    testVideo.style.left = '0';
    testVideo.style.width = '320px';
    testVideo.style.height = '240px';
    testVideo.style.zIndex = '9999';
    testVideo.style.background = '#000';
    testVideo.controls = true;
    testVideo.muted = true;
    
    // Add message
    const messageDiv = document.createElement('div');
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '240px';
    messageDiv.style.left = '0';
    messageDiv.style.width = '320px';
    messageDiv.style.padding = '10px';
    messageDiv.style.background = 'rgba(0,0,0,0.8)';
    messageDiv.style.color = '#fff'; // Fix: Changed from setting color property directly
    messageDiv.style.zIndex = '10000';
    messageDiv.style.fontSize = '12px';
    messageDiv.textContent = 'Testing video URL... Click to close.';
    
    // Show instructions
    console.log("[MANUAL TEST] Adding test video to page. Click it to remove.");
    
    // Add click handler to remove test elements
    const cleanup = () => {
      if (document.body.contains(testVideo)) document.body.removeChild(testVideo);
      if (document.body.contains(messageDiv)) document.body.removeChild(messageDiv);
      console.log("[MANUAL TEST] Test video removed.");
    };
    
    testVideo.addEventListener('click', cleanup);
    messageDiv.addEventListener('click', cleanup);
    
    // Add event listeners
    testVideo.addEventListener('loadeddata', () => {
      console.log("[MANUAL TEST] Video loaded successfully!");
      messageDiv.textContent = 'Video loaded successfully! Click to close.';
      messageDiv.style.background = 'rgba(0,128,0,0.8)';
    });
    
    testVideo.addEventListener('error', (e) => {
      console.error("[MANUAL TEST] Video failed to load:", e);
      if (testVideo.error) {
        console.error("[MANUAL TEST] Error code:", testVideo.error.code, "Message:", testVideo.error.message);
        messageDiv.textContent = `Error loading video: ${testVideo.error.message}. Click to close.`;
      } else {
        messageDiv.textContent = 'Unknown error loading video. Click to close.';
      }
      messageDiv.style.background = 'rgba(255,0,0,0.8)';
    });
    
    // Add to document
    document.body.appendChild(testVideo);
    document.body.appendChild(messageDiv);
    
    // Set source and load
    testVideo.src = url;
    testVideo.load();
    
    // Attempt to play
    testVideo.play().catch(e => {
      console.warn("[MANUAL TEST] Auto-play was blocked:", e);
    });
    
    // Auto-remove after 30 seconds
    setTimeout(cleanup, 30000);
    
    return {
      isValid: true,
      testElement: testVideo,
      cleanup
    };
    
  } catch (e) {
    console.error("[MANUAL TEST] Error during manual testing:", e);
    return {
      isValid: false,
      reason: e instanceof Error ? e.message : "Unknown error"
    };
  }
};

// Export the helper functions to make them available in the console
if (typeof window !== 'undefined') {
  (window as any).testVideoUrl = manualTestVideoUrl;
}

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
      
      // Try to extract from public URL pattern
      const publicPathMatch = url.match(/public\/[^/]+\/([^?]+)/);
      if (publicPathMatch && publicPathMatch[1]) {
        // Decode the URL-encoded filename
        return decodeURIComponent(publicPathMatch[1]);
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
