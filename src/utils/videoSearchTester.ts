
import { searchAndPlayVideo } from '@/services/video/searchAndPlay';
import { searchVideosByKeyword } from '@/services/video/keywordSearch';
import { supabase } from '@/integrations/supabase/client';

/**
 * Test script to verify if voice input handling and video search are working correctly
 * Run this function in the browser console with: 
 * import('@/utils/videoSearchTester').then(module => module.testVoiceInputVideoSearch())
 */
export async function testVoiceInputVideoSearch(customKeyword?: string) {
  const testId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  console.group(`%c 🎬 VIDEO SEARCH TEST (${testId})`, 'background: #ff9e00; color: black; padding: 4px; border-radius: 4px; font-weight: bold;');
  console.time(`${testId}-total-test-duration`);
  
  try {
    // Step 1: Check if localStorage is accessible
    console.log(`[${testId}] Step 1: Testing localStorage access...`);
    try {
      localStorage.getItem('test');
      console.log(`[${testId}] ✅ localStorage is accessible`);
    } catch (e) {
      console.error(`[${testId}] ❌ localStorage is not accessible:`, e);
      throw new Error('Cannot proceed: localStorage not available');
    }
    
    // Step 2: Check if voice_input_history exists
    console.log(`[${testId}] Step 2: Checking if voice_input_history exists...`);
    const voiceHistory = localStorage.getItem('voice_input_history');
    
    if (!voiceHistory) {
      console.log(`[${testId}] ⚠️ voice_input_history not found, creating test entry`);
      const testEntry = [{
        text: customKeyword || "Quick replies",
        timestamp: Date.now(),
        source: 'test'
      }];
      localStorage.setItem('voice_input_history', JSON.stringify(testEntry));
      console.log(`[${testId}] ✅ Created test voice input entry`);
    } else {
      console.log(`[${testId}] ✅ voice_input_history found:`, JSON.parse(voiceHistory).length, 'entries');
      
      // Log the contents of voice_input_history to check for "Quick replies"
      const entries = JSON.parse(voiceHistory);
      console.log(`[${testId}] Voice Input History Entries:`);
      entries.slice(0, 5).forEach((entry, i) => {
        console.log(`[${testId}] ${i}: "${entry.text}" (${new Date(entry.timestamp).toLocaleTimeString()})`);
        if (entry.text.toLowerCase().includes('quick replies')) {
          console.log(`[${testId}] ✅ Found "Quick replies" at position ${i}`);
        }
      });
    }
    
    // Step 3: Get the latest voice input or use test keyword
    console.log(`[${testId}] Step 3: Getting latest voice input...`);
    const history = JSON.parse(localStorage.getItem('voice_input_history') || '[]');
    let testKeyword = customKeyword || "Quick replies";
    
    if (history.length > 0) {
      console.log(`[${testId}] Found existing voice inputs:`, history.length);
      if (!customKeyword) {
        testKeyword = history[0].text;
        console.log(`[${testId}] Using latest voice input: "${testKeyword}"`);
      } else {
        console.log(`[${testId}] Using custom keyword: "${testKeyword}"`);
        
        // Add our test keyword to the history
        const newEntry = {
          text: testKeyword,
          timestamp: Date.now(),
          source: 'test'
        };
        
        history.unshift(newEntry);
        localStorage.setItem('voice_input_history', JSON.stringify(history));
        console.log(`[${testId}] Added custom keyword to voice input history`);
      }
    } else {
      console.log(`[${testId}] No existing voice inputs, using default keyword: "${testKeyword}"`);
    }
    
    // Step 4: Perform the video search
    console.log(`[${testId}] Step 4: Performing video search with keyword: "${testKeyword}"`);
    console.time(`${testId}-video-search-duration`);
    const searchResult = await searchAndPlayVideo(testKeyword);
    console.timeEnd(`${testId}-video-search-duration`);
    
    // Step 5: Analyze search results
    console.log(`[${testId}] Step 5: Analyzing search results...`);
    console.log(`[${testId}] Raw search result:`, JSON.stringify(searchResult));
    
    if (searchResult.success && searchResult.video) {
      console.log(`%c [${testId}] ✅ VIDEO FOUND!`, 'background: #4CAF50; color: white; padding: 4px; border-radius: 4px;');
      console.log(`[${testId}] Video details:`, {
        id: searchResult.video.id,
        name: searchResult.video.video_name,
        url: searchResult.video.video_url.substring(0, 50) + '...',
        keyword: searchResult.video.keyword
      });
      
      // Step 6: Verify video URL is valid
      console.log(`[${testId}] Step 6: Verifying video URL...`);
      if (searchResult.video.video_url && searchResult.video.video_url.startsWith('http')) {
        console.log(`[${testId}] ✅ Video URL is valid`);
        console.log(`[${testId}] Full URL: ${searchResult.video.video_url}`);
        
        // Step 7: Attempt to load video in a test video element to check if URL works
        console.log(`[${testId}] Step 7: Testing if video URL loads correctly...`);
        const testVideo = document.createElement('video');
        testVideo.style.display = 'none';
        testVideo.crossOrigin = 'anonymous'; // Try with CORS settings
        testVideo.muted = true;
        
        const onLoadSuccess = () => {
          console.log(`%c [${testId}] ✅ VIDEO URL LOADS SUCCESSFULLY!`, 'background: #4CAF50; color: white; padding: 4px; border-radius: 4px;');
          console.log(`[${testId}] Test video load success details:`, {
            videoWidth: testVideo.videoWidth,
            videoHeight: testVideo.videoHeight,
            duration: testVideo.duration,
            readyState: testVideo.readyState,
            networkState: testVideo.networkState
          });
          
          if (document.body.contains(testVideo)) {
            document.body.removeChild(testVideo);
          }
        };
        
        const onLoadError = (e: any) => {
          console.error(`[${testId}] ❌ VIDEO URL FAILS TO LOAD:`, e);
          console.log(`[${testId}] Error details:`, {
            error: testVideo.error ? testVideo.error.code : 'No error code',
            errorMessage: testVideo.error ? testVideo.error.message : 'No error message',
            networkState: testVideo.networkState,
            readyState: testVideo.readyState
          });
          if (document.body.contains(testVideo)) {
            document.body.removeChild(testVideo);
          }
        };
        
        testVideo.addEventListener('loadeddata', onLoadSuccess);
        testVideo.addEventListener('error', onLoadError);
        
        document.body.appendChild(testVideo);
        testVideo.src = searchResult.video.video_url;
        console.log(`[${testId}] Set test video source to: ${searchResult.video.video_url.substring(0, 50)}...`);
        
        console.log(`[${testId}] Calling load() on test video element`);
        testVideo.load();
        
        // Check if TranscriptListener component is in the DOM and verify video rendering
        console.log(`[${testId}] Step 8: Checking if TranscriptListener component is active...`);
        const transcriptListenerElement = document.querySelector('[data-testid="video-player-container"]');
        if (transcriptListenerElement) {
          console.log(`[${testId}] ✅ TranscriptListener component found in DOM`);
          
          // Check if there's a video element inside the TranscriptListener
          const videoElement = transcriptListenerElement.querySelector('video');
          if (videoElement) {
            console.log(`[${testId}] ✅ Video element found in TranscriptListener`);
            console.log(`[${testId}] Video properties:`, {
              src: videoElement.src,
              error: videoElement.error ? videoElement.error.code : 'No error',
              errorMessage: videoElement.error ? videoElement.error.message : 'No error message',
              networkState: videoElement.networkState,
              readyState: videoElement.readyState,
              currentSrc: videoElement.currentSrc,
              paused: videoElement.paused,
              ended: videoElement.ended
            });
            
            if (videoElement.src.includes(searchResult.video.video_url.split('?')[0])) {
              console.log(`%c [${testId}] ✅ VIDEO IS PLAYING IN UI!`, 'background: #4CAF50; color: white; padding: 4px; border-radius: 4px;');
            } else {
              console.log(`[${testId}] ❌ Video element has different source URL`);
              console.log(`[${testId}] Expected: ${searchResult.video.video_url.split('?')[0]}`);
              console.log(`[${testId}] Actual: ${videoElement.src.split('?')[0]}`);
            }
          } else {
            console.log(`[${testId}] ❌ No video element found in TranscriptListener`);
            
            // Log the HTML structure of the TranscriptListener to debug
            console.log(`[${testId}] TranscriptListener DOM structure:`, transcriptListenerElement.innerHTML);
          }
        } else {
          console.log(`[${testId}] ⚠️ TranscriptListener component not found in DOM - video will not render automatically`);
          console.log(`[${testId}] Attempting to dispatch custom event for TranscriptListener...`);
          
          // Dispatch voice_input event to trigger the TranscriptListener
          window.dispatchEvent(new CustomEvent('voice_input', {
            detail: {
              type: 'voice_input',
              text: testKeyword
            }
          }));
          
          console.log(`[${testId}] ✅ Dispatched voice_input event with text: "${testKeyword}"`);
          console.log(`[${testId}] Checking again for video player after 1 second...`);
          
          // Check again after a short delay
          setTimeout(() => {
            const playerContainer = document.querySelector('[data-testid="video-player-container"]');
            if (playerContainer) {
              console.log(`[${testId}] ✅ Video player container appeared after event dispatch!`);
              const videoEl = playerContainer.querySelector('video');
              if (videoEl) {
                console.log(`%c [${testId}] ✅ VIDEO IS NOW PLAYING IN UI!`, 'background: #4CAF50; color: white; padding: 4px; border-radius: 4px;');
                console.log(`[${testId}] Video source:`, videoEl.src);
              } else {
                console.log(`[${testId}] ❌ No video element found in player container`);
                console.log(`[${testId}] Player container DOM structure:`, playerContainer.innerHTML);
              }
            } else {
              console.log(`[${testId}] ❌ Video player container still not found after event dispatch`);
              console.log(`[${testId}] All elements with data-testid attributes:`);
              document.querySelectorAll('[data-testid]').forEach(el => {
                console.log(`[${testId}] - ${el.getAttribute('data-testid')}`);
              });
              
              console.log(`[${testId}] Possible issues:`);
              console.log(`[${testId}] 1. TranscriptListener component might not be correctly processing voice_input events`);
              console.log(`[${testId}] 2. The video state in the TranscriptListener might not be updating`);
              console.log(`[${testId}] 3. The video player might be hidden due to CSS issues`);
              
              // Try one more approach with a direct message to the conversation history
              console.log(`[${testId}] Attempting one more approach - check if useConversationHistory hook is working...`);
              
              // Look for any setCurrentVideo functions in the global scope
              const globalFunctions = Object.keys(window).filter(key => 
                typeof (window as any)[key] === 'function' && 
                key.toLowerCase().includes('video')
              );
              
              if (globalFunctions.length > 0) {
                console.log(`[${testId}] Found potentially related global functions:`, globalFunctions);
              }
            }
          }, 1000);
        }
        
        // Return the search result for further use
        console.timeEnd(`${testId}-total-test-duration`);
        console.groupEnd();
        return searchResult;
      } else {
        console.error(`[${testId}] ❌ Invalid video URL:`, searchResult.video.video_url);
        throw new Error('Invalid video URL format');
      }
    } else {
      console.error(`%c [${testId}] ❌ VIDEO NOT FOUND`, 'background: #f44336; color: white; padding: 4px; border-radius: 4px;');
      console.error(`[${testId}] Error details:`, searchResult.errorDetails);
      
      // Try to determine why no video was found
      if (typeof searchResult.errorDetails === 'string' && 
          searchResult.errorDetails.includes('database_query')) {
        console.log(`[${testId}] 💡 Suggestion: There might be an issue with the database query`);
        console.log(`[${testId}] Checking database for "Quick replies" videos directly...`);
        
        // Import and use the direct database search function
        import('@/services/video/keywordSearch').then(module => {
          module.searchVideosByKeyword("Quick replies").then(result => {
            console.log(`[${testId}] Direct DB search results:`, result);
            if (result.success && result.data && result.data.length > 0) {
              console.log(`[${testId}] ✅ Videos found in direct DB search:`, result.data.length);
              console.log(`[${testId}] First video:`, result.data[0]);
            } else {
              console.log(`[${testId}] ❌ No videos found in direct DB search`);
              console.log(`[${testId}] Raw query used:`, result.rawQuery);
              console.log(`[${testId}] Error reason:`, result.errorReason);
              
              // Check if the database has any videos at all
              console.log(`[${testId}] Checking if the database has any videos...`);
              
              // Check all videos in the database directly
              const checkAllVideos = async () => {
                try {
                  console.time(`${testId}-all-videos-query`);
                  const { data, error } = await supabase
                    .from('videos')
                    .select('*')
                    .limit(10);
                  console.timeEnd(`${testId}-all-videos-query`);
                  
                  if (error) throw error;
                  
                  console.log(`[${testId}] Sample of videos in database:`, data);
                  
                  if (data.length > 0) {
                    console.log(`[${testId}] ✅ Found`, data.length, 'videos in database');
                    
                    // Check for videos with "quick replies" in tags
                    const quickRepliesVideos = data.filter(video => {
                      const tags = [
                        video.video_tag1, 
                        video.video_tag2, 
                        video.video_tag3
                      ].map(tag => tag?.toLowerCase() || '');
                      
                      return tags.some(tag => tag.includes('quick') && tag.includes('replies'));
                    });
                    
                    if (quickRepliesVideos.length > 0) {
                      console.log(`[${testId}] ✅ Found videos with "quick replies" in tags:`, quickRepliesVideos);
                    } else {
                      console.log(`[${testId}] ❌ No videos with "quick replies" in tags found`);
                    }
                  } else {
                    console.log(`[${testId}] ❌ No videos found in the database`);
                  }
                } catch (err) {
                  console.error(`[${testId}] Error checking all videos:`, err);
                }
              };
              
              checkAllVideos();
            }
          });
        });
      } else if (typeof searchResult.errorDetails === 'string' && 
                searchResult.errorDetails.includes('no_results')) {
        console.log(`[${testId}] 💡 Suggestion: No matching videos found for the keyword. Check if videos with tag "Quick replies" exist in the database`);
      } else if (typeof searchResult.errorDetails === 'string' && 
                searchResult.errorDetails.includes('url_validation')) {
        console.log(`[${testId}] 💡 Suggestion: A video was found but its URL is invalid`);
      }
      
      throw new Error(`Video search failed: ${searchResult.errorDetails}`);
    }
  } catch (error) {
    console.error(`[${testId}] ❌ Test failed:`, error);
    console.timeEnd(`${testId}-total-test-duration`);
    console.groupEnd();
    throw error;
  } finally {
    if (console.groupEnd) {
      // Make sure we end the group if not already ended
      console.timeEnd(`${testId}-total-test-duration`);
      console.groupEnd();
    }
  }
}

/**
 * A simpler function that just checks if "Quick replies" exists in localStorage and triggers a video search
 * Run this function in the browser console directly.
 */
export function quickRepliesStorageTest() {
  const testId = `qr-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  console.group(`%c 🔍 QUICK REPLIES STORAGE TEST (${testId})`, 'background: #ff9e00; color: black; padding: 4px; border-radius: 4px; font-weight: bold;');
  console.time(`${testId}-total-duration`);
  
  try {
    // Check if "Quick replies" exists in localStorage
    console.log(`[${testId}] Checking voice_input_history in localStorage...`);
    const voiceHistory = localStorage.getItem('voice_input_history');
    
    if (!voiceHistory) {
      console.log(`[${testId}] ⚠️ voice_input_history not found in localStorage`);
      console.log(`[${testId}] Creating test entry with "Quick replies"...`);
      
      const testEntry = [{
        text: "Quick replies",
        timestamp: Date.now(),
        source: 'test'
      }];
      
      localStorage.setItem('voice_input_history', JSON.stringify(testEntry));
      console.log(`[${testId}] ✅ Created test voice input entry with "Quick replies"`);
    } else {
      const entries = JSON.parse(voiceHistory);
      console.log(`[${testId}] ✅ voice_input_history found with`, entries.length, 'entries');
      
      // Check if "Quick replies" exists
      let foundQuickReplies = false;
      entries.forEach((entry, i) => {
        if (entry.text.toLowerCase().includes('quick replies')) {
          console.log(`[${testId}] ✅ Found "Quick replies" at position ${i}:`, entry);
          foundQuickReplies = true;
        }
      });
      
      if (!foundQuickReplies) {
        console.log(`[${testId}] ❌ "Quick replies" not found in voice_input_history`);
        console.log(`[${testId}] Adding "Quick replies" to voice_input_history...`);
        
        const newEntry = {
          text: "Quick replies",
          timestamp: Date.now(),
          source: 'test'
        };
        
        entries.unshift(newEntry);
        localStorage.setItem('voice_input_history', JSON.stringify(entries));
        console.log(`[${testId}] ✅ Added "Quick replies" to voice_input_history`);
      }
    }
    
    // Manually dispatch a voice_input event
    console.log(`[${testId}] Dispatching voice_input event with "Quick replies"...`);
    window.dispatchEvent(new CustomEvent('voice_input', {
      detail: {
        type: 'voice_input',
        text: "Quick replies"
      }
    }));
    
    console.log(`[${testId}] ✅ Event dispatched, check console for video search and player logs`);
    console.log(`[${testId}] Check the DOM for video player at:`, document.querySelector('[data-testid="video-player-container"]'));
    
    // Check after a delay to see if the video player appeared
    setTimeout(() => {
      const playerContainer = document.querySelector('[data-testid="video-player-container"]');
      if (playerContainer) {
        console.log(`[${testId}] ✅ Video player container found in DOM!`);
        const videoEl = playerContainer.querySelector('video');
        if (videoEl) {
          console.log(`%c [${testId}] ✅ VIDEO IS PLAYING IN UI!`, 'background: #4CAF50; color: white; padding: 4px; border-radius: 4px;');
          console.log(`[${testId}] Video source:`, videoEl.src);
          console.log(`[${testId}] Video state:`, {
            networkState: videoEl.networkState,
            readyState: videoEl.readyState,
            error: videoEl.error ? videoEl.error.code : 'No error',
            errorMessage: videoEl.error ? videoEl.error.message : 'No error message',
            currentTime: videoEl.currentTime,
            duration: videoEl.duration,
            paused: videoEl.paused
          });
        } else {
          console.log(`[${testId}] ❌ No video element found in player container`);
          console.log(`[${testId}] Player container contents:`, playerContainer.innerHTML);
        }
      } else {
        console.log(`[${testId}] ❌ Video player container not found after event dispatch`);
        console.log(`[${testId}] Possible UI rendering or state management issues...`);
        
        // Check if any videos are present in the DOM
        const allVideos = document.querySelectorAll('video');
        console.log(`[${testId}] Found ${allVideos.length} video elements in DOM:`, allVideos);
      }
      
      console.timeEnd(`${testId}-total-duration`);
    }, 2000);
  } catch (error) {
    console.error(`[${testId}] ❌ Test failed:`, error);
    console.timeEnd(`${testId}-total-duration`);
  } finally {
    // Close the group after a delay to ensure all logs are captured
    setTimeout(() => {
      console.groupEnd();
    }, 3000);
  }
  
  return true;
}

// Make the test function available globally
if (typeof window !== 'undefined') {
  (window as any).testVoiceInputVideoSearch = testVoiceInputVideoSearch;
  (window as any).quickRepliesStorageTest = quickRepliesStorageTest;
}
