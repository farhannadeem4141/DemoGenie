
import React, { useState, useEffect, useRef } from 'react';
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
          videoUrl: "https://zludhbuizuzusixaqjww.supabase.co/storage/v1/object/sign/demogenie/about%20accepting%20payments%20on%20the%20whatsapp%20business%20app.mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJkZW1vZ2VuaWUvYWJvdXQgYWNjZXB0aW5nIHBheW1lbnRzIG9uIHRoZSB3aGF0c2FwcCBidXNpbmVzcyBhcHAubXA0IiwiaWF0IjoxNzQzNzk5MzY2LCJleHAiOjE3NzUzMzUzNjZ9.thsNoN3SliQLOGNRphEMkn4FZUu8FQyxxUFVGEle7X8&cb=1744147394388",
          videoName: "Debug Test Video"
        }
      }));
    }, 2000);
    
    return () => {
      window.removeEventListener('video_play_request', handleVideoRequest as EventListener);
      clearTimeout(testTimer);
    };
  }, []);
  
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
