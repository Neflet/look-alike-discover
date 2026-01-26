"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, Loader2, AlertCircle, X, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { embedImage, searchSimilar, searchSimilarWithCategory, type SearchHit, type SearchResponse, type MatchStatus, type ProductCategory } from '../../lib/search-image';
import { trackEvent } from '@/api/analytics';
import { track } from '@/lib/posthog';
import { CropOverlay } from './CropOverlay';
import { cropImage, type CropArea } from '../../lib/image-crop';
import RefineSearch from '@/components/RefineSearch';
import { UserMenu } from './UserMenu';
import { SaveButton } from './SaveButton';
import { ImagePreview } from './ImagePreview';
import { ProductCarousel3D } from './ProductCarousel3D';
import { CantFindItemModal } from './CantFindItemModal';
import { HomePage } from './HomePage';
import { ResultsPage } from './ResultsPage';

// Extended SearchHit for UI (includes score for backward compatibility)
type UISearchHit = SearchHit & {
  score: number; // For backward compatibility with existing UI code
};

export function ImageSearch() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<UISearchHit[]>([]);
  const [originalProducts, setOriginalProducts] = useState<UISearchHit[]>([]); // Store original unfiltered results for "Clear all filters"
  const [previousSuccessfulProducts, setPreviousSuccessfulProducts] = useState<UISearchHit[]>([]); // Store last successful results for "Back to all results"
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showCrop, setShowCrop] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [lastEmbedding, setLastEmbedding] = useState<number[] | null>(null);
  const [lastModel, setLastModel] = useState<string | null>(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const [matchStatus, setMatchStatus] = useState<MatchStatus>('none');
  const [predictedCategory, setPredictedCategory] = useState<ProductCategory | undefined>(undefined);
  const [activeBrandFilter, setActiveBrandFilter] = useState<string | null>(null);
  const [showCantFindModal, setShowCantFindModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageSearch = async (file: File, isNewSearch: boolean = false) => {
    setIsLoading(true);
    setSearchCompleted(false);
    
    // If this is a completely new search (not a refine), reset filters and stored results
    if (isNewSearch) {
      setActiveBrandFilter(null);
      setOriginalProducts([]); // Clear original results for new search
      setPreviousSuccessfulProducts([]); // Clear previous results for new search
    }
    
    // Create preview URL for the uploaded image
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    
    try {
      console.log('Starting image search…', { isNewSearch, hasPreviousResults: previousSuccessfulProducts.length > 0, activeBrandFilter });

      // Track search triggered
      track('search_triggered', { qtype: 'image', filters: null });

      // Step 1: Get embedding from edge function
      const { embedding, model } = await embedImage(file);
      setLastEmbedding(embedding);
      setLastModel(model);

      // Step 2: Search similar products with category filtering and match status
      // Only apply brand filter if this is NOT a new search (i.e., it's a refine)
      let searchResponse: SearchResponse;
      try {
        searchResponse = await searchSimilarWithCategory(embedding, model, {
          topK: 5,
          brand: (!isNewSearch && activeBrandFilter) || undefined,
        });
      } catch (searchError: any) {
        console.error('[SEARCH] searchSimilarWithCategory failed, falling back to basic search:', searchError);
        // Fallback to basic search if new function fails
        const fallbackResults = await searchSimilar(embedding, model, { topK: 5 });
        const items: UISearchHit[] = fallbackResults.map(r => ({
          ...r,
          title: r.title || 'Untitled',
          category: r.category || 'other',
          score: r.similarity ?? (r.cos_distance !== undefined ? 1.0 - r.cos_distance : 0.5),
        }));
        setProducts(items);
        setMatchStatus(items.length > 0 ? 'strong' : 'none');
        setPredictedCategory(undefined);
        setSearchCompleted(true);
        return; // Exit early on fallback
      }

      // Transform results to match existing UI format
      const items: UISearchHit[] = searchResponse.results.map(r => ({
        ...r,
        title: r.title || 'Untitled',
        category: r.category || 'other', // Ensure category is always present
        score: r.similarity ?? (r.cos_distance !== undefined ? 1.0 - r.cos_distance : 0.5), // Fallback if similarity not provided
      }));

      setProducts(items);
      // Store original products on first search (for "Clear all filters")
      if (isNewSearch && items.length > 0) {
        console.log('[ImageSearch] Storing original results:', items.length, 'items');
        setOriginalProducts([...items]);
      }
      // Note: previousSuccessfulProducts is set before each refine search (for "Back to all results")
      console.log('[ImageSearch] Search complete:', { resultCount: items.length, isNewSearch });
      setMatchStatus(searchResponse.matchStatus);
      setPredictedCategory(searchResponse.predictedCategory);
      setSearchCompleted(true);

      // Track search event
      try {
        await trackEvent('image_search', {
          results_count: items.length,
          top_score: items[0]?.score || null,
          request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      } catch (trackError) {
        console.warn('Analytics tracking failed:', trackError);
      }

      if (items.length === 0) {
        toast({
          title: "No results found",
          description: "Try uploading a different image or adjusting your search.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Search completed",
          description: `Found ${items.length} similar products`,
        });
      }

    } catch (error) {
      console.error('[UI] search error', error);
      
      // Track search failure
      track('search_failed', { 
        reason: error instanceof Error ? error.message : 'unknown' 
      });
      
      toast({
        title: "Search service unavailable",
        description: "The search service is warming up—please try again in a few seconds.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);
      setShowCrop(true); // Show crop interface first
      
      // Track image upload
      const source = event.target.id === 'camera-input' ? 'camera' : 'file';
      track('image_uploaded', { source });
    }
  };

  const handleCropComplete = async (croppedArea: CropArea) => {
    if (!uploadedFile) return;
    
    setShowCrop(false);
    
    try {
      // Convert cropped area to a cropped file
      const croppedFile = await cropImage(uploadedFile, croppedArea);
      console.log('[SEARCH] Using cropped image for search:', {
        name: croppedFile.name,
        size: croppedFile.size,
        cropArea: croppedArea
      });
      handleImageSearch(croppedFile, true); // New search with cropped image
    } catch (error) {
      console.error('Failed to crop image:', error);
      toast({
        title: 'Crop failed',
        description: 'Failed to crop image. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSearchAll = () => {
    setShowCrop(false);
    // Search the entire image without cropping
    if (uploadedFile) {
      console.log('[SEARCH] Using full image for search');
      handleImageSearch(uploadedFile, true);
    }
  };

  const handleCropCancel = () => {
    setShowCrop(false);
    setUploadedImage(null);
    setUploadedFile(null);
    // Reset file inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleProductClick = async (product: UISearchHit) => {
    // Track result clicked
    track('result_clicked', {
      productId: product.id,
      brand: product.brand,
      price: product.price,
    });

    await trackEvent('product_click', {
      product_id: product.id,
      product_title: product.title,
      product_price: product.price,
      similarity_score: product.score
    });

    // Navigate to product URL if available
    if (product.url) {
      // Track affiliate click
      track('affiliate_click', {
        productId: product.id,
        merchant: product.brand || 'unknown',
        url: product.url,
      });
      
      window.open(product.url, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: "Product URL not available",
        description: product.title,
        variant: "destructive"
      });
    }
  };

  return (
    <div className={`min-h-screen relative overflow-hidden ${searchCompleted && products.length > 1 ? 'bg-black' : 'bg-background'}`}>
      {/* Diagonal split background - Only show when NOT using ResultsPage */}
      {!(searchCompleted && products.length > 1) && (
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        </div>
      )}

      {/* Compact corner header - Hide when ResultsPage is showing */}
      {!(searchCompleted && products.length > 1) && (
        <>
          <header className="fixed top-0 left-0 z-50 p-4">
            <div className="flex items-center gap-3 bg-background/95 backdrop-blur-sm px-4 py-2 border border-border/30">
              <Image src="/icons/lens.svg" alt="" width={16} height={16} className="h-4 w-auto" />
              <div className="h-3 w-px bg-border" />
              <button
                onClick={() => router.push('/')}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Image src="/logo.svg" alt="Swagai" width={64} height={16} className="h-4 w-auto" />
              </button>
            </div>
          </header>

          {/* User Menu */}
          <UserMenu />
        </>
      )}

      {/* Main Content */}
      <div className="relative z-10">
        {/* Crop Interface */}
        {showCrop && uploadedImage && (
          <CropOverlay
            imageSrc={uploadedImage}
            onCrop={handleCropComplete}
            onSearchAll={handleSearchAll}
            onCancel={handleCropCancel}
          />
        )}

        {!showCrop && !isLoading && (
          <>
            {/* New HomePage UI */}
            {!searchCompleted && !isLoading && (
              <>
                <HomePage 
                  onCapture={handleCapture}
                  onUpload={handleUpload}
                />
                
                <input
                  id="file-input"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  aria-label="Upload image file"
                />
                
                <input
                  id="camera-input"
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                  aria-label="Capture photo"
                />
              </>
            )}

            {/* Loading State with Lens Blink Animation */}
            {isLoading && (
              <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden bg-black">
                {/* Background gradient matching home page */}
                <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
                </div>
                <div className="relative z-10 flex flex-col items-center gap-10">
                  <div className="relative">
                    <Image 
                      src="/icons/lens.svg" 
                      alt="" 
                      width={96}
                      height={96}
                      className="w-24 h-24 lens-blink"
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xs tracking-[0.3em] uppercase font-medium text-white">Processing Image</p>
                    <div className="flex gap-1 justify-center">
                      <div className="w-1 h-1 bg-white animate-pulse" style={{ animationDelay: '0s' }} />
                      <div className="w-1 h-1 bg-white animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <div className="w-1 h-1 bg-white animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results with conditional display */}
            {searchCompleted && !isLoading && (
              <div className="min-h-screen flex flex-col">
                {products.length === 0 ? (
                  // Empty state: 0 results
                  <div className="min-h-screen flex flex-col items-center justify-center space-y-6 px-6 relative overflow-hidden">
                    {/* Background gradient matching home page */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black">
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
                    </div>
                    <div className="relative z-10 flex flex-col items-center space-y-6">
                      <div className="w-16 h-16 border-2 border-zinc-700 flex items-center justify-center rounded-full">
                        <AlertCircle className="w-7 h-7 text-zinc-400" />
                      </div>
                      <div className="text-center space-y-4">
                        {activeBrandFilter ? (
                          // Brand filter active - show brand-specific message
                          <>
                            <h3 className="text-xl font-black tracking-tighter text-white">No Similar Items Found</h3>
                            <p className="text-zinc-400 text-sm max-w-md">
                              No similar items found from {activeBrandFilter}.
                            </p>
                            <div className="flex items-center justify-center gap-3">
                              <Button
                                onClick={() => {
                                  console.log('[ImageSearch] Clear brand filter clicked', {
                                    originalProductsCount: originalProducts.length,
                                  });
                                  setActiveBrandFilter(null);
                                  // Restore original unfiltered results (for "Clear all filters")
                                  if (originalProducts.length > 0) {
                                    console.log('[ImageSearch] Restoring original products after clearing brand filter');
                                    setProducts([...originalProducts]);
                                    setMatchStatus('strong');
                                  } else {
                                    // Fallback: re-run search without brand filter
                                    console.log('[ImageSearch] No original products, re-running search after clearing brand filter');
                                    if (lastEmbedding && lastModel && uploadedFile) {
                                      handleImageSearch(uploadedFile, false);
                                    }
                                  }
                                }}
                                className="h-12 px-6 bg-transparent border border-white hover:bg-white hover:text-black text-white font-bold transition-all rounded-full flex items-center gap-2"
                              >
                                Clear brand filter
                              </Button>
                              <Button
                                onClick={() => {
                                  console.log('[ImageSearch] Back to all results clicked', {
                                    previousProductsCount: previousSuccessfulProducts.length,
                                    currentProductsCount: products.length,
                                    hasEmbedding: !!lastEmbedding,
                                    hasFile: !!uploadedFile,
                                  });
                                  setActiveBrandFilter(null);
                                  // Restore previous successful results
                                  if (previousSuccessfulProducts.length > 0) {
                                    console.log('[ImageSearch] Restoring previous successful products:', previousSuccessfulProducts.length);
                                    setProducts([...previousSuccessfulProducts]);
                                    setMatchStatus('strong');
                                  } else {
                                    // Fallback: re-run search without brand filter
                                    console.log('[ImageSearch] No previous products, re-running search');
                                    if (lastEmbedding && lastModel && uploadedFile) {
                                      handleImageSearch(uploadedFile, false);
                                    }
                                  }
                                }}
                                className="h-12 px-6 bg-transparent border border-white hover:bg-white hover:text-black text-white font-bold transition-all rounded-full flex items-center gap-2"
                              >
                                <ArrowLeft className="w-4 h-4" />
                                Back to all results
                              </Button>
                            </div>
                          </>
                        ) : (
                          // No brand filter - show general message with "Can't find item?" button
                          <>
                            <h3 className="text-xl font-black tracking-tighter text-white">No Good Visual Matches Found</h3>
                            <p className="text-zinc-400 text-sm max-w-md">
                              We couldn't find any similar items based on your image.
                            </p>
                            <div className="flex items-center justify-center gap-3 flex-wrap">
                              <Button
                                onClick={() => setShowCantFindModal(true)}
                                className="h-12 px-6 bg-transparent border border-white hover:bg-white hover:text-black text-white font-bold transition-all rounded-full"
                              >
                                Can't find the item?
                              </Button>
                              <Button
                                onClick={() => {
                                  setSearchCompleted(false);
                                  setProducts([]);
                                  setUploadedImage(null);
                                }}
                                className="h-12 px-6 bg-transparent border border-white hover:bg-white hover:text-black text-white font-bold transition-all rounded-full flex items-center gap-2"
                              >
                                <ArrowLeft className="w-4 h-4" />
                                Try Different Image
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : products.length === 1 ? (
                  // Single result
                  <div className="flex-1 flex flex-col h-screen">
                    <div className="px-6 md:px-16 lg:px-24 pt-24 pb-6 border-b border-border/50">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <h2 className="text-2xl font-bold tracking-tight mb-1">Results</h2>
                          <p className="text-xs opacity-60">We only found 1 similar item from our catalog.</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => setRefineOpen(true)}
                            className="px-4 py-2 border text-xs tracking-wide uppercase hover:bg-foreground hover:text-background transition-colors"
                          >
                            Refine search
                          </button>
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
                    </div>
                    
                    {/* Single product display */}
                    <div className="flex-1 relative overflow-visible bg-gradient-to-br from-background to-muted/20 py-8 flex items-center justify-center">
                      <ProductCarousel3D 
                        products={products.map(p => ({
                          ...p,
                          image: p.main_image_url
                        }))}
                        onProductClick={handleProductClick}
                      />
                    </div>
                    
                    {/* Show "Can't find item?" if match status is weak */}
                    {matchStatus === 'weak' && !activeBrandFilter && (
                      <div className="px-6 md:px-16 lg:px-24 pb-8 flex justify-center">
                        <Button
                          variant="outline"
                          onClick={() => setShowCantFindModal(true)}
                        >
                          Can't find the item?
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  // Multiple results - Use new ResultsPage component
                  <ResultsPage
                    onHome={() => {
                      setSearchCompleted(false);
                      setProducts([]);
                      setUploadedImage(null);
                      setUploadedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                      if (cameraInputRef.current) cameraInputRef.current.value = '';
                    }}
                    searchImage={uploadedImage || undefined}
                    products={products}
                    onRefine={async (filters) => {
                      if (!lastEmbedding || !lastModel) {
                        toast({
                          title: 'Refine failed',
                          description: 'No search query available. Please search again.',
                          variant: 'destructive',
                        });
                        return;
                      }
                      
                      try {
                        setIsLoading(true);
                        
                        // Save current results as previous successful results before attempting new filter
                        if (products.length > 0) {
                          setPreviousSuccessfulProducts([...products]);
                        }
                        
                        const searchResponse = await searchSimilarWithCategory(
                          lastEmbedding,
                          lastModel,
                          {
                            topK: 5,
                            priceMin: filters.minPrice,
                            priceMax: filters.maxPrice,
                            brand: filters.brand || undefined,
                          }
                        );
                        
                        const items: UISearchHit[] = searchResponse.results.map(r => ({
                          ...r,
                          title: r.title || 'Untitled',
                          category: r.category || 'other',
                          score: r.similarity ?? (r.cos_distance !== undefined ? 1.0 - r.cos_distance : 0.5),
                        }));
                        
                        console.log('[ImageSearch] Refine results:', {
                          filters,
                          resultCount: items.length,
                          brands: Array.from(new Set(items.map(i => i.brand))),
                          prices: items.map(i => i.price).filter(p => p != null),
                        });
                        
                        setProducts(items);
                        setMatchStatus(searchResponse.matchStatus);
                        if (filters.brand) {
                          setActiveBrandFilter(filters.brand);
                        } else {
                          setActiveBrandFilter(null);
                        }
                        setSearchCompleted(true);
                      } catch (error: any) {
                        console.error('[ImageSearch] Refine error:', error);
                        toast({
                          title: 'Refine failed',
                          description: error?.message || 'Failed to refine search. Please try again.',
                          variant: 'destructive',
                        });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Uploaded Image Preview - Show during loading and when NOT using ResultsPage (single result or empty) */}
      {uploadedImage && (isLoading || (searchCompleted && products.length <= 1)) && (
        <div className="fixed bottom-8 left-8 z-50 animate-in slide-in-from-left duration-700">
          <div className="group relative">
            <div className="absolute -inset-1 bg-foreground/10 blur-sm rounded-xl" />
            <div className="relative bg-background border-2 border-foreground p-1 rounded-xl overflow-hidden">
              <div className="w-28 h-28 overflow-hidden rounded-lg">
                <ImagePreview src={uploadedImage} alt="Search reference" />
              </div>
              <button
                onClick={() => setUploadedImage(null)}
                className="absolute top-0 right-0 w-6 h-6 bg-foreground text-background flex items-center justify-center hover:bg-foreground/80 transition-colors"
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

      {/* Refine Search Drawer */}
      <RefineSearch
        isOpen={refineOpen}
        onClose={() => setRefineOpen(false)}
        lastEmbedding={lastEmbedding}
        lastModel={lastModel}
        onBrandFilterChange={(brand) => {
          setActiveBrandFilter(brand);
          // If clearing brand filter, restore original unfiltered results
          if (!brand && originalProducts.length > 0) {
            setProducts(originalProducts);
            setMatchStatus('strong');
          }
        }}
        onResults={(hits) => {
          const items: UISearchHit[] = (hits || []).map(r => ({
            ...r,
            title: r.title || 'Untitled',
            category: r.category || 'other',
            score: r.similarity ?? (r.cos_distance !== undefined ? 1.0 - r.cos_distance : 0.5),
          }));
          // Save current products before updating (if we have results)
          if (products.length > 0) {
            setPreviousSuccessfulProducts([...products]);
          }
          setProducts(items as UISearchHit[]);
          setSearchCompleted(true);
        }}
      />

      {/* Can't Find Item Modal */}
      <CantFindItemModal
        isOpen={showCantFindModal}
        onClose={() => setShowCantFindModal(false)}
        onRefineCrop={() => {
          // Navigate back to crop mode
          if (uploadedFile) {
            setShowCrop(true);
            setSearchCompleted(false);
          }
        }}
        onClearFilters={() => {
          // Clear brand filter and restore original unfiltered results
          setActiveBrandFilter(null);
          if (originalProducts.length > 0) {
            setProducts(originalProducts);
            setMatchStatus('strong');
          } else if (lastEmbedding && lastModel && uploadedFile) {
            // Fallback: re-run search without filters
            handleImageSearch(uploadedFile, false);
          }
        }}
      />
    </div>
  );
}