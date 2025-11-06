-- Create RPC function to get analytics events (admin only)
-- This function checks if the user's email is in the admin list
CREATE OR REPLACE FUNCTION public.get_analytics_events(
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  session_id TEXT,
  event_type TEXT,
  event_data JSONB,
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
  v_is_admin BOOLEAN := false;
BEGIN
  -- Get the current user's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Check if user is admin (add your email here)
  v_is_admin := v_user_email IN (
    'ohiomokhaimusa@gmail.com'
    -- Add more admin emails here
  );

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied: Admin access required';
  END IF;

  -- Return analytics events
  RETURN QUERY
  SELECT 
    ae.id,
    ae.user_id,
    ae.session_id,
    ae.event_type,
    ae.event_data,
    ae.page_url,
    ae.user_agent,
    ae.created_at
  FROM public.analytics_events ae
  ORDER BY ae.created_at DESC
  LIMIT p_limit;
END;
$$;

