import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { X, Filter, Sliders, Search, Zap } from 'lucide-react';

interface RefineSearchProps {
  onRefineSearch: (filters: SearchFilters, mode: 'filter' | 'requery') => void;
  onClose: () => void;
  currentFilters?: SearchFilters;
  hasOriginalImage?: boolean;
}

export interface SearchFilters {
  priceRange: [number, number];
  colors: string[];
  sizes: string[];
  categories: string[];
  brands: string[];
}

const AVAILABLE_COLORS = [
  'Black', 'White', 'Gray', 'Silver', 'Red', 'Blue', 'Green', 
  'Yellow', 'Orange', 'Purple', 'Pink', 'Brown', 'Beige'
];

const AVAILABLE_SIZES = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', '6', '7', '8', '9', '10', '11', '12'
];

const AVAILABLE_CATEGORIES = [
  'tops', 'bottoms', 'shoes', 'accessories', 'outerwear', 'dresses'
];

const AVAILABLE_BRANDS = [
  'Carhartt', 'Stussy', 'Nike', 'Adidas', '032c', 'Rick Owens',
  'Paloma Wool', 'Uniqlo', 'New Balance', 'The Row', 'Wales Bonner'
];

export function RefineSearch({ onRefineSearch, onClose, currentFilters, hasOriginalImage = true }: RefineSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>(currentFilters || {
    priceRange: [0, 10000],
    colors: [],
    sizes: [],
    categories: [],
    brands: []
  });

  const toggleFilter = (type: keyof Omit<SearchFilters, 'priceRange'>, value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type].includes(value)
        ? prev[type].filter(item => item !== value)
        : [...prev[type], value]
    }));
  };

  const handleApplyFilters = (mode: 'filter' | 'requery') => {
    onRefineSearch(filters, mode);
    onClose();
  };

  const clearAllFilters = () => {
    setFilters({
      priceRange: [0, 10000],
      colors: [],
      sizes: [],
      categories: [],
      brands: []
    });
  };

  const hasActiveFilters = filters.colors.length > 0 || 
                          filters.sizes.length > 0 || 
                          filters.categories.length > 0 ||
                          filters.brands.length > 0 ||
                          filters.priceRange[0] > 0 || 
                          filters.priceRange[1] < 10000;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-strong bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Sliders className="w-5 h-5" />
            Refine Your Search
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Price Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Price Range</Label>
            <div className="px-3">
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value as [number, number] }))}
                max={10000}
                min={0}
                step={50}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>${filters.priceRange[0]}</span>
                <span>${filters.priceRange[1]}</span>
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Colors</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_COLORS.map(color => (
                <Badge
                  key={color}
                  variant={filters.colors.includes(color) ? "default" : "outline"}
                  className="cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => toggleFilter('colors', color)}
                >
                  {color}
                </Badge>
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Sizes</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SIZES.map(size => (
                <Badge
                  key={size}
                  variant={filters.sizes.includes(size) ? "default" : "outline"}
                  className="cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => toggleFilter('sizes', size)}
                >
                  {size}
                </Badge>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Categories</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_CATEGORIES.map(category => (
                <Badge
                  key={category}
                  variant={filters.categories.includes(category) ? "default" : "outline"}
                  className="cursor-pointer hover:scale-105 transition-transform capitalize"
                  onClick={() => toggleFilter('categories', category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          {/* Brands */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Brands</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_BRANDS.map(brand => (
                <Badge
                  key={brand}
                  variant={filters.brands.includes(brand) ? "default" : "outline"}
                  className="cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => toggleFilter('brands', brand)}
                >
                  {brand}
                </Badge>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={clearAllFilters}
              disabled={!hasActiveFilters}
              className="flex-1"
            >
              Clear All
            </Button>
            
            {/* Filter Existing Results */}
            <Button
              onClick={() => handleApplyFilters('filter')}
              variant="secondary"
              className="flex-1"
              disabled={!hasActiveFilters}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter Results
            </Button>
            
            {/* Re-query with Original Image */}
            {hasOriginalImage && (
              <Button
                onClick={() => handleApplyFilters('requery')}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Search className="w-4 h-4 mr-2" />
                New Search
              </Button>
            )}
          </div>

          {/* Info Text */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Filter className="w-3 h-3" />
              <span className="font-medium">Filter Results:</span> Narrow down existing results
            </div>
            <div className="flex items-center justify-center gap-2">
              <Search className="w-3 h-3" />
              <span className="font-medium">New Search:</span> Use original image + filters for fresh results
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}