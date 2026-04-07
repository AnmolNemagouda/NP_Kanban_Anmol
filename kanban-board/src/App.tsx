import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Authenticate the Guest User automatically
    const loginGuest = async () => {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error("Auth error:", error.message);
      } else {
        setSession(data.session);
        fetchTasks(data.session?.user.id);
      }
    };

    loginGuest();
  }, []);

  // 2. Fetch their tasks from Supabase
  const fetchTasks = async (userId: string | undefined) => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error("Fetch error:", error.message);
    else setTasks(data || []);
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kanban Board</h1>
          <p className="text-slate-500 mt-1">Guest Session: {session ? "Active" : "Connecting..."}</p>
        </div>
        
        {/* Fake Shadcn Button */}
        <button className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-md font-medium shadow-sm transition-colors">
          + New Task
        </button>
      </div>

      {/* Board Layout */}
      {loading ? (
        <div className="text-slate-500">Loading your board...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {['To Do', 'In Progress', 'In Review', 'Done'].map((column) => (
            <div key={column} className="bg-slate-100/50 rounded-lg p-4 border border-slate-200 min-h-[500px]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-700">{column}</h2>
                <span className="bg-slate-200 text-slate-600 text-xs py-0.5 px-2 rounded-full font-medium">0</span>
              </div>
              
              {/* Dropzone Area */}
              <div className="space-y-3">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center text-sm text-slate-400">
                  Drop tasks here
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}