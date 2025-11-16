"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Sparkles, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { ImageWithFallback } from "./ImageWithFallback";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ImageUploadPanel() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 h-full">
        {uploadedImage && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setUploadedImage(null)}
          >
            <Plus className="w-4 h-4" />
            New Search
          </Button>
        )}
        <Card className="p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold">{uploadedImage ? "Your Query" : "Upload Image"}</h2>
          
          {uploadedImage ? (
            // Thumbnail View
            <div className="space-y-3">
              <motion.div
                whileHover={{ scale: 1.05 }}
                onClick={() => setIsImageExpanded(true)}
                className="relative w-full aspect-square rounded-lg overflow-hidden cursor-pointer border-2 border-border hover:border-foreground/50 transition-colors"
              >
                <ImageWithFallback
                  src={uploadedImage}
                  alt="Searched image"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                  <span className="text-white opacity-0 hover:opacity-100 transition-opacity text-sm">
                    Click to expand
                  </span>
                </div>
              </motion.div>
            </div>
          ) : (
            // Upload Area
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative aspect-square border-2 border-dashed border-border rounded-lg overflow-hidden cursor-pointer hover:border-foreground/50 transition-colors"
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Upload className="w-12 h-12" />
                <div className="text-center">
                  <p className="font-medium">Drop your image here</p>
                  <p className="text-sm">or click to browse</p>
                </div>
              </div>
            </motion.div>
          )}
        </Card>
        {/* Refine Button */}
        <Button
          size="lg"
          className="w-full gap-2"
          disabled={!uploadedImage}
        >
          <Sparkles className="w-5 h-5" />
          Refine Results
        </Button>
      </div>
      {/* Expanded Image Dialog */}
      <Dialog open={isImageExpanded} onOpenChange={setIsImageExpanded}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Your Query Image</DialogTitle>
          </DialogHeader>
          {uploadedImage && (
            <div className="w-full">
              <ImageWithFallback
                src={uploadedImage}
                alt="Searched image"
                width={800}
                height={800}
                className="w-full h-auto rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}





