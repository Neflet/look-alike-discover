import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, Loader2, AlertCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { searchImage } from '@/api/search-image';
import { trackEvent } from '@/api/analytics';
import swagaiLogo from '@/assets/swagai-logo.png';
import lensIcon from '@/assets/lens-icon.png';

interface Product {
  id: string;
  title: string;
  price: number;
  url: string;
  main_image_url: string;
  distance: number;
}

interface SearchResponse {
  products: Product[];
  requestId: string;
}

export function ImageSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();


  const handleImageSearch = async (file: File) => {
    setIsLoading(true);
    setSearchCompleted(false);
    
    // Create preview URL for the uploaded image
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    
    try {
      console.log('Starting image search...');
      const data = await searchImage(file);
      console.log('Search data received:', data);
      
      if (!data || !data.products) {
        throw new Error('Invalid search response');
      }
      
      setProducts(data.products);
      setSearchCompleted(true);

      // Track search event
      try {
        await trackEvent('image_search', {
          results_count: data.products.length,
          top_distance: data.products[0]?.distance || null,
          request_id: data.requestId
        });
      } catch (trackError) {
        console.warn('Analytics tracking failed:', trackError);
      }

      if (data.products.length === 0) {
        toast({
          title: "No results found",
          description: "Try uploading a different image or adjusting your search.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Search completed",
          description: `Found ${data.products.length} similar products`,
        });
      }

    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageSearch(file);
    }
  };

  const handleProductClick = async (product: Product) => {
    await trackEvent('product_click', {
      product_id: product.id,
      product_title: product.title,
      product_price: product.price,
      similarity_distance: product.distance
    });

    window.open(product.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Diagonal split background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
      </div>

      {/* Compact corner header */}
      <header className="fixed top-0 left-0 z-50 p-4">
        <div className="flex items-center gap-3 bg-background/95 backdrop-blur-sm px-4 py-2 border border-border/30">
          <img src={lensIcon} alt="" className="h-4 w-auto" />
          <div className="h-3 w-px bg-border" />
          <img src={swagaiLogo} alt="Swagai" className="h-4 w-auto" />
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10">
        {!searchCompleted && !isLoading && (
          <div className="min-h-screen flex items-center px-6 md:px-16 lg:px-24">
            <div className="w-full max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-20 items-center">
                {/* Left side - Hero text */}
                <div className="space-y-10 lg:pt-0 pt-20">
                  <div className="space-y-6">
                    <div className="inline-block px-3 py-1 border border-border/50">
                      <span className="text-[9px] tracking-[0.25em] uppercase opacity-60">Beta v1.0</span>
                    </div>
                    <h1 className="text-[clamp(3rem,10vw,7rem)] font-bold leading-[0.85] tracking-tighter">
                      MATCH<br />
                      YOUR<br />
                      <span className="italic font-light">Vision</span>
                    </h1>
                    <p className="text-sm leading-relaxed max-w-md opacity-70">
                      Upload any fashion image and our AI will find visually similar products from curated collections
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      className="h-14 px-10 text-xs tracking-[0.2em] uppercase bg-foreground text-background hover:bg-foreground/90 border-2 border-foreground"
                    >
                      Browse Files
                    </Button>
                    
                    <div className="flex items-center gap-3">
                      <div className="h-px w-12 bg-border/50" />
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={isLoading}
                        className="text-xs tracking-wide opacity-60 hover:opacity-100 transition-opacity"
                      >
                        or capture photo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right side - Visual element */}
                <div className="hidden lg:block relative">
                  <div className="aspect-square relative">
                    <div className="absolute inset-0 border-2 border-border/30 translate-x-4 translate-y-4" />
                    <div className="absolute inset-0 border-2 border-foreground flex items-center justify-center bg-background">
                      <img src={lensIcon} alt="" className="w-32 h-32 opacity-40" />
                    </div>
                  </div>
                  <div className="absolute -bottom-6 -right-6 px-4 py-2 bg-foreground text-background text-[10px] tracking-[0.2em]">
                    AI POWERED
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                aria-label="Upload image file"
              />
              
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
                aria-label="Capture photo"
              />
            </div>
          </div>
        )}

        {/* Loading State with Lens Blink Animation */}
        {isLoading && (
          <div className="min-h-screen flex items-center justify-center px-6">
            <div className="flex flex-col items-center gap-10">
              <div className="relative">
                <img 
                  src={lensIcon} 
                  alt="" 
                  className="w-24 h-24 lens-blink"
                />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xs tracking-[0.3em] uppercase font-medium">Processing Image</p>
                <div className="flex gap-1 justify-center">
                  <div className="w-1 h-1 bg-foreground animate-pulse" style={{ animationDelay: '0s' }} />
                  <div className="w-1 h-1 bg-foreground animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-1 h-1 bg-foreground animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Grid */}
        {searchCompleted && !isLoading && (
          <div className="min-h-screen px-6 md:px-16 lg:px-24 py-24">
            {products.length === 0 ? (
              <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-6">
                <div className="w-16 h-16 border-2 border-border flex items-center justify-center">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="text-center space-y-3">
                  <h3 className="text-base tracking-wide uppercase font-medium">No Matches Found</h3>
                  <button
                    onClick={() => {
                      setSearchCompleted(false);
                      setProducts([]);
                      setUploadedImage(null);
                    }}
                    className="text-xs tracking-wide underline underline-offset-4 hover:no-underline transition-all"
                  >
                    Try Different Image
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Results header */}
                <div className="mb-12 pb-6 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight mb-1">Results</h2>
                      <p className="text-xs opacity-60">{products.length} similar items found</p>
                    </div>
                    <button
                      onClick={() => {
                        setSearchCompleted(false);
                        setProducts([]);
                        setUploadedImage(null);
                      }}
                      className="px-6 py-2 border border-foreground text-xs tracking-wide uppercase hover:bg-foreground hover:text-background transition-colors"
                    >
                      New Search
                    </button>
                  </div>
                </div>
                
                {/* Products grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {products.map((product, index) => (
                    <div 
                      key={product.id} 
                      className="group cursor-pointer"
                      onClick={() => handleProductClick(product)}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="aspect-[3/4] relative overflow-hidden bg-muted/20 mb-3 border border-transparent group-hover:border-foreground transition-all duration-300">
                        <img
                          src={product.main_image_url}
                          alt={product.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-300" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-[11px] leading-tight line-clamp-2 font-medium" title={product.title}>
                          {product.title}
                        </h3>
                        <p className="text-xs font-bold">
                          ${product.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Floating Uploaded Image Preview - More prominent */}
      {uploadedImage && (searchCompleted || isLoading) && (
        <div className="fixed bottom-8 left-8 z-50 animate-in slide-in-from-left duration-700">
          <div className="group relative">
            <div className="absolute -inset-1 bg-foreground/10 blur-sm" />
            <div className="relative bg-background border-2 border-foreground p-1">
              <div className="w-28 h-28 overflow-hidden">
                <img 
                  src={uploadedImage} 
                  alt="Search reference" 
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => setUploadedImage(null)}
                className="absolute -top-3 -right-3 w-6 h-6 bg-foreground text-background flex items-center justify-center hover:bg-foreground/80 transition-colors"
                aria-label="Remove preview"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="mt-2 text-[9px] tracking-[0.15em] uppercase opacity-60">
              Your Image
            </div>
          </div>
        </div>
      )}
    </div>
  );
}