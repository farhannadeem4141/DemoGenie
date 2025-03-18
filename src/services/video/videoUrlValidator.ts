
/**
 * Utility functions for validating and sanitizing video URLs
 */

// Validates a URL string and returns whether it's a valid URL
export const isValidUrl = (urlString: string): boolean => {
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
};

// Validates video URLs specifically, checking for proper protocols and formats
export const isValidVideoUrl = (url: string): boolean => {
  if (!url) return false;
  
  try {
    const parsedUrl = new URL(url);
    
    // Check protocol - should be http or https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      console.warn(`Invalid video URL protocol: ${parsedUrl.protocol}`);
      return false;
    }
    
    // Check if it's a supabase URL, which requires special handling
    if (url.includes('supabase.co/storage')) {
      // Ensure it has a token for authentication
      if (!url.includes('token=')) {
        console.warn('Supabase storage URL missing token parameter');
        return false;
      }
    }
    
    return true;
  } catch (e) {
    console.error('URL validation error:', e);
    return false;
  }
};

// Sanitizes video URL by trimming whitespace and handling special characters
export const sanitizeVideoUrl = (url: string): string => {
  if (!url) return '';
  
  // Trim whitespace and remove line breaks
  url = url.trim().replace(/[\r\n]+/g, '');
  
  // If it's not a valid URL to begin with, return empty string
  if (!isValidUrl(url)) {
    console.error(`Cannot sanitize invalid URL: ${url}`);
    return '';
  }
  
  return url;
};
