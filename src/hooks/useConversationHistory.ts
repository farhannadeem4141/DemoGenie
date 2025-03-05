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
  
  // Load conversation history from localStorage on mount
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
  
  // Save conversation history to localStorage whenever it changes
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('conversation_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Fetch the initial video on component mount
  useEffect(() => {
    const fetchInitialVideo = async () => {
      try {
        // First try to get the video with ID 42
        let { data, error } = await supabase
          .from('Videos')
          .select('*')
          .eq('id', 42)
          .maybeSingle();
        
        // If that fails or returns no data, get the first video available
        if (error || !data) {
          console.log("Could not find video with ID 42, fetching first available video");
          const { data: firstVideo, error: firstVideoError } = await supabase
            .from('Videos')
            .select('*')
            .limit(1)
            .maybeSingle();
          
          if (firstVideoError || !firstVideo) {
            console.error('Error fetching any video:', firstVideoError);
            
            // If we still can't get a video, use a fallback URL
            setCurrentVideo({
              id: 0,
              video_url: 'https://aalbdeydgpallvcmmsvq.supabase.co/storage/v1/object/sign/DemoGenie/What%20is%20WhatsApp.mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJEZW1vR2VuaWUvV2hhdCBpcyBXaGF0c0FwcC5tcDQiLCJpYXQiOjE3NDExMDI1OTEsImV4cCI6MTc3MjYzODU5MX0.285hWWaFnlZJ8wLkuYaAyf_sLH0wjDzxv4kgXsGEzO4',
              video_name: 'What is WhatsApp',
              keyword: 'WhatsApp'
            });
            
            // Show toast for fallback video
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
          // Format the video data to match the VideoMatch interface
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
          // Fallback in case we got data but no video_url
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
        // Provide a fallback video in case of any errors
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
  
  // Function to extract potential keywords from a message
  const extractKeywords = (text: string): string[] => {
    // Convert to lowercase and clean the text
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');
    
    // Directly check for important specific phrases first
    const phrases = [
      "quick replies", 
      "quick reply",
      "message templates", 
      "whatsapp business",
      "business profile",
      "templates"
    ];
    
    // Check if any of our important phrases are in the text
    const foundPhrases = phrases.filter(phrase => 
      text.toLowerCase().includes(phrase.toLowerCase())
    );
    
    // If we found important phrases, prioritize them
    if (foundPhrases.length > 0) {
      console.log("Found important phrases:", foundPhrases);
      return foundPhrases;
    }
    
    // Otherwise, split by spaces and filter out short words
    const words = cleanText.split(/\s+/).filter(word => word.length > 3);
    
    console.log("Extracted keywords:", words);
    return [...new Set(words)]; // Remove duplicates
  };
  
  // Function to add a new message and search for keywords
  const addMessage = async (text: string) => {
    console.log("Processing new message:", text);
    const newMessage = { text, timestamp: Date.now() };
    setMessages(prev => [...prev, newMessage]);
    
    // Extract keywords and search for videos
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
    
    // Search for each keyword
    console.log("Searching for videos with keywords:", keywords);
    
    // First try high-priority keywords (phrases we specifically care about)
    const highPriorityKeywords = ["quick replies", "quick reply", "message templates", "templates", "whatsapp business"];
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
    
    // If no high priority keywords or no results, try all keywords
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
        break; // Exit after finding first match
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
