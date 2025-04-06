
import React, { useState, useEffect } from 'react';
import VideoPlayerVisibilityWrapper from './VideoPlayerVisibilityWrapper';
import { useToast } from '@/hooks/use-toast';

interface VideoDisplayManagerProps {
  className?: string;
}

const VideoDisplayManager: React.FC<VideoDisplayManagerProps> = ({ className }) => {
  const [activeVideo, setActiveVideo] = useState<{ url: string; name?: string } | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    // Listen for video play requests
    const handleVideoRequest = (event: CustomEvent) => {
      const { videoUrl, videoName } = event.detail;
      console.log('[VideoDisplayManager] Received video request event:', event.detail);
      
      if (videoUrl) {
        setActiveVideo({ url: videoUrl, name: videoName });
        console.log('[VideoDisplayManager] Set active video:', videoUrl);
        
        toast({
          title: "Video Ready",
          description: `Playing: ${videoName || 'Video'}`,
          duration: 3000,
        });
      }
    };
    
    // Use type assertion to handle CustomEvent
    window.addEventListener('video_play_request', handleVideoRequest as EventListener);
    
    // Create a test video event after 2 seconds for debugging
    const testTimer = setTimeout(() => {
      console.log('[VideoDisplayManager] Dispatching test video event');
      window.dispatchEvent(new CustomEvent('video_play_request', {
        detail: {
          videoUrl: "https://zludhbuizuzusixaqjww.supabase.co/storage/v1/object/public/videos/welcome.mp4",
          videoName: "Debug Test Video"
        }
      }));
    }, 2000);
    
    return () => {
      window.removeEventListener('video_play_request', handleVideoRequest as EventListener);
      clearTimeout(testTimer);
    };
  }, [toast]);
  
  const handleClose = () => {
    console.log('[VideoDisplayManager] Closing video');
    setActiveVideo(null);
  };
  
  const handleError = () => {
    console.error('[VideoDisplayManager] Video error occurred');
    toast({
      variant: "destructive",
      title: "Video Error",
      description: "There was a problem playing the video",
      duration: 5000,
    });
  };
  
  if (!activeVideo) return null;
  
  return (
    <div className={`fixed top-20 right-4 z-50 ${className}`} style={{ display: 'block' }}>
      <VideoPlayerVisibilityWrapper
        videoUrl={activeVideo.url}
        videoName={activeVideo.name}
        onClose={handleClose}
        onError={handleError}
      />
    </div>
  );
};

export default VideoDisplayManager;
