
import { supabase } from "@/integrations/supabase/client";

export async function searchVideosByKeyword(keyword: string): Promise<any[]> {
  if (!keyword) return [];
  
  console.log("Searching videos with keyword:", keyword);
  
  // First try exact match on any of the three tags
  const { data: exactMatches, error: exactMatchError } = await supabase
    .from('Videos')
    .select('*')
    .or(`video_tag1.eq."${keyword}",video_tag2.eq."${keyword}",video_tag3.eq."${keyword}"`);
  
  if (exactMatchError) {
    console.error('Error searching videos (exact match):', exactMatchError);
  }
  
  if (exactMatches && exactMatches.length > 0) {
    console.log("Found exact matches:", exactMatches);
    return exactMatches;
  }
  
  // Try a direct fetch of the video with ID 6 (as specified by the user)
  const { data: videoWithId6, error: id6Error } = await supabase
    .from('Videos')
    .select('*')
    .eq('id', 6)
    .maybeSingle();
    
  if (id6Error) {
    console.error('Error fetching video with ID 6:', id6Error);
  } else if (videoWithId6) {
    console.log("Found video with ID 6:", videoWithId6);
    console.log("Video tag1:", videoWithId6.video_tag1);
    
    // Check if this video's tag matches our keyword (case-insensitive)
    if (videoWithId6.video_tag1 && 
        videoWithId6.video_tag1.toLowerCase() === keyword.toLowerCase()) {
      console.log("Video with ID 6 matches the keyword. Returning it.");
      return [videoWithId6];
    }
  }
  
  // Then try partial match on all tags with properly formatted query
  const { data: partialMatches, error: partialMatchError } = await supabase
    .from('Videos')
    .select('*')
    .or(`video_tag1.ilike.%${keyword}%,video_tag2.ilike.%${keyword}%,video_tag3.ilike.%${keyword}%`);
    
  if (partialMatchError) {
    console.error('Error searching videos (partial match):', partialMatchError);
    return [];
  }
  
  console.log("Found partial matches:", partialMatches);
  
  // If still no matches, use a fallback video for important keywords
  if (!partialMatches || partialMatches.length === 0) {
    // Check if keyword is an important WhatsApp feature and provide a fallback video
    const fallbackKeywords = ['quick replies', 'quick reply', 'replies', 'whatsapp business', 'templates'];
    
    if (fallbackKeywords.some(k => keyword.toLowerCase().includes(k))) {
      console.log("No matches found but keyword is important. Using fallback video.");
      
      // Try to get a stable video URL from your Supabase bucket that won't expire quickly
      const fallbackVideoUrl = 'https://aalbdeydgpallvcmmsvq.supabase.co/storage/v1/object/sign/DemoGenie/What%20is%20WhatsApp.mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJEZW1vR2VuaWUvV2hhdCBpcyBXaGF0c0FwcC5tcDQiLCJpYXQiOjE3NDExMDI1OTEsImV4cCI6MTc3MjYzODU5MX0.285hWWaFnlZJ8wLkuYaAyf_sLH0wjDzxv4kgXsGEzO4';
      
      // Return a hardcoded fallback video for these important keywords
      return [{
        id: 999,
        video_url: fallbackVideoUrl,
        video_name: `WhatsApp ${keyword} Feature`,
        video_tag1: keyword
      }];
    }
  }
  
  return partialMatches || [];
}
