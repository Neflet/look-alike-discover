import { Search } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6">
        {/* Animated Search Icon */}
        <div className="relative">
          <div className="w-20 h-20 mx-auto bg-fashion-gradient rounded-full flex items-center justify-center shadow-strong animate-pulse-soft">
            <Search className="w-10 h-10 text-white" />
          </div>
          
          {/* Ripple Effect */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping"></div>
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" style={{ animationDelay: '0.5s' }}></div>
        </div>

        {/* Loading Text */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Finding Similar Items</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Analyzing your image and searching through thousands of fashion items...
          </p>
        </div>

        {/* Loading Steps */}
        <div className="space-y-3 text-left max-w-xs mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">Processing image</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <span className="text-sm text-muted-foreground">Extracting features</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            <span className="text-sm text-muted-foreground">Searching catalog</span>
          </div>
        </div>
      </div>
    </div>
  );
}