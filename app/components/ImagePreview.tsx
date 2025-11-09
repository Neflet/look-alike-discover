"use client";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";

export function ImagePreview({ src, alt = "Search image" }: { src: string; alt?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button 
          aria-label="Enlarge search image"
          className="cursor-pointer hover:opacity-80 transition-opacity w-full h-full"
        >
          <img 
            src={src} 
            alt={alt} 
            className="w-full h-full object-cover rounded-md" 
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <div className="relative w-full h-[70vh]">
          <img 
            src={src} 
            alt={alt} 
            className="w-full h-full object-contain" 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

