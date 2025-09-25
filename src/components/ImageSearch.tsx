import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { searchImage } from '@/api/search-image';
import { trackEvent } from '@/api/analytics';

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
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Visual Product Search</h1>
        <p className="text-muted-foreground">
          Upload or capture an image to find similar products
        </p>
      </div>

      {/* Upload Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Image
        </Button>
        
        <Button
          onClick={() => cameraInputRef.current?.click()}
          disabled={isLoading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          Take Photo
        </Button>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Or paste image URL..."
            className="px-3 py-2 border rounded-md"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const url = e.currentTarget.value;
                if (url) {
                  handleImageSearch(new File([], 'url', { type: 'text/plain' }));
                }
              }
            }}
          />
          <Button
            onClick={() => {
              const input = document.querySelector('input[placeholder="Or paste image URL..."]') as HTMLInputElement;
              const url = input?.value;
              if (url) {
                // Test URL search
                fetch('http://localhost:8000/api/search', {
                  method: 'POST',
                  body: new URLSearchParams({ url })
                })
                .then(res => res.json())
                .then(data => {
                  if (data.matches) {
                    setProducts(data.matches);
                    setSearchCompleted(true);
                    toast({
                      title: "Search completed",
                      description: `Found ${data.matches.length} similar products`,
                    });
                  }
                })
                .catch(err => {
                  toast({
                    title: "Search failed",
                    description: err.message,
                    variant: "destructive"
                  });
                });
              }
            }}
            disabled={isLoading}
            variant="secondary"
          >
            Search URL
          </Button>
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

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-muted-foreground">Searching for similar products...</p>
        </div>
      )}

      {/* Results Grid */}
      {searchCompleted && !isLoading && (
        <>
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <AlertCircle className="w-12 h-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">No products found</h3>
                <p className="text-muted-foreground">
                  Try uploading a different image or check your filters
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={product.main_image_url}
                        alt={product.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold text-sm line-clamp-2" title={product.title}>
                        {product.title}
                      </h3>
                      <p className="text-lg font-bold">
                        ${product.price.toFixed(2)}
                      </p>
                      <Button
                        onClick={() => handleProductClick(product)}
                        className="w-full"
                        size="sm"
                      >
                        Buy Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}