import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { gatewayRpc } from '../lib/supabase';

const firebaseConfig = {
  apiKey: "AIzaSyDxgqkp2VbpVy6eV7d3lRfeVnUP92o2ZOw",
  authDomain: "teacher-attendance-27fa1.firebaseapp.com",
  projectId: "teacher-attendance-27fa1",
  storageBucket: "teacher-attendance-27fa1.firebasestorage.app",
  messagingSenderId: "986385297505",
  appId: "1:986385297505:web:44e2fba93a304407faba20"
};

const VAPID_KEY = "BENlbE4gzPN1aUFMwQBli_jJFXZO4XgbFWhAFhNzly39ohfyvM9URlvdOy6zNLonmn-6Z0i-RChjc1gfWhLUhSA";

let messagingInstance: Messaging | null = null;

export function initFirebaseMessaging(): Messaging | null {
  try {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }
    const apps = getApps();
    const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    if (!messagingInstance) {
      messagingInstance = getMessaging(app);
    }
    return messagingInstance;
  } catch (e) {
    console.warn('Firebase messaging initialization skipped/failed:', e);
    return null;
  }
}

export async function requestAndRegisterPushToken(teacherId: string, pin: string): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Push registration failed: Notification API not supported in window.');
      return false;
    }

    const currentPermission = Notification.permission;
    if (currentPermission === 'denied') {
      console.warn('Push registration aborted: Notification permission is denied.');
      return false;
    }

    let permission: NotificationPermission = currentPermission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.warn('Push registration failed: permission not granted (current: ' + permission + ').');
      return false;
    }

    const messaging = initFirebaseMessaging();
    if (!messaging) {
      console.warn('Push registration failed: messaging instance initialization returned null.');
      return false;
    }

    let registration;
    try {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    } catch (e) {
      console.warn('Service worker registration failed during push setup:', e);
      return false;
    }
    
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!currentToken) {
      console.warn('Push registration failed: getToken returned empty token.');
      return false;
    }

    const { error } = await gatewayRpc('register_teacher_device_token', {
      p_teacher_id: teacherId,
      p_pin: pin,
      p_token: currentToken,
      p_platform: 'web',
    });

    if (error) {
      console.warn('Failed to register device token in Supabase:', error);
      return false;
    }

    try {
      localStorage.setItem('teacher_app_push_token', currentToken);
      localStorage.setItem('teacher_app_push_registered', 'true');
    } catch (e) {
      console.warn('Failed to save push token state in localStorage:', e);
    }

    return true;
  } catch (err) {
    console.warn('Error requesting or registering push token:', err);
    return false;
  }
}

export async function removePushTokenOnLogout(teacherId: string, pin: string): Promise<void> {
  try {
    const token = localStorage.getItem('teacher_app_push_token');
    if (!token) {
      try {
        localStorage.removeItem('teacher_app_push_registered');
      } catch (e) {
        console.warn('Failed to clear push registered flag in localStorage:', e);
      }
      return;
    }

    const { error } = await gatewayRpc('remove_teacher_device_token', {
      p_teacher_id: teacherId,
      p_pin: pin,
      p_token: token,
    });

    if (error) {
      console.warn('Failed to remove device token in Supabase:', error);
    }

    try {
      localStorage.removeItem('teacher_app_push_token');
      localStorage.removeItem('teacher_app_push_registered');
    } catch (e) {
      console.warn('Failed to clear push token state in localStorage:', e);
    }
  } catch (e) {
    console.warn('Error removing push token on logout:', e);
  }
}

export async function disablePushNotifications(teacherId: string, pin: string): Promise<void> {
  await removePushTokenOnLogout(teacherId, pin);
}

export function setupForegroundMessageHandler(): void {
  try {
    const messaging = initFirebaseMessaging();
    if (!messaging) {
      console.warn('Foreground message handler setup skipped: messaging not initialized.');
      return;
    }

    onMessage(messaging, (payload) => {
      try {
        if (typeof window === 'undefined' || Notification.permission !== 'granted') {
          return;
        }
        const title = payload.notification?.title || payload.data?.title;
        const body = payload.notification?.body || payload.data?.body;
        if (title || body) {
          new Notification(title || 'Teacher Attendance', {
            body: body || 'You have a new update.',
            icon: '/vite.svg'
          });
        }
      } catch (e) {
        console.warn('Error handling foreground push message:', e);
      }
    });
  } catch (e) {
    console.warn('Error setting up foreground message handler:', e);
  }
}
