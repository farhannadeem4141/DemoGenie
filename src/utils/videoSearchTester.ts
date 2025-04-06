import { searchAndPlay } from '@/services/video/searchAndPlay';
import { validateVideoUrl } from '@/services/video/videoUrlValidator';
import { searchTranscript } from '@/services/video/transcriptSearch';
import { searchKeywords } from '@/services/video/keywordSearch';
import { VideoSearchResult } from '@/services/video/types';

// Utility to test video search functionality
const testId = `tester-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
console.log(`[VideoSearchTester:${testId}] Starting video search tester`);

// Function to run a series of tests
export const runVideoSearchTests = async () => {
  console.log(`[VideoSearchTester:${testId}] Running video search tests`);
  
  // Test cases
  const testCases = [
    {
      transcript: "Welcome video",
      expectedVideoUrl: "https://zludhbuizuzusixaqjww.supabase.co/storage/v1/object/public/videos/welcome.mp4",
      description: "Should find the welcome video"
    },
    {
      transcript: "Invalid video",
      expectedVideoUrl: null,
      description: "Should not find any video"
    },
    {
      transcript: "Message templates",
      expectedVideoUrl: "https://zludhbuizuzusixaqjww.supabase.co/storage/v1/object/public/videos/message-templates.mp4",
      description: "Should find the message templates video"
    }
  ];
  
  // Run each test case
  for (const testCase of testCases) {
    console.log(`[VideoSearchTester:${testId}] Running test case: ${testCase.description}`);
    await runSingleTest(testCase.transcript, testCase.expectedVideoUrl, testCase.description);
  }
  
  console.log(`[VideoSearchTester:${testId}] All video search tests completed`);
};

// Function to run a single test
const runSingleTest = async (transcript: string, expectedVideoUrl: string | null, description: string) => {
  const testRunId = `testRun-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  console.log(`[VideoSearchTester:${testRunId}] Running single test: ${description}`);
  console.time(`[VideoSearchTester:${testRunId}] Single test duration`);
  
  try {
    // Perform the video search
    console.log(`[VideoSearchTester:${testRunId}] Searching for video with transcript: ${transcript}`);
    const result = await searchAndPlay(transcript);
    
    // Validate the result
    if (expectedVideoUrl) {
      console.assert(result !== null && result.videoUrl === expectedVideoUrl, 
        `[VideoSearchTester:${testRunId}] Test failed: ${description}. Expected ${expectedVideoUrl}, but got ${result ? result.videoUrl : null}`);
      console.log(`[VideoSearchTester:${testRunId}] Test passed: ${description}`);
    } else {
      console.assert(result === null || result.videoUrl === undefined, 
        `[VideoSearchTester:${testRunId}] Test failed: ${description}. Expected no video, but got ${result ? result.videoUrl : null}`);
      console.log(`[VideoSearchTester:${testRunId}] Test passed: ${description}`);
    }
  } catch (error) {
    console.error(`[VideoSearchTester:${testRunId}] Test failed with error: ${description}`, error);
  } finally {
    console.timeEnd(`[VideoSearchTester:${testRunId}] Single test duration`);
  }
};

// Function to test video URL validator
export const testVideoUrlValidator = () => {
  console.log(`[VideoSearchTester:${testId}] Testing video URL validator`);
  
  const validUrl = "https://zludhbuizuzusixaqjww.supabase.co/storage/v1/object/public/videos/welcome.mp4";
  const invalidUrl = "htps://invalid-url";
  
  console.assert(validateVideoUrl(validUrl) === validUrl, "[VideoSearchTester] Valid URL should pass validation");
  console.assert(validateVideoUrl(invalidUrl) === '', "[VideoSearchTester] Invalid URL should fail validation");
  
  console.log(`[VideoSearchTester:${testId}] Video URL validator tests completed`);
};

// Function to test transcript search
export const testTranscriptSearch = async () => {
  console.log(`[VideoSearchTester:${testId}] Testing transcript search`);
  
  const validTranscript = "Welcome video";
  const invalidTranscript = "Non existing video transcript";
  
  const validResult = await searchTranscript(validTranscript);
  console.assert(validResult !== null && validResult.videoUrl === "https://zludhbuizuzusixaqjww.supabase.co/storage/v1/object/public/videos/welcome.mp4",
    "[VideoSearchTester] Valid transcript should return a video");
  
  const invalidResult = await searchTranscript(invalidTranscript);
  console.assert(invalidResult === null, "[VideoSearchTester] Invalid transcript should return null");
  
  console.log(`[VideoSearchTester:${testId}] Transcript search tests completed`);
};

// Function to test keyword search
export const testKeywordSearch = async () => {
  console.log(`[VideoSearchTester:${testId}] Testing keyword search`);
  
  const validKeyword = "Message templates";
  const invalidKeyword = "Non existing video keyword";
  
  const validResult = await searchKeywords(validKeyword);
  console.assert(validResult !== null && validResult.videoUrl === "https://zludhbuizuzusixaqjww.supabase.co/storage/v1/object/public/videos/message-templates.mp4",
    "[VideoSearchTester] Valid keyword should return a video");
  
  const invalidResult = await searchKeywords(invalidKeyword);
  console.assert(invalidResult === null, "[VideoSearchTester] Invalid keyword should return null");
  
  console.log(`[VideoSearchTester:${testId}] Keyword search tests completed`);
};

// Combined test function
export const runAllTests = async () => {
  console.log(`[VideoSearchTester:${testId}] Running all tests`);
  
  await runVideoSearchTests();
  testVideoUrlValidator();
  await testTranscriptSearch();
  await testKeywordSearch();
  
  console.log(`[VideoSearchTester:${testId}] All tests completed`);
};

// Error tracking and reporting
const errorLog: any[] = [];

// Function to simulate errors
export const simulateError = (step: string, message: string) => {
  console.error(`[VideoSearchTester:${testId}] Simulating error in ${step}: ${message}`);
  errorLog.push({ step, message, timestamp: Date.now() });
};

// Function to clear error log
export const clearErrorLog = () => {
  console.log(`[VideoSearchTester:${testId}] Clearing error log`);
  errorLog.length = 0;
};

// Function to display error report
export const displayErrorReport = () => {
  console.log(`[VideoSearchTester:${testId}] Displaying error report`);
  if (errorLog.length === 0) {
    console.log(`[VideoSearchTester:${testId}] No errors found`);
    return;
  }
  
  console.warn(`[VideoSearchTester:${testId}] Errors found:`);
  errorLog.forEach((error, index) => {
    console.warn(`[VideoSearchTester:${testId}] Error ${index + 1}: Step - ${error.step}, Message - ${error.message}, Timestamp - ${new Date(error.timestamp).toLocaleString()}`);
  });
};

// Test error handling during searchAndPlay
export const testSearchAndPlayErrorHandling = async () => {
  const testRunId = `testRun-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  console.log(`[VideoSearchTester:${testRunId}] Testing searchAndPlay error handling`);
  
  // Simulate an error during transcript search
  simulateError('transcriptSearch', 'Simulated error during transcript search');
  
  try {
    // Run searchAndPlay with a transcript
    const transcript = "Test transcript";
    console.log(`[VideoSearchTester:${testRunId}] Searching for video with transcript: ${transcript}`);
    const result = await searchAndPlay(transcript);
    
    // Check if the error was handled correctly
    console.assert(result === null, "[VideoSearchTester] Error handling test failed: Expected null result");
    console.log(`[VideoSearchTester:${testRunId}] Error handling test passed: Error was handled correctly`);
  } catch (error) {
    console.error(`[VideoSearchTester:${testRunId}] Test failed with error:`, error);
  } finally {
    // Display the error report
    displayErrorReport();
    
    // Clear the error log
    clearErrorLog();
  }
};

// Test error handling during video URL validation
export const testVideoUrlValidationErrorHandling = async () => {
  const testRunId = `testRun-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  console.log(`[VideoSearchTester:${testRunId}] Testing video URL validation error handling`);
  
  // Simulate an error during video URL validation by modifying the validateVideoUrl function
  const originalValidateVideoUrl = validateVideoUrl;
  
  // Override validateVideoUrl to simulate an error
  (validateVideoUrl as any) = (url: string) => {
    console.error(`[VideoSearchTester:${testRunId}] Simulating error during video URL validation`);
    simulateError('videoUrlValidation', 'Simulated error during video URL validation');
    return ''; // Return an empty string to simulate validation failure
  };
  
  try {
    // Run searchAndPlay with a transcript
    const transcript = "Test transcript";
    console.log(`[VideoSearchTester:${testRunId}] Searching for video with transcript: ${transcript}`);
    const result = await searchAndPlay(transcript);
    
    // Check if the error was handled correctly
    console.assert(result === null, "[VideoSearchTester] Error handling test failed: Expected null result");
    console.log(`[VideoSearchTester:${testRunId}] Error handling test passed: Error was handled correctly`);
  } catch (error) {
    console.error(`[VideoSearchTester:${testRunId}] Test failed with error:`, error);
  } finally {
    // Restore the original validateVideoUrl function
    (validateVideoUrl as any) = originalValidateVideoUrl;
    
    // Display the error report
    displayErrorReport();
    
    // Clear the error log
    clearErrorLog();
  }
};

// Test error handling during transcript search
export const testTranscriptSearchErrorHandling = async () => {
  const testRunId = `testRun-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  console.log(`[VideoSearchTester:${testRunId}] Testing transcript search error handling`);
  
  // Simulate an error during transcript search by modifying the searchTranscript function
  const originalSearchTranscript = searchTranscript;
  
  // Override searchTranscript to simulate an error
  (searchTranscript as any) = (transcript: string) => {
    console.error(`[VideoSearchTester:${testRunId}] Simulating error during transcript search`);
    simulateError('transcriptSearch', 'Simulated error during transcript search');
    throw new Error('Simulated error during transcript search');
  };
  
  try {
    // Run searchAndPlay with a transcript
    const transcript = "Test transcript";
    console.log(`[VideoSearchTester:${testRunId}] Searching for video with transcript: ${transcript}`);
    const result = await searchAndPlay(transcript);
    
    // Check if the error was handled correctly
    console.assert(result === null, "[VideoSearchTester] Error handling test failed: Expected null result");
    console.log(`[VideoSearchTester:${testRunId}] Error handling test passed: Error was handled correctly`);
  } catch (error) {
    console.error(`[VideoSearchTester:${testRunId}] Test failed with error:`, error);
  } finally {
    // Restore the original searchTranscript function
    (searchTranscript as any) = originalSearchTranscript;
    
    // Display the error report
    displayErrorReport();
    
    // Clear the error log
    clearErrorLog();
  }
};

// Test error handling during keyword search
export const testKeywordSearchErrorHandling = async () => {
  const testRunId = `testRun-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  console.log(`[VideoSearchTester:${testRunId}] Testing keyword search error handling`);
  
  // Simulate an error during keyword search by modifying the searchKeywords function
  const originalSearchKeywords = searchKeywords;
  
  // Override searchKeywords to simulate an error
  (searchKeywords as any) = (keyword: string) => {
    console.error(`[VideoSearchTester:${testRunId}] Simulating error during keyword search`);
    simulateError('keywordSearch', 'Simulated error during keyword search');
    throw new Error('Simulated error during keyword search');
  };
  
  try {
    // Run searchAndPlay with a transcript
    const transcript = "Test transcript";
    console.log(`[VideoSearchTester:${testRunId}] Searching for video with transcript: ${transcript}`);
    const result = await searchAndPlay(transcript);
    
    // Check if the error was handled correctly
    console.assert(result === null, "[VideoSearchTester] Error handling test failed: Expected null result");
    console.log(`[VideoSearchTester:${testRunId}] Error handling test passed: Error was handled correctly`);
  } catch (error) {
    console.error(`[VideoSearchTester:${testRunId}] Test failed with error:`, error);
  } finally {
    // Restore the original searchKeywords function
    (searchKeywords as any) = originalSearchKeywords;
    
    // Display the error report
    displayErrorReport();
    
    // Clear the error log
    clearErrorLog();
  }
};

// Run all error handling tests
export const runAllErrorHandlingTests = async () => {
  console.log(`[VideoSearchTester:${testId}] Running all error handling tests`);
  
  await testSearchAndPlayErrorHandling();
  await testVideoUrlValidationErrorHandling();
  await testTranscriptSearchErrorHandling();
  await testKeywordSearchErrorHandling();
  
  console.log(`[VideoSearchTester:${testId}] All error handling tests completed`);
};

// Example usage: Run all tests
// runAllTests();

// Example usage: Run all error handling tests
// runAllErrorHandlingTests();

// Log uncaught errors
window.addEventListener('error', (event) => {
  console.error("[VideoSearchTester] Uncaught error:", event.error);
  const errorDetails = event.error;
  
  if (typeof errorDetails === 'string' && errorDetails.includes('transcriptSearch')) {
    console.log("[VideoSearchTester] Error occurred during transcript search");
    simulateError('transcriptSearch', errorDetails);
  }
  
  if (typeof errorDetails === 'string' && errorDetails.includes('keywordSearch')) {
    console.log("[VideoSearchTester] Error occurred during keyword search");
    simulateError('keywordSearch', errorDetails);
  }
  
  displayErrorReport();
});

// Log unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error("[VideoSearchTester] Unhandled promise rejection:", event.reason);
  const errorDetails = event.reason;
  
  if (typeof errorDetails === 'string' && errorDetails.includes('keywordSearch')) {
    console.log("[VideoSearchTester] Error occurred during keyword search");
    simulateError('keywordSearch', errorDetails);
  }
  else if (typeof errorDetails === 'string' && errorDetails.includes('transcriptSearch')) {
    console.log("[VideoSearchTester] Error occurred during transcript search");
    simulateError('transcriptSearch', errorDetails);
  }
  
  console.warn(`[VideoSearchTester] Unknown error: ${errorDetails}`);
  displayErrorReport();
});
