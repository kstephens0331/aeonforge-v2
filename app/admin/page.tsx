'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, X, Eye } from 'lucide-react';

interface ContentFlag {
  id: string;
  user_id: string;
  message_id: string;
  flag_reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reviewed: boolean;
  created_at: string;
  users: {
    email: string;
  };
  messages?: {
    content: string;
  };
}

export default function AdminPage() {
  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlag, setSelectedFlag] = useState<ContentFlag | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Check if user is admin (you can add an is_admin column to users table)
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    // For now, check if email matches admin email from env
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (userData?.email !== adminEmail && adminEmail) {
      router.push('/chat');
      return;
    }

    setIsAdmin(true);
    loadFlags();
  };

  const loadFlags = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('content_flags')
      .select(`
        *,
        users (email),
        messages (content)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setFlags(data as any);
    }

    setLoading(false);
  };

  const reviewFlag = async (flagId: string, decision: 'approved' | 'rejected') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('content_flags')
      .update({
        reviewed: true,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', flagId);

    loadFlags();
    setSelectedFlag(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      case 'low': return 'bg-blue-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Unauthorized</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">You do not have access to this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Content Moderation</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="text-gray-500 dark:text-gray-400 text-sm">Total Flags</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
              {flags.length}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="text-gray-500 dark:text-gray-400 text-sm">Pending Review</div>
            <div className="text-3xl font-bold text-orange-600 mt-2">
              {flags.filter(f => !f.reviewed).length}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="text-gray-500 dark:text-gray-400 text-sm">Critical</div>
            <div className="text-3xl font-bold text-red-600 mt-2">
              {flags.filter(f => f.severity === 'critical' && !f.reviewed).length}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {flags.map((flag) => (
                  <tr key={flag.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(flag.severity)}`}>
                        {flag.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {flag.users?.email || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {flag.flag_reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(flag.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {flag.reviewed ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                          Reviewed
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedFlag(flag)}
                        className="text-primary-600 hover:text-primary-700 mr-3"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {!flag.reviewed && (
                        <>
                          <button
                            onClick={() => reviewFlag(flag.id, 'approved')}
                            className="text-green-600 hover:text-green-700 mr-3"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => reviewFlag(flag.id, 'rejected')}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedFlag && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Content Flag Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Severity</label>
                  <div className="mt-1">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(selectedFlag.severity)}`}>
                      {selectedFlag.severity.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">User</label>
                  <div className="mt-1 text-gray-900 dark:text-white">
                    {selectedFlag.users?.email || 'Unknown'}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reason</label>
                  <div className="mt-1 text-gray-900 dark:text-white">
                    {selectedFlag.flag_reason}
                  </div>
                </div>

                {selectedFlag.messages && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
                    <div className="mt-1 p-4 bg-gray-100 dark:bg-gray-900 rounded text-gray-900 dark:text-white whitespace-pre-wrap">
                      {selectedFlag.messages.content}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setSelectedFlag(null)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Close
                  </button>
                  {!selectedFlag.reviewed && (
                    <>
                      <button
                        onClick={() => {
                          reviewFlag(selectedFlag.id, 'approved');
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          reviewFlag(selectedFlag.id, 'rejected');
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
