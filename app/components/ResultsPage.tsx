"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart, ExternalLink, X, Home, User, LogOut } from 'lucide-react';
import { RefineSearchModal } from './RefineSearchModal';
import { SignInModal } from './SignInModal';
import { ClosetView } from './ClosetView';
import type { SearchHit } from '../../lib/search-image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ResultsPageProps {
  onHome: () => void;
  searchImage?: string;
  products: SearchHit[];
  onRefine: (filters: any) => void;
}

export function ResultsPage({ onHome, searchImage, products, onRefine }: ResultsPageProps) {
  const router = useRouter();
  const { user, signOut, loading } = useAuth();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());
  const [showSearchImage, setShowSearchImage] = useState(true);
  const [direction, setDirection] = useState(0);
  const [showCloset, setShowCloset] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const totalResults = products.length;

  // Load saved status for products when user is available
  useEffect(() => {
    const checkSavedItems = async () => {
      if (!user || products.length === 0) return;
      
      const savedSet = new Set<string>();
      for (const product of products) {
        try {
          const { data, error } = await (supabase.rpc as any)('is_product_saved', {
            p_user_id: user.id,
            p_product_id: product.id,
          }) as { data: boolean | null; error: any };
          
          if (!error && data === true) {
            savedSet.add(product.id);
          }
        } catch (e) {
          // Ignore errors for individual checks
        }
      }
      setSavedItems(savedSet);
    };
    
    checkSavedItems();
  }, [user, products]);

  if (totalResults === 0) {
    return null;
  }

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prevIndex) => {
      const newIndex = prevIndex + newDirection;
      if (newIndex < 0) return totalResults - 1;
      if (newIndex >= totalResults) return 0;
      return newIndex;
    });
  };

  const handlePrevious = () => {
    paginate(-1);
  };

  const handleNext = () => {
    paginate(1);
  };

  const toggleSave = async (productId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save items to your closet",
        variant: "destructive"
      });
      setIsSignInModalOpen(true);
      return;
    }

    // Prevent double-clicks
    if (savingItems.has(productId)) return;
    
    setSavingItems(prev => new Set(prev).add(productId));
    
    try {
      const { data, error } = await (supabase.rpc as any)('toggle_closet_item', {
        p_user_id: user.id,
        p_product_id: productId,
      }) as { data: { action: string; is_saved: boolean } | null; error: any };

      if (error) {
        console.error('[ResultsPage] Failed to toggle save:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to save item",
          variant: "destructive"
        });
      } else {
        // Update local state
        setSavedItems(prev => {
          const newSet = new Set(prev);
          if (data?.is_saved) {
            newSet.add(productId);
          } else {
            newSet.delete(productId);
          }
          return newSet;
        });
        
        toast({
          title: data?.action === 'added' ? "Saved to closet" : "Removed from closet",
          description: data?.action === 'added' 
            ? "Item added to your closet" 
            : "Item removed from your closet",
        });
      }
    } catch (error) {
      console.error('[ResultsPage] Error toggling save:', error);
      toast({
        title: "Error",
        description: "An error occurred",
        variant: "destructive"
      });
    } finally {
      setSavingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const handleProductClick = (product: SearchHit) => {
    if (product.url) {
      window.open(product.url, '_blank', 'noopener,noreferrer');
      } else {
      router.push(`/product/${product.id}?return=results`);
    }
  };

  // Get 3 visible products (previous, current, next) with position index
  const getVisibleProducts = () => {
    const visible = [];
    for (let i = -1; i <= 1; i++) {
      let index = currentIndex + i;
      if (index < 0) index = totalResults + index;
      if (index >= totalResults) index = index - totalResults;
      visible.push({ ...products[index], position: i });
    }
    return visible;
  };

  const visibleProducts = getVisibleProducts();

    return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background gradient matching home page */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-sm border-b border-zinc-900 relative">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white mb-1">Results</h1>
            <p className="text-zinc-500 text-sm">{totalResults} similar items found</p>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
            <button
              onClick={onHome}
              className="w-12 h-12 flex items-center justify-center text-white hover:text-zinc-400 transition-colors"
              aria-label="Home"
            >
              <Home className="w-6 h-6" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="h-12 px-6 bg-zinc-800 text-zinc-500 font-bold rounded-full flex items-center">
                Loading...
              </div>
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="h-12 px-6 bg-zinc-200 hover:bg-white text-black font-bold transition-colors rounded-full flex items-center gap-2"
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm truncate max-w-[150px]">
                    {user.email?.split('@')[0] || 'User'}
                  </span>
                </button>
                
                {menuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg z-50 min-w-[200px]">
                      <div className="p-1">
                        <button
                          onClick={() => {
                            setShowCloset(true);
                            setMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <Heart className="w-4 h-4" />
                          My Closet
                        </button>
                        <button
                          onClick={() => {
                            signOut();
                            setMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsSignInModalOpen(true)}
                className="h-12 px-6 bg-zinc-200 hover:bg-white text-black font-bold transition-colors rounded-full"
              >
                SIGN IN
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Carousel Area */}
      <div className="relative min-h-[calc(100vh-140px)] flex items-center justify-center py-12 relative z-10">
        {/* Navigation Arrows */}
        <button
          onClick={handlePrevious}
          className="absolute left-12 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 border-white hover:bg-white hover:text-black text-white transition-all flex items-center justify-center z-30"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        
        <button
          onClick={handleNext}
          className="absolute right-12 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 border-white hover:bg-white hover:text-black text-white transition-all flex items-center justify-center z-30"
        >
          <ChevronRight className="w-8 h-8" />
        </button>

        {/* Cards Container */}
        <div 
          className="relative w-full max-w-7xl mx-auto px-6 flex items-center justify-center"
          style={{ perspective: "2000px", minHeight: "600px" }}
        >
          <div className="relative w-full flex items-center justify-center overflow-visible">
            <AnimatePresence initial={false} custom={direction}>
              {visibleProducts.map((product) => {
                const position = product.position;
                const isCenter = position === 0;
                const imageUrl = product.main_image_url || '/placeholder.svg';
                const price = product.price !== undefined 
                  ? `$${product.price.toFixed(2)}` 
                  : 'Price N/A';
                const brand = product.brand || product.category || 'OTHER';

            return (
                  <motion.div
                    key={`${product.id}-${position}-${currentIndex}`}
                    className="absolute"
                    initial={{
                      rotateY: direction > 0 ? 60 : -60,
                      x: direction > 0 ? 300 : -300,
                      z: -400,
                      opacity: 0,
                    }}
                    animate={{
                      rotateY: position * 45,
                      x: position * 250,
                      z: isCenter ? 0 : -300,
                      opacity: isCenter ? 1 : 0.4,
                      scale: isCenter ? 1 : 0.75,
                    }}
                    exit={{
                      rotateY: direction > 0 ? -60 : 60,
                      x: direction > 0 ? -300 : 300,
                      z: -400,
                      opacity: 0,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                style={{
                      transformStyle: "preserve-3d",
                      zIndex: isCenter ? 20 : 10,
                    }}
                  >
                    <div className={`${isCenter ? 'w-80' : 'w-64'}`}>
                      <div className="bg-zinc-900 border border-zinc-800 overflow-hidden rounded-xl">
                  {/* Product Image */}
                  <div className="relative aspect-[3/4] bg-zinc-800 overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Save Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSave(product.id);
                      }}
                      disabled={savingItems.has(product.id)}
                      className={`absolute top-4 right-4 w-12 h-12 bg-black hover:bg-zinc-900 rounded-full transition-colors flex items-center justify-center z-10 ${
                        savingItems.has(product.id) ? 'opacity-50' : ''
                      }`}
                    >
                      <Heart
                        className={`w-6 h-6 transition-all ${
                          savedItems.has(product.id)
                            ? 'fill-white text-white'
                            : 'text-white'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-6">
                    <div className="text-zinc-500 text-xs mb-2 tracking-wider uppercase">
                      {brand}
                    </div>
                    <h3 className="text-white font-medium mb-4 min-h-[3rem] text-sm leading-relaxed">
                      {product.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-2xl font-bold">
                        {price}
                      </span>
                      <button 
                        onClick={() => handleProductClick(product)}
                        className="h-10 px-6 bg-zinc-200 hover:bg-white text-black font-bold transition-colors flex items-center gap-2 rounded"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View
                      </button>
                    </div>
                  </div>
                        </div>
                    </div>
                  </motion.div>
            );
          })}
            </AnimatePresence>
          </div>
      </div>

        {/* Your Image Preview - Bottom Left (Clickable) */}
        {showSearchImage && searchImage && (
          <div className="fixed bottom-8 left-8 z-30">
            <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-xl w-48 overflow-hidden">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSearchImage(false);
                  }}
                  className="absolute top-0 right-0 w-6 h-6 bg-white hover:bg-zinc-200 flex items-center justify-center transition-colors z-10"
                >
                  <X className="w-4 h-4 text-black" />
                </button>
                <button 
                  onClick={() => {
                    // Open image in modal
                    const img = document.createElement('img');
                    img.src = searchImage;
                    img.style.maxWidth = '90vw';
                    img.style.maxHeight = '90vh';
                    img.style.objectFit = 'contain';
                    
                    const modal = document.createElement('div');
                    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer';
                    modal.onclick = () => modal.remove();
                    modal.appendChild(img);
                    document.body.appendChild(modal);
                  }}
                  className="w-full"
                >
                  <img
                    src={searchImage}
                    alt="Your search"
                    className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </button>
                <p className="text-zinc-500 text-xs mt-2 text-center uppercase tracking-wide">
                  Your Image
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Refine Search Button - Bottom Right (Only one) */}
        <button
          onClick={() => setIsRefineModalOpen(true)}
          className="fixed bottom-8 right-8 h-14 px-8 bg-white hover:bg-zinc-200 text-black font-bold transition-colors rounded-full z-30"
        >
          Refine search
        </button>
        
        {/* Pagination Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30">
          {products.map((_, i) => {
            const isActive = i === currentIndex;
            return (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-2 transition-all rounded-full ${
                  isActive ? 'w-8 bg-white' : 'w-2 bg-zinc-600 hover:bg-zinc-500'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Refine Search Modal */}
      <RefineSearchModal
        isOpen={isRefineModalOpen}
        onClose={() => setIsRefineModalOpen(false)}
        onApply={(filters) => {
          onRefine(filters);
          setIsRefineModalOpen(false);
        }}
      />

      {/* Sign In Modal */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
      />

      {/* Closet View */}
      {showCloset && (
        <div className="fixed inset-0 z-50">
          <ClosetView onHome={() => setShowCloset(false)} onClose={() => setShowCloset(false)} />
        </div>
      )}
    </div>
  );
}
