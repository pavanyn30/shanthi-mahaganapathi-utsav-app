// Firebase Cloud Messaging Service Worker for background push notifications
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "FIREBASE_API_KEY_PLACEHOLDER",
  authDomain: "ganapathi-utsav.firebaseapp.com",
  projectId: "ganapathi-utsav",
  storageBucket: "ganapathi-utsav.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Ganapathi Festival 2026';
  const notificationOptions = {
    body: payload.notification?.body || 'New announcement updated live!',
    icon: '/favicon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
