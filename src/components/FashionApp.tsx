import { useState } from 'react';
import { AppState } from '@/types/fashion';
import { FashionApiService } from '@/services/FashionApiService';
import { UploadScreen } from './UploadScreen';
import { CropScreen } from './CropScreen';
import { LoadingScreen } from './LoadingScreen';
import { ResultsScreen } from './ResultsScreen';
import { RefineSearch, SearchFilters } from './RefineSearch';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Heart, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function FashionApp() {
  const [appState, setAppState] = useState<AppState>({
    currentView: 'upload',
    selectedImage: null,
    imagePreview: null,
    boundingBox: null,
    searchResults: [],
    isLoading: false,
    error: null
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleImageSelect = async (file: File) => {
    try {
      const imageUrl = await FashionApiService.uploadImage(file);
      setAppState(prev => ({
        ...prev,
        selectedImage: file,
        imagePreview: imageUrl,
        currentView: 'crop',
        error: null
      }));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCropComplete = async (boundingBox?: { x: number; y: number; width: number; height: number }) => {
    if (!appState.selectedImage) return;

    setAppState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await FashionApiService.searchSimilarProducts({
        imageFile: appState.selectedImage!,
        boundingBox
      });

      setAppState(prev => ({
        ...prev,
        boundingBox,
        searchResults: result.products,
        currentView: 'results',
        isLoading: false
      }));

      if (result.products.length === 0) {
        toast({
          title: "No Results",
          description: "No similar items found. Try a different image or adjust your crop.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      setAppState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to find similar items. Please try again.'
      }));
      
      toast({
        title: "Search Failed",
        description: "Unable to search for items. Using sample results.",
        variant: "destructive"
      });
    }
  };

  const handleSkipCrop = () => {
    handleCropComplete();
  };

  const handleEditImage = () => {
    setAppState(prev => ({
      ...prev,
      currentView: 'crop'
    }));
  };

  const handleNewSearch = () => {
    setAppState({
      currentView: 'upload',
      selectedImage: null,
      imagePreview: null,
      boundingBox: null,
      searchResults: [],
      isLoading: false,
      error: null
    });
  };

  const handleRefineSearch = async (filters: SearchFilters, mode: 'filter' | 'requery') => {
    if (mode === 'filter') {
      // Filter existing results - no need to call backend
      // The ResultsScreen will handle this locally
      return;
    }
    
    if (mode === 'requery' && !appState.selectedImage) return;

    setAppState(prev => ({ ...prev, isLoading: true }));

    try {
      const result = await FashionApiService.searchSimilarProducts({
        imageFile: appState.selectedImage!,
        boundingBox: appState.boundingBox || undefined,
        filters
      });

      setAppState(prev => ({
        ...prev,
        searchResults: result.products,
        isLoading: false
      }));
    } catch (error) {
      console.error('Refine search error:', error);
      setAppState(prev => ({
        ...prev,
        isLoading: false
      }));
      
      toast({
        title: "Search Failed",
        description: "Failed to refine search. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Render current view
  const AppContent = () => {
    if (appState.isLoading) {
      return <LoadingScreen />;
    }

    switch (appState.currentView) {
      case 'upload':
        return <UploadScreen onImageSelect={handleImageSelect} />;
      
      case 'crop':
        return (
          <CropScreen
            imageUrl={appState.imagePreview!}
            onCropComplete={handleCropComplete}
            onSkip={handleSkipCrop}
            onEditImage={handleEditImage}
          />
        );
      
      case 'results':
        return (
          <ResultsScreen
            products={appState.searchResults}
            searchTime={2000} // Mock search time
            onNewSearch={handleNewSearch}
            onRefineSearch={handleRefineSearch}
            hasOriginalImage={!!appState.selectedImage}
          />
        );
      
      default:
        return <UploadScreen onImageSelect={handleImageSelect} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with navigation */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              SwagAI
            </h1>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/closet')}
                className="flex items-center gap-2"
              >
                <Heart className="w-4 h-4" />
                My Closet
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Profile
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <AppContent />
    </div>
  );
}