import React, { useState, useEffect } from 'react';
import { IPhoneFrame } from './components/layout/IPhoneFrame';
import { Header } from './components/layout/Header';
import { TabBar } from './components/layout/TabBar';
import { JoinScreen } from './components/auth/JoinScreen';
import { PinLoginScreen } from './components/auth/PinLoginScreen';
import { TodayAttendanceScreen } from './components/attendance/TodayAttendanceScreen';
import { TimetableScreen } from './components/timetable/TimetableScreen';
import { HistoryScreen } from './components/history/HistoryScreen';
import { ProfileScreen } from './components/profile/ProfileScreen';
import { SupabaseMissingBanner } from './components/common/SupabaseMissingBanner';
import { TeacherSession, TabKey } from './types';
import { getStoredSession, getRememberedTeacher, clearRememberedTeacher, clearSession } from './services/authService';
import { removePushTokenOnLogout, requestAndRegisterPushToken, setupForegroundMessageHandler } from './services/pushService';
import { NotificationPromptModal } from './components/common/NotificationPromptModal';
import { initSupabase, isSupabaseReady } from './lib/supabase';

// TEMPORARY PREVIEW BYPASS:
// Set PREVIEW_MODE = true to bypass the Join/PIN login flow and render the main
// interface (Today, Timetable, History, Profile) directly on initial load.
// To restore the authentic phone + 4-digit PIN enrollment flow, set PREVIEW_MODE = false.
export const PREVIEW_MODE = false;

// In-memory-only preview teacher session used for rendering when PREVIEW_MODE is true.
// This is never persisted to localStorage/sessionStorage, never writes to Supabase,
// and does not invent any remote DB rows.
const PREVIEW_TEACHER_SESSION: TeacherSession = {
  teacherId: '00000000-0000-4000-8000-000000000001',
  teacherName: 'Preview Teacher',
  whatsappNumber: '+92 300 0000000',
  schoolId: '00000000-0000-4000-8000-000000000002',
  schoolName: 'City Grammar High School',
  schoolTimezone: 'Asia/Karachi',
  isHeadTeacher: true,
  classId: '00000000-0000-4000-8000-000000000003',
  loginTime: new Date().toISOString(),
  pin: '1234',
  workingDays: 'Mon-Fri',
};

export default function App() {
  const [session, setSession] = useState<TeacherSession | null>(
    PREVIEW_MODE ? PREVIEW_TEACHER_SESSION : null
  );
  const [authMode, setAuthMode] = useState<'login' | 'join'>('login');
  const [currentTab, setCurrentTab] = useState<TabKey>('today');
  const [supabaseReady, setSupabaseReady] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(!PREVIEW_MODE);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);

  // Effective teacher session (in preview mode, guaranteed to use the preview session)
  const activeSession = session || (PREVIEW_MODE ? PREVIEW_TEACHER_SESSION : null);

  // HOOK 1: Initialize Supabase and check existing stored session
  useEffect(() => {
    async function bootstrap() {
      try {
        const res = await initSupabase();
        setSupabaseReady(res.configured);

        // When PREVIEW_MODE is active, bypass stored session / authMode logic
        if (PREVIEW_MODE) {
          setSession(PREVIEW_TEACHER_SESSION);
          setInitializing(false);
          return;
        }

        const existing = getStoredSession();
        if (existing) {
          setSession(existing);
        } else {
          const remembered = getRememberedTeacher();
          if (remembered) {
            setAuthMode('login');
          } else {
            setAuthMode('join');
          }
        }
      } catch (err) {
        console.warn('Bootstrap initialization error:', err);
      } finally {
        setInitializing(false);
      }
    }
    bootstrap();
  }, []);

  // HOOK 2: Evaluate and prompt/register notifications (must be called unconditionally before any early return)
  useEffect(() => {
    if (!activeSession) return;

    async function evaluateNotifications() {
      if (!activeSession) return;
      if (typeof window === 'undefined' || !('Notification' in window)) return;

      const perm = Notification.permission;
      if (perm === 'granted') {
        await requestAndRegisterPushToken(activeSession.teacherId, activeSession.pin || '');
      } else if (perm === 'default') {
        if (
          sessionStorage.getItem('teacher_app_session_prompted') !== 'true' &&
          localStorage.getItem('teacher_app_notifications_prompted') !== 'true'
        ) {
          sessionStorage.setItem('teacher_app_session_prompted', 'true');
          setShowNotificationModal(true);
        }
      } else if (perm === 'denied') {
        console.warn('[Notifications] Notification permission is denied; push registration skipped on login.');
      }
    }

    evaluateNotifications();
  }, [activeSession?.teacherId]);

  // Setup foreground message handler once on mount
  useEffect(() => {
    setupForegroundMessageHandler();
  }, []);

  const checkAndPromptNotifications = () => {
    try {
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'default' &&
        localStorage.getItem('teacher_app_notifications_prompted') !== 'true'
      ) {
        setShowNotificationModal(true);
      }
    } catch {}
  };

  const handleJoined = (newSession: TeacherSession) => {
    setSession(newSession);
    setCurrentTab('today');
    checkAndPromptNotifications();
  };

  const handleLoggedIn = (newSession: TeacherSession) => {
    setSession(newSession);
    setCurrentTab('today');
    checkAndPromptNotifications();
  };

  const handleLogout = () => {
    if (PREVIEW_MODE) {
      // In preview mode, stay on the main interface (reset to Today tab)
      // rather than navigating to the Join/PIN login screen.
      setCurrentTab('today');
      return;
    }
    const current = getStoredSession();
    if (current?.teacherId && current?.pin) {
      removePushTokenOnLogout(current.teacherId, current.pin);
    }
    clearSession();
    setSession(null);
    const remembered = getRememberedTeacher();
    if (remembered) {
      setAuthMode('login');
    } else {
      setAuthMode('join');
    }
  };

  const handleSwitchToJoin = () => {
    clearRememberedTeacher();
    setAuthMode('join');
  };

  if (initializing) {
    return (
      <IPhoneFrame>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white animate-pulse mb-3">
            <span className="font-bold text-lg">TA</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Teacher Attendance
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Loading secure connection...
          </p>
        </div>
      </IPhoneFrame>
    );
  }

  // If user is not authenticated and preview mode is disabled, show Join or PIN Login screen
  if (!PREVIEW_MODE && !activeSession) {
    const remembered = getRememberedTeacher();
    return (
      <IPhoneFrame>
        {!supabaseReady && (
          <SupabaseMissingBanner
            onRetrySuccess={() => setSupabaseReady(true)}
          />
        )}
        {authMode === 'login' ? (
          <PinLoginScreen
            rememberedTeacher={remembered}
            onLoggedIn={handleLoggedIn}
            onSwitchToJoin={handleSwitchToJoin}
          />
        ) : (
          <JoinScreen
            onJoined={handleJoined}
            onSwitchToLogin={() => setAuthMode('login')}
          />
        )}
      </IPhoneFrame>
    );
  }

  // Safety fallback if no session (only reachable if PREVIEW_MODE is false)
  if (!activeSession) {
    return null;
  }

  // Header content depending on current tab
  const getHeaderTitle = () => {
    switch (currentTab) {
      case 'today':
        return activeSession.teacherName;
      case 'timetable':
        return 'My Timetable';
      case 'history':
        return 'Attendance History';
      case 'profile':
        return 'Teacher Profile';
      default:
        return 'Teacher App';
    }
  };

  const getHeaderSubtitle = () => {
    switch (currentTab) {
      case 'today':
        return 'Morning Check-In';
      case 'timetable':
        return 'Class Periods & Covers';
      case 'history':
        return 'Past Attendance Log';
      case 'profile':
        return activeSession.whatsappNumber;
      default:
        return undefined;
    }
  };

  return (
    <IPhoneFrame schoolTimezone={activeSession.schoolTimezone}>
      {showNotificationModal && (
        <NotificationPromptModal
          session={activeSession}
          onClose={() => setShowNotificationModal(false)}
        />
      )}

      {/* Top iOS Header */}
      <Header
        title={getHeaderTitle()}
        subtitle={getHeaderSubtitle()}
        schoolName={activeSession.schoolName}
        schoolTimezone={activeSession.schoolTimezone}
      />

      {!PREVIEW_MODE && !supabaseReady && (
        <SupabaseMissingBanner
          onRetrySuccess={() => setSupabaseReady(true)}
        />
      )}

      {/* Main Tab Screen Content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {currentTab === 'today' && (
          <TodayAttendanceScreen session={activeSession} />
        )}
        {currentTab === 'timetable' && (
          <TimetableScreen session={activeSession} />
        )}
        {currentTab === 'history' && (
          <HistoryScreen session={activeSession} />
        )}
        {currentTab === 'profile' && (
          <ProfileScreen session={activeSession} onLogout={handleLogout} />
        )}
      </div>

      {/* Fixed Bottom iOS Tab Bar */}
      <TabBar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
      />
    </IPhoneFrame>
  );
}
