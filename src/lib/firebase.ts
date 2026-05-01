import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// CRITICAL: Validate connection to Firestore on boot
async function testConnection() {
  try {
    console.log('[Firebase] Testing connection to Firestore...');
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Connection successful.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or internet connection.");
    } else {
      console.error("[Firebase] Connection test failed:", error);
    }
  }
}

// Only run connection test in browser environments
if (typeof window !== 'undefined') {
  testConnection();
}
