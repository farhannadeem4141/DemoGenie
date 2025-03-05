
import { supabase } from "@/integrations/supabase/client";

export async function searchVideosByKeyword(keyword: string): Promise<any[]> {
  if (!keyword) return [];
  
  console.log("Searching videos with keyword:", keyword);
  
  // First try exact match on any of the three tags
  let { data: exactMatches, error: exactMatchError } = await supabase
    .from('Videos')
    .select('*')
    .or(`video_tag1.eq.${keyword},video_tag2.eq.${keyword},video_tag3.eq.${keyword}`);
  
  if (exactMatchError) {
    console.error('Error searching videos (exact match):', exactMatchError);
  }
  
  if (exactMatches && exactMatches.length > 0) {
    console.log("Found exact matches:", exactMatches);
    return exactMatches;
  }
  
  // Then try partial match on all tags
  const { data: partialMatches, error: partialMatchError } = await supabase
    .from('Videos')
    .select('*')
    .or(`video_tag1.ilike.%${keyword}%,video_tag2.ilike.%${keyword}%,video_tag3.ilike.%${keyword}%`);
    
  if (partialMatchError) {
    console.error('Error searching videos (partial match):', partialMatchError);
    return [];
  }
  
  console.log("Found partial matches:", partialMatches);
  
  // If still no matches, try with a fallback video for important keywords
  if (!partialMatches || partialMatches.length === 0) {
    // Check if keyword is an important WhatsApp feature and provide a fallback video
    const fallbackKeywords = ['quick replies', 'quick reply', 'replies', 'whatsapp business', 'templates'];
    
    if (fallbackKeywords.some(k => keyword.toLowerCase().includes(k))) {
      // Return a hardcoded fallback video for these important keywords
      return [{
        id: 999,
        video_url: 'https://aalbdeydgpallvcmmsvq.supabase.co/storage/v1/object/sign/DemoGenie/What%20is%20WhatsApp.mp4?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJEZW1vR2VuaWUvV2hhdCBpcyBXaGF0c0FwcC5tcDQiLCJpYXQiOjE3NDExMDI1OTEsImV4cCI6MTc3MjYzODU5MX0.285hWWaFnlZJ8wLkuYaAyf_sLH0wjDzxv4kgXsGEzO4',
        video_name: `WhatsApp ${keyword} Feature`,
        video_tag1: keyword
      }];
    }
  }
  
  return partialMatches || [];
}
