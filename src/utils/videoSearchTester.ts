
import { searchAndPlayVideo } from '@/services/video/searchAndPlay';

/**
 * Test script to verify if voice input handling and video search are working correctly
 * Run this function in the browser console with: 
 * import('@/utils/videoSearchTester').then(module => module.testVoiceInputVideoSearch())
 */
export async function testVoiceInputVideoSearch(customKeyword?: string) {
  console.group('%c VIDEO SEARCH TEST', 'background: #ff9e00; color: black; padding: 4px; border-radius: 4px; font-weight: bold;');
  
  try {
    // Step 1: Check if localStorage is accessible
    console.log('Step 1: Testing localStorage access...');
    try {
      localStorage.getItem('test');
      console.log('✅ localStorage is accessible');
    } catch (e) {
      console.error('❌ localStorage is not accessible:', e);
      throw new Error('Cannot proceed: localStorage not available');
    }
    
    // Step 2: Check if voice_input_history exists
    console.log('Step 2: Checking if voice_input_history exists...');
    const voiceHistory = localStorage.getItem('voice_input_history');
    
    if (!voiceHistory) {
      console.log('⚠️ voice_input_history not found, creating test entry');
      const testEntry = [{
        text: customKeyword || "Quick replies",
        timestamp: Date.now(),
        source: 'test'
      }];
      localStorage.setItem('voice_input_history', JSON.stringify(testEntry));
      console.log('✅ Created test voice input entry');
    } else {
      console.log('✅ voice_input_history found:', JSON.parse(voiceHistory).length, 'entries');
    }
    
    // Step 3: Get the latest voice input or use test keyword
    console.log('Step 3: Getting latest voice input...');
    const history = JSON.parse(localStorage.getItem('voice_input_history') || '[]');
    let testKeyword = customKeyword || "Quick replies";
    
    if (history.length > 0) {
      console.log('Found existing voice inputs:', history.length);
      if (!customKeyword) {
        testKeyword = history[0].text;
        console.log('Using latest voice input:', testKeyword);
      } else {
        console.log('Using custom keyword:', testKeyword);
        
        // Add our test keyword to the history
        const newEntry = {
          text: testKeyword,
          timestamp: Date.now(),
          source: 'test'
        };
        
        history.unshift(newEntry);
        localStorage.setItem('voice_input_history', JSON.stringify(history));
        console.log('Added custom keyword to voice input history');
      }
    } else {
      console.log('No existing voice inputs, using default keyword:', testKeyword);
    }
    
    // Step 4: Perform the video search
    console.log('Step 4: Performing video search with keyword:', testKeyword);
    console.time('Video search duration');
    const searchResult = await searchAndPlayVideo(testKeyword);
    console.timeEnd('Video search duration');
    
    // Step 5: Analyze search results
    console.log('Step 5: Analyzing search results...');
    if (searchResult.success && searchResult.video) {
      console.log('%c ✅ VIDEO FOUND!', 'background: #4CAF50; color: white; padding: 4px; border-radius: 4px;');
      console.log('Video details:', {
        id: searchResult.video.id,
        name: searchResult.video.video_name,
        url: searchResult.video.video_url.substring(0, 50) + '...',
        keyword: searchResult.video.keyword
      });
      
      // Step 6: Verify video URL is valid
      console.log('Step 6: Verifying video URL...');
      if (searchResult.video.video_url && searchResult.video.video_url.startsWith('http')) {
        console.log('✅ Video URL is valid');
        
        // Step 7: Attempt to load video in a video element to check if URL works
        console.log('Step 7: Testing if video URL loads correctly...');
        const testVideo = document.createElement('video');
        testVideo.style.display = 'none';
        testVideo.muted = true;
        
        const onLoadSuccess = () => {
          console.log('%c ✅ VIDEO URL LOADS SUCCESSFULLY!', 'background: #4CAF50; color: white; padding: 4px; border-radius: 4px;');
          document.body.removeChild(testVideo);
        };
        
        const onLoadError = (e: any) => {
          console.error('❌ VIDEO URL FAILS TO LOAD:', e);
          document.body.removeChild(testVideo);
        };
        
        testVideo.addEventListener('loadeddata', onLoadSuccess);
        testVideo.addEventListener('error', onLoadError);
        
        document.body.appendChild(testVideo);
        testVideo.src = searchResult.video.video_url;
        testVideo.load();
        
        // If TranscriptListener component is in the DOM, it should automatically render the video
        console.log('Checking if TranscriptListener component is active...');
        const transcriptListenerElement = document.querySelector('[data-testid="video-player-container"]');
        if (transcriptListenerElement) {
          console.log('✅ TranscriptListener component found in DOM');
        } else {
          console.log('⚠️ TranscriptListener component not found in DOM - video will not render automatically');
          console.log('Suggest dispatching custom event for TranscriptListener:');
          console.log(`
            window.dispatchEvent(new CustomEvent('voice_input', {
              detail: {
                type: 'voice_input',
                text: "${testKeyword}"
              }
            }));
          `);
        }
        
        // Return the search result for further use
        return searchResult;
      } else {
        console.error('❌ Invalid video URL:', searchResult.video.video_url);
        throw new Error('Invalid video URL format');
      }
    } else {
      console.error('%c ❌ VIDEO NOT FOUND', 'background: #f44336; color: white; padding: 4px; border-radius: 4px;');
      console.error('Error details:', searchResult.errorDetails);
      
      // Try to determine why no video was found
      if (searchResult.errorDetails?.step === 'database_query') {
        console.log('💡 Suggestion: There might be an issue with the database query');
      } else if (searchResult.errorDetails?.step === 'no_results') {
        console.log('💡 Suggestion: No matching videos found for the keyword. Check if videos with tag "Quick replies" exist in the database');
      } else if (searchResult.errorDetails?.step === 'url_validation') {
        console.log('💡 Suggestion: A video was found but its URL is invalid');
      }
      
      throw new Error(`Video search failed at step: ${searchResult.errorDetails?.step}`);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    console.groupEnd();
  }
}

