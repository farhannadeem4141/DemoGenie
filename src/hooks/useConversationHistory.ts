import { useState, useEffect } from 'react';
import { searchVideosByKeyword } from '@/services/videoService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  text: string;
  timestamp: number;
}

interface VideoMatch {
  id: number;
  video_url: string;
  video_name: string;
  keyword: string;
}

export function useConversationHistory() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [matchedVideos, setMatchedVideos] = useState<VideoMatch[]>([]);
  const [currentVideo, setCurrentVideo] = useState<VideoMatch | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    const savedHistory = localStorage.getItem('conversation_history');
    if (savedHistory) {
      try {
        setMessages(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse conversation history:', e);
      }
    }
  }, []);
  
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('conversation_history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    const fetchInitialVideo = async () => {
      try {
        let { data, error } = await supabase
          .from('Videos')
          .select('*')
          .eq('id', 42)
          .maybeSingle();
        
        if (error || !data) {
          console.log("Could not find video with ID 42, fetching first available video");
          const { data: firstVideo, error: firstVideoError } = await supabase
            .from('Videos')
            .select('*')
            .limit(1)
            .maybeSingle();
          
          if (firstVideoError || !firstVideo) {
            console.error('Error fetching any video:', firstVideoError);
            
            setCurrentVideo({
              id: 0,
              video_url: 'https://aalbdeydgpallvcmmsvq.supabase.co/storage/v1/object/sign/DemoGenie/What%20is%20WhatsApp.mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJEZW1vR2VuaWUvV2hhdCBpcyBXaGF0c0FwcC5tcDQiLCJpYXQiOjE3NDExMDI1OTEsImV4cCI6MTc3MjYzODU5MX0.285hWWaFnlZJ8wLkuYaAyf_sLH0wjDzxv4kgXsGEzO4',
              video_name: 'What is WhatsApp',
              keyword: 'WhatsApp'
            });
            
            toast({
              title: "Using fallback video",
              description: "Could not fetch video data from database",
              duration: 3000,
            });
            
            return;
          }
          
          data = firstVideo;
        }
        
        if (data && data.video_url) {
          const videoData: VideoMatch = {
            id: data.id,
            video_url: data.video_url,
            video_name: data.video_name || 'WhatsApp Video',
            keyword: data.video_tag1 || 'WhatsApp'
          };
          
          console.log("Setting initial video:", videoData);
          setCurrentVideo(videoData);
          
          toast({
            title: "Video loaded",
            description: `Now playing: ${videoData.video_name}`,
            duration: 3000,
          });
        } else {
          setCurrentVideo({
            id: 0,
            video_url: 'https://aalbdeydgpallvcmmsvq.supabase.co/storage/v1/object/sign/DemoGenie/What%20is%20WhatsApp.mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJEZW1vR2VuaWUvV2hhdCBpcyBXaGF0c0FwcC5tcDQiLCJpYXQiOjE3NDExMDI1OTEsImV4cCI6MTc3MjYzODU5MX0.285hWWaFnlZJ8wLkuYaAyf_sLH0wjDzxv4kgXsGEzO4',
            video_name: 'What is WhatsApp',
            keyword: 'WhatsApp'
          });
          
          toast({
            title: "Using fallback video",
            description: "Missing video URL in database",
            duration: 3000,
          });
        }
      } catch (error) {
        console.error('Error fetching initial video:', error);
        setCurrentVideo({
          id: 0,
          video_url: 'https://aalbdeydgpallvcmmsvq.supabase.co/storage/v1/object/sign/DemoGenie/What%20is%20WhatsApp.mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJEZW1vR2VuaWUvV2hhdCBpcyBXaGF0c0FwcC5tcDQiLCJpYXQiOjE3NDExMDI1OTEsImV4cCI6MTc3MjYzODU5MX0.285hWWaFnlZJ8wLkuYaAyf_sLH0wjDzxv4kgXsGEzO4',
          video_name: 'What is WhatsApp',
          keyword: 'WhatsApp'
        });
        
        toast({
          variant: "destructive",
          title: "Error loading video",
          description: "Using fallback video due to an error",
          duration: 3000,
        });
      }
    };
    
    fetchInitialVideo();
  }, [toast]);
  
  const extractKeywords = (text: string): string[] => {
    const cleanText = text.replace(/[^\w\s]/g, '');
    
    const phrases = [
      "Quick Replies", 
      "Quick Reply",
      "Message Templates", 
      "WhatsApp Business",
      "Business Profile",
      "Templates"
    ];
    
    const foundPhrases = phrases.filter(phrase => 
      text.toLowerCase().includes(phrase.toLowerCase())
    );
    
    if (foundPhrases.length > 0) {
      console.log("Found important phrases:", foundPhrases);
      return foundPhrases;
    }
    
    const words = cleanText.split(/\s+/).filter(word => word.length > 3);
    
    console.log("Extracted keywords:", words);
    return [...new Set(words)];
  };
  
  const addMessage = async (text: string) => {
    console.log("Processing new message:", text);
    const newMessage = { text, timestamp: Date.now() };
    setMessages(prev => [...prev, newMessage]);
    
    const keywords = extractKeywords(text);
    
    if (keywords.length === 0) {
      console.log("No keywords found in message");
      toast({
        title: "No keywords found",
        description: "Couldn't extract any keywords from the message",
        duration: 3000,
      });
      return;
    }
    
    console.log("Searching for videos with keywords:", keywords);
    
    const highPriorityKeywords = ["Quick Replies", "Quick Reply", "Message Templates", "Templates", "WhatsApp Business"];
    const priorityKeyword = keywords.find(kw => highPriorityKeywords.includes(kw.toLowerCase()));
    
    if (priorityKeyword) {
      console.log("Found high priority keyword:", priorityKeyword);
      const videos = await searchVideosByKeyword(priorityKeyword);
      
      if (videos && videos.length > 0) {
        const matchedVideos = videos.map(video => ({ ...video, keyword: priorityKeyword }));
        setMatchedVideos(matchedVideos);
        console.log("Setting current video to high priority match:", matchedVideos[0]);
        setCurrentVideo(matchedVideos[0]);
        
        toast({
          title: "Video found",
          description: `Now playing: ${matchedVideos[0].video_name || matchedVideos[0].keyword}`,
          duration: 3000,
        });
        return;
      }
    }
    
    let foundAnyVideos = false;
    
    for (const keyword of keywords) {
      const videos = await searchVideosByKeyword(keyword);
      
      if (videos && videos.length > 0) {
        foundAnyVideos = true;
        const matchedVideos = videos.map(video => ({ ...video, keyword }));
        setMatchedVideos(matchedVideos);
        console.log("Setting current video to:", matchedVideos[0]);
        setCurrentVideo(matchedVideos[0]);
        
        toast({
          title: "Video found",
          description: `Now playing: ${matchedVideos[0].video_name || keyword}`,
          duration: 3000,
        });
        break;
      }
    }
    
    if (!foundAnyVideos) {
      console.log("No matching videos found for keywords:", keywords);
      toast({
        variant: "destructive",
        title: "No videos found",
        description: "No matching videos for your query",
        duration: 3000,
      });
    }
  };
  
  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem('conversation_history');
  };
  
  return {
    messages,
    addMessage,
    clearHistory,
    matchedVideos,
    currentVideo,
    setCurrentVideo
  };
}
