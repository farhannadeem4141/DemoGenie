
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

// Helper to generate public URL for video path
export const getPublicVideoUrl = (videoPath: string): string | null => {
  try {
    if (!videoPath) return null;
    
    // If it's already a fully formed URL, validate and return it
    if (videoPath.startsWith('http')) {
      return validateVideoUrl(videoPath);
    }
    
    // If it's a storage path, convert to public URL
    const { data } = supabase.storage.from("videos").getPublicUrl(videoPath);
    console.log("Generated public URL:", data.publicUrl);
    return validateVideoUrl(data.publicUrl);
  } catch (error) {
    console.error("Error generating public video URL:", error);
    return null;
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
  
  // Add action buttons
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '8px';
  actions.style.marginTop = '8px';
  
  const regenerateBtn = document.createElement('button');
  regenerateBtn.textContent = '🔄 Try Public URL';
  regenerateBtn.style.background = '#3b82f6';
  regenerateBtn.style.border = 'none';
  regenerateBtn.style.color = '#fff';
  regenerateBtn.style.padding = '4px 8px';
  regenerateBtn.style.borderRadius = '4px';
  regenerateBtn.style.cursor = 'pointer';
  regenerateBtn.style.fontSize = '12px';
  
  regenerateBtn.addEventListener('click', async () => {
    status.textContent = 'Generating public URL...';
    status.style.background = 'rgba(0,0,0,0.5)';
    
    try {
      const publicUrl = getPublicVideoUrl(url.includes('/object/') ? url.split('/object/')[1].split('?')[0] : url);
      if (publicUrl) {
        video.src = publicUrl;
        video.load();
        video.play().catch(e => {
          console.warn("Auto-play prevented:", e);
        });
        status.textContent = 'Trying with public URL...';
        urlInfo.textContent = publicUrl;
      } else {
        status.textContent = 'Failed to generate public URL';
        status.style.background = 'rgba(255,0,0,0.5)';
      }
    } catch (e) {
      status.textContent = 'Error generating URL: ' + (e instanceof Error ? e.message : 'Unknown error');
      status.style.background = 'rgba(255,0,0,0.5)';
    }
  });
  
  const copyUrlBtn = document.createElement('button');
  copyUrlBtn.textContent = '📋 Copy URL';
  copyUrlBtn.style.background = '#10b981';
  copyUrlBtn.style.border = 'none';
  copyUrlBtn.style.color = '#fff';
  copyUrlBtn.style.padding = '4px 8px';
  copyUrlBtn.style.borderRadius = '4px';
  copyUrlBtn.style.cursor = 'pointer';
  copyUrlBtn.style.fontSize = '12px';
  
  copyUrlBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(video.src)
      .then(() => {
        const originalText = copyUrlBtn.textContent;
        copyUrlBtn.textContent = '✅ Copied!';
        setTimeout(() => {
          copyUrlBtn.textContent = originalText;
        }, 2000);
      })
      .catch(() => {
        copyUrlBtn.textContent = '❌ Failed!';
        setTimeout(() => {
          copyUrlBtn.textContent = '📋 Copy URL';
        }, 2000);
      });
  });
  
  actions.appendChild(regenerateBtn);
  actions.appendChild(copyUrlBtn);
  
  // Assemble container
  container.appendChild(header);
  container.appendChild(video);
  container.appendChild(status);
  container.appendChild(actions);
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

// Function to fix URLs in the database
export const fixVideosInDatabase = async (): Promise<void> => {
  console.log("🔍 Looking for videos with problematic URLs...");
  
  try {
    const { data, error } = await supabase.from('videos').select('*');
    
    if (error) {
      console.error("❌ Database query failed:", error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log("❓ No videos found in database");
      return;
    }
    
    console.log(`✅ Found ${data.length} videos to check:`);
    
    // Process each video
    for (const video of data) {
      console.group(`Checking video: ${video.video_name} (ID: ${video.id})`);
      
      if (!video.video_url) {
        console.error("❌ Video has no URL");
        console.groupEnd();
        continue;
      }
      
      const validUrl = validateVideoUrl(video.video_url);
      if (!validUrl) {
        console.log(`⚠️ Invalid URL detected for "${video.video_name}": ${video.video_url}`);
        
        try {
          // If it's a storage path, convert to public URL
          const publicUrl = getPublicVideoUrl(video.video_url);
          
          if (publicUrl) {
            console.log(`✅ Generated public URL: ${publicUrl}`);
            
            // Update the database
            const { error: updateError } = await supabase
              .from('videos')
              .update({ video_url: publicUrl })
              .eq('id', video.id);
              
            if (updateError) {
              console.error("❌ Error updating video URL:", updateError);
            } else {
              console.log("✅ Successfully updated video URL in database");
            }
          } else {
            console.error("❌ Failed to generate public URL");
          }
        } catch (e) {
          console.error("❌ Error processing URL:", e);
        }
      } else {
        console.log(`✅ URL is valid: ${video.video_url}`);
      }
      
      console.groupEnd();
    }
    
    console.log("✅ Finished checking all videos");
    
  } catch (error) {
    console.error("❌ Error fixing database URLs:", error);
  }
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
      if (!validUrl) {
        console.warn(`⚠️ URL validation failed: ${video.video_url}`);
        console.log("Running auto-fix...");
        
        const publicUrl = getPublicVideoUrl(video.video_url);
        if (publicUrl) {
          console.log(`✅ Generated public URL: ${publicUrl}`);
          video.video_url = publicUrl;
          
          // Update in the database
          const { error: updateError } = await supabase
            .from('videos')
            .update({ video_url: publicUrl })
            .eq('id', video.id);
            
          if (!updateError) {
            console.log("✅ Database updated with new URL");
          } else {
            console.error("❌ Failed to update database:", updateError);
          }
        }
      } else {
        console.log(`✅ URL validation passed: ${video.video_url}`);
      }
      
      console.log(`Full URL: ${video.video_url}`);
      console.groupEnd();
    }
    
  } catch (error) {
    console.error("❌ Error searching database:", error);
  }
};

// Diagnostic function that runs all checks and attempts to fix issues
export const diagnoseAndFixVideoIssues = async (): Promise<void> => {
  console.log("🔍 Running complete video system diagnostic...");
  
  try {
    // Step 1: Check database connection
    console.log("Step 1: Verifying database connection...");
    const { data: healthCheck, error: healthError } = await supabase.from('videos').select('count(*)');
    
    if (healthError) {
      console.error("❌ Database connection failed:", healthError);
      return;
    }
    
    console.log("✅ Database connection successful");
    
    // Step 2: Find and fix problematic URLs
    console.log("Step 2: Checking and fixing video URLs...");
    await fixVideosInDatabase();
    
    // Step 3: Create a sample log entry to test URL creation
    console.log("Step 3: Testing storage URL generation...");
    try {
      // This is just a test, not actually uploading
      const { data: testPublicUrl } = supabase.storage.from('videos').getPublicUrl('test-video.mp4');
      console.log("✅ Storage public URL test successful:", testPublicUrl);
    } catch (e) {
      console.error("❌ Storage URL generation test failed:", e);
    }
    
    console.log("✅ Diagnostic complete! Check logs for any issues that need attention.");
    
  } catch (error) {
    console.error("❌ Error during diagnostic:", error);
  }
};

// Make functions available globally
if (typeof window !== 'undefined') {
  const videoUrlTester = {
    testUrl,
    showTestPlayer,
    findAndTestVideosInDatabase,
    fixVideosInDatabase,
    diagnoseAndFixVideoIssues,
    validateUrl: validateVideoUrl,
    getPublicUrl: getPublicVideoUrl
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
      
    videoUrlTester.fixVideosInDatabase() 
      - Automatically fixes problematic URLs in the database
      
    videoUrlTester.diagnoseAndFixVideoIssues()
      - Runs full diagnostic and attempts to fix all issues
  `);
}

export default {
  testUrl,
  showTestPlayer,
  findAndTestVideosInDatabase,
  fixVideosInDatabase,
  diagnoseAndFixVideoIssues,
  validateUrl: validateVideoUrl,
  getPublicUrl: getPublicVideoUrl
};
