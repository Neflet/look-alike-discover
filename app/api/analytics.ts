import { supabase } from '@/integrations/supabase/client';

export async function trackEvent(eventType: string, eventData?: any): Promise<void> {
  try {
    const sessionId = sessionStorage.getItem('sessionId') || 
      (() => {
        const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('sessionId', id);
        return id;
      })();

    const { error } = await supabase.rpc('track_analytics_event', {
      p_user_id: null, // For anonymous tracking
      p_session_id: sessionId,
      p_event_type: eventType,
      p_event_data: eventData || {},
      p_page_url: window.location.href,
      p_user_agent: navigator.userAgent
    });

    if (error) {
      console.error('Analytics tracking error:', error);
    }
  } catch (error) {
    console.error('Track event error:', error);
  }
}