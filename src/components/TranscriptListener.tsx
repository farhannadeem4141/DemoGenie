
import React, { useState, useEffect, useRef } from 'react';
import { searchAndPlay } from '@/services/video/searchAndPlay';
import VideoPlayer from '@/components/VideoPlayer';
import { useToast } from '@/hooks/use-toast';
import { VideoSearchResult } from '@/services/video/types';

interface TranscriptListenerProps {
  isRecording: boolean;
}

const TranscriptListener: React.FC<TranscriptListenerProps> = ({ isRecording }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [vapiButtonVisible, setVapiButtonVisible] = useState(true);
  const processingRef = useRef(false);
  const { toast } = useToast();
  const lastTranscriptRef = useRef<string>('');
  const lastVideoRef = useRef<string | null>(null);
  const videoPlayerDisplayedRef = useRef(false);

  // Function to check Vapi button visibility
  const checkVapiButtonVisibility = () => {
    // Look for the Vapi button - this is the floating button with AI Assistant text
    const vapiButton = document.querySelector('[aria-label="AI Assistant"]') || 
                       document.querySelector('.vapi-button') || 
                       document.querySelector('[class*="vapi"]');
    
    const isVisible = !!vapiButton;
    console.log("TranscriptListener: Vapi button visibility check:", isVisible);
    setVapiButtonVisible(isVisible);
    return isVisible;
  };

  // Check button visibility periodically
  useEffect(() => {
    const visibilityInterval = setInterval(checkVapiButtonVisibility, 3000);
    
    // Initial check
    checkVapiButtonVisibility();
    
    return () => clearInterval(visibilityInterval);
  }, []);

  // Listen for voice input events
  useEffect(() => {
    const handleVoiceInput = (event: any) => {
      if (!event.detail || !event.detail.text) return;
      
      const transcript = event.detail.text;
      console.log("TranscriptListener: Received voice input:", transcript);
      
      // Skip if we're already processing or the transcript is the same
      if (processingRef.current) {
        console.log("TranscriptListener: Skipping voice input - already processing");
        return;
      }
      
      // Skip if the transcript hasn't changed significantly
      if (transcript === lastTranscriptRef.current) {
        console.log("TranscriptListener: Skipping - transcript hasn't changed");
        return;
      }
      
      // Store the current transcript
      lastTranscriptRef.current = transcript;
      
      setIsProcessing(true);
      processingRef.current = true;
      
      console.log(`TranscriptListener: Processing transcript: "${transcript}"`);
      
      // Search for a video based on the transcript
      searchAndPlay(transcript)
        .then((result: VideoSearchResult | null) => {
          console.log("TranscriptListener: Search result:", result);
          
          if (result && result.videoUrl) {
            console.log("TranscriptListener: Found video:", result.videoName, result.videoUrl);
            
            // Set video URL and name in state to trigger render
            setVideoUrl(result.videoUrl);
            setVideoName(result.videoName || "Video");
            lastVideoRef.current = result.videoUrl;
            
            // Log that the video player should now be visible
            console.log("TranscriptListener: Video player should now be visible");
            videoPlayerDisplayedRef.current = true;
            
            toast({
              title: "Video Found",
              description: `Playing: ${result.videoName || "Video"}`,
              duration: 3000,
            });
          } else {
            console.log("TranscriptListener: No video found for transcript");
            // If we already have a video playing, don't clear it
            if (!videoPlayerDisplayedRef.current) {
              setVideoUrl(null);
              setVideoName(null);
            }
          }
        })
        .catch(error => {
          console.error("TranscriptListener: Error processing transcript:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to process voice input",
            duration: 3000,
          });
        })
        .finally(() => {
          setIsProcessing(false);
          processingRef.current = false;
        });
    };

    // Listen for voice input events
    window.addEventListener('voice_input', handleVoiceInput);
    
    return () => {
      window.removeEventListener('voice_input', handleVoiceInput);
    };
  }, [toast]);

  // Handle video player close
  const handleClose = () => {
    console.log("TranscriptListener: Closing video player");
    setVideoUrl(null);
    setVideoName(null);
    videoPlayerDisplayedRef.current = false;
    lastVideoRef.current = null;
  };

  return (
    <div className="transcript-listener">
      {isProcessing && (
        <div className="fixed bottom-4 left-4 bg-amber-500 text-white px-4 py-2 rounded-full z-50">
          Processing voice input...
        </div>
      )}
      
      {/* Video Player - Added a debug message to confirm it's rendering */}
      {videoUrl && (
        <div 
          className="fixed top-20 right-4 w-96 z-50 shadow-lg rounded-lg overflow-hidden"
          style={{ display: 'block' }} // Force display block for debugging
          data-testid="video-player-container-wrapper"
        >
          {console.log("TranscriptListener: Rendering VideoPlayer component with URL:", videoUrl)}
          <VideoPlayer 
            videoUrl={videoUrl} 
            videoName={videoName || undefined} 
            onClose={handleClose}
            onError={() => {
              console.error("TranscriptListener: Video player reported an error");
              toast({
                variant: "destructive",
                title: "Video Error",
                description: "There was a problem playing the video",
                duration: 5000,
              });
            }}
          />
        </div>
      )}
    </div>
  );
};

export default TranscriptListener;
