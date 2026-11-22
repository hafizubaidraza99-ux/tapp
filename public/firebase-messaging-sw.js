importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDxgqkp2VbpVy6eV7d3lRfeVnUP92o2ZOw",
  authDomain: "teacher-attendance-27fa1.firebaseapp.com",
  projectId: "teacher-attendance-27fa1",
  storageBucket: "teacher-attendance-27fa1.firebasestorage.app",
  messagingSenderId: "986385297505",
  appId: "1:986385297505:web:44e2fba93a304407faba20"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload, event) => {
  const notificationTitle = payload.notification?.title || 'Teacher Attendance';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new update.',
    icon: '/vite.svg'
  };

  const promise = self.registration.showNotification(notificationTitle, notificationOptions);
  if (event && event.waitUntil) {
    event.waitUntil(promise);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
