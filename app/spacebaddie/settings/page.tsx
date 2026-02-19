'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getCurrentUser } from '@/lib/supabase/client';
import DashboardShell from '../components/DashboardShell';

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface SocialConnection {
  platform: string;
  connected: boolean;
  username?: string;
}

interface NotificationPreferences {
  sms_enabled: boolean;
  sms_phone_number: string | null;
  notify_video_complete: boolean;
  notify_post_published: boolean;
  notify_weekly_summary: boolean;
  notify_tips_updates: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

const SETTINGS_SECTIONS = [
  {
    id: 'profile',
    title: 'Profile',
    description: 'Manage your account details and public profile',
    icon: '👤',
    color: '#FF6B9D',
  },
  {
    id: 'social',
    title: 'Connected Accounts',
    description: 'Connect your social platforms for automated posting',
    icon: '🔗',
    color: '#C77DFF',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Configure alerts and notification preferences',
    icon: '🔔',
    color: '#00D4D4',
  },
  {
    id: 'billing',
    title: 'Billing & Plan',
    description: 'View your plan, usage, and payment details',
    icon: '💳',
    color: '#22c55e',
  },
];

const SOCIAL_PLATFORMS = [
  { name: 'youtube', label: 'YouTube', icon: '📺', color: '#FF0000' },
  { name: 'tiktok', label: 'TikTok', icon: '🎵', color: '#FF0050' },
  { name: 'instagram', label: 'Instagram', icon: '📸', color: '#E1306C' },
  { name: 'twitter', label: 'Twitter/X', icon: '🐦', color: '#1DA1F2' },
  { name: 'facebook', label: 'Facebook', icon: '👥', color: '#1877F2' },
  { name: 'linkedin', label: 'LinkedIn', icon: '💼', color: '#0A66C2' },
];

export default function SpaceBaddieSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('profile');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [connections, setConnections] = useState<SocialConnection[]>(
    SOCIAL_PLATFORMS.map(p => ({ platform: p.name, connected: false }))
  );
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    sms_enabled: false,
    sms_phone_number: null,
    notify_video_complete: true,
    notify_post_published: true,
    notify_weekly_summary: true,
    notify_tips_updates: true,
    quiet_hours_start: null,
    quiet_hours_end: null,
  });
  const [phoneInput, setPhoneInput] = useState('');
  const [savingNotifs, setSavingNotifs] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await getCurrentUser();
      if (!userData) {
        router.push('/spacebaddie/login');
        return;
      }
      
      setUser({
        id: userData.id,
        email: userData.email || '',
        display_name: userData.profile?.display_name || null,
        avatar_url: null,
      });
      setDisplayName(userData.profile?.display_name || '');

      // Load social connections from spacebaddie_social_connections
      const { data: socialData } = await supabase
        .from('spacebaddie_social_connections')
        .select('platform, platform_username, status, connected, metadata')
        .eq('user_id', userData.id)
        .eq('tenant', 'spacebaddie');

      if (socialData) {
        setConnections(prev => prev.map(conn => {
          const found = socialData.find(s => s.platform === conn.platform);
          const isConnected = found && (found.status === 'connected' || found.connected === true || found.metadata?.access_token);
          const username = found?.platform_username || found?.metadata?.account_name;
          return found && isConnected ? { ...conn, connected: true, username: username || undefined } : conn;
        }));
      }

      // Load notification preferences
      try {
        const notifResponse = await fetch('/api/spacebaddie/notifications/preferences');
        if (notifResponse.ok) {
          const prefs = await notifResponse.json();
          setNotifPrefs(prefs);
          setPhoneInput(prefs.sms_phone_number || '');
        }
      } catch (e) {
        console.error('Failed to load notification prefs:', e);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSavingNotifs(true);
    setMessage(null);

    try {
      // Format phone number
      let formattedPhone = phoneInput.replace(/\D/g, '');
      if (formattedPhone && !formattedPhone.startsWith('1')) {
        formattedPhone = '1' + formattedPhone;
      }
      if (formattedPhone) {
        formattedPhone = '+' + formattedPhone;
      }

      const response = await fetch('/api/spacebaddie/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notifPrefs,
          sms_phone_number: notifPrefs.sms_enabled && formattedPhone ? formattedPhone : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      setMessage({ type: 'success', text: 'Notification preferences saved!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save preferences' });
    } finally {
      setSavingNotifs(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ display_name: displayName })
        .eq('id', user.id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleConnectPlatform = (platform: string) => {
    window.localStorage.setItem('social_connect_return', window.location.href);
    window.location.href = `/api/social/connect/${platform}`;
  };

  if (loading) {
    return (
      <DashboardShell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '2px solid rgba(255,107,157,0.3)',
            borderTopColor: '#FF6B9D',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', color: '#fff' }}>
            Settings
          </h1>
          <p style={{ color: '#888', fontSize: '16px' }}>
            Manage your account, connections, and preferences
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '32px' }}>
          {/* Sidebar Navigation */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '16px',
            height: 'fit-content',
          }}>
            {SETTINGS_SECTIONS.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  marginBottom: '4px',
                  background: activeSection === section.id 
                    ? 'linear-gradient(135deg, rgba(255,0,110,0.2) 0%, rgba(138,43,226,0.2) 100%)'
                    : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: activeSection === section.id ? '#fff' : '#888',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '20px' }}>{section.icon}</span>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{section.title}</span>
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '24px',
          }}>
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', color: '#fff' }}>
                  Profile Settings
                </h2>

                {message && (
                  <div style={{
                    padding: '12px 16px',
                    marginBottom: '16px',
                    borderRadius: '8px',
                    background: message.type === 'success' ? 'rgba(0,200,0,0.2)' : 'rgba(255,0,0,0.2)',
                    color: message.type === 'success' ? '#0f0' : '#f00',
                    fontSize: '14px',
                  }}>
                    {message.text}
                  </div>
                )}

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '14px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#666',
                      fontSize: '14px',
                    }}
                  />
                  <p style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                    Email cannot be changed
                  </p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '14px' }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}

            {/* Connected Accounts Section */}
            {activeSection === 'social' && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
                  Connected Accounts
                </h2>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
                  Connect your social media accounts to enable automated posting
                </p>

                <div style={{ display: 'grid', gap: '12px' }}>
                  {SOCIAL_PLATFORMS.map(platform => {
                    const connection = connections.find(c => c.platform === platform.name);
                    const isConnected = connection?.connected || false;

                    return (
                      <div
                        key={platform.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px',
                          background: isConnected ? 'rgba(0,200,0,0.1)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${isConnected ? 'rgba(0,200,0,0.3)' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '24px' }}>{platform.icon}</span>
                          <div>
                            <h4 style={{ margin: 0, color: '#fff', fontWeight: 500 }}>{platform.label}</h4>
                            {isConnected && connection?.username && (
                              <p style={{ margin: '4px 0 0', color: '#888', fontSize: '12px' }}>
                                @{connection.username}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleConnectPlatform(platform.name)}
                          style={{
                            padding: '8px 16px',
                            background: isConnected ? 'rgba(0,200,0,0.2)' : 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            fontWeight: 500,
                            cursor: 'pointer',
                            fontSize: '14px',
                          }}
                        >
                          {isConnected ? '✅ Connected' : '🔗 Connect'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
                  Notification Preferences
                </h2>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
                  Choose how and when you want to be notified
                </p>

                {message && activeSection === 'notifications' && (
                  <div style={{
                    padding: '12px 16px',
                    marginBottom: '16px',
                    borderRadius: '8px',
                    background: message.type === 'success' ? 'rgba(0,200,0,0.2)' : 'rgba(255,0,0,0.2)',
                    color: message.type === 'success' ? '#0f0' : '#f00',
                    fontSize: '14px',
                  }}>
                    {message.text}
                  </div>
                )}

                {/* SMS Opt-in Section */}
                <div style={{
                  padding: '20px',
                  marginBottom: '24px',
                  background: 'linear-gradient(135deg, rgba(0,212,212,0.1) 0%, rgba(138,43,226,0.1) 100%)',
                  border: '1px solid rgba(0,212,212,0.3)',
                  borderRadius: '16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '28px' }}>📱</span>
                    <div>
                      <h3 style={{ margin: 0, color: '#fff', fontWeight: 600 }}>SMS Notifications</h3>
                      <p style={{ margin: '4px 0 0', color: '#888', fontSize: '13px' }}>
                        Get instant text alerts when your videos are ready
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                      <input 
                        type="checkbox" 
                        checked={notifPrefs.sms_enabled}
                        onChange={(e) => setNotifPrefs(prev => ({ ...prev, sms_enabled: e.target.checked }))}
                        style={{ opacity: 0, width: 0, height: 0 }} 
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: notifPrefs.sms_enabled ? 'linear-gradient(135deg, #00D4D4 0%, #8A2BE2 100%)' : 'rgba(255,255,255,0.1)',
                        borderRadius: '24px',
                        transition: '0.2s',
                      }}>
                        <span style={{
                          position: 'absolute',
                          height: '18px',
                          width: '18px',
                          left: notifPrefs.sms_enabled ? '27px' : '3px',
                          bottom: '3px',
                          background: '#fff',
                          borderRadius: '50%',
                          transition: '0.2s',
                        }} />
                      </span>
                    </label>
                    <span style={{ color: '#fff', fontSize: '14px' }}>
                      {notifPrefs.sms_enabled ? 'SMS alerts enabled' : 'Enable SMS alerts'}
                    </span>
                  </div>

                  {notifPrefs.sms_enabled && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '14px' }}>
                        Phone Number (US)
                      </label>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="(678) 787-3388"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '16px',
                        }}
                      />
                      <p style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
                        Standard message rates may apply. Reply STOP to unsubscribe.
                      </p>
                    </div>
                  )}
                </div>

                {/* Notification Types */}
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#fff' }}>
                  Notification Types
                </h3>
                <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
                  {[
                    { key: 'notify_video_complete', label: 'Video Generation Complete', description: 'Get notified when your video is ready' },
                    { key: 'notify_post_published', label: 'Post Published', description: 'Get notified when posts are published' },
                    { key: 'notify_weekly_summary', label: 'Weekly Summary', description: 'Receive a weekly performance summary' },
                    { key: 'notify_tips_updates', label: 'Tips & Updates', description: 'Receive tips and product updates' },
                  ].map(item => (
                    <div
                      key={item.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                      }}
                    >
                      <div>
                        <h4 style={{ margin: 0, color: '#fff', fontWeight: 500 }}>{item.label}</h4>
                        <p style={{ margin: '4px 0 0', color: '#888', fontSize: '12px' }}>{item.description}</p>
                      </div>
                      <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                        <input 
                          type="checkbox" 
                          checked={notifPrefs[item.key as keyof NotificationPreferences] as boolean}
                          onChange={(e) => setNotifPrefs(prev => ({ ...prev, [item.key]: e.target.checked }))}
                          style={{ opacity: 0, width: 0, height: 0 }} 
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0, left: 0, right: 0, bottom: 0,
                          background: notifPrefs[item.key as keyof NotificationPreferences] ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)' : 'rgba(255,255,255,0.1)',
                          borderRadius: '24px',
                          transition: '0.2s',
                        }}>
                          <span style={{
                            position: 'absolute',
                            height: '18px',
                            width: '18px',
                            left: notifPrefs[item.key as keyof NotificationPreferences] ? '27px' : '3px',
                            bottom: '3px',
                            background: '#fff',
                            borderRadius: '50%',
                            transition: '0.2s',
                          }} />
                        </span>
                      </label>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSaveNotifications}
                  disabled={savingNotifs}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: savingNotifs ? 'not-allowed' : 'pointer',
                    opacity: savingNotifs ? 0.7 : 1,
                  }}
                >
                  {savingNotifs ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            )}

            {/* Billing Section */}
            {activeSection === 'billing' && (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
                  Billing & Plan
                </h2>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
                  Manage your subscription and view usage
                </p>

                {/* Current Plan */}
                <div style={{
                  padding: '24px',
                  background: 'linear-gradient(135deg, rgba(138,43,226,0.2) 0%, rgba(0,200,200,0.2) 100%)',
                  border: '1px solid rgba(138,43,226,0.3)',
                  borderRadius: '16px',
                  marginBottom: '24px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '24px' }}>✨</span>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '20px', fontWeight: 600 }}>Pro Plan</h3>
                        <span style={{
                          padding: '4px 12px',
                          background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}>
                          Active
                        </span>
                      </div>
                      <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
                        Promotional period until Aug 6, 2026 - All Pro features unlocked!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Usage Stats */}
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#fff' }}>
                  This Month's Usage
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div style={{
                    padding: '16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                  }}>
                    <p style={{ margin: 0, color: '#888', fontSize: '12px' }}>Videos Generated</p>
                    <p style={{ margin: '4px 0 0', color: '#fff', fontSize: '24px', fontWeight: 700 }}>
                      Unlimited
                    </p>
                  </div>
                  <div style={{
                    padding: '16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                  }}>
                    <p style={{ margin: 0, color: '#888', fontSize: '12px' }}>Posts Scheduled</p>
                    <p style={{ margin: '4px 0 0', color: '#fff', fontSize: '24px', fontWeight: 700 }}>
                      Unlimited
                    </p>
                  </div>
                </div>

                <Link
                  href="/spacebaddie/pricing"
                  style={{
                    display: 'inline-block',
                    marginTop: '24px',
                    padding: '12px 24px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 500,
                    fontSize: '14px',
                  }}
                >
                  View All Plans →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
