
import { useState, useEffect } from 'react';
import { searchVideosByKeyword, VideoSearchResult } from '@/services/video';
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

interface SearchErrorLog {
  timestamp: number;
  message: string;
  keyword: string;
  details: string;
}

export function useConversationHistory() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [matchedVideos, setMatchedVideos] = useState<VideoMatch[]>([]);
  const [currentVideo, setCurrentVideo] = useState<VideoMatch | null>(null);
  const [errorLogs, setErrorLogs] = useState<SearchErrorLog[]>([]);
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
            
            addErrorLog(
              "Failed to fetch initial video", 
              "initial_load", 
              "Database error or no videos available"
            );
            
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
          addErrorLog(
            "Missing video URL in initial video", 
            "initial_load", 
            "Video record exists but URL is missing"
          );
          
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
        
        addErrorLog(
          "Exception during initial video fetch", 
          "initial_load", 
          JSON.stringify(error)
        );
        
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
    console.log("%c [KEYWORD LOG] Original text for keyword extraction: " + text, "background: #4361ee; color: white; padding: 2px; border-radius: 4px;");
    console.log("%c [KEYWORD LOG] Cleaned text for keyword extraction: " + cleanText, "background: #4361ee; color: white; padding: 2px; border-radius: 4px;");
    
    const phrases = [
      "Quick Replies", 
      "Quick Reply",
      "Message Templates", 
      "WhatsApp Business",
      "Business Profile",
      "Templates",
      "Catalog"
    ];
    
    console.log("%c [KEYWORD LOG] Phrases to check: ", "background: #4361ee; color: white; padding: 2px; border-radius: 4px;", phrases);
    
    // Log each phrase check individually for debugging
    phrases.forEach(phrase => {
      const lowerText = text.toLowerCase();
      const lowerPhrase = phrase.toLowerCase();
      console.log(`%c [KEYWORD LOG] Checking for "${phrase}"... Original: ${text.includes(phrase)}, Case-insensitive: ${lowerText.includes(lowerPhrase)}`, 
        "background: #4361ee; color: white; padding: 2px; border-radius: 4px;");
    });
    
    // Use case-insensitive search for phrases
    const foundPhrases = phrases.filter(phrase => 
      text.toLowerCase().includes(phrase.toLowerCase())
    );
    
    if (foundPhrases.length > 0) {
      console.log("%c [KEYWORD LOG] Found important phrases: " + foundPhrases.join(", "), "background: #4cc9f0; color: black; padding: 2px; border-radius: 4px;");
      return foundPhrases;
    }
    
    const words = cleanText.split(/\s+/).filter(word => word.length > 3);
    console.log("%c [KEYWORD LOG] Extracted individual words: " + words.join(", "), "background: #4361ee; color: white; padding: 2px; border-radius: 4px;");
    
    return [...new Set(words)];
  };
  
  const addErrorLog = (message: string, keyword: string, details: string) => {
    const newError: SearchErrorLog = {
      timestamp: Date.now(),
      message,
      keyword,
      details
    };
    
    console.log("%c [ERROR LOG] Adding error: " + message, "background: #e63946; color: white; padding: 2px; border-radius: 4px;", {
      keyword,
      details,
      timestamp: new Date(newError.timestamp).toLocaleString()
    });
    
    setErrorLogs(prev => [newError, ...prev].slice(0, 50));
    
    try {
      localStorage.setItem('video_search_errors', JSON.stringify([newError, ...errorLogs].slice(0, 50)));
    } catch (e) {
      console.error('Failed to save error log to localStorage:', e);
    }
  };
  
  const addMessage = async (text: string) => {
    console.log("%c [MESSAGE LOG] Processing new message: " + text, "background: #3a0ca3; color: white; padding: 2px; border-radius: 4px;");
    const newMessage = { text, timestamp: Date.now() };
    setMessages(prev => [...prev, newMessage]);
    
    const keywords = extractKeywords(text);
    console.log("%c [MESSAGE LOG] Extracted keywords: ", "background: #3a0ca3; color: white; padding: 2px; border-radius: 4px;", keywords);
    
    if (keywords.length === 0) {
      console.log("%c [MESSAGE LOG] No keywords found in message", "background: #3a0ca3; color: white; padding: 2px; border-radius: 4px;");
      addErrorLog(
        "No keywords extracted", 
        text.substring(0, 30), 
        "Message doesn't contain any extractable keywords"
      );
      
      toast({
        title: "No keywords found",
        description: "Couldn't extract any keywords from the message",
        duration: 3000,
      });
      return;
    }
    
    console.log("%c [SEARCH LOG] Searching for videos with keywords: " + keywords.join(", "), "background: #f72585; color: white; padding: 2px; border-radius: 4px;");
    
    const highPriorityKeywords = ["Quick Replies", "Quick Reply", "Message Templates", "Templates", "WhatsApp Business", "Business Profile"];
    console.log("%c [SEARCH LOG] High priority keywords: " + highPriorityKeywords.join(", "), "background: #f72585; color: white; padding: 2px; border-radius: 4px;");
    
    // Check each keyword against high priority list with detailed logging
    let priorityKeyword = null;
    for (const kw of keywords) {
      for (const priority of highPriorityKeywords) {
        const match = priority.toLowerCase() === kw.toLowerCase();
        console.log(`%c [SEARCH LOG] Checking if "${kw}" matches priority "${priority}": ${match}`, 
          "background: #f72585; color: white; padding: 2px; border-radius: 4px;");
        if (match) {
          priorityKeyword = kw;
          break;
        }
      }
      if (priorityKeyword) break;
    }
    
    if (priorityKeyword) {
      console.log("%c [SEARCH LOG] Found high priority keyword: " + priorityKeyword, "background: #b5179e; color: white; padding: 2px; border-radius: 4px;");
      const searchResult = await searchVideosByKeyword(priorityKeyword);
      
      console.log("%c [SEARCH LOG] Priority keyword search result: ", "background: #b5179e; color: white; padding: 2px; border-radius: 4px;", {
        success: searchResult.success,
        dataLength: searchResult.data?.length || 0,
        errorReason: searchResult.errorReason,
        searchDetails: searchResult.searchDetails
      });
      
      if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
        const matchedVideos = searchResult.data.map(video => ({ ...video, keyword: priorityKeyword }));
        console.log("%c [SEARCH LOG] Matched videos for priority keyword: ", "background: #b5179e; color: white; padding: 2px; border-radius: 4px;", matchedVideos);
        setMatchedVideos(matchedVideos);
        console.log("%c [SEARCH LOG] Setting current video to high priority match: ", "background: #b5179e; color: white; padding: 2px; border-radius: 4px;", matchedVideos[0]);
        setCurrentVideo(matchedVideos[0]);
        
        toast({
          title: "Video found",
          description: `Now playing: ${matchedVideos[0].video_name || matchedVideos[0].keyword}`,
          duration: 3000,
        });
        return;
      } else {
        console.log("%c [SEARCH LOG] No videos found for priority keyword: " + priorityKeyword, "background: #e63946; color: white; padding: 2px; border-radius: 4px;", searchResult);
        addErrorLog(
          `No video found for priority keyword: ${priorityKeyword}`, 
          priorityKeyword, 
          searchResult.errorReason || "Unknown reason"
        );
      }
    }
    
    let foundAnyVideos = false;
    let searchErrors: {keyword: string, reason: string}[] = [];
    
    console.log("%c [SEARCH LOG] Trying all keywords: " + keywords.join(", "), "background: #f72585; color: white; padding: 2px; border-radius: 4px;");
    
    for (const keyword of keywords) {
      console.log("%c [SEARCH LOG] Searching with keyword: " + keyword, "background: #f72585; color: white; padding: 2px; border-radius: 4px;");
      const searchResult = await searchVideosByKeyword(keyword);
      
      console.log("%c [SEARCH LOG] Search result for keyword '" + keyword + "': ", "background: #f72585; color: white; padding: 2px; border-radius: 4px;", {
        success: searchResult.success,
        dataLength: searchResult.data?.length || 0,
        errorReason: searchResult.errorReason,
        searchDetails: searchResult.searchDetails,
        rawData: searchResult.data
      });
      
      if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
        foundAnyVideos = true;
        const matchedVideos = searchResult.data.map(video => ({ ...video, keyword }));
        console.log("%c [SEARCH LOG] Matched videos for keyword '" + keyword + "': ", "background: #f72585; color: white; padding: 2px; border-radius: 4px;", matchedVideos);
        setMatchedVideos(matchedVideos);
        console.log("%c [SEARCH LOG] Setting current video to: ", "background: #f72585; color: white; padding: 2px; border-radius: 4px;", matchedVideos[0]);
        setCurrentVideo(matchedVideos[0]);
        
        toast({
          title: "Video found",
          description: `Now playing: ${matchedVideos[0].video_name || keyword}`,
          duration: 3000,
        });
        break;
      } else {
        console.log("%c [SEARCH LOG] No videos found for keyword '" + keyword + "': ", "background: #e63946; color: white; padding: 2px; border-radius: 4px;", searchResult.errorReason || "Unknown reason");
        searchErrors.push({
          keyword,
          reason: searchResult.errorReason || "Unknown reason"
        });
      }
    }
    
    if (!foundAnyVideos) {
      console.log("%c [SEARCH LOG] No matching videos found for any keywords: " + keywords.join(", "), "background: #e63946; color: white; padding: 2px; border-radius: 4px;");
      
      searchErrors.forEach(err => {
        addErrorLog(
          `No video found for keyword: ${err.keyword}`, 
          err.keyword, 
          err.reason
        );
      });
      
      const errorDetails = searchErrors.length > 2 
        ? `${searchErrors.length} keywords tried without matches` 
        : searchErrors.map(e => `"${e.keyword}": ${e.reason}`).join(", ");
      
      toast({
        variant: "destructive",
        title: "No videos found",
        description: `No matching videos for your query. ${errorDetails}`,
        duration: 5000,
      });
    }
  };
  
  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem('conversation_history');
  };
  
  const clearErrorLogs = () => {
    setErrorLogs([]);
    localStorage.removeItem('video_search_errors');
  };
  
  useEffect(() => {
    const savedErrorLogs = localStorage.getItem('video_search_errors');
    if (savedErrorLogs) {
      try {
        setErrorLogs(JSON.parse(savedErrorLogs));
      } catch (e) {
        console.error('Failed to parse error logs from localStorage:', e);
      }
    }
  }, []);
  
  return {
    messages,
    addMessage,
    clearHistory,
    matchedVideos,
    currentVideo,
    setCurrentVideo,
    errorLogs,
    clearErrorLogs
  };
}
