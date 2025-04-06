
export interface VideoSearchResult {
  success: boolean;
  data?: any[] | null;
  videoUrl?: string;
  videoName?: string;
  errorReason?: string;
  searchDetails?: {
    keywordUsed: string;
    matchType?: 'exact' | 'partial' | 'none' | 'fallback';
    searchMethod?: string;
  };
  rawQuery?: string;
}

export interface VapiMessage {
  text?: string;
  content?: string;
  type?: string;
  timestamp?: number;
}

export interface VapiState {
  status?: 'connecting' | 'connected' | 'disconnected' | 'error' | 'idle';
  error?: any;
  details?: any;
}

export interface VoiceInput {
  transcript?: string;
  isFinal?: boolean;
  confidence?: number;
  timestamp?: number;
}

export interface TranscriptItem {
  text: string;
  isUser: boolean;
  timestamp: number;
}
