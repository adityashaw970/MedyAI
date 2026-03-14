import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  Activity, Send, Bell, MessageSquare, Plus, LogOut,
  Stethoscope, User, Lock, Mail, Wrench, ChevronRight,
  Calendar, Clock, TrendingUp, X, Trash2, MessageCircle,
} from 'lucide-react';

const API = 'http://localhost:8000';

/* ═══════════════════════════════════════════════════════════════
   LOGIN SCREEN
   ═══════════════════════════════════════════════════════════════ */
function LoginScreen({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole]       = useState('patient');
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone]     = useState('');
  const [specialization, setSpecialization] = useState('General Physician');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers]     = useState({ doctors: [], patients: [] });

  const specializations = [
    'General Physician', 'Cardiologist', 'Dermatologist',
    'Oncologist (Cancer)', 'Endocrinologist (Diabetes)', 'Nephrologist (Kidney)',
    'Neurologist', 'Pediatrician', 'Orthopedic'
  ];

  const fetchUsers = () => {
    fetch(`${API}/api/auth/users`)
      .then(r => r.json())
      .then(d => setUsers({ doctors: d?.doctors || [], patients: d?.patients || [] }))
      .catch(() => {});
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    if (!isRegister) {
      if (role === 'patient') { setEmail(''); setPassword('patient123'); }
      else                    { setEmail(''); setPassword('doctor123'); }
    } else {
      setEmail(''); setPassword(''); setName(''); setPhone('');
    }
    setError('');
  }, [role, isRegister]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister
      ? { name, email, password, role, phone, specialization }
      : { email, password, role };

    try {
      const res  = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(isRegister ? 'Registration successful!' : `Welcome, ${data.user.name}!`);
        onLogin(data.user);
      }
      else setError(data.detail || (isRegister ? 'Registration failed' : 'Login failed'));
    } catch {
      setError('Cannot connect to backend. Make sure the server is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const availableUsers = (role === 'doctor' ? users?.doctors : users?.patients) || [];

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#060a13] relative overflow-hidden login-bg-mesh">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#060a13]/30 pointer-events-none" />
      <div className="absolute top-[10%] left-[25%] w-[55%] h-[55%] bg-[#63b3ed] opacity-[0.08] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[10%] right-[25%] w-[55%] h-[55%] bg-[#b794f4] opacity-[0.06] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-[440px] px-8 py-8 bg-[#0e1421]/85 border border-white/10 rounded-2xl shadow-xl shadow-blue-500/5 backdrop-blur-xl transition-all max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-brand flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/25 animate-[bounce_3s_ease-in-out_infinite]">
            <Activity size={24} strokeWidth={1.5} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text text-gradient-brand tracking-tight">MedyAI</h1>
            <p className="text-xs text-[#8b95a5] mt-1 hover:text-white transition-colors">{isRegister ? 'Create a New Account' : 'Agentic Appointment Assistant'}</p>
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl mb-5 backdrop-blur-sm">
          <button
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${role === 'patient' ? 'bg-[#63b3ed] text-[#0c1220] shadow-[0_2px_12px_rgba(99,179,237,0.2)]' : 'text-[#8b95a5] hover:bg-white/10 hover:text-white'}`}
            onClick={() => setRole('patient')} type="button"
          >
            <User size={14} /> Patient
          </button>
          <button
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${role === 'doctor' ? 'bg-[#68d391] text-[#0c1220] shadow-[0_2px_12px_rgba(104,211,145,0.2)]' : 'text-[#8b95a5] hover:bg-white/10 hover:text-white'}`}
            onClick={() => setRole('doctor')} type="button"
          >
            <Stethoscope size={14} /> Doctor
          </button>
        </div>

        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          {!isRegister && availableUsers.length > 0 && (
            <div className="relative">
              <label className="block text-[10px] font-semibold text-[#8b95a5] mb-1 uppercase tracking-wider">Quick Select</label>
              <select
                className="w-full bg-white/5 border border-white/10 text-[#ecf0f6] py-2.5 px-3 rounded-lg text-sm outline-none transition-all focus:border-[#63b3ed] focus:ring-1 focus:ring-[#63b3ed]/20 appearance-none"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setPassword(role === 'doctor' ? 'doctor123' : 'patient123');
                }}
              >
                <option value="" disabled>Select user...</option>
                {availableUsers.map(u => (
                  <option key={u.id} value={u.email} className="bg-[#0c1220] text-[#ecf0f6]">
                    {u.name}{u.specialization ? ` · ${u.specialization}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isRegister && (
            <div className="relative">
              <label className="block text-[10px] font-semibold text-[#8b95a5] mb-1 uppercase tracking-wider flex items-center gap-1.5"><User size={10} /> Full Name</label>
              <input
                className="w-full bg-white/5 border border-white/10 text-[#ecf0f6] py-2.5 px-3 rounded-lg text-sm outline-none transition-all focus:border-[#63b3ed] focus:ring-1 focus:ring-[#63b3ed]/20 placeholder-gray-500"
                type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" required={isRegister}
              />
            </div>
          )}

          {isRegister && role === 'doctor' && (
            <div className="relative">
              <label className="block text-[10px] font-semibold text-[#8b95a5] mb-1 uppercase tracking-wider flex items-center gap-1.5"><Activity size={10} /> Specialization</label>
              <select
                className="w-full bg-white/5 border border-white/10 text-[#ecf0f6] py-2.5 px-3 rounded-lg text-sm outline-none transition-all focus:border-[#63b3ed] focus:ring-1 focus:ring-[#63b3ed]/20 appearance-none"
                value={specialization} onChange={e => setSpecialization(e.target.value)}
              >
                {specializations.map(s => <option key={s} value={s} className="bg-[#0c1220] text-[#ecf0f6]">{s}</option>)}
              </select>
            </div>
          )}

          <div className="relative">
            <label className="block text-[10px] font-semibold text-[#8b95a5] mb-1 uppercase tracking-wider flex items-center gap-1.5"><Mail size={10} /> Email</label>
            <input
              className="w-full bg-white/5 border border-white/10 text-[#ecf0f6] py-2.5 px-3 rounded-lg text-sm outline-none transition-all focus:border-[#63b3ed] focus:ring-1 focus:ring-[#63b3ed]/20 placeholder-gray-500"
              type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@gmail.com" required
            />
          </div>

          <div className="relative">
            <label className="block text-[10px] font-semibold text-[#8b95a5] mb-1 uppercase tracking-wider flex items-center gap-1.5"><Lock size={10} /> Password</label>
            <input
              className="w-full bg-white/5 border border-white/10 text-[#ecf0f6] py-2.5 px-3 rounded-lg text-sm outline-none transition-all focus:border-[#63b3ed] focus:ring-1 focus:ring-[#63b3ed]/20 placeholder-gray-500"
              type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
            />
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 py-2 px-3 rounded-md text-xs text-center flex items-center justify-center gap-1.5 animate-pulse"><X size={12} /> {error}</div>}

          <button className={`mt-2 py-3 border-none rounded-xl bg-gradient-brand text-white text-sm font-bold cursor-pointer transition-all shadow-lg hover:-translate-y-0.5 hover:shadow-blue-500/40 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`} type="submit" disabled={loading}>
            {loading ? <span className="spin border-2 border-white/30 border-t-white rounded-full w-4 h-4 animate-spin" /> : <><span>{isRegister ? 'Create Account' : `Sign in as ${role === 'doctor' ? 'Doctor' : 'Patient'}`}</span><ChevronRight size={14} /></>}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button type="button" className="text-[12px] text-[#63b3ed] hover:text-white transition-colors" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Already have an account? Sign in' : 'Need an account? Register'}
          </button>
        </div>


      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════ */
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('medyai_user') || 'null'); }
    catch { return null; }
  });

  const handleLogin  = (u) => { setUser(u); localStorage.setItem('medyai_user', JSON.stringify(u)); };
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('medyai_user');
    toast('Signed out', { icon: '👋' });
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a2035',
            color: '#e2e8f0',
            border: '1px solid rgba(99,179,237,0.2)',
            borderRadius: '10px',
            fontSize: '0.85rem',
          },
        }}
      />
      {user
        ? <ChatScreen user={user} onLogout={handleLogout} />
        : <LoginScreen onLogin={handleLogin} />
      }
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CHAT SCREEN with conversation history
   ═══════════════════════════════════════════════════════════════ */
function ChatScreen({ user, onLogout }) {
  const role = user.role;

  // Current conversation state
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages]             = useState([]);
  const [input,   setInput]                 = useState('');
  const [loading, setLoading]               = useState(false);

  // Sidebar: saved conversations list
  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs]   = useState(true);

  // Notifications (doctor only)
  const [notifs,     setNotifs]     = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  const endRef = useRef(null);

  // ── Load conversations on mount ──────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/chat/conversations?user_id=${user.id}&role=${role}`);
      const d = await r.json();
      setConversations(d?.conversations || []);
    } catch {
      console.error('Failed to load conversations');
    } finally {
      setLoadingConvs(false);
    }
  }, [user.id, role]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // ── Auto-scroll ──────────────────────────────────────────────
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // ── Notifications (doctor) ───────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    if (role !== 'doctor') return;
    try {
      const r = await fetch(`${API}/api/notifications?doctor_id=${user.id}`);
      const d = await r.json();
      setNotifs(d?.notifications || []);
    } catch { /* silent */ }
  }, [role, user.id]);

  useEffect(() => {
    if (role === 'doctor') {
      fetchNotifs();
      const iv = setInterval(fetchNotifs, 7000);
      return () => clearInterval(iv);
    }
  }, [role, fetchNotifs]);

  const markRead = async () => {
    await fetch(`${API}/api/notifications/read?doctor_id=${user.id}`, { method: 'POST' });
    fetchNotifs();
    toast.success('All notifications cleared');
  };

  // ── Load a saved conversation ────────────────────────────────
  const loadConversation = async (convId) => {
    try {
      const r = await fetch(`${API}/api/chat/conversations/${convId}/messages`);
      const d = await r.json();
      setConversationId(convId);
      setMessages(d?.messages || []);
    } catch {
      toast.error('Failed to load conversation');
    }
  };

  // ── Delete a conversation ────────────────────────────────────
  const deleteConversation = async (convId, e) => {
    e.stopPropagation();
    try {
      await fetch(`${API}/api/chat/conversations/${convId}`, { method: 'DELETE' });
      setConversations(p => p.filter(c => c.id !== convId));
      if (conversationId === convId) {
        setConversationId(null);
        setMessages([]);
      }
      toast.success('Conversation deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  // ── New chat ─────────────────────────────────────────────────
  const newChat = () => {
    setConversationId(null);
    setMessages([]);
    toast('New conversation ✨');
  };

  // ── Send message ─────────────────────────────────────────────
  const send = async (text = input) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg  = { role: 'user', content: trimmed, ts: Date.now() };
    const updated  = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const res  = await fetch(`${API}/api/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated.map(m => ({ role: m.role, content: m.content })),
          role,
          user_id: user.id,
          conversation_id: conversationId,
        }),
      });
      const data = await res.json();

      // If this was a new conversation, capture the ID returned by the server
      if (!conversationId && data.conversation_id) {
        setConversationId(data.conversation_id);
      }

      if (data.response) {
        setMessages([...updated, { ...data.response, ts: Date.now() }]);
        if (role === 'doctor') fetchNotifs();
      }

      // Refresh sidebar conversation list
      fetchConversations();

    } catch {
      setMessages([...updated, {
        role: 'assistant',
        content: '⚠️ Backend unreachable. Is the server running on port 8000?',
        ts: Date.now(),
        tools_used: [],
      }]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const safeNotifs = Array.isArray(notifs) ? notifs : [];
  const unread     = safeNotifs.filter(n => !n.read).length;

  const patientQuicks = [
    { icon: '🩺', label: "Check Availability",  prompt: "Check a doctor's availability for tomorrow." },
    { icon: '📅', label: 'Book appointment',     prompt: "Book an appointment for tomorrow at 10 AM for a checkup." },
    { icon: '🔄', label: 'Reschedule',           prompt: "Reschedule my latest appointment to the next free slot." },
    { icon: '❌', label: 'Cancel appointment',    prompt: "Cancel my latest scheduled appointment." },
    { icon: '👨‍⚕️', label: 'All doctors',          prompt: "Show me all available doctors and their specializations." },
  ];

  const doctorQuicks = [
    { icon: '📊', label: "Today's appointments",  prompt: "How many appointments do I have today?" },
    { icon: '🤒', label: 'Fever patients',         prompt: "How many patients came in with fever?" },
    { icon: '📋', label: "Yesterday's visits",     prompt: "How many visits did we have yesterday?" },
    { icon: '🔔', label: 'Summary + WhatsApp',     prompt: "Summarize this week and send me a notification via WhatsApp." },
    { icon: '📈', label: 'Weekly report',          prompt: "Give me a summary report for this week." },
  ];

  const quicks = role === 'doctor' ? doctorQuicks : patientQuicks;

  // Format relative time
  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex h-screen w-screen bg-[#060a13] text-[#ecf0f6] overflow-hidden font-sans relative">
      {/* Dynamic Background */}
      <div className="absolute top-[5%] left-[15%] w-[50%] h-[50%] bg-[#63b3ed] opacity-[0.06] blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[5%] right-[15%] w-[50%] h-[50%] bg-[#68d391] opacity-[0.04] blur-[100px] rounded-full pointer-events-none" />

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside className="w-[290px] min-w-[290px] bg-[#0a0f19]/95 border-r border-white/5 flex flex-col z-10 backdrop-blur-md transition-all">
        <div className="p-5 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-transparent bg-clip-text text-gradient-brand">
            <div className="text-[#63b3ed]"><Activity size={22} strokeWidth={2.5} /></div>
            <span>MedyAI</span>
          </div>

          <div className="flex items-center gap-2.5 mt-5 p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
            <div className={`w-9 h-9 flex items-center justify-center rounded-lg text-lg shrink-0 border ${
              role === 'doctor' ? 'bg-[#68d391]/10 border-[#68d391]/20' : 'bg-[#63b3ed]/10 border-[#63b3ed]/20'
            }`}>
              {role === 'doctor' ? '👨‍⚕️' : '🧑'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate text-[#ecf0f6]">{user.name}</div>
              <div className="text-[11px] text-[#4a5568] uppercase tracking-wider font-medium">
                {role === 'doctor' ? (user.specialization || 'Doctor') : 'Patient'}
              </div>
            </div>
            <button className="p-1.5 text-[#8b95a5] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" onClick={onLogout} title="Sign out">
              <LogOut size={15} />
            </button>
          </div>

          <button className="w-full flex items-center justify-center gap-2 mt-4 py-2.5 border border-dashed border-white/20 rounded-xl text-sm font-medium text-[#8b95a5] hover:border-[#63b3ed] hover:text-[#63b3ed] hover:bg-[#63b3ed]/10 transition-all" onClick={newChat}>
            <Plus size={16} /> New chat
          </button>
        </div>

        {/* Conversation History */}
        <div className="flex-[1] overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-white/10">
          <p className="text-[10px] uppercase tracking-widest text-[#4a5568] px-3 pb-2 font-bold">Conversation History</p>
          {loadingConvs ? (
            <p className="text-sm text-[#4a5568] italic px-3 pt-2">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-[#4a5568] italic px-3 pt-2">No conversations yet</p>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer mb-0.5 ${
                  conversationId === conv.id
                    ? 'bg-white/10 text-[#ecf0f6] border border-white/10'
                    : 'text-[#8b95a5] hover:text-[#ecf0f6] hover:bg-white/5 border border-transparent'
                }`}
                onClick={() => loadConversation(conv.id)}
              >
                <MessageCircle size={13} className="shrink-0 opacity-40" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-[13px]">{conv.title || 'Untitled'}</div>
                  <div className="flex items-center gap-2 text-[10px] text-[#4a5568] mt-0.5">
                    <span>{timeAgo(conv.updated_at)}</span>
                    <span>·</span>
                    <span>{conv.message_count || 0} msgs</span>
                  </div>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 p-1 text-[#8b95a5] hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                  onClick={(e) => deleteConversation(conv.id, e)}
                  title="Delete conversation"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────── */}
      <div className="flex-[1] flex flex-col min-w-0 relative z-10 w-full">

        {/* Top bar */}
        <header className="h-[64px] min-h-[64px] px-8 flex justify-between items-center border-b border-white/5 bg-[#0a0f19]/80 backdrop-blur-md z-20 w-full transition-all">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#68d391] shadow-[0_0_8px_#68d391] animate-pulse" />
            <span className="text-[15px] font-semibold tracking-wide flex items-center">
              {role === 'doctor' ? `Dr. ${user.name} Dashboard` : 'Patient Portal'}
            </span>
            {conversationId && (
              <span className="text-[11px] text-[#4a5568] ml-2 bg-white/5 px-2 py-0.5 rounded-full">
                Conv #{conversationId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {role === 'doctor' && (
              <button
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${unread > 0 ? 'bg-[#f56565]/10 border-[#f56565]/30 text-[#f56565]' : 'bg-white/5 border-white/10 text-[#8b95a5] hover:bg-white/10 hover:text-white'}`}
                onClick={() => { setShowNotifs(!showNotifs); fetchNotifs(); }}
              >
                <Bell size={18} />
                {unread > 0 && <span className="absolute -top-1.5 -right-1.5 bg-[#f56565] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#060a13] shadow-md animate-bounce">{unread}</span>}
              </button>
            )}
          </div>
        </header>

        {/* Notifications panel */}
        {showNotifs && role === 'doctor' && (
          <div className="absolute top-[75px] right-6 w-80 max-h-[400px] bg-[#0c1220] border border-white/10 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in">
            <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center bg-white/5">
              <span className="font-semibold text-sm">🔔 Notifications</span>
              <div className="flex gap-2">
                <button className="text-xs text-[#63b3ed] hover:text-white transition-colors" onClick={markRead}>Mark all read</button>
                <button className="text-[#8b95a5] hover:text-white transition-colors p-1 rounded-md bg-white/5 hover:bg-white/10" onClick={() => setShowNotifs(false)}><X size={14} /></button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2 scrollbar-thin scrollbar-thumb-white/10">
              {safeNotifs.length === 0
                ? <p className="text-sm text-[#4a5568] text-center p-4">No notifications yet</p>
                : safeNotifs.map(n => (
                  <div key={n.id} className={`p-3 border-b border-white/5 last:border-0 rounded-lg transition-colors ${n.read ? 'opacity-60' : 'bg-white/5 border-l-2 border-l-[#63b3ed]'}`}>
                    <p className="text-sm text-[#ecf0f6] leading-relaxed break-words">{n.message}</p>
                    <p className="text-[10px] text-[#4a5568] mt-1.5">
                      {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                    </p>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6 scroll-smooth scrollbar-thin scrollbar-thumb-white/10">
          {(messages?.length === 0 && !loading) && (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-2xl mx-auto animate-fade-up">
              <div className="w-20 h-20 rounded-2xl bg-gradient-brand flex items-center justify-center mb-6 shadow-[0_12px_40px_rgba(99,179,237,0.3)] hover:scale-105 transition-transform cursor-default">
                <Activity size={36} strokeWidth={1} className="text-white" />
              </div>
              <h2 className="text-3xl font-extrabold text-transparent bg-clip-text text-gradient-brand tracking-tight mb-3">
                {role === 'doctor' ? `Good day, Dr. ${user.name}` : `Hello, ${user.name}`}
              </h2>
              <p className="text-[#8b95a5] text-[15px] leading-relaxed max-w-md mx-auto mb-8 font-medium">
                {role === 'patient'
                  ? 'Ask me to check availability, book, reschedule, or cancel appointments — in plain English.'
                  : 'Ask about today\'s schedule, patient stats, or trigger a summary notification via WhatsApp.'}
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {quicks.map((q, i) => (
                  <button key={i} className={`flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-[#8b95a5] transition-all hover:-translate-y-0.5 shadow-sm ${role === 'doctor' ? 'hover:border-[#68d391] hover:text-[#68d391] hover:bg-[#68d391]/10 hover:shadow-[0_0_20px_rgba(104,211,145,0.15)]' : 'hover:border-[#63b3ed] hover:text-[#63b3ed] hover:bg-[#63b3ed]/10 hover:shadow-[0_0_20px_rgba(99,179,237,0.15)]'}`} onClick={() => send(q.prompt)}>
                    <span className="text-lg">{q.icon}</span>
                    <span>{q.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(messages) && messages.map((m, i) => (
            <div key={i} className={`flex w-full animate-slide-up ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center flex-shrink-0 mr-3 shadow-md mt-1">
                  <Activity size={16} strokeWidth={2} className="text-white" />
                </div>
              )}
              <div className={`max-w-[75%] px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed relative border shadow-sm ${
                m.role === 'user'
                  ? 'bg-gradient-to-br from-[#1a365d] to-[#1e3a5f] text-blue-50 border-blue-500/20 rounded-br-sm shadow-blue-900/50'
                  : 'bg-[#141c2c]/85 border-white/10 text-gray-100 rounded-bl-sm pb-5'
              }`}>
                <div className={`prose prose-invert break-words max-w-none prose-p:my-1.5 prose-ul:my-2 prose-li:my-0.5 whitespace-pre-wrap ${m.role === 'assistant' ? 'text-gray-100' : 'text-blue-50'}`}>
                  {String(m.content || "")}
                </div>

                {m.tools_used && m.tools_used.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-white/5 opacity-80">
                    {Array.isArray(m.tools_used) && m.tools_used.map((t, j) => (
                      <span key={j} className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        <Wrench size={10} /> {t}
                      </span>
                    ))}
                  </div>
                )}

                <time className={`absolute bottom-1 text-[10px] opacity-50 ${m.role === 'user' ? 'left-3' : 'right-3'}`}>
                  {m.ts ? new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </time>
              </div>
              {m.role === 'user' && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-3 shadow-md border mt-1 ${role === 'doctor' ? 'bg-[#68d391]/20 border-[#68d391]/30' : 'bg-[#63b3ed]/20 border-[#63b3ed]/30'}`}>
                  {role === 'doctor' ? '👨‍⚕️' : '🧑'}
                </div>
              )}
            </div>
          ))}

          {loading && (
             <div className="flex w-full justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center flex-shrink-0 mr-3 shadow-md mt-1">
                  <Activity size={16} strokeWidth={2} className="text-white" />
              </div>
              <div className="px-5 py-4 rounded-2xl rounded-bl-sm bg-[#141c2c] border border-white/10 flex items-center gap-1.5 shadow-sm">
                 <div className="w-1.5 h-1.5 rounded-full bg-[#8b95a5] animate-bounce" style={{animationDelay: '0ms'}}></div>
                 <div className="w-1.5 h-1.5 rounded-full bg-[#8b95a5] animate-bounce" style={{animationDelay: '150ms'}}></div>
                 <div className="w-1.5 h-1.5 rounded-full bg-[#8b95a5] animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input bar */}
        <div className="px-8 pb-6 pt-2 bg-gradient-to-t from-[#060a13] to-transparent z-20">
          <div className="flex items-end bg-[#101726]/90 border border-white/10 rounded-2xl shadow-xl shadow-black/40 p-2 overflow-hidden focus-within:ring-2 focus-within:ring-[#63b3ed]/30 focus-within:border-[#63b3ed] transition-all backdrop-blur-xl relative">
             <textarea
              className="flex-1 bg-transparent max-h-[160px] min-h-[44px] text-[15px] resize-none outline-none px-3 py-2.5 text-[#ecf0f6] placeholder-gray-500 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 leading-relaxed font-sans"
              rows={1}
              placeholder={
                role === 'patient'
                  ? 'Book an appointment for tomorrow morning…'
                  : 'How many patients had fever this week?'
              }
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={onKey}
              disabled={loading}
            />
            <button
              className={`p-3 ml-2 rounded-xl transition-all shadow-md flex-shrink-0 ${!input.trim() || loading ? 'bg-white/5 text-[#4a5568] cursor-not-allowed border border-white/5' : role === 'doctor' ? 'bg-gradient-to-r from-[#22543d] to-[#276749] text-white hover:shadow-[0_0_15px_rgba(104,211,145,0.4)] hover:-translate-y-0.5 active:translate-y-0 border border-[#68d391]/30' : 'bg-gradient-to-r from-[#1a365d] to-[#2a4365] text-white hover:shadow-[0_0_15px_rgba(99,179,237,0.4)] hover:-translate-y-0.5 active:translate-y-0 border border-[#63b3ed]/30'}`}
              onClick={() => send()}
              disabled={loading || !input.trim()}
            >
              <Send size={18} className={!input.trim() || loading ? '' : 'translate-x-[1px] -translate-y-[1px]'} />
            </button>
          </div>
          <p className="text-center text-[11px] text-[#4a5568] mt-2.5 font-medium tracking-wide">Enter to send · Shift+Enter for newline</p>
        </div>
      </div>
    </div>
  );
}