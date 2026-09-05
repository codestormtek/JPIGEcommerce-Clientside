import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImageUploader({ onUploadComplete }: { onUploadComplete: (assetId: string) => void }) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("jpig_access_token");
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch("/api/v1/media/upload", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const json = await res.json();
      const asset = json.data || json;
      
      // Invalidate media list so it refreshes
      queryClient.invalidateQueries({ queryKey: ["media"] });
      
      onUploadComplete(asset.id);
    } catch (e) {
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        id="image-upload"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            uploadFile(e.target.files[0]);
          }
        }}
      />
      <label htmlFor="image-upload">
        <Button variant="outline" type="button" asChild disabled={isUploading}>
          <span>
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload New"}
          </span>
        </Button>
      </label>
    </div>
  );
}
