import { useEffect, useState, useMemo } from 'react';
import { supabase } from './supabase';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { 
  Plus, Layout, GripVertical, CheckCircle2, Circle, Clock, 
  Search, Tag, Activity, BarChart3, Filter, X, AlignLeft, FilePlus2, User, Trash2
} from 'lucide-react';

/**
 * Interface for Kanban Task
 */
interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  labels: string[];
  user_id: string;
  created_at: string;
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  /* Updated to store only one label string */
  const [newTaskLabel, setNewTaskLabel] = useState<string | null>(null);
  const [selectedFilterLabel, setSelectedFilterLabel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  /* Modal & Temporary Editing State */
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [tempDescription, setTempDescription] = useState('');
  const [tempAssignee, setTempAssignee] = useState('');

  const labelOptions = ['Bug', 'Feature', 'Design'];

  /**
   * Initializes session and fetches initial task data
   */
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          setSession(currentSession);
          fetchTasks(currentSession.user.id);
        } else {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) throw error;
          setSession(data.session);
          if (data.session) fetchTasks(data.session.user.id);
        }
      } catch (err) {
        console.error('Session error:', err);
      } finally {
        setLoading(false);
      }
    };
    initSession();
  }, []);

  /**
   * Retrieves tasks from Supabase filtered by user_id
   */
  const fetchTasks = async (userId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching tasks:', error);
    else if (data) setTasks(data as Task[]);
  };

  /**
   * Opens details modal and initializes temp text/assignee
   */
  const openTaskDetails = (task: Task) => {
    setEditingTask(task);
    setTempDescription(task.description || '');
    setTempAssignee(task.assignee || '');
  };

  /**
   * Saves description and assignee fields to Supabase
   */
  const saveDetails = async () => {
    if (!editingTask) return;
    const { error } = await supabase
      .from('tasks')
      .update({ description: tempDescription, assignee: tempAssignee })
      .eq('id', editingTask.id);

    if (error) {
      alert(`Save error: ${error.message}`);
    } else {
      setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, description: tempDescription, assignee: tempAssignee } : t));
      setEditingTask(null);
    }
  };

  /**
   * Permanently deletes a task from the database
   */
  const deleteTask = async () => {
    if (!editingTask) return;
    if (!confirm("Permanently delete this task?")) return;

    const { error } = await supabase.from('tasks').delete().eq('id', editingTask.id);

    if (error) {
      alert(`Delete error: ${error.message}`);
    } else {
      setTasks(tasks.filter(t => t.id !== editingTask.id));
      setEditingTask(null);
    }
  };

  /**
   * Enforces single label selection logic
   */
  const handleLabelSelect = (label: string) => {
    setNewTaskLabel(prev => prev === label ? null : label);
  };

  /**
   * Board analytics summary
   */
  const stats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'done').length,
    percent: tasks.length ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0
  }), [tasks]);

  /**
   * Combined filter logic for Search and Label Pills
   */
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLabel = selectedFilterLabel === 'all' || task.labels?.includes(selectedFilterLabel);
    return matchesSearch && matchesLabel;
  });

  /**
   * Validates and inserts a new task into the database
   */
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      alert("Please enter a task name.");
      return;
    }
    if (!session) return;

    /* Wrap the single label in an array to maintain DB compatibility */
    const labelsToSubmit = newTaskLabel ? [newTaskLabel] : [];

    const { data, error } = await supabase.from('tasks').insert([{ 
      title: newTaskTitle, 
      status: 'todo', 
      user_id: session.user.id,
      labels: labelsToSubmit,
      description: '',
      assignee: ''
    }]).select();

    if (error) {
      alert(`Supabase Error: ${error.message}`);
    } else if (data) {
      setTasks([data[0] as Task, ...tasks]);
      setNewTaskTitle('');
      setNewTaskLabel(null);
    }
  };

  /**
   * Handles column changes and persists them
   */
  const onDragEnd = async (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const updatedTasks = Array.from(tasks);
    const task = updatedTasks.find(t => t.id === draggableId);
    if (task) {
      task.status = destination.droppableId as Task['status'];
      setTasks(updatedTasks);
      await supabase.from('tasks').update({ status: destination.droppableId }).eq('id', draggableId);
    }
  };

  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-slate-400' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-[#7FFFD4]' },
    { id: 'in_review', title: 'In Review', color: 'bg-slate-500' },
    { id: 'done', title: 'Done', color: 'bg-emerald-600' },
  ];

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#9fb1a3] text-white font-bold">Initializing...</div>;

  return (
    <div className="min-h-screen bg-[#9fb1a3] p-8 text-[#121212]">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header Summary */}
        <header className="flex justify-between items-center bg-slate-200 p-6 rounded-2xl border border-black/10 shadow-md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#7FFFD4] rounded-xl shadow-inner border border-black/5">
              <BarChart3 size={24} className="text-[#121212]" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">NP Kanban Board</h1>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{stats.percent}% Success Rate</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black">{stats.total}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Tasks</p>
          </div>
        </header>

        {/* Toolbar */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Find a task..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-100 border border-black/10 rounded-xl focus:ring-2 focus:ring-[#7FFFD4] outline-none text-[#121212]"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-100 border border-black/10 p-2 rounded-xl">
              {['all', ...labelOptions].map(l => (
                <button
                  key={l}
                  onClick={() => setSelectedFilterLabel(l)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase transition-all ${selectedFilterLabel === l ? 'bg-[#121212] text-white' : 'text-slate-500 hover:bg-slate-200'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={addTask} className="bg-slate-200 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4 shadow-md border border-black/10">
            <input 
              type="text" 
              placeholder="Task name..." 
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-50 border border-black/5 rounded-lg outline-none text-sm text-[#121212]"
            />
            <div className="flex items-center gap-2 px-4 border-l border-slate-300">
              <span className="text-[9px] font-black uppercase text-slate-400 mr-2">Label:</span>
              {labelOptions.map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleLabelSelect(l)}
                  className={`px-3 py-1 rounded-md text-[10px] font-black border uppercase transition-all ${newTaskLabel === l ? 'bg-[#7FFFD4] border-[#7FFFD4]' : 'bg-slate-100 border-slate-300 text-slate-400'}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <button type="submit" className="bg-[#7FFFD4] text-[#121212] px-8 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm hover:bg-[#60f0c5]">
              Create
            </button>
          </form>
        </div>
//comment just to push the code to github and trigger the workflow
        {/* Board */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {columns.map(column => (
              <div key={column.id} className="flex flex-col gap-4">
                <div className="flex items-center gap-2 px-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${column.color} border border-black/10`} />
                  <h2 className="font-black text-[11px] text-slate-100 uppercase tracking-widest drop-shadow-md">{column.title}</h2>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={provided.innerRef}
                      className={`min-h-[550px] rounded-2xl p-3 transition-all border border-black/5 shadow-inner ${snapshot.isDraggingOver ? 'bg-slate-300/80 scale-[1.01]' : 'bg-slate-300/60'}`}
                    >
                      {filteredTasks.filter(t => t.status === column.id).map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef} 
                              {...provided.draggableProps} 
                              {...provided.dragHandleProps}
                              onClick={() => openTaskDetails(task)}
                              className={`bg-slate-100 p-5 rounded-xl border border-black/5 mb-3 shadow-sm hover:shadow-md transition-all group relative cursor-pointer ${snapshot.isDragging ? 'rotate-1 shadow-2xl ring-2 ring-[#7FFFD4]' : ''}`}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <h3 className="font-bold text-[#121212] text-sm leading-snug tracking-tight">{task.title}</h3>
                                <GripVertical size={14} className="text-slate-300 group-hover:text-[#121212]" />
                              </div>
                              
                              {task.labels && task.labels.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2 mb-4">
                                  {task.labels.map(l => (
                                    <span key={l} className="px-2 py-0.5 bg-[#7FFFD4]/40 text-[#121212] rounded-md text-[9px] font-black uppercase border border-black/5">{l}</span>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200/50">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1">
                                    <FilePlus2 size={12} className={task.description ? 'text-[#7FFFD4]' : 'text-slate-300'} />
                                    <span className={`text-[9px] font-black uppercase tracking-tight ${task.description ? 'text-slate-700' : 'text-slate-400'}`}>Notes</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <User size={12} className={task.assignee ? 'text-[#7FFFD4]' : 'text-slate-300'} />
                                    <span className={`text-[9px] font-black uppercase tracking-tight ${task.assignee ? 'text-slate-700' : 'text-slate-400'}`}>{task.assignee || 'None'}</span>
                                  </div>
                                </div>
                                <span className="text-[9px] font-black text-slate-400">{new Date(task.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-100 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-black/10">
            <div className="p-6 bg-slate-200 flex justify-between items-center border-b border-slate-300">
              <h2 className="font-black text-sm uppercase tracking-widest text-[#121212]">{editingTask.title}</h2>
              <button onClick={() => setEditingTask(null)}><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><User size={12} /> Assign To</label>
                <input type="text" value={tempAssignee} onChange={(e) => setTempAssignee(e.target.value)} placeholder="Name..." className="w-full p-3 bg-slate-50 border border-black/5 rounded-xl outline-none focus:ring-2 focus:ring-[#7FFFD4] text-sm text-[#121212]" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><AlignLeft size={12} /> Task Notes</label>
                <textarea value={tempDescription} onChange={(e) => setTempDescription(e.target.value)} placeholder="Add details..." className="w-full h-40 p-4 bg-slate-50 border border-black/5 rounded-xl outline-none focus:ring-2 focus:ring-[#7FFFD4] text-sm text-[#121212] resize-none shadow-inner" />
              </div>
              <div className="flex justify-between items-center">
                <button onClick={deleteTask} className="flex items-center gap-2 text-red-500 hover:text-red-700 font-black text-[10px] uppercase transition-colors"><Trash2 size={14} /> Delete</button>
                <div className="flex gap-3">
                  <button onClick={() => setEditingTask(null)} className="px-4 py-2 text-[10px] font-black uppercase text-slate-500">Cancel</button>
                  <button onClick={saveDetails} className="bg-[#7FFFD4] text-[#121212] px-8 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm">Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}