
import React, { useState, useEffect } from 'react';
import { VideosTable, addVideoToDatabase, inspectVideosTable } from '@/utils/databaseInspector';
import { validateVideoUrl, testVideoPlayability } from '@/services/video/videoUrlValidator';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Database = () => {
  const [videoName, setVideoName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTag1, setVideoTag1] = useState('');
  const [videoTag2, setVideoTag2] = useState('');
  const [videoTag3, setVideoTag3] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();

  // Advertise video case for the task
  const advertiseVideoUrl = "https://boncletesuahajikgrrz.supabase.co/storage/v1/object/public/videos//How%20To%20Advertise.mp4";

  const handleAddAdvertiseVideo = async () => {
    setIsSubmitting(true);
    
    try {
      const validatedUrl = validateVideoUrl(advertiseVideoUrl);
      if (!validatedUrl) {
        toast({
          title: "Invalid URL",
          description: "The video URL is not valid",
          variant: "destructive"
        });
        return;
      }
      
      const isPlayable = await testVideoPlayability(validatedUrl);
      if (!isPlayable) {
        toast({
          title: "Video May Not Be Playable",
          description: "The URL was validated but the video may not play correctly",
          variant: "warning"
        });
      }
      
      const result = await addVideoToDatabase(
        "advertise", 
        advertiseVideoUrl,
        "advertise"
      );
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Advertise video added to database",
        });
        // Trigger refresh of the table
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast({
          title: "Error",
          description: "Failed to add video to database",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error adding advertise video:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (!videoName || !videoUrl) {
        toast({
          title: "Missing Fields",
          description: "Video name and URL are required",
          variant: "destructive"
        });
        return;
      }
      
      const validatedUrl = validateVideoUrl(videoUrl);
      if (!validatedUrl) {
        toast({
          title: "Invalid URL",
          description: "The video URL is not valid",
          variant: "destructive"
        });
        return;
      }
      
      const isPlayable = await testVideoPlayability(validatedUrl);
      if (!isPlayable) {
        toast({
          title: "Video May Not Be Playable",
          description: "The URL was validated but the video may not play correctly",
          variant: "warning"
        });
      }
      
      const result = await addVideoToDatabase(
        videoName, 
        videoUrl,
        videoTag1 || undefined,
        videoTag2 || undefined,
        videoTag3 || undefined
      );
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Video added to database",
        });
        
        // Reset form
        setVideoName('');
        setVideoUrl('');
        setVideoTag1('');
        setVideoTag2('');
        setVideoTag3('');
        
        // Trigger refresh of the table
        setRefreshTrigger(prev => prev + 1);
      } else {
        toast({
          title: "Error",
          description: "Failed to add video to database",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error adding video:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initial load of advertise video
  useEffect(() => {
    const addInitialVideo = async () => {
      console.log("Checking if advertise video exists...");
      const inspection = await inspectVideosTable();
      
      if (inspection.success && inspection.data) {
        const videos = inspection.data;
        const advertiseExists = videos.some(
          v => v.video_name === "advertise" || 
               v.video_tag1 === "advertise" ||
               v.video_url === advertiseVideoUrl
        );
        
        if (!advertiseExists) {
          console.log("Advertise video not found, adding it automatically");
          await handleAddAdvertiseVideo();
        } else {
          console.log("Advertise video already exists in the database");
        }
      }
    };
    
    addInitialVideo();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Video Database Management</h1>
      
      <div className="mb-8 p-6 bg-gray-50 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Add New Video</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="videoName">Video Name*</Label>
              <Input
                id="videoName"
                value={videoName}
                onChange={(e) => setVideoName(e.target.value)}
                placeholder="Enter video name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL*</Label>
              <Input
                id="videoUrl"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Enter video URL"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="videoTag1">Tag 1</Label>
              <Input
                id="videoTag1"
                value={videoTag1}
                onChange={(e) => setVideoTag1(e.target.value)}
                placeholder="Primary tag"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="videoTag2">Tag 2</Label>
              <Input
                id="videoTag2"
                value={videoTag2}
                onChange={(e) => setVideoTag2(e.target.value)}
                placeholder="Secondary tag"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="videoTag3">Tag 3</Label>
              <Input
                id="videoTag3"
                value={videoTag3}
                onChange={(e) => setVideoTag3(e.target.value)}
                placeholder="Additional tag"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-4">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => {
                setVideoName('');
                setVideoUrl('');
                setVideoTag1('');
                setVideoTag2('');
                setVideoTag3('');
              }}
              disabled={isSubmitting}
            >
              Clear
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Video'}
            </Button>
          </div>
        </form>
      </div>
      
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">All Videos in Database</h2>
          <Button 
            variant="outline" 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
          >
            Refresh List
          </Button>
        </div>
        <VideosTable key={refreshTrigger} />
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium mb-2">Add Advertise Video</h3>
        <p className="text-sm mb-3">
          Add the advertise video with URL: {advertiseVideoUrl}
        </p>
        <Button 
          onClick={handleAddAdvertiseVideo}
          variant="secondary"
          disabled={isSubmitting}
        >
          Add Advertise Video
        </Button>
      </div>
    </div>
  );
};

export default Database;
