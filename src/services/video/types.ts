
export interface VideoSearchResult {
  success: boolean;
  data?: any[] | null;
  errorReason?: string;
  searchDetails?: {
    keywordUsed: string;
    matchType?: 'exact' | 'partial' | 'none' | 'fallback';
    searchMethod?: string;
  };
  rawQuery?: string;
}
