import { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Globe, 
  Play, 
  RefreshCw,
  Search,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from './lib/error-handler';

interface VisitLog {
  id: string;
  timestamp: string;
  targetUrl: string;
  ip: string;
  status: 'success' | 'error';
  errorMessage?: string;
  duration: number;
}

export default function App() {
  const [logs, setLogs] = useState<VisitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [plannedVisits, setPlannedVisits] = useState<number[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'visit_logs'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VisitLog[];
      setLogs(newLogs);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'visit_logs');
    });

    // Fetch planned visits
    fetch('/api/plan')
      .then(res => res.json())
      .then(data => setPlannedVisits(data.plannedMinutes || []))
      .catch(console.error);

    return () => unsubscribe();
  }, []);

  const handleVisitNow = async () => {
    setIsRunningAction(true);
    try {
      const res = await fetch('/api/visit/now', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start visit');
      alert('Visit initiated successfully!');
    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsRunningAction(false);
    }
  };

  const successCount = logs.filter(l => l.status === 'success').length;
  const errorCount = logs.filter(l => l.status === 'error').length;
  const targetUrl = logs[0]?.targetUrl || 'https://ohsobserver.com/...';

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-900 border-t-2 border-blue-600">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold shadow-sm shadow-blue-200">
            <Globe size={18} />
          </div>
          <h1 id="app-title" className="text-xl font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            GhostVisitor <span className="text-blue-600 font-mono text-sm bg-blue-50 px-2 py-0.5 rounded">v1.2</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Bot Active
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          <button
            id="run-now-btn"
            onClick={handleVisitNow}
            disabled={isRunningAction}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded shadow-sm text-sm font-medium transition-all transform active:scale-95 disabled:opacity-50"
          >
            <Play size={14} fill="currentColor" />
            {isRunningAction ? 'Executing...' : 'Run Now'}
          </button>
        </div>
      </nav>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Sidebar - Configuration & Guide */}
        <div className="md:col-span-4 space-y-6">
          {/* Configuration Card */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Search size={14} className="text-blue-500" />
                Configuration
              </h2>
              <button 
                onClick={() => window.location.reload()}
                className="text-slate-400 hover:text-blue-600 transition-colors"
                title="Refresh Cache"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center justify-between">
                  TARGET URL
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">AUTO</span>
                </label>
                <div className="bg-slate-50 p-2 text-xs border border-slate-200 rounded font-mono text-slate-600 break-all">
                  {targetUrl}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">FREQUENCY</label>
                  <div className="text-sm font-semibold flex items-center gap-1.5">
                    <Activity size={12} className="text-blue-500" />
                    3 / Day
                  </div>
                </div>
                <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 block mb-0.5">INTERVALS</label>
                  <div className="text-sm font-semibold flex items-center gap-1.5">
                    <Clock size={12} className="text-blue-500" />
                    Random
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-700">Stealth Protocol</span>
                  <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100">ACTIVE</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  Headers randomized via automated user-agent rotation and referrer stripping to maintain zero footprint.
                </p>
              </div>
            </div>
          </section>

          {/* Deployment Guide */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Deployment Guide</h2>
            <div className="space-y-4">
              <div className="flex gap-3 items-start outline-none">
                <div className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                <p className="text-xs text-slate-600 leading-tight">Clone this repository to your preferred Git provider.</p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                <p className="text-xs text-slate-600 leading-tight">Link project to <b>Vercel</b> or <b>Railway</b> for serverless runtime.</p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
                <p className="text-xs text-slate-600 leading-tight">Configure <b>Vercel Cron</b> to hit your server daily at 00:00.</p>
              </div>
            </div>
          </section>
        </div>

        {/* Main Panel - Stats & Logs */}
        <div className="md:col-span-8 space-y-6 flex flex-col">
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
            >
              <div className="text-xs font-semibold text-slate-400 mb-1">TOTAL LOGS</div>
              <div className="text-2xl font-bold text-slate-800 tabular-nums">
                {logs.length}
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
            >
              <div className="text-xs font-semibold text-slate-400 mb-1">SUCCESS RATE</div>
              <div className="text-2xl font-bold text-green-600 tabular-nums">
                {logs.length > 0 ? ((successCount / logs.length) * 100).toFixed(1) : 0}%
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
            >
              <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
                NEXT WINDOW
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>
              </div>
              <div className="text-2xl font-bold text-blue-600 tabular-nums lowercase">
                {plannedVisits.length} left
              </div>
            </motion.div>
          </div>

          {/* Activity Logs Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col min-h-[400px]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Activity size={14} className="text-blue-500" />
                Activity Logs
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">
                LAST RECORD: {logs[0] ? format(new Date(logs[0].timestamp), 'HH:mm:ss') : '--:--:--'}
              </span>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-100">
                  <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">IP Address</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Latency</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100 font-mono">
                  <AnimatePresence initial={false}>
                    {logs.map((log) => (
                      <motion.tr 
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="px-5 py-3.5 text-slate-500 text-xs">
                          {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] group-hover:bg-slate-200 transition-colors">
                            {log.ip}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {log.status === 'success' ? (
                            <span className="text-green-600 font-bold text-[11px] flex items-center justify-center gap-1">
                              <CheckCircle size={10} />
                              200 OK
                            </span>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className="text-red-500 font-bold text-[11px] flex items-center gap-1">
                                <XCircle size={10} />
                                {log.errorMessage?.includes('timeout') ? 'TIMEOUT' : 'FAILED'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-400 text-xs tabular-nums">
                          {log.duration}ms
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  
                  {logs.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <Activity className="text-slate-200" size={40} />
                          <p className="text-sm font-medium">No activity recorded yet.</p>
                          <p className="text-xs">Trigger a visit or wait for the scheduler.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  
                  {isLoading && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-slate-400">
                        <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                        Syncing with secure vault...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <button className="text-[11px] font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest flex items-center justify-center gap-2 mx-auto">
                Secure Data Feed Enabled
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-4 text-center text-[10px] text-slate-400 border-t border-slate-200 bg-white space-y-1">
        <p>GhostVisitor System • Enterprise stealth layer active</p>
        <p className="font-mono uppercase opacity-70">
          Privacy Protocol: No persistent cookies • Edge IP Rotation • User-Agent Randomization
        </p>
      </footer>
    </div>
  );
}
