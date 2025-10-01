import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { searchImage } from '@/api/search-image';
import { trackEvent } from '@/api/analytics';
import swagaiLogo from '@/assets/swagai-logo.png';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();


  const handleImageSearch = async (file: File) => {
    setIsLoading(true);
    setSearchCompleted(false);
    
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-[1600px] mx-auto px-8 py-5 flex items-center justify-between">
          <img 
            src={swagaiLogo}
            alt="Swagai" 
            className="h-7 w-auto"
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-24 pb-16">
        {!searchCompleted && !isLoading && (
          <div className="max-w-2xl mx-auto px-8 py-32 text-center space-y-12">
            <div className="space-y-4">
              <h1 className="text-6xl font-medium tracking-tight uppercase">
                Find Your Style
              </h1>
              <p className="text-muted-foreground text-base tracking-wide uppercase">
                Upload an image to discover similar products
              </p>
            </div>

            {/* Upload Controls */}
            <div className="flex flex-col gap-4 items-center">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                size="lg"
                className="px-12 py-6 text-sm tracking-widest uppercase font-medium rounded-none"
              >
                Upload Image
              </Button>
              
              <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={isLoading}
                className="text-sm tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                or use camera
              </button>


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

        {/* Loading State */}
        {isLoading && (
          <div className="max-w-[1600px] mx-auto px-8">
            <div className="flex flex-col items-center justify-center py-32 space-y-6">
              <Loader2 className="w-6 h-6 animate-spin text-foreground" />
              <p className="text-sm tracking-widest uppercase text-muted-foreground">Searching</p>
            </div>
          </div>
        )}

        {/* Results Grid */}
        {searchCompleted && !isLoading && (
          <div className="max-w-[1600px] mx-auto px-8">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <AlertCircle className="w-8 h-8 text-muted-foreground" />
                <div className="text-center space-y-2">
                  <h3 className="text-lg tracking-wide uppercase">No products found</h3>
                  <button
                    onClick={() => {
                      setSearchCompleted(false);
                      setProducts([]);
                    }}
                    className="text-sm tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Try another image
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-12 flex items-center justify-between">
                  <p className="text-xs tracking-widest uppercase text-muted-foreground">
                    {products.length} Results
                  </p>
                  <button
                    onClick={() => {
                      setSearchCompleted(false);
                      setProducts([]);
                    }}
                    className="text-xs tracking-widest uppercase hover:text-foreground transition-colors"
                  >
                    New Search
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
                  {products.map((product) => (
                    <div 
                      key={product.id} 
                      className="group cursor-pointer"
                      onClick={() => handleProductClick(product)}
                    >
                      <div className="aspect-[3/4] relative overflow-hidden bg-muted mb-4">
                        <img
                          src={product.main_image_url}
                          alt={product.title}
                          className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80"
                          loading="lazy"
                        />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xs tracking-wide uppercase line-clamp-2 leading-relaxed" title={product.title}>
                          {product.title}
                        </h3>
                        <p className="text-xs tracking-wider">
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
    </div>
  );
}