
import { supabase } from "@/integrations/supabase/client";
import { validateVideoUrl } from "@/services/video/videoUrlValidator";

/**
 * VideoFixer - A utility to diagnose and fix video playback issues
 */
export const VideoFixer = {
  /**
   * Check the health of all videos in the database
   */
  async checkAllVideos() {
    console.log("🔍 Starting video health check...");
    
    try {
      // Get all videos from the database
      const { data: videos, error } = await supabase
        .from('videos')
        .select('*');
      
      if (error) {
        console.error("❌ Failed to fetch videos:", error);
        return { success: false, error };
      }
      
      if (!videos || videos.length === 0) {
        console.warn("⚠️ No videos found in the database");
        return { success: true, message: "No videos found" };
      }
      
      console.log(`🎬 Found ${videos.length} videos. Checking each...`);
      
      const issues = [];
      const fixed = [];
      
      // Check each video
      for (const video of videos) {
        console.log(`\n🎥 Checking video ID ${video.id}: "${video.video_name}"`);
        console.log(`   URL: ${video.video_url}`);
        
        // Validate current URL
        const isValid = validateVideoUrl(video.video_url);
        
        if (!isValid) {
          console.warn(`⚠️ Invalid URL detected for video: "${video.video_name}"`);
          issues.push({ id: video.id, name: video.video_name, issue: "Invalid URL format" });
          
          // Try to fix by generating new public URL
          try {
            console.log("🔄 Attempting to generate a new public URL...");
            
            // Extract the file path if it's a relative path or full URL
            let filePath = video.video_url;
            
            // If it's a full URL pointing to Supabase storage
            if (filePath.includes('storage/v1/object/public/videos/')) {
              filePath = filePath.split('storage/v1/object/public/videos/').pop() || '';
              console.log("   Extracted path from URL:", filePath);
            }
            
            // Generate new public URL
            const { data } = supabase.storage.from("videos").getPublicUrl(filePath);
            
            if (data && data.publicUrl) {
              console.log("✅ Generated new public URL:", data.publicUrl);
              
              // Update the database
              const { error: updateError } = await supabase
                .from('videos')
                .update({ video_url: data.publicUrl })
                .eq('id', video.id);
              
              if (updateError) {
                console.error("❌ Failed to update database:", updateError);
              } else {
                console.log("💾 Database updated successfully");
                fixed.push({ id: video.id, name: video.video_name, newUrl: data.publicUrl });
              }
            } else {
              console.error("❌ Failed to generate public URL");
            }
          } catch (err) {
            console.error("❌ Error fixing URL:", err);
          }
        } else {
          console.log("✅ URL is valid");
        }
      }
      
      console.log("\n📊 Video health check summary:");
      console.log(`   Total videos: ${videos.length}`);
      console.log(`   Issues found: ${issues.length}`);
      console.log(`   Issues fixed: ${fixed.length}`);
      
      return {
        success: true,
        summary: {
          total: videos.length,
          issuesFound: issues.length,
          issuesFixed: fixed.length
        },
        issues,
        fixed
      };
    } catch (err) {
      console.error("❌ Error checking videos:", err);
      return { success: false, error: err };
    }
  },
  
  /**
   * Test playability of a video URL
   */
  testUrl(url) {
    return new Promise((resolve) => {
      console.log("🔍 Testing URL playability:", url);
      
      // Create test video element
      const video = document.createElement('video');
      video.style.display = 'none';
      document.body.appendChild(video);
      
      // Set up event listeners
      let timeoutId;
      
      const cleanup = () => {
        clearTimeout(timeoutId);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('error', handleError);
        document.body.removeChild(video);
      };
      
      const handleCanPlay = () => {
        console.log("✅ Video can play!");
        cleanup();
        resolve({ success: true });
      };
      
      const handleError = (e) => {
        console.error("❌ Video error:", e);
        cleanup();
        resolve({ success: false, error: e });
      };
      
      // Set timeout for testing
      timeoutId = setTimeout(() => {
        console.warn("⏱️ Video load timed out");
        cleanup();
        resolve({ success: false, error: "Timeout" });
      }, 10000);
      
      // Set up video element
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('error', handleError);
      
      // Start testing
      video.src = url;
      video.load();
    });
  },
  
  /**
   * Create a test button in the UI to run diagnostics
   */
  addTestButton() {
    const btn = document.createElement('button');
    btn.textContent = '🔄 Fix Videos';
    btn.style.position = 'fixed';
    btn.style.bottom = '10px';
    btn.style.left = '10px';
    btn.style.zIndex = '9999';
    btn.style.padding = '10px';
    btn.style.background = '#25D366';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '5px';
    btn.style.cursor = 'pointer';
    
    btn.onclick = async () => {
      console.log("🔄 Video fixer running...");
      btn.disabled = true;
      btn.textContent = '⏳ Fixing...';
      
      const result = await this.checkAllVideos();
      
      btn.textContent = result.success ? 
        `✅ Fixed ${result.fixed?.length || 0} videos` :
        '❌ Fix failed';
      
      setTimeout(() => {
        btn.textContent = '🔄 Fix Videos';
        btn.disabled = false;
      }, 3000);
    };
    
    document.body.appendChild(btn);
    console.log("🛠️ Video fixer button added to the UI");
    
    return btn;
  }
};

// Export a convenient function to run in the console
export function fixAllVideos() {
  return VideoFixer.checkAllVideos();
}
