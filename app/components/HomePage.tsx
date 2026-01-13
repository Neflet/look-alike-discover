"use client";

import { Camera, Upload } from 'lucide-react';

interface HomePageProps {
  onCapture: () => void;
  onUpload: () => void;
}

export function HomePage({ onCapture, onUpload }: HomePageProps) {

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-2xl">
        {/* Logo/Brand */}
        <div className="mb-12">
          <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-400">
            SWAGAI
          </h1>
          <p className="text-zinc-400 text-lg tracking-wide">
            Find similar fashion instantly
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-6 items-center justify-center mb-8">
          {/* Camera Capture */}
          <button
            onClick={onCapture}
            className="group relative w-full md:w-64 h-64 bg-zinc-900 border-2 border-zinc-700 hover:border-white transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 group-hover:from-zinc-700 group-hover:to-zinc-800 transition-all"></div>
            <div className="relative z-10 flex flex-col items-center justify-center h-full p-6">
              <div className="w-20 h-20 mb-4 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <Camera className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-white text-xl font-bold mb-2">CAPTURE</h3>
              <p className="text-zinc-400 text-sm">Use your camera</p>
            </div>
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>

          {/* File Upload */}
          <button
            onClick={onUpload}
            className="group relative w-full md:w-64 h-64 bg-zinc-900 border-2 border-zinc-700 hover:border-white transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 group-hover:from-zinc-700 group-hover:to-zinc-800 transition-all"></div>
            <div className="relative z-10 flex flex-col items-center justify-center h-full p-6">
              <div className="w-20 h-20 mb-4 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-white text-xl font-bold mb-2">UPLOAD</h3>
              <p className="text-zinc-400 text-sm">Choose from files</p>
            </div>
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </div>

        {/* Additional info */}
        <p className="text-zinc-500 text-sm">
          Upload an image or capture live to find similar clothing items
        </p>
      </div>
    </div>
  );
}

