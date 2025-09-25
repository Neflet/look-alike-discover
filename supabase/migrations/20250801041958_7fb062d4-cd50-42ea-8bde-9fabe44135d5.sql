-- Create RPC function for analytics tracking (bypasses RLS)
CREATE OR REPLACE FUNCTION public.track_analytics_event(
  p_user_id UUID,
  p_session_id TEXT,
  p_event_type TEXT,
  p_event_data JSONB,
  p_page_url TEXT,
  p_user_agent TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.analytics_events (
    user_id,
    session_id,
    event_type,
    event_data,
    page_url,
    user_agent,
    ip_address
  ) VALUES (
    p_user_id,
    p_session_id,
    p_event_type,
    p_event_data,
    p_page_url,
    p_user_agent,
    inet_client_addr()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;