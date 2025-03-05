
import { useState, useEffect } from 'react';
import { searchVideosByKeyword } from '@/services/videoService';

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
  
  // Function to add a new message and search for keywords
  const addMessage = async (text: string) => {
    const newMessage = { text, timestamp: Date.now() };
    setMessages(prev => [...prev, newMessage]);
    
    // Extract keywords and search for videos
    const words = text.toLowerCase().split(/\s+/);
    const uniqueWords = [...new Set(words)].filter(word => word.length > 3); // Filter out short words
    
    // Search for each keyword
    const videoPromises = uniqueWords.map(async keyword => {
      const videos = await searchVideosByKeyword(keyword);
      return videos.map(video => ({ ...video, keyword }));
    });
    
    const results = await Promise.all(videoPromises);
    const allMatches = results.flat();
    
    if (allMatches.length > 0) {
      setMatchedVideos(allMatches);
      setCurrentVideo(allMatches[0]);
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
