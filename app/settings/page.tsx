'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { CreditCard, User, Bell, Trash2, Database, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      router.push('/auth/login');
      return;
    }

    setUser(user);

    // Get user data from database
    const { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    setUserData(dbUser);

    // Get usage stats
    const response = await fetch('/api/usage');
    if (response.ok) {
      const usageData = await response.json();
      setUsage(usageData);
    }

    setLoading(false);
  };

  const handleUpgrade = async (tier: string, seats = 1) => {
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier, seats }),
    });

    if (response.ok) {
      const { url } = await response.json();
      window.location.href = url;
    }
  };

  const handleManageBilling = async () => {
    const response = await fetch('/api/stripe/portal', {
      method: 'POST',
    });

    if (response.ok) {
      const { url } = await response.json();
      window.location.href = url;
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const tierColors: Record<string, string> = {
    free: 'bg-gray-600',
    standard: 'bg-blue-600',
    pro: 'bg-purple-600',
    team: 'bg-green-600',
    enterprise: 'bg-orange-600',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-6">
                <User className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <div className="mt-1 text-gray-900 dark:text-white">{user?.email}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">User ID</label>
                  <div className="mt-1 text-xs font-mono text-gray-600 dark:text-gray-400">{user?.id}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Member Since</label>
                  <div className="mt-1 text-gray-900 dark:text-white">
                    {userData && new Date(userData.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-6">
                <Database className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Usage</h2>
              </div>

              {usage && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tokens This Month</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {usage.tokensUsedThisMonth.toLocaleString()} / {usage.tokensLimit > 0 ? usage.tokensLimit.toLocaleString() : 'Unlimited'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{ width: `${Math.min(usage.percentageUsed, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Storage Used</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {(usage.storageUsed / 1024 / 1024).toFixed(2)} MB / {(usage.storageLimit / 1024 / 1024).toFixed(0)} MB
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(usage.storageUsed / usage.storageLimit) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3 mb-6">
                <Trash2 className="w-6 h-6 text-red-600" />
                <h2 className="text-xl font-semibold text-red-600">Danger Zone</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Delete Account</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Once you delete your account, there is no going back. All your data will be permanently deleted.
                  </p>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                    Delete Account
                  </button>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Section */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-6">
                <CreditCard className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Subscription</h2>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Current Plan</span>
                  <span className={`px-3 py-1 text-xs font-semibold text-white rounded ${tierColors[userData?.subscription_tier || 'free']}`}>
                    {(userData?.subscription_tier || 'free').toUpperCase()}
                  </span>
                </div>
              </div>

              {userData?.subscription_tier !== 'free' && userData?.stripe_customer_id && (
                <button
                  onClick={handleManageBilling}
                  className="w-full mb-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Manage Billing
                </button>
              )}

              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white">Available Plans</h3>

                {userData?.subscription_tier === 'free' && (
                  <>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="font-medium text-gray-900 dark:text-white">Standard</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white my-2">$15<span className="text-sm font-normal text-gray-600">/month</span></div>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                        <li>• 2M tokens/month</li>
                        <li>• 1 GB storage</li>
                        <li>• 10 projects</li>
                      </ul>
                      <button
                        onClick={() => handleUpgrade('standard')}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Upgrade
                      </button>
                    </div>

                    <div className="border-2 border-purple-500 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-900 dark:text-white">Pro</div>
                        <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded">Popular</span>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white my-2">$40<span className="text-sm font-normal text-gray-600">/month</span></div>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                        <li>• Unlimited tokens</li>
                        <li>• 5 GB storage</li>
                        <li>• Unlimited projects</li>
                        <li>• Image generation</li>
                      </ul>
                      <button
                        onClick={() => handleUpgrade('pro')}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                      >
                        Upgrade
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
