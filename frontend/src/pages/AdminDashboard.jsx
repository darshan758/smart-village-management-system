import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import StatsCard from '../components/StatsCard';
import MapComponent from '../components/MapComponent';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';
import {
  CATEGORIES, STATUS_LIST, PRIORITY_LIST,
  STATUS_COLORS, CATEGORY_ICONS, CATEGORY_COLORS, formatDateTime, timeAgo,
} from '../utils/helpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Users, FileText, Clock, CheckCircle, XCircle, AlertTriangle,
  Search, Filter, Trash2, Eye, Map, BarChart2, User,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ── Tab values ── */
const TABS = [
  { id: 'overview',   label: 'Overview',   icon: BarChart2 },
  { id: 'complaints', label: 'Complaints', icon: FileText  },
  { id: 'map',        label: 'Map',        icon: Map       },
  { id: 'users',      label: 'Users',      icon: Users     },
];

export default function AdminDashboard() {
  const [tab, setTab]             = useState('overview');
  const [stats, setStats]         = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [users, setUsers]         = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [darkMode, setDarkMode]   = useState(false);

  // Filters
  const [filters, setFilters] = useState({ status: '', category: '', priority: '', search: '' });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Status update modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: '', adminNote: '' });
  const [updating, setUpdating] = useState(false);

  const toggleDark = () => {
    setDarkMode((d) => { document.documentElement.classList.toggle('dark', !d); return !d; });
  };

  /* ── Fetch stats ── */
  useEffect(() => {
    api.get('/admin/stats')
      .then(({ data }) => setStats(data))
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false));

    api.get('/complaints/locations')
      .then(({ data }) => setLocations(data.complaints));
  }, []);

  /* ── Fetch complaints ── */
  const fetchComplaints = useCallback(async (page = 1) => {
    const params = new URLSearchParams({ page, limit: 12 });
    if (filters.status)   params.append('status', filters.status);
    if (filters.category) params.append('category', filters.category);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.search)   params.append('search', filters.search);

    try {
      const { data } = await api.get(`/admin/complaints?${params}`);
      setComplaints(data.complaints);
      setPagination({ page: data.page, pages: data.pages, total: data.total });
    } catch { toast.error('Failed to load complaints'); }
  }, [filters]);

  useEffect(() => { if (tab === 'complaints') fetchComplaints(1); }, [tab, fetchComplaints]);

  /* ── Fetch users ── */
  useEffect(() => {
    if (tab === 'users') {
      api.get('/admin/users').then(({ data }) => setUsers(data.users));
    }
  }, [tab]);

  /* ── Update status ── */
  const handleStatusUpdate = async () => {
    if (!statusForm.status) return toast.error('Select a status');
    setUpdating(true);
    try {
      const { data } = await api.put(`/admin/complaints/${selectedComplaint._id}/status`, statusForm);
      toast.success('Status updated!');
      setComplaints((prev) => prev.map((c) => c._id === data.complaint._id ? data.complaint : c));
      setSelectedComplaint(null);
      setStatusForm({ status: '', adminNote: '' });
      if (stats) setStats((s) => ({ ...s })); // trigger re-render
    } catch { toast.error('Update failed'); }
    finally { setUpdating(false); }
  };

  /* ── Delete complaint ── */
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this complaint permanently?')) return;
    try {
      await api.delete(`/admin/complaints/${id}`);
      setComplaints((prev) => prev.filter((c) => c._id !== id));
      toast.success('Complaint deleted');
    } catch { toast.error('Delete failed'); }
  };

  /* ── Toggle user ── */
  const handleToggleUser = async (id) => {
    try {
      const { data } = await api.put(`/admin/users/${id}/toggle`);
      setUsers((prev) => prev.map((u) => u._id === id ? data.user : u));
      toast.success(data.message);
    } catch { toast.error('Failed'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar darkMode={darkMode} toggleDark={toggleDark} />
      <div className="flex justify-center py-24"><LoadingSpinner size="lg" text="Loading admin dashboard…" /></div>
    </div>
  );

  const pieData = stats?.categoryStats?.map((s) => ({
    name: s._id, value: s.count, color: CATEGORY_COLORS[s._id] || '#8b5cf6',
  })) || [];

  const barData = stats?.monthlyTrend?.map((t) => ({
    name: new Date(t._id.year, t._id.month - 1).toLocaleString('default', { month: 'short' }),
    Complaints: t.count,
  })) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar darkMode={darkMode} toggleDark={toggleDark} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Smart Village Civic Management System</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === id ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {tab === 'overview' && stats && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatsCard label="Total"       value={stats.stats.total}      icon={FileText}    color="primary" />
              <StatsCard label="Pending"     value={stats.stats.pending}    icon={Clock}       color="yellow"  />
              <StatsCard label="In Progress" value={stats.stats.inProgress} icon={AlertTriangle} color="blue"  />
              <StatsCard label="Resolved"    value={stats.stats.resolved}   icon={CheckCircle} color="green"   />
              <StatsCard label="Rejected"    value={stats.stats.rejected}   icon={XCircle}     color="red"     />
              <StatsCard label="Users"       value={stats.stats.totalUsers} icon={User}        color="purple"  />
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Bar chart — monthly */}
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Monthly Complaints (last 6 months)</h3>
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="Complaints" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-400 text-sm text-center py-12">No data yet</p>}
              </div>

              {/* Pie chart — categories */}
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Complaints by Category</h3>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                      <Legend iconType="circle" iconSize={10} formatter={(v) => <span style={{ fontSize: 12 }}>{CATEGORY_ICONS[v]} {v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-400 text-sm text-center py-12">No data yet</p>}
              </div>
            </div>

            {/* Recent complaints */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Recent Complaints</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700">
                      <th className="pb-3 pr-4">Tracking ID</th>
                      <th className="pb-3 pr-4">Title</th>
                      <th className="pb-3 pr-4">Category</th>
                      <th className="pb-3 pr-4">User</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {stats.recentComplaints.map((c) => (
                      <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="py-3 pr-4 font-mono text-xs text-gray-500">{c.trackingId}</td>
                        <td className="py-3 pr-4 font-medium text-gray-800 dark:text-white max-w-[180px] truncate">{c.title}</td>
                        <td className="py-3 pr-4 text-gray-500">{CATEGORY_ICONS[c.category]} {c.category}</td>
                        <td className="py-3 pr-4 text-gray-500">{c.user?.name}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                        </td>
                        <td className="py-3 text-gray-400 text-xs">{timeAgo(c.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Complaints Tab ── */}
        {tab === 'complaints' && (
          <div className="animate-fade-in">
            {/* Filters */}
            <div className="card p-4 mb-5 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  placeholder="Search title, ID, description…"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="input-field pl-9 text-sm"
                />
              </div>
              {[
                { key: 'status', options: STATUS_LIST,   placeholder: 'All Status' },
                { key: 'category', options: CATEGORIES,  placeholder: 'All Categories' },
                { key: 'priority', options: PRIORITY_LIST, placeholder: 'All Priority' },
              ].map(({ key, options, placeholder }) => (
                <select
                  key={key}
                  value={filters[key]}
                  onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
                  className="input-field text-sm min-w-[140px] flex-shrink-0"
                >
                  <option value="">{placeholder}</option>
                  {options.map((o) => <option key={o}>{o}</option>)}
                </select>
              ))}
              {Object.values(filters).some(Boolean) && (
                <button onClick={() => setFilters({ status: '', category: '', priority: '', search: '' })} className="btn-secondary text-sm">
                  Clear
                </button>
              )}
            </div>

            <p className="text-sm text-gray-500 mb-3">{pagination.total} complaints found</p>

            {/* Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                      {['Tracking ID', 'Title', 'Category', 'User', 'Priority', 'Status', 'Date', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {complaints.map((c) => (
                      <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.trackingId}</td>
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-white max-w-[180px] truncate">
                          {c.title}
                          {c.image && <span className="ml-1 text-gray-400 text-xs">📷</span>}
                          {c.latitude && <span className="ml-1 text-blue-400 text-xs">📍</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{CATEGORY_ICONS[c.category]} {c.category}</td>
                        <td className="px-4 py-3 text-gray-500">
                          <div className="text-xs">{c.user?.name}</div>
                          <div className="text-xs text-gray-400">{c.user?.village}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{c.priority}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{timeAgo(c.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setSelectedComplaint(c); setStatusForm({ status: c.status, adminNote: c.adminNote || '' }); }}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Update Status"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(c._id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {complaints.length === 0 && (
                  <div className="text-center py-12 text-gray-400">No complaints found</div>
                )}
              </div>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => fetchComplaints(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium ${
                      pagination.page === p ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Map Tab ── */}
        {tab === 'map' && (
          <div className="card p-3 animate-fade-in">
            <MapComponent complaints={locations} height="600px" />
          </div>
        )}

        {/* ── Users Tab ── */}
        {tab === 'users' && (
          <div className="card overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr className="text-left text-xs text-gray-500 uppercase">
                    {['Name', 'Email', 'Phone', 'Village', 'Complaints', 'Joined', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          {u.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3 text-gray-500">{u.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{u.village || '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-600 font-semibold">{u.totalComplaints}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{timeAgo(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleUser(u._id)}
                          className={`text-xs px-3 py-1 rounded-lg font-medium ${u.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <div className="text-center py-12 text-gray-400">No users found</div>}
            </div>
          </div>
        )}
      </main>

      {/* ── Status Update Modal ── */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedComplaint(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Update Complaint Status</h3>
            <p className="text-sm text-gray-500 mb-5">{selectedComplaint.title}</p>

            {selectedComplaint.image && (
              <img src={selectedComplaint.image} alt="" className="w-full h-40 object-cover rounded-xl mb-4" />
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Status</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select status</option>
                  {STATUS_LIST.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Admin Note (optional)</label>
                <textarea
                  value={statusForm.adminNote}
                  onChange={(e) => setStatusForm({ ...statusForm, adminNote: e.target.value })}
                  rows={3}
                  placeholder="Add a note for the user…"
                  className="input-field resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setSelectedComplaint(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleStatusUpdate} disabled={updating} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {updating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                {updating ? 'Updating…' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
