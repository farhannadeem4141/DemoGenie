
// Utility file for testing video URLs in the browser console

import { validateVideoUrl, testVideoPlayability } from '@/services/video/videoUrlValidator';
import { supabase } from '@/integrations/supabase/client';

/**
 * This utility file provides functions for testing video URLs directly in the browser console.
 * You can use these functions to debug video playback issues.
 * 
 * Usage:
 * 1. Open browser console
 * 2. Type: videoUrlTester.testUrl("https://your-video-url.mp4")
 */

// Function to test if a video URL is valid and playable
export const testUrl = async (url: string): Promise<{valid: boolean; playable?: boolean; error?: string}> => {
  console.log("🎬 Testing video URL:", url);
  
  // Step 1: Validate URL format
  const validUrl = validateVideoUrl(url);
  if (!validUrl) {
    console.error("❌ URL failed validation");
    return { valid: false, error: "URL failed validation check" };
  }
  
  console.log("✅ URL passed validation");
  
  // Step 2: Test playability
  try {
    const isPlayable = await testVideoPlayability(url);
    if (isPlayable) {
      console.log("✅ Video appears to be playable");
    } else {
      console.warn("⚠️ Video might not be playable");
    }
    
    return { valid: true, playable: isPlayable };
  } catch (error) {
    console.error("❌ Error testing video playability:", error);
    return { 
      valid: true, 
      playable: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
};

// Function to display a video in a small player on the page for visual testing
export const showTestPlayer = (url: string): (() => void) => {
  console.log("🎬 Creating test player for:", url);
  
  // Create container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '20px';
  container.style.right = '20px';
  container.style.width = '320px';
  container.style.background = '#000';
  container.style.padding = '10px';
  container.style.borderRadius = '8px';
  container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
  container.style.zIndex = '10000';
  
  // Create header
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '8px';
  
  const title = document.createElement('div');
  title.textContent = 'Video Test Player';
  title.style.color = '#fff';
  title.style.fontWeight = 'bold';
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.background = 'transparent';
  closeBtn.style.border = 'none';
  closeBtn.style.color = '#fff';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '16px';
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  // Create video element
  const video = document.createElement('video');
  video.style.width = '100%';
  video.style.display = 'block';
  video.style.borderRadius = '4px';
  video.controls = true;
  video.muted = true;
  video.playsInline = true;
  
  // Create status
  const status = document.createElement('div');
  status.style.padding = '8px';
  status.style.fontSize = '12px';
  status.style.color = '#fff';
  status.style.background = 'rgba(0,0,0,0.5)';
  status.style.borderRadius = '4px';
  status.style.marginTop = '8px';
  status.textContent = 'Loading video...';
  
  // Add URL info
  const urlInfo = document.createElement('div');
  urlInfo.style.padding = '8px';
  urlInfo.style.fontSize = '10px';
  urlInfo.style.color = '#aaa';
  urlInfo.style.wordBreak = 'break-all';
  urlInfo.style.marginTop = '8px';
  urlInfo.textContent = url;
  
  // Assemble container
  container.appendChild(header);
  container.appendChild(video);
  container.appendChild(status);
  container.appendChild(urlInfo);
  
  // Add to page
  document.body.appendChild(container);
  
  // Add event listeners
  const cleanup = () => {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
      console.log("🎬 Test player closed");
    }
  };
  
  closeBtn.addEventListener('click', cleanup);
  
  video.addEventListener('loadeddata', () => {
    status.textContent = '✅ Video loaded successfully!';
    status.style.background = 'rgba(0,128,0,0.5)';
    console.log("✅ Test player: Video loaded successfully");
  });
  
  video.addEventListener('error', () => {
    console.error("❌ Test player: Error loading video");
    if (video.error) {
      const errorMessage = `❌ Error: ${video.error.message || 'Unknown error'} (code: ${video.error.code})`;
      status.textContent = errorMessage;
      console.error("Video element error details:", {
        code: video.error.code,
        message: video.error.message,
        networkState: video.networkState,
        readyState: video.readyState
      });
    } else {
      status.textContent = '❌ Unknown error loading video';
    }
    status.style.background = 'rgba(255,0,0,0.5)';
  });
  
  video.addEventListener('playing', () => {
    console.log("✅ Test player: Video is playing");
  });
  
  // Set video source
  video.src = url;
  video.load();
  
  // Try to play
  video.play().catch(error => {
    console.warn("⚠️ Test player: Autoplay prevented:", error);
  });
  
  // Return cleanup function
  return cleanup;
};

// Function to find and test videos in database
export const findAndTestVideosInDatabase = async (tag?: string): Promise<void> => {
  console.log(`🔍 Searching for videos in database${tag ? ` with tag: ${tag}` : ''}`);
  
  try {
    // Build query
    let query = supabase.from('videos').select('*');
    
    if (tag) {
      // Search for tag in any of the tag columns
      query = query.or(`video_tag1.ilike.%${tag}%,video_tag2.ilike.%${tag}%,video_tag3.ilike.%${tag}%`);
    }
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      console.error("❌ Database query failed:", error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log("❓ No videos found in database");
      return;
    }
    
    console.log(`✅ Found ${data.length} videos in database:`);
    
    // Display results in table format
    console.table(data.map(v => ({
      id: v.id,
      name: v.video_name,
      tags: [v.video_tag1, v.video_tag2, v.video_tag3].filter(Boolean).join(', '),
      url_preview: v.video_url ? v.video_url.substring(0, 30) + '...' : 'N/A'
    })));
    
    // Test all URLs
    for (const video of data) {
      console.group(`Testing video: ${video.video_name} (ID: ${video.id})`);
      
      if (!video.video_url) {
        console.error("❌ Video has no URL");
        console.groupEnd();
        continue;
      }
      
      const validUrl = validateVideoUrl(video.video_url);
      console.log(`URL validation: ${validUrl ? '✅ Valid' : '❌ Invalid'}`);
      console.log(`Full URL: ${video.video_url}`);
      
      console.groupEnd();
    }
    
  } catch (error) {
    console.error("❌ Error searching database:", error);
  }
};

// Make functions available globally
if (typeof window !== 'undefined') {
  const videoUrlTester = {
    testUrl,
    showTestPlayer,
    findAndTestVideosInDatabase,
    validateUrl: validateVideoUrl
  };
  
  (window as any).videoUrlTester = videoUrlTester;
  
  console.log(`
    ====== Video URL Testing Utilities ======
    Available in console as 'videoUrlTester':
    
    videoUrlTester.testUrl("https://your-video-url.mp4") 
      - Tests if a URL is valid and playable
      
    videoUrlTester.showTestPlayer("https://your-video-url.mp4") 
      - Shows a test player on screen
      
    videoUrlTester.findAndTestVideosInDatabase() 
      - Lists and tests all videos in database
      
    videoUrlTester.findAndTestVideosInDatabase("catalog") 
      - Tests videos with specific tag
  `);
}

export default {
  testUrl,
  showTestPlayer,
  findAndTestVideosInDatabase,
  validateUrl: validateVideoUrl
};
