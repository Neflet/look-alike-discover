import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface AnalyticsEvent {
  event_type: string;
  event_data?: Record<string, any>;
  page_url?: string;
}

export function useAnalytics() {
  const { user } = useAuth();
  const sessionId = useRef<string>(generateSessionId());

  function generateSessionId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  const trackEvent = useCallback(async (eventType: string, eventData?: Record<string, any>) => {
    try {
      // Insert directly into analytics table using the RPC function
      const { error } = await supabase.rpc('track_analytics_event', {
        p_user_id: user?.id || null,
        p_session_id: sessionId.current,
        p_event_type: eventType,
        p_event_data: eventData || {},
        p_page_url: window.location.href,
        p_user_agent: navigator.userAgent,
      });

      if (error) {
        console.error('Analytics tracking error:', error);
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }, [user]);

  // Track page views
  useEffect(() => {
    trackEvent('page_view', {
      path: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackProductView: (product: any) => trackEvent('product_view', { product_id: product.id, product_name: product.name }),
    trackProductClick: (product: any) => trackEvent('product_click', { product_id: product.id, product_name: product.name }),
    trackSearchStart: (searchData: any) => trackEvent('search_start', searchData),
    trackSearchComplete: (searchData: any) => trackEvent('search_complete', searchData),
    trackSearchRefine: (filters: any) => trackEvent('search_refine', { filters }),
    trackProductLike: (product: any) => trackEvent('product_like', { product_id: product.id, product_name: product.name }),
    trackProductUnlike: (product: any) => trackEvent('product_unlike', { product_id: product.id, product_name: product.name }),
  };
}