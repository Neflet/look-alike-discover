import { useState } from 'react';
import { Product } from '@/types/fashion';
import { ProductCard } from './ProductCard';
import { RefineSearch, SearchFilters } from './RefineSearch';
import { Button } from '@/components/ui/button';
import { ArrowUp, Search, Sliders, User, Filter, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useNavigate } from 'react-router-dom';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface ResultsScreenProps {
  products: Product[];
  searchTime: number;
  onNewSearch: () => void;
  onRefineSearch?: (filters: SearchFilters, mode: 'filter' | 'requery') => void;
  hasOriginalImage?: boolean;
}

export function ResultsScreen({ 
  products, 
  searchTime, 
  onNewSearch, 
  onRefineSearch,
  hasOriginalImage = true 
}: ResultsScreenProps) {
  const [showRefineSearch, setShowRefineSearch] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>({
    priceRange: [0, 10000],
    colors: [],
    sizes: [],
    categories: [],
    brands: []
  });
  const [isRefining, setIsRefining] = useState(false);
  
  const { user } = useAuth();
  const { trackSearchRefine } = useAnalytics();
  const navigate = useNavigate();

  const handleRefineSearch = async (filters: SearchFilters, mode: 'filter' | 'requery') => {
    setCurrentFilters(filters);
    trackSearchRefine(filters);
    
    if (mode === 'filter') {
      // Filter existing results - no need to call backend
      setShowRefineSearch(false);
    } else if (mode === 'requery' && onRefineSearch) {
      // Re-query with original image + filters
      setIsRefining(true);
      try {
        await onRefineSearch(filters, mode);
      } finally {
        setIsRefining(false);
      }
    }
    
    setShowRefineSearch(false);
  };

  const filteredProducts = products.filter(product => {
    // Apply price filter
    if (product.price < currentFilters.priceRange[0] || product.price > currentFilters.priceRange[1]) {
      return false;
    }
    
    // Apply category filter
    if (currentFilters.categories.length > 0 && !currentFilters.categories.includes(product.category)) {
      return false;
    }
    
    // Apply brand filter
    if (currentFilters.brands.length > 0 && !currentFilters.brands.includes(product.brand)) {
      return false;
    }
    
    // Color and size filters would need to be implemented based on product data structure
    // For now, we'll assume they pass these filters
    
    return true;
  });

  const hasActiveFilters = currentFilters.colors.length > 0 || 
                          currentFilters.sizes.length > 0 || 
                          currentFilters.categories.length > 0 ||
                          currentFilters.brands.length > 0 ||
                          currentFilters.priceRange[0] > 0 || 
                          currentFilters.priceRange[1] < 10000;

  const clearFilters = () => {
    setCurrentFilters({
      priceRange: [0, 10000],
      colors: [],
      sizes: [],
      categories: [],
      brands: []
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">Similar Items</h2>
              <p className="text-sm text-muted-foreground">
                Found {filteredProducts.length} matches in {searchTime}ms
                {hasActiveFilters && (
                  <span className="ml-2 text-primary">
                    (filtered from {products.length} total)
                  </span>
                )}
              </p>
            </div>
            
            {/* User Profile Button */}
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                className="mr-2"
              >
                <User className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">
                  {user.email?.split('@')[0]}
                </span>
              </Button>
            )}
            
            <Button
              onClick={onNewSearch}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">New Search</span>
            </Button>
          </div>
          
          {/* Filter Controls */}
          <div className="flex gap-2 items-center">
            <Button
              onClick={() => setShowRefineSearch(true)}
              size="sm"
              variant="secondary"
              className="flex items-center gap-2 bg-secondary hover:bg-secondary/80"
              disabled={isRefining}
            >
              {isRefining ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sliders className="w-4 h-4" />
              )}
              {isRefining ? 'Refining...' : 'Refine Search'}
            </Button>
            
            {/* Active Filter Indicators */}
            {hasActiveFilters && (
              <div className="flex gap-1 flex-wrap items-center">
                <span className="text-xs text-muted-foreground mr-1">Filters:</span>
                {currentFilters.colors.map(color => (
                  <span key={color} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                    {color}
                  </span>
                ))}
                {currentFilters.categories.map(category => (
                  <span key={category} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded capitalize">
                    {category}
                  </span>
                ))}
                {currentFilters.brands.map(brand => (
                  <span key={brand} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                    {brand}
                  </span>
                ))}
                {(currentFilters.priceRange[0] > 0 || currentFilters.priceRange[1] < 10000) && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                    ${currentFilters.priceRange[0]}-${currentFilters.priceRange[1]}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Carousel */}
      <div className="p-4 pb-20">
        {filteredProducts.length > 0 ? (
          <div className="w-full">
            <Carousel
              opts={{
                align: "start",
                loop: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {filteredProducts.map((product, index) => (
                  <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                    <ProductCard 
                      product={product} 
                      index={index}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex -left-12" />
              <CarouselNext className="hidden md:flex -right-12" />
            </Carousel>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <Search className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {hasActiveFilters 
                ? "We couldn't find any items with your current filters. Try adjusting your search criteria or clear filters to see all results."
                : "We couldn't find any similar items. Try a different image or adjust your search criteria."
              }
            </p>
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowRefineSearch(true)}
                variant="outline"
              >
                <Sliders className="w-4 h-4 mr-2" />
                {hasActiveFilters ? 'Adjust Filters' : 'Refine Search'}
              </Button>
              {hasActiveFilters && (
                <Button 
                  onClick={clearFilters}
                  variant="outline"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
              <Button 
                onClick={onNewSearch} 
                className="bg-primary hover:bg-primary/90"
              >
                Try Another Search
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        {/* Refine Search FAB */}
        <Button
          onClick={() => setShowRefineSearch(true)}
          size="lg"
          variant="secondary"
          className="w-14 h-14 rounded-full shadow-strong bg-secondary hover:bg-secondary/90"
          disabled={isRefining}
        >
          {isRefining ? (
            <RefreshCw className="w-6 h-6 animate-spin" />
          ) : (
            <Sliders className="w-6 h-6" />
          )}
        </Button>
        
        {/* New Search FAB */}
        <Button
          onClick={onNewSearch}
          size="lg"
          className="w-14 h-14 rounded-full shadow-strong"
          style={{ background: 'var(--fashion-gradient)' }}
        >
          <ArrowUp className="w-6 h-6 text-white" />
        </Button>
      </div>

      {/* Refine Search Modal */}
      {showRefineSearch && (
        <RefineSearch
          onRefineSearch={handleRefineSearch}
          onClose={() => setShowRefineSearch(false)}
          currentFilters={currentFilters}
          hasOriginalImage={hasOriginalImage}
        />
      )}
    </div>
  );
}