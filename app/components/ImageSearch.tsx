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

// Extended SearchHit for UI (includes score for backward compatibility)
type UISearchHit = SearchHit & {
  score: number; // For backward compatibility with existing UI code
};

export function ImageSearch() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<UISearchHit[]>([]);
  const [originalProducts, setOriginalProducts] = useState<UISearchHit[]>([]); // Store original unfiltered results from first search
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
    
    // If this is a completely new search (not a refine), reset filters
    if (isNewSearch) {
      setActiveBrandFilter(null);
      setOriginalProducts([]); // Clear previous original results
    }
    
    // Create preview URL for the uploaded image
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    
    try {
      console.log('Starting image search…', { isNewSearch, hasOriginalResults: originalProducts.length > 0, activeBrandFilter });

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
      // Store original results ONLY if:
      // 1. This is a new search (isNewSearch = true), AND
      // 2. We don't already have original results (meaning this is truly the first search), AND
      // 3. No brand filter is active (ensures it's truly unfiltered)
      // This ensures originalProducts represents the unfiltered results from the very first search
      if (isNewSearch && originalProducts.length === 0 && !activeBrandFilter) {
        console.log('[ImageSearch] Storing original results:', items.length, 'items');
        setOriginalProducts([...items]); // Create a deep copy
      } else {
        console.log('[ImageSearch] NOT storing as original:', {
          isNewSearch,
          hasOriginal: originalProducts.length > 0,
          hasBrandFilter: !!activeBrandFilter,
        });
      }
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Diagonal split background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
      </div>

      {/* Compact corner header */}
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
            {/* Refine bar */}
            {searchCompleted && products.length > 0 && (
              <div className="fixed bottom-6 right-6 z-40">
                <button
                  onClick={() => setRefineOpen(true)}
                  className="px-4 py-2 border bg-background hover:bg-foreground hover:text-background transition-colors"
                >
                  Refine search
                </button>
              </div>
            )}

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
              <div className="min-h-screen flex items-center justify-center px-6">
                <div className="flex flex-col items-center gap-10">
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

            {/* Results with conditional display */}
            {searchCompleted && !isLoading && (
              <div className="min-h-screen flex flex-col">
                {products.length === 0 ? (
                  // Empty state: 0 results
                  <div className="flex-1 flex flex-col items-center justify-center space-y-6 px-6">
                    <div className="w-16 h-16 border-2 border-border flex items-center justify-center">
                      <AlertCircle className="w-7 h-7" />
                    </div>
                    <div className="text-center space-y-3">
                      {activeBrandFilter ? (
                        // Brand filter active - show brand-specific message
                        <>
                          <h3 className="text-base tracking-wide uppercase font-medium">No Similar Items Found</h3>
                          <p className="text-sm opacity-60 max-w-md">
                            No similar items found from {activeBrandFilter}.
                          </p>
                          <div className="flex items-center justify-center gap-3">
                            <Button
                              onClick={() => {
                                console.log('[ImageSearch] Clear brand filter clicked', {
                                  originalProductsCount: originalProducts.length,
                                });
                                setActiveBrandFilter(null);
                                // Restore original results (from before brand filter was applied)
                                if (originalProducts.length > 0) {
                                  console.log('[ImageSearch] Restoring original products after clearing brand filter');
                                  setProducts([...originalProducts]); // Create a new array to trigger re-render
                                  setMatchStatus(originalProducts.length > 0 ? 'strong' : 'none');
                                } else {
                                  // Fallback: re-run search without brand filter
                                  console.log('[ImageSearch] No original products, re-running search after clearing brand filter');
                                  if (lastEmbedding && lastModel && uploadedFile) {
                                    handleImageSearch(uploadedFile, false);
                                  }
                                }
                              }}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              Clear brand filter
                            </Button>
                            <Button
                              onClick={() => {
                                console.log('[ImageSearch] Back to all results clicked', {
                                  originalProductsCount: originalProducts.length,
                                  currentProductsCount: products.length,
                                  hasEmbedding: !!lastEmbedding,
                                  hasFile: !!uploadedFile,
                                });
                                setActiveBrandFilter(null);
                                // Restore original results (from before brand filter was applied)
                                if (originalProducts.length > 0) {
                                  console.log('[ImageSearch] Restoring original products:', originalProducts.length);
                                  setProducts([...originalProducts]); // Create new array reference to trigger re-render
                                  setMatchStatus(originalProducts.length > 0 ? 'strong' : 'none');
                                } else {
                                  // Fallback: re-run search without brand filter
                                  console.log('[ImageSearch] No original products, re-running search');
                                  if (lastEmbedding && lastModel && uploadedFile) {
                                    handleImageSearch(uploadedFile, false); // Re-run search without brand filter (not a new search)
                                  }
                                }
                              }}
                              variant="outline"
                              className="flex items-center gap-2"
                            >
                              <ArrowLeft className="w-4 h-4" />
                              Back to all results
                            </Button>
                          </div>
                        </>
                      ) : (
                        // No brand filter - show general message with "Can't find item?" button
                        <>
                          <h3 className="text-base tracking-wide uppercase font-medium">No Good Visual Matches Found</h3>
                          <p className="text-sm opacity-60 max-w-md">
                            We couldn't find any similar items based on your image.
                          </p>
                          <div className="flex items-center justify-center gap-3 flex-wrap">
                            <Button
                              variant="outline"
                              onClick={() => setShowCantFindModal(true)}
                            >
                              Can't find the item?
                            </Button>
                            <Button
                              onClick={() => {
                                setSearchCompleted(false);
                                setProducts([]);
                                setUploadedImage(null);
                              }}
                              variant="ghost"
                              className="flex items-center gap-2"
                            >
                              <ArrowLeft className="w-4 h-4" />
                              Try Different Image
                            </Button>
                          </div>
                        </>
                      )}
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
                  // Multiple results
                  <div className="flex-1 flex flex-col h-screen">
                    <div className="px-6 md:px-16 lg:px-24 pt-24 pb-6 border-b border-border/50">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <h2 className="text-2xl font-bold tracking-tight mb-1">Results</h2>
                          <p className="text-xs opacity-60">{products.length} similar items found</p>
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
                    
                    {/* 3D Product Carousel */}
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
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Uploaded Image Preview - More prominent */}
      {uploadedImage && (searchCompleted || isLoading) && (
        <div className="fixed bottom-8 left-8 z-50 animate-in slide-in-from-left duration-700">
          <div className="group relative">
            <div className="absolute -inset-1 bg-foreground/10 blur-sm" />
            <div className="relative bg-background border-2 border-foreground p-1">
              <div className="w-28 h-28 overflow-hidden">
                <ImagePreview src={uploadedImage} alt="Search reference" />
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

      {/* Refine Search Drawer */}
      <RefineSearch
        isOpen={refineOpen}
        onClose={() => setRefineOpen(false)}
        lastEmbedding={lastEmbedding}
        lastModel={lastModel}
        onBrandFilterChange={(brand) => {
          setActiveBrandFilter(brand);
          // If clearing brand filter, restore original results
          if (!brand && originalProducts.length > 0) {
            setProducts(originalProducts);
            setMatchStatus(originalProducts.length > 0 ? 'strong' : 'none');
          }
        }}
        onResults={(hits) => {
          const items: UISearchHit[] = (hits || []).map(r => ({
            ...r,
            title: r.title || 'Untitled',
            category: r.category || 'other',
            score: r.similarity ?? (r.cos_distance !== undefined ? 1.0 - r.cos_distance : 0.5),
          }));
          setProducts(items as UISearchHit[]);
          // NEVER update originalProducts from RefineSearch - it should only be set on initial search
          // originalProducts represents the unfiltered results from the first search
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
          // Clear brand filter and restore original results
          setActiveBrandFilter(null);
          if (originalProducts.length > 0) {
            setProducts(originalProducts);
            setMatchStatus(originalProducts.length > 0 ? 'strong' : 'none');
          } else if (lastEmbedding && lastModel && uploadedFile) {
            // Fallback: re-run search without filters
            handleImageSearch(uploadedFile, false);
          }
        }}
      />
    </div>
  );
}