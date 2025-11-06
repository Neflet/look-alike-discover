import { supabase } from '@/integrations/supabase/client';

// Get or create session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  const stored = sessionStorage.getItem('sessionId');
  if (stored) return stored;
  
  const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem('sessionId', id);
  return id;
}

// Get current user ID
async function getUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

export async function trackEvent(eventType: string, eventData?: any): Promise<void> {
  try {
    const userId = await getUserId();
    const sessionId = getSessionId();

    const { error } = await supabase.rpc('track_analytics_event', {
      p_user_id: userId,
      p_session_id: sessionId,
      p_event_type: eventType,
      p_event_data: eventData || {},
      p_page_url: typeof window !== 'undefined' ? window.location.href : '',
      p_user_agent: typeof window !== 'undefined' ? navigator.userAgent : ''
    });

    if (error) {
      console.error('Analytics tracking error:', error);
    }
  } catch (error) {
    console.error('Track event error:', error);
  }
}