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
      {/* Header with Logo */}
      <header className="border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <img 
            src={swagaiLogo}
            alt="Swagai" 
            className="h-8 w-auto"
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full max-w-6xl mx-auto px-6 py-12 space-y-12">
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-bold tracking-tight">Find Your Style</h1>
          <p className="text-muted-foreground text-lg font-light">
            Upload an image to discover similar products
          </p>
        </div>

        {/* Upload Controls */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            size="lg"
            className="flex items-center gap-2 font-medium"
          >
            <Upload className="w-4 h-4" />
            Upload Image
          </Button>
          
          <Button
            onClick={() => cameraInputRef.current?.click()}
            disabled={isLoading}
            variant="outline"
            size="lg"
            className="flex items-center gap-2 font-medium"
          >
            <Camera className="w-4 h-4" />
            Take Photo
          </Button>


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

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-foreground" />
            <p className="text-muted-foreground font-light">Searching...</p>
          </div>
        )}

        {/* Results Grid */}
        {searchCompleted && !isLoading && (
          <>
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <AlertCircle className="w-12 h-12 text-muted-foreground" />
                <div className="text-center">
                  <h3 className="text-xl font-semibold">No products found</h3>
                  <p className="text-muted-foreground font-light">
                    Try uploading a different image
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <div 
                    key={product.id} 
                    className="group cursor-pointer"
                    onClick={() => handleProductClick(product)}
                  >
                    <div className="aspect-[3/4] relative overflow-hidden bg-muted mb-3">
                      <img
                        src={product.main_image_url}
                        alt={product.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium text-sm line-clamp-2 leading-tight" title={product.title}>
                        {product.title}
                      </h3>
                      <p className="text-sm font-semibold">
                        ${product.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}