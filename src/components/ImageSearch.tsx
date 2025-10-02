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
    <div className="min-h-screen bg-background">
      {/* Asymmetric Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="max-w-[1800px] mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src={lensIcon}
              alt="" 
              className="h-5 w-auto opacity-90"
            />
            <img 
              src={swagaiLogo}
              alt="Swagai" 
              className="h-6 w-auto"
            />
          </div>
          <div className="h-px w-16 bg-border" />
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-20">
        {!searchCompleted && !isLoading && (
          <div className="min-h-[80vh] flex items-center justify-center px-6">
            <div className="max-w-3xl w-full">
              {/* Asymmetric layout */}
              <div className="grid md:grid-cols-[2fr,1fr] gap-16 items-center">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Visual Search</span>
                    </div>
                    <h1 className="text-[clamp(2.5rem,8vw,5rem)] font-light tracking-[-0.02em] leading-[0.9]">
                      Discover<br />Similar<br />Styles
                    </h1>
                  </div>

                  <div className="flex items-center gap-6">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      variant="outline"
                      className="h-11 px-8 text-[11px] tracking-[0.2em] uppercase font-normal border-foreground hover:bg-foreground hover:text-background transition-all duration-300"
                    >
                      Select Image
                    </Button>
                    
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={isLoading}
                      className="text-[11px] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border hover:decoration-foreground"
                    >
                      Camera
                    </button>
                  </div>
                </div>

                <div className="hidden md:block">
                  <div className="aspect-square border border-border/50 flex items-center justify-center">
                    <img src={lensIcon} alt="" className="w-20 h-20 opacity-30" />
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

        {/* Loading State with Rotating Lens */}
        {isLoading && (
          <div className="min-h-[80vh] flex items-center justify-center px-6">
            <div className="flex flex-col items-center gap-8">
              <div className="relative">
                <img 
                  src={lensIcon} 
                  alt="" 
                  className="w-16 h-16 animate-spin opacity-90"
                  style={{ animationDuration: '3s' }}
                />
                <div className="absolute inset-0 animate-ping opacity-20">
                  <img src={lensIcon} alt="" className="w-16 h-16" />
                </div>
              </div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Analyzing</p>
            </div>
          </div>
        )}

        {/* Results Grid with Uploaded Image Preview */}
        {searchCompleted && !isLoading && (
          <div className="max-w-[1800px] mx-auto px-6 md:px-12 py-12">
            {products.length === 0 ? (
              <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border border-border/50 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-center space-y-3">
                  <h3 className="text-sm tracking-[0.15em] uppercase font-light">No Results</h3>
                  <button
                    onClick={() => {
                      setSearchCompleted(false);
                      setProducts([]);
                      setUploadedImage(null);
                    }}
                    className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-16 flex items-start justify-between gap-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
                        {products.length} Matches
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSearchCompleted(false);
                      setProducts([]);
                      setUploadedImage(null);
                    }}
                    className="text-[10px] tracking-[0.25em] uppercase hover:text-foreground transition-colors flex items-center gap-2"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-16">
                  {products.map((product) => (
                    <div 
                      key={product.id} 
                      className="group cursor-pointer"
                      onClick={() => handleProductClick(product)}
                    >
                      <div className="aspect-[3/4] relative overflow-hidden bg-muted/30 mb-3 border border-transparent group-hover:border-border transition-all duration-500">
                        <img
                          src={product.main_image_url}
                          alt={product.title}
                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-[10px] tracking-[0.1em] uppercase line-clamp-2 leading-relaxed font-light" title={product.title}>
                          {product.title}
                        </h3>
                        <p className="text-[10px] tracking-[0.15em] text-muted-foreground">
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

      {/* Floating Uploaded Image Preview */}
      {uploadedImage && (searchCompleted || isLoading) && (
        <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="group relative">
            <div className="w-20 h-20 border border-border bg-background overflow-hidden">
              <img 
                src={uploadedImage} 
                alt="Your search" 
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={() => setUploadedImage(null)}
              className="absolute -top-2 -right-2 w-5 h-5 bg-foreground text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove preview"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="absolute -bottom-6 left-0 text-[8px] tracking-[0.2em] uppercase text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              Reference
            </div>
          </div>
        </div>
      )}
    </div>
  );
}