"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type AnalyticsEvent = {
  id: string;
  user_id: string | null;
  session_id: string;
  event_type: string;
  event_data: any;
  page_url: string | null;
  user_agent: string | null;
  created_at: string;
};

type AnalyticsStats = {
  events_by_type: Array<{ event_type: string; count: number }>;
  unique_users: number;
  unique_sessions: number;
  total_events: number;
};

// List of authorized admin emails (you can add your email here)
const ADMIN_EMAILS = [
  'ohiomokhaimusa@gmail.com', // Add your email here
  // Add more admin emails as needed
];

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authorized
  useEffect(() => {
    if (!authLoading && user) {
      const userEmail = user.email?.toLowerCase();
      if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
        router.push('/');
        return;
      }
    } else if (!authLoading && !user) {
      router.push('/');
      return;
    }
  }, [user, authLoading, router]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch recent events via RPC function (bypasses RLS)
      const { data: eventsData, error: eventsError } = await (supabase.rpc as any)(
        'get_analytics_events',
        { p_limit: 100 }
      ) as { data: AnalyticsEvent[] | null; error: any };

      if (eventsError) throw eventsError;

      setEvents(eventsData || []);

      // Calculate stats
      const eventTypes: Record<string, number> = {};
      const uniqueUsers = new Set<string>();
      const uniqueSessions = new Set<string>();

      (eventsData || []).forEach((event) => {
        eventTypes[event.event_type] = (eventTypes[event.event_type] || 0) + 1;
        if (event.user_id) uniqueUsers.add(event.user_id);
        if (event.session_id) uniqueSessions.add(event.session_id);
      });

      setStats({
        events_by_type: Object.entries(eventTypes).map(([event_type, count]) => ({
          event_type,
          count,
        })),
        unique_users: uniqueUsers.size,
        unique_sessions: uniqueSessions.size,
        total_events: eventsData?.length || 0,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
      fetchAnalytics();
    }
  }, [user]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  // Check authorization
  if (!user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-sm opacity-60 mb-4">You don't have permission to view analytics.</p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Search
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          </div>
          <Button onClick={fetchAnalytics} disabled={loading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-muted/50 border rounded-lg p-4">
              <div className="text-sm opacity-60 mb-1">Total Events</div>
              <div className="text-2xl font-bold">{stats.total_events}</div>
            </div>
            <div className="bg-muted/50 border rounded-lg p-4">
              <div className="text-sm opacity-60 mb-1">Unique Users</div>
              <div className="text-2xl font-bold">{stats.unique_users}</div>
            </div>
            <div className="bg-muted/50 border rounded-lg p-4">
              <div className="text-sm opacity-60 mb-1">Unique Sessions</div>
              <div className="text-2xl font-bold">{stats.unique_sessions}</div>
            </div>
            <div className="bg-muted/50 border rounded-lg p-4">
              <div className="text-sm opacity-60 mb-1">Event Types</div>
              <div className="text-2xl font-bold">{stats.events_by_type.length}</div>
            </div>
          </div>
        )}

        {/* Events by Type */}
        {stats && stats.events_by_type.length > 0 && (
          <div className="bg-background border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Events by Type</h2>
            <div className="space-y-2">
              {stats.events_by_type.map((item) => (
                <div key={item.event_type} className="flex items-center justify-between py-2 border-b">
                  <span className="font-medium">{item.event_type}</span>
                  <span className="text-sm opacity-60">{item.count} events</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Events */}
        <div className="bg-background border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Events ({events.length})</h2>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-sm opacity-60">No events found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Time</th>
                    <th className="text-left py-2 px-2">Event Type</th>
                    <th className="text-left py-2 px-2">User</th>
                    <th className="text-left py-2 px-2">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b">
                      <td className="py-2 px-2 text-xs opacity-60">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 px-2">
                        <span className="font-medium">{event.event_type}</span>
                      </td>
                      <td className="py-2 px-2 text-xs opacity-60">
                        {event.user_id ? event.user_id.substring(0, 8) + '...' : 'Anonymous'}
                      </td>
                      <td className="py-2 px-2 text-xs opacity-60 max-w-xs truncate">
                        {JSON.stringify(event.event_data)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

