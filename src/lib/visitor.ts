import axios from 'axios';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const TARGET_URL = process.env.TARGET_URL || 'https://ohsobserver.com/can-we-do-better-than-positive-masculinity/';

export async function getPublicIp(): Promise<string> {
  try {
    const response = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
    return response.data.ip;
  } catch (error) {
    console.error('Failed to get public IP:', error);
    return 'Unknown';
  }
}

export async function visitTarget() {
  const ip = await getPublicIp();
  const startTime = Date.now();
  
  console.log(`[Visitor] Starting visit to ${TARGET_URL} from IP: ${ip}`);

  try {
    const response = await axios.get(TARGET_URL, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    const duration = Date.now() - startTime;
    
    await addDoc(collection(db, 'visit_logs'), {
      timestamp: new Date().toISOString(),
      targetUrl: TARGET_URL,
      ip: ip,
      status: 'success',
      duration: duration,
      createdAt: serverTimestamp()
    });

    console.log(`[Visitor] Visit successful. Duration: ${duration}ms`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error.message || 'Unknown error';
    
    await addDoc(collection(db, 'visit_logs'), {
      timestamp: new Date().toISOString(),
      targetUrl: TARGET_URL,
      ip: ip,
      status: 'error',
      errorMessage: errorMessage,
      duration: duration,
      createdAt: serverTimestamp()
    });

    console.error(`[Visitor] Visit failed: ${errorMessage}`);
  }
}
