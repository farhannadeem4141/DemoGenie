
import React, { useState, useRef } from 'react';
import { ArrowRight, Mic, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import { Button } from './ui/button';

const SpeechToTextButton = () => {
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();
  const LOCAL_STORAGE_KEY = 'voice_input_history';
  const isProcessingRef = useRef(false);
  const buttonClickTimeRef = useRef(0);
  const CLICK_DEBOUNCE_TIME = 1000; // 1 second debounce for button clicks

  const {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    isSupported,
    resetTranscript
  } = useSpeechRecognition({
    continuous: true,
    language: 'en-US',
    interimResults: true,
  });

  const toggleRecording = () => {
    // Debounce rapid clicks
    const now = Date.now();
    if (now - buttonClickTimeRef.current < CLICK_DEBOUNCE_TIME) {
      console.log("[DEBUG] Debouncing button click - too soon since last click");
      return;
    }
    buttonClickTimeRef.current = now;
    
    console.log("[DEBUG] Try Demo button clicked, initiating recording");
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (isProcessingRef.current) {
      console.log("[DEBUG] Already processing, ignoring start request");
      return;
    }
    
    if (!isSupported) {
      toast({
        variant: "destructive",
        title: "Browser Not Supported",
        description: "Speech recognition is not supported in your browser. Try Chrome, Edge, or Safari.",
        duration: 5000,
      });
      return;
    }
    
    console.log("[DEBUG] Recording started, UI updated");
    resetTranscript();
    startListening();
    setIsRecording(true);
    
    // Dispatch a custom event that other components can listen for
    window.dispatchEvent(new CustomEvent('recording_status_change', {
      detail: { isActive: true }
    }));
    
    toast({
      title: "Recording Started",
      description: "Speak now. Your voice is being recorded.",
      duration: 3000,
    });
  };

  const stopRecording = () => {
    if (isProcessingRef.current) {
      console.log("[DEBUG] Already processing, ignoring stop request");
      return;
    }
    
    console.log("[DEBUG] Stopping recording and processing transcript");
    isProcessingRef.current = true;
    
    stopListening();
    setIsRecording(false);
    
    // Dispatch event that recording stopped
    window.dispatchEvent(new CustomEvent('recording_status_change', {
      detail: { isActive: false }
    }));
    
    if (transcript && transcript.trim()) {
      try {
        console.log(`[DEBUG] Transcript received: "${transcript}"`);
        
        // Extract keywords
        const keywords = extractKeywords(transcript);
        console.log(`[DEBUG] Extracted keywords: ${JSON.stringify(keywords)}`);
        
        // Save transcript for video search
        localStorage.setItem('transcript', transcript);
        
        // Save to local storage
        const audioEntry = {
          text: transcript,
          timestamp: Date.now(),
          keywords: keywords,
          source: 'speechToText'
        };
        
        // Get existing entries or create new array
        const existingEntries = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        
        // Add new entry at the beginning
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify([audioEntry, ...existingEntries].slice(0, 50))
        );
        
        console.log("[DEBUG] Transcript saved to localStorage:", transcript);
        
        // Trigger video search with the transcript
        window.dispatchEvent(new CustomEvent('voice_input', {
          detail: {
            type: 'voice_input',
            text: transcript,
            source: 'speechToText'
          }
        }));
        
        // Show success toast
        toast({
          title: "Success",
          description: "Your speech has been processed. Looking for relevant videos...",
          duration: 3000,
        });
      } catch (e) {
        console.error("[ERROR] Error saving to localStorage:", e);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save audio text to local storage",
          duration: 5000,
        });
      }
    } else {
      console.log("[WARNING] No speech detected");
      toast({
        variant: "destructive",
        title: "No Speech Detected",
        description: "No text was captured during recording. Please try again.",
        duration: 3000,
      });
    }
    
    // Reset processing flag after a delay
    setTimeout(() => {
      isProcessingRef.current = false;
      console.log("[DEBUG] Processing complete, ready for next recording");
    }, 2000);
  };

  // Extract meaningful keywords from transcript
  const extractKeywords = (text: string): string[] => {
    // Simple stopwords list
    const stopwords = new Set([
      'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
      'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
      'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
      'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
      'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
      'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
      'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
      'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
      'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
      'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
      'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
      'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'want', 'like'
    ]);
    
    // Priority terms for WhatsApp-related content
    const priorityTerms = [
      'whatsapp', 'business', 'message', 'quick', 'replies', 'template', 'catalog', 'chat',
      'notification', 'customer', 'support', 'marketing', 'promotion', 'communication'
    ];
    
    // Clean and normalize text
    const cleanedText = text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')    // Remove extra spaces
      .trim();
    
    // Split into words
    const words = cleanedText.split(' ');
    
    // Filter out stopwords and keep only meaningful words
    const filteredWords = words.filter(word => 
      word.length > 2 && !stopwords.has(word)
    );
    
    // Check for priority terms first
    const priorityMatches = filteredWords.filter(word => 
      priorityTerms.some(term => word.includes(term))
    );
    
    // If we have priority matches, use those; otherwise use the filtered words
    const keywordsToUse = priorityMatches.length > 0 ? 
      priorityMatches : filteredWords;
    
    console.log("[DEBUG] Full keyword extraction:", { 
      original: text,
      cleaned: cleanedText,
      filtered: filteredWords, 
      priority: priorityMatches,
      final: keywordsToUse.slice(0, 3)
    });
    
    // Take up to 3 keywords
    return keywordsToUse.slice(0, 3);
  };

  // Display errors
  React.useEffect(() => {
    if (error) {
      console.error("[ERROR] Speech recognition error:", error);
      toast({
        variant: "destructive",
        title: "Recording Error",
        description: error,
        duration: 3000,
      });
    }
  }, [error, toast]);

  return (
    <div className="inline-block">
      <Button
        onClick={toggleRecording}
        variant={isRecording ? "destructive" : "default"}
        size="lg"
        className={`flex items-center justify-center gap-2 ${
          isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-whatsapp hover:bg-whatsapp-dark text-white'
        }`}
      >
        {isRecording ? (
          <>
            <MicOff className="h-5 w-5" /> Stop Demo
          </>
        ) : (
          <>
            Try Demo <Mic className="h-5 w-5 ml-1" />
          </>
        )}
      </Button>
      
      {isRecording && (
        <div className="mt-3 text-center text-sm text-gray-600 animate-pulse">
          Recording... {transcript ? `"${transcript}"` : 'Speak now'}
        </div>
      )}
    </div>
  );
};

export default SpeechToTextButton;
