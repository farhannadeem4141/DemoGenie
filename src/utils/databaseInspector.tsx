
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

/**
 * Utility function to fetch all videos from the database
 * @returns Promise with the query result
 */
export async function inspectVideosTable() {
  console.log("Running database inspection on Videos table...");
  
  try {
    // Fetch all records from the Videos table
    const { data, error } = await supabase
      .from('Videos')
      .select('*');
    
    if (error) {
      console.error("Error fetching videos:", error);
      return { success: false, data: null, error };
    }
    
    // Log the results for inspection
    console.log("Videos table contents:", data);
    
    // Also log individual records in a more readable format
    if (data && data.length > 0) {
      console.log(`Found ${data.length} videos in the database:`);
      data.forEach((video, index) => {
        console.log(`\nVideo #${index + 1}:`);
        console.log(`ID: ${video.id}`);
        console.log(`Name: ${video.video_name}`);
        console.log(`URL: ${video.video_url}`);
        console.log(`Tags: ${video.video_tag1 || 'none'}, ${video.video_tag2 || 'none'}, ${video.video_tag3 || 'none'}`);
        console.log(`Created: ${video.created_at}`);
      });
    } else {
      console.log("No videos found in the database.");
    }
    
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error during database inspection:", error);
    return { success: false, data: null, error };
  }
}

/**
 * Utility function to search for videos with a specific tag value
 * @param tagValue The tag value to search for
 * @returns Promise with the query result
 */
export async function searchVideosByTagValue(tagValue: string) {
  console.log(`Searching videos with tag value: "${tagValue}"`);
  
  try {
    // Run a direct SQL query to find any videos with the specified tag
    const { data, error } = await supabase
      .from('Videos')
      .select('*')
      .or(`video_tag1.eq.${tagValue},video_tag2.eq.${tagValue},video_tag3.eq.${tagValue}`);
    
    console.log("Search results:", data);
    console.log("Search error:", error);
    
    // Also try an ilike search for case-insensitive matching
    const { data: ilikeData, error: ilikeError } = await supabase
      .from('Videos')
      .select('*')
      .or(`video_tag1.ilike.%${tagValue}%,video_tag2.ilike.%${tagValue}%,video_tag3.ilike.%${tagValue}%`);
    
    console.log("Case-insensitive search results:", ilikeData);
    console.log("Case-insensitive search error:", ilikeError);
    
    return { 
      exactMatch: { success: !error, data, error },
      partialMatch: { success: !ilikeError, data: ilikeData, error: ilikeError }
    };
  } catch (error) {
    console.error("Unexpected error during tag search:", error);
    return { 
      exactMatch: { success: false, data: null, error },
      partialMatch: { success: false, data: null, error }
    };
  }
}

/**
 * Adds a new video to the database
 * @param videoName The name of the video
 * @param videoUrl The URL of the video
 * @param videoTag1 The first tag for the video 
 * @param videoTag2 Optional second tag for the video
 * @param videoTag3 Optional third tag for the video
 * @returns Promise with the insert result
 */
export async function addVideoToDatabase(
  videoName: string, 
  videoUrl: string, 
  videoTag1?: string, 
  videoTag2?: string, 
  videoTag3?: string
) {
  console.log(`Adding video to database: "${videoName}" with URL: ${videoUrl}`);
  
  try {
    // Prepare the video record
    const videoRecord = {
      video_name: videoName,
      video_url: videoUrl,
      video_tag1: videoTag1 || null,
      video_tag2: videoTag2 || null,
      video_tag3: videoTag3 || null
    };
    
    // Insert the record into the Videos table
    const { data, error } = await supabase
      .from('Videos')
      .insert(videoRecord)
      .select();
    
    if (error) {
      console.error("Error adding video:", error);
      return { success: false, data: null, error };
    }
    
    console.log("Video added successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error adding video:", error);
    return { success: false, data: null, error };
  }
}

/**
 * Creates a table display of all videos in the database
 * @returns JSX for a table of videos
 */
export function VideosTable() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadVideos() {
      try {
        const result = await inspectVideosTable();
        if (result.success && result.data) {
          setVideos(result.data);
        } else {
          setError("Failed to load videos");
        }
      } catch (err) {
        setError("Error loading videos");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    loadVideos();
  }, []);
  
  if (loading) {
    return <div className="p-4 text-center">Loading videos...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }
  
  if (videos.length === 0) {
    return <div className="p-4 text-center">No videos found in database</div>;
  }
  
  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Tag 1</TableHead>
            <TableHead>Tag 2</TableHead>
            <TableHead>Tag 3</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {videos.map((video) => (
            <TableRow key={video.id}>
              <TableCell>{video.id}</TableCell>
              <TableCell>{video.video_name || '-'}</TableCell>
              <TableCell className="max-w-xs truncate">{video.video_url || '-'}</TableCell>
              <TableCell>{video.video_tag1 || '-'}</TableCell>
              <TableCell>{video.video_tag2 || '-'}</TableCell>
              <TableCell>{video.video_tag3 || '-'}</TableCell>
              <TableCell>{new Date(video.created_at).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Remove the self-executing function to avoid automatic execution during import
// This should be called explicitly from another component when needed
