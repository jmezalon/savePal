import { useState, useEffect, useRef } from 'react';

type Priority = 'low' | 'medium' | 'high';
type Column = 'backlog' | 'inProgress' | 'completed';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  column: Column;
  createdAt: string;
}

const STORAGE_KEY = 'savepal-backlog-tasks';

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'User authentication (email/password)',
    description: 'Register, login, password reset',
    priority: 'high',
    column: 'completed',
    createdAt: '2025-01-01',
  },
  {
    id: '2',
    title: 'Google & Apple OAuth',
    description: 'Social sign-in on all platforms',
    priority: 'high',
    column: 'completed',
    createdAt: '2025-01-15',
  },
  {
    id: '3',
    title: 'Group creation & management',
    description: 'Create, join via invite code, update, start/cancel',
    priority: 'high',
    column: 'completed',
    createdAt: '2025-02-01',
  },
  {
    id: '4',
    title: 'Stripe payment processing',
    description: 'With retry logic and fallback payments',
    priority: 'high',
    column: 'completed',
    createdAt: '2025-02-15',
  },
  {
    id: '5',
    title: 'Cycles & bidding system',
    description: 'Sequential, random, and bidding-based payouts',
    priority: 'high',
    column: 'completed',
    createdAt: '2025-03-01',
  },
  {
    id: '6',
    title: 'Payment methods & bank accounts',
    description: 'Stripe Connect, save/delete cards, set default',
    priority: 'high',
    column: 'completed',
    createdAt: '2025-03-15',
  },
  {
    id: '7',
    title: 'Push & in-app notifications',
    description: 'Device tokens for iOS, Android, web; read/unread/delete',
    priority: 'medium',
    column: 'completed',
    createdAt: '2025-04-01',
  },
  {
    id: '8',
    title: 'Debt tracking & fallback payments',
    description: 'Automatic payout withholding for unpaid contributions',
    priority: 'high',
    column: 'completed',
    createdAt: '2025-04-15',
  },
  {
    id: '9',
    title: 'Profile management',
    description: 'Edit profile, change password, notification preferences',
    priority: 'medium',
    column: 'completed',
    createdAt: '2025-05-01',
  },
  {
    id: '10',
    title: 'Admin dashboard',
    description: 'Super admin role for system management',
    priority: 'medium',
    column: 'completed',
    createdAt: '2025-05-15',
  },
  {
    id: '11',
    title: 'Group creation fees',
    description: 'Fee charging with waiver code support',
    priority: 'medium',
    column: 'completed',
    createdAt: '2025-06-01',
  },
  {
    id: '12',
    title: 'Android & iOS apps',
    description: 'Full feature parity on both mobile platforms',
    priority: 'high',
    column: 'completed',
    createdAt: '2025-06-15',
  },
  {
    id: '13',
    title: 'Email & phone verification',
    description: 'Verification tokens for email and phone',
    priority: 'high',
    column: 'completed',
    createdAt: '2025-07-01',
  },
  {
    id: '14',
    title: 'Achievement badges',
    description: 'Gamification — e.g. "Never missed a payment", "Founded 5 groups"',
    priority: 'medium',
    column: 'backlog',
    createdAt: '2026-04-03',
  },
];

const PRIORITY_COLORS: Record<Priority, { bg: string; text: string; dot: string }> = {
  high: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  low: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
};

const COLUMN_CONFIG: Record<Column, { title: string; color: string; headerBg: string }> = {
  backlog: { title: 'Backlog', color: 'border-gray-300', headerBg: 'bg-gray-100' },
  inProgress: { title: 'In Progress', color: 'border-blue-400', headerBg: 'bg-blue-50' },
  completed: { title: 'Completed', color: 'border-green-400', headerBg: 'bg-green-50' },
};

export default function Backlog() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_TASKS;
      }
    }
    return INITIAL_TASKS;
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' as Priority, column: 'backlog' as Column });
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Column | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const dragCounter = useRef<Record<string, number>>({ backlog: 0, inProgress: 0, completed: 0 });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const getColumnTasks = (column: Column) => filteredTasks.filter((t) => t.column === column);

  const addTask = () => {
    if (!newTask.title.trim()) return;
    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      priority: newTask.priority,
      column: newTask.column,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setTasks((prev) => [...prev, task]);
    setNewTask({ title: '', description: '', priority: 'medium', column: 'backlog' });
    setShowAddModal(false);
  };

  const updateTask = () => {
    if (!editingTask || !editingTask.title.trim()) return;
    setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? editingTask : t)));
    setEditingTask(null);
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const moveTask = (id: string, toColumn: Column) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, column: toColumn } : t)));
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragEnter = (e: React.DragEvent, column: Column) => {
    e.preventDefault();
    dragCounter.current[column]++;
    setDragOverColumn(column);
  };

  const handleDragLeave = (column: Column) => {
    dragCounter.current[column]--;
    if (dragCounter.current[column] === 0) {
      setDragOverColumn((prev) => (prev === column ? null : prev));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, column: Column) => {
    e.preventDefault();
    dragCounter.current[column] = 0;
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      moveTask(taskId, column);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
    dragCounter.current = { backlog: 0, inProgress: 0, completed: 0 };
  };

  const totalTasks = tasks.length;
  const completedCount = tasks.filter((t) => t.column === 'completed').length;
  const inProgressCount = tasks.filter((t) => t.column === 'inProgress').length;
  const backlogCount = tasks.filter((t) => t.column === 'backlog').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">SavePal Backlog</h1>
          <p className="mt-1 text-gray-500">Track features, bugs, and improvements</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-500">Backlog</p>
            <p className="text-2xl font-bold text-gray-600">{backlogCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-500">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as Priority | 'all')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            + Add Task
          </button>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['backlog', 'inProgress', 'completed'] as Column[]).map((column) => {
            const config = COLUMN_CONFIG[column];
            const columnTasks = getColumnTasks(column);
            const isDragOver = dragOverColumn === column;

            return (
              <div
                key={column}
                onDragEnter={(e) => handleDragEnter(e, column)}
                onDragLeave={() => handleDragLeave(column)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column)}
                className={`rounded-xl border-2 transition-colors ${isDragOver ? 'border-blue-400 bg-blue-50/50' : config.color + ' bg-white'}`}
              >
                <div className={`${config.headerBg} px-4 py-3 rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-800">{config.title}</h2>
                    <span className="text-sm text-gray-500 bg-white rounded-full px-2.5 py-0.5 font-medium">{columnTasks.length}</span>
                  </div>
                </div>

                <div className="p-3 space-y-3 min-h-[120px]">
                  {columnTasks.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">
                      {draggedTask ? 'Drop here' : 'No tasks'}
                    </p>
                  )}
                  {columnTasks.map((task) => {
                    const pColor = PRIORITY_COLORS[task.priority];
                    const isDragging = draggedTask === task.id;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white rounded-lg border shadow-sm p-3 cursor-grab active:cursor-grabbing transition-all ${isDragging ? 'opacity-40 scale-95' : 'hover:shadow-md'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-medium text-gray-900 flex-1">{task.title}</h3>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => setEditingTask({ ...task })}
                              className="text-gray-400 hover:text-blue-500 transition-colors p-0.5"
                              title="Edit"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                              title="Delete"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {task.description && <p className="text-xs text-gray-500 mt-1">{task.description}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${pColor.bg} ${pColor.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pColor.dot}`} />
                            {task.priority}
                          </span>
                          {/* Move arrows */}
                          <div className="flex gap-1">
                            {column !== 'backlog' && (
                              <button
                                onClick={() => moveTask(task.id, column === 'completed' ? 'inProgress' : 'backlog')}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="Move left"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                            )}
                            {column !== 'completed' && (
                              <button
                                onClick={() => moveTask(task.id, column === 'backlog' ? 'inProgress' : 'completed')}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="Move right"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Task</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Task title"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value as Priority }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Column</label>
                  <select
                    value={newTask.column}
                    onChange={(e) => setNewTask((p) => ({ ...p, column: e.target.value as Column }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="inProgress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={addTask} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingTask(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Task</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask((p) => p ? { ...p, title: e.target.value } : null)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && updateTask()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingTask.description}
                  onChange={(e) => setEditingTask((p) => p ? { ...p, description: e.target.value } : null)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask((p) => p ? { ...p, priority: e.target.value as Priority } : null)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Column</label>
                  <select
                    value={editingTask.column}
                    onChange={(e) => setEditingTask((p) => p ? { ...p, column: e.target.value as Column } : null)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="inProgress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditingTask(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={updateTask} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
