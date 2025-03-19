
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
    // Creating a HEAD request to check if the URL is accessible
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'no-cors' // This helps with CORS issues but will give limited info
    });
    
    console.log(`[URL VALIDATOR] Head request response:`, response);
    return true;
  } catch (e) {
    console.error(`[URL VALIDATOR] Error testing video URL playability:`, e);
    return false;
  }
};
