
import { useState, useEffect } from 'react';
import { searchVideosByKeyword } from '@/services/videoService';
import { supabase } from '@/integrations/supabase/client';

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
        } else {
          // Fallback in case we got data but no video_url
          setCurrentVideo({
            id: 0,
            video_url: 'https://aalbdeydgpallvcmmsvq.supabase.co/storage/v1/object/sign/DemoGenie/What%20is%20WhatsApp.mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJEZW1vR2VuaWUvV2hhdCBpcyBXaGF0c0FwcC5tcDQiLCJpYXQiOjE3NDExMDI1OTEsImV4cCI6MTc3MjYzODU5MX0.285hWWaFnlZJ8wLkuYaAyf_sLH0wjDzxv4kgXsGEzO4',
            video_name: 'What is WhatsApp',
            keyword: 'WhatsApp'
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
      }
    };
    
    fetchInitialVideo();
  }, []);
  
  // Function to extract potential keywords from a message
  const extractKeywords = (text: string): string[] => {
    // Remove punctuation and convert to lowercase
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');
    
    // Split by spaces and filter out short words
    const words = cleanText.split(/\s+/).filter(word => word.length > 3);
    
    // Important phrases to check for (add more as needed)
    const phrases = [
      "quick replies", 
      "message templates", 
      "whatsapp business",
      "business profile"
    ];
    
    const foundPhrases = phrases.filter(phrase => 
      text.toLowerCase().includes(phrase.toLowerCase())
    );
    
    // Combine individual words and found phrases
    const keywords = [...new Set([...words, ...foundPhrases])];
    console.log("Extracted keywords:", keywords);
    
    return keywords;
  };
  
  // Function to add a new message and search for keywords
  const addMessage = async (text: string) => {
    console.log("Processing new message:", text);
    const newMessage = { text, timestamp: Date.now() };
    setMessages(prev => [...prev, newMessage]);
    
    // Extract keywords and search for videos
    const keywords = extractKeywords(text);
    
    // Search for each keyword
    console.log("Searching for videos with keywords:", keywords);
    const videoPromises = keywords.map(async keyword => {
      const videos = await searchVideosByKeyword(keyword);
      return videos.map(video => ({ ...video, keyword }));
    });
    
    const results = await Promise.all(videoPromises);
    const allMatches = results.flat();
    
    console.log("Found video matches:", allMatches);
    if (allMatches.length > 0) {
      setMatchedVideos(allMatches);
      console.log("Setting current video to:", allMatches[0]);
      setCurrentVideo(allMatches[0]);
    } else {
      console.log("No matching videos found for keywords:", keywords);
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
