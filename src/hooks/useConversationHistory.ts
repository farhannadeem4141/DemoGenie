import { useState, useEffect, useRef } from 'react';
import { searchVideosByKeyword } from '@/services/video';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  text: string;
  timestamp: number;
  isAiMessage?: boolean;
  isSystem?: boolean;
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
  const initialVideoLoadedRef = useRef(false);
  const lastVideoRef = useRef<VideoMatch | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout>();
  
  const setCurrentVideoWithTracking = (video: VideoMatch | null) => {
    if (video === null) {
      lastVideoRef.current = null;
      setCurrentVideo(null);
      return;
    }
    
    // Prevent setting the same video multiple times
    if (lastVideoRef.current?.id === video.id && 
        lastVideoRef.current?.video_url === video.video_url) {
      console.log("Ignoring duplicate video set request");
      return;
    }
    
    console.log("Setting new video:", video.video_name);
    lastVideoRef.current = video;
    setCurrentVideo(video);
    
    // Clear any existing toast timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    // Set a new toast with a timeout
    toastTimeoutRef.current = setTimeout(() => {
      toast({
        title: "Video found",
        description: `Now playing: ${video.video_name || video.keyword}`,
        duration: 3000,
      });
    }, 500);
  };

  useEffect(() => {
    const loadConversationHistory = () => {
      const savedHistory = localStorage.getItem('conversation_history');
      if (savedHistory) {
        try {
          const parsedMessages = JSON.parse(savedHistory);
          console.log("Loaded conversation history from localStorage:", parsedMessages.length, "messages");
          
          if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
            setMessages(parsedMessages);
          }
        } catch (e) {
          console.error('Failed to parse conversation history:', e);
        }
      }
    };
    
    const loadVoiceInputs = () => {
      const voiceInputs = localStorage.getItem('voice_input_history');
      if (voiceInputs) {
        try {
          const parsedInputs = JSON.parse(voiceInputs);
          console.log("Found voice inputs in localStorage:", parsedInputs.length);
          
          if (Array.isArray(parsedInputs) && parsedInputs.length > 0) {
            setMessages(prevMessages => {
              const existingTexts = new Set(prevMessages.map(m => m.text));
              
              const newInputs = parsedInputs
                .filter(input => input && input.text && !existingTexts.has(input.text))
                .map(input => ({
                  text: input.text,
                  isAiMessage: false,
                  timestamp: input.timestamp || Date.now()
                }));
              
              if (newInputs.length > 0) {
                console.log("Adding", newInputs.length, "voice inputs to conversation history");
                const updatedMessages = [...prevMessages, ...newInputs];
                
                try {
                  localStorage.setItem('conversation_history', JSON.stringify(updatedMessages));
                } catch (e) {
                  console.error('Failed to save conversation history:', e);
                }
                
                return updatedMessages;
              }
              
              return prevMessages;
            });
          }
        } catch (e) {
          console.error('Failed to parse voice inputs from localStorage:', e);
        }
      }
    };
    
    loadConversationHistory();
    loadVoiceInputs();
    
    const savedErrorLogs = localStorage.getItem('video_search_errors');
    if (savedErrorLogs) {
      try {
        setErrorLogs(JSON.parse(savedErrorLogs));
      } catch (e) {
        console.error('Failed to parse error logs from localStorage:', e);
      }
    }
  }, []);
  
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('conversation_history', JSON.stringify(messages));
      console.log("Saved conversation history to localStorage:", messages.length, "messages");
    }
  }, [messages]);

  useEffect(() => {
    if (!initialVideoLoadedRef.current && !currentVideo && !lastVideoRef.current) {
      initialVideoLoadedRef.current = true;
      
      const introVideo = {
        id: 0,
        video_url: 'https://aalbdeydgpallvcmmsvq.supabase.co/storage/v1/object/sign/DemoGenie/WhatsApp%20Intro%20By%20Sophie.mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJEZW1vR2VuaWUvV2hhdHNBcHAgSW50cm8gQnkgU29waGllLm1wNCIsImlhdCI6MTc0MTEwMjcwOSwiZXhwIjoxNzcyNjM4NzA5fQ.rvjigS14YSrlPd2VqEDpQHHQlCsOSivOegXkciDnnEA',
        video_name: 'WhatsApp Intro By Sophie',
        keyword: 'WhatsApp'
      };
      
      console.log("Setting initial intro video");
      lastVideoRef.current = introVideo;
      setCurrentVideo(introVideo);
    }
  }, [toast, currentVideo]);
  
  const extractKeywords = (text: string): string[] => {
    const cleanText = text.replace(/[^\w\s]/g, '');
    console.log("%c [KEYWORD LOG] ========== KEYWORD EXTRACTION ==========", "background: #4361ee; color: white; padding: 4px; border-radius: 4px; font-weight: bold;");
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
    
    phrases.forEach(phrase => {
      const lowerText = text.toLowerCase();
      const lowerPhrase = phrase.toLowerCase();
      console.log(`%c [KEYWORD LOG] Checking for "${phrase}"...`, "background: #4361ee; color: white; padding: 2px; border-radius: 4px;");
      console.log(`%c [KEYWORD LOG]   - Original case match: ${text.includes(phrase)}`, "background: #4361ee; color: white; padding: 2px; border-radius: 4px;");
      console.log(`%c [KEYWORD LOG]   - Case-insensitive match: ${lowerText.includes(lowerPhrase)}`, "background: #4361ee; color: white; padding: 2px; border-radius: 4px;");
      console.log(`%c [KEYWORD LOG]   - Exact match position: ${text.indexOf(phrase)}`, "background: #4361ee; color: white; padding: 2px; border-radius: 4px;");
      console.log(`%c [KEYWORD LOG]   - Case-insensitive match position: ${lowerText.indexOf(lowerPhrase)}`, "background: #4361ee; color: white; padding: 2px; border-radius: 4px;");
    });
    
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
  
  const addMessage = async (message: Message | string) => {
    console.log("%c [MESSAGE LOG] ========== NEW MESSAGE PROCESSING ==========", "background: #3a0ca3; color: white; padding: 4px; border-radius: 4px; font-weight: bold;");
    
    const newMessage: Message = typeof message === 'string' 
      ? { text: message, timestamp: Date.now() }
      : message;
    
    console.log("%c [MESSAGE LOG] Processing new message:", "background: #3a0ca3; color: white; padding: 2px; border-radius: 4px;", newMessage);
    
    setMessages(prevMessages => {
      const isDuplicate = prevMessages.some(m => 
        m.text === newMessage.text && 
        Math.abs(m.timestamp - newMessage.timestamp) < 1000
      );
      
      if (isDuplicate) {
        console.log("%c [MESSAGE LOG] Duplicate message detected, skipping", "background: #3a0ca3; color: white; padding: 2px; border-radius: 4px;");
        return prevMessages;
      }
      
      const updatedMessages = [...prevMessages, newMessage];
      console.log("%c [MESSAGE LOG] Updated message count:", "background: #3a0ca3; color: white; padding: 2px; border-radius: 4px;", updatedMessages.length);
      
      try {
        localStorage.setItem('conversation_history', JSON.stringify(updatedMessages));
      } catch (e) {
        console.error('Failed to save conversation history:', e);
      }
      
      return updatedMessages;
    });
    
    if (typeof message !== 'string' && (message.isSystem || message.isAiMessage)) {
      return;
    }
    
    const messageText = typeof message === 'string' ? message : message.text;
    const keywords = extractKeywords(messageText);
    console.log("%c [MESSAGE LOG] Extracted keywords: ", "background: #3a0ca3; color: white; padding: 2px; border-radius: 4px;", keywords);
    
    if (keywords.length === 0) {
      console.log("%c [MESSAGE LOG] No keywords found in message", "background: #3a0ca3; color: white; padding: 2px; border-radius: 4px;");
      addErrorLog(
        "No keywords extracted", 
        messageText.substring(0, 30), 
        "Message doesn't contain any extractable keywords"
      );
      
      toast({
        title: "No keywords found",
        description: "Couldn't extract any keywords from the message",
        duration: 3000,
      });
      return;
    }
    
    console.log("%c [SEARCH LOG] ========== DATABASE SEARCH ==========", "background: #f72585; color: white; padding: 4px; border-radius: 4px; font-weight: bold;");
    console.log("%c [SEARCH LOG] Searching for videos with keywords: " + keywords.join(", "), "background: #f72585; color: white; padding: 2px; border-radius: 4px;");
    
    const highPriorityKeywords = ["Quick Replies", "Quick Reply", "Message Templates", "Templates", "WhatsApp Business", "Business Profile"];
    console.log("%c [SEARCH LOG] High priority keywords: " + highPriorityKeywords.join(", "), "background: #f72585; color: white; padding: 2px; border-radius: 4px;");
    
    let priorityKeyword = null;
    for (const kw of keywords) {
      for (const priority of highPriorityKeywords) {
        const exactMatch = priority === kw;
        const caseInsensitiveMatch = priority.toLowerCase() === kw.toLowerCase();
        console.log(`%c [SEARCH LOG] Checking if "${kw}" matches priority "${priority}":`, 
          "background: #f72585; color: white; padding: 2px; border-radius: 4px;");
        console.log(`%c [SEARCH LOG]   - Exact match: ${exactMatch}`, 
          "background: #f72585; color: white; padding: 2px; border-radius: 4px;");
        console.log(`%c [SEARCH LOG]   - Case-insensitive match: ${caseInsensitiveMatch}`, 
          "background: #f72585; color: white; padding: 2px; border-radius: 4px;");
        
        if (caseInsensitiveMatch) {
          priorityKeyword = kw;
          console.log(`%c [SEARCH LOG]   - MATCH FOUND! Using "${kw}" as priority keyword`, 
            "background: #f72585; color: white; font-weight: bold; padding: 2px; border-radius: 4px;");
          break;
        }
      }
      if (priorityKeyword) break;
    }
    
    if (priorityKeyword) {
      console.log("%c [SEARCH LOG] Found high priority keyword: " + priorityKeyword, "background: #b5179e; color: white; padding: 2px; border-radius: 4px;");
      console.log("%c [SEARCH LOG] Querying database with keyword: " + priorityKeyword, "background: #b5179e; color: white; padding: 2px; border-radius: 4px;");
      
      const searchResult = await searchVideosByKeyword(priorityKeyword);
      
      console.log("%c [SEARCH LOG] Priority keyword search result: ", "background: #b5179e; color: white; padding: 2px; border-radius: 4px;", {
        success: searchResult.success,
        dataLength: searchResult.data?.length || 0,
        errorReason: searchResult.errorReason,
        searchDetails: searchResult.searchDetails,
        rawQuery: searchResult.rawQuery,
        rawData: searchResult.data
      });
      
      if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
        const matchedVideos = searchResult.data.map(video => ({ ...video, keyword: priorityKeyword }));
        console.log("%c [SEARCH LOG] Matched videos for priority keyword: ", "background: #b5179e; color: white; padding: 2px; border-radius: 4px;", matchedVideos);
        setMatchedVideos(matchedVideos);
        console.log("%c [SEARCH LOG] Setting current video to high priority match: ", "background: #b5179e; color: white; padding: 2px; border-radius: 4px;", matchedVideos[0]);
        setCurrentVideoWithTracking(matchedVideos[0]);
        
        toast({
          title: "Video found",
          description: `Now playing: ${matchedVideos[0].video_name || matchedVideos[0].keyword}`,
          duration: 3000,
        });
        return;
      } else {
        console.log("%c [SEARCH LOG] No videos found for priority keyword: " + priorityKeyword, "background: #e63946; color: white; padding: 2px; border-radius: 4px;", searchResult);
        console.log("%c [SEARCH LOG] Raw query used: " + searchResult.rawQuery, "background: #e63946; color: white; padding: 2px; border-radius: 4px;");
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
        setCurrentVideoWithTracking(matchedVideos[0]);
        
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
    console.log("Conversation history cleared");
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
    setCurrentVideo: setCurrentVideoWithTracking,
    errorLogs,
    clearErrorLogs
  };
}
