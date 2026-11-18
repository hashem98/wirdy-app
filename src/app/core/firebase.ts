import { getAnalytics, isSupported } from 'firebase/analytics';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'AIzaSyADf5GBBt5Nj00dOJ3uUMP2PiQ5RGRj9zg',
  authDomain: 'wirdy-app.firebaseapp.com',
  projectId: 'wirdy-app',
  storageBucket: 'wirdy-app.firebasestorage.app',
  messagingSenderId: '334916457374',
  appId: '1:334916457374:web:99dacee740b2b513c7fc8f',
  measurementId: 'G-BKVFEESVZF',
};

const app = initializeApp(firebaseConfig);

export function startFirebase(): void {
  void isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  });
}
