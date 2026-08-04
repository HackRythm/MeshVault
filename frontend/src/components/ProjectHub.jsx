import { useState, useEffect } from 'react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { projectApi, workspaceApi, dsaApi } from '../services/api';
import { HiPlus, HiSearch, HiClock, HiTag } from 'react-icons/hi';

const statusConfig = {
  planning:  { label: 'Planning', variant: 'muted' },
  active:    { label: 'Active', variant: 'accent' },
  review:    { label: 'Review', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  archived:  { label: 'Archived', variant: 'muted' },
};

const priorityConfig = {
  low:      { label: 'Low', variant: 'muted' },
  medium:   { label: 'Medium', variant: 'accent' },
  high:     { label: 'High', variant: 'warning' },
  critical: { label: 'Critical', variant: 'alert' },
};

export default function ProjectHub() {
  const [projects, setProjects] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showWsCreate, setShowWsCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [projectForm, setProjectForm] = useState({
    title: '', description: '', workspace: '', status: 'planning',
    priority: 'medium', deadline: '', tags: '',
  });
  const [wsForm, setWsForm] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projRes, wsRes] = await Promise.allSettled([
        projectApi.getAll(),
        workspaceApi.getAll(),
      ]);
      if (projRes.status === 'fulfilled') setProjects(projRes.value.data.projects || []);
      if (wsRes.status === 'fulfilled') setWorkspaces(wsRes.value.data.workspaces || []);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  // Trie search
  useEffect(() => {
    if (!searchQuery) { setSuggestions([]); setShowSuggestions(false); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await dsaApi.autocomplete(searchQuery, 6);
        setSuggestions(data.suggestions || []);
        setShowSuggestions((data.suggestions || []).length > 0);
      } catch { setSuggestions([]); }
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const payload = {
        ...projectForm,
        tags: projectForm.tags ? projectForm.tags.split(',').map(t => t.trim()) : [],
        deadline: projectForm.deadline || undefined,
      };
      await projectApi.create(payload);
      setShowCreate(false);
      setProjectForm({ title: '', description: '', workspace: '', status: 'planning', priority: 'medium', deadline: '', tags: '' });
      // Index title in trie
      try { await dsaApi.insertTerms([payload.title]); } catch {}
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create project');
    }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    try {
      await workspaceApi.create(wsForm);
      setShowWsCreate(false);
      setWsForm({ name: '', description: '' });
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create workspace');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project?')) return;
    try {
      await projectApi.delete(id);
      loadData();
    } catch { /* handled */ }
  };

  const filteredProjects = projects.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.tags?.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const deadlineCountdown = (deadline) => {
    if (!deadline) return null;
    const diff = new Date(deadline) - new Date();
    const days = Math.ceil(diff / 86400000);
    if (days < 0) return { text: `${Math.abs(days)}d overdue`, variant: 'alert' };
    if (days <= 3) return { text: `${days}d left`, variant: 'warning' };
    return { text: `${days}d left`, variant: 'accent' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search projects (Trie)..."
              className="bg-canvas border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-body placeholder-muted
                focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all w-64"
            />
            {showSuggestions && (
              <div className="absolute top-full mt-1 w-full bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted border-b border-border">
                  Trie Results
                </div>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onMouseDown={() => { setSearchQuery(s); setShowSuggestions(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-body hover:bg-surface-hover transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-canvas border border-border rounded-lg px-3 py-2 text-sm text-body
              focus:outline-none focus:border-accent transition-all"
          >
            <option value="">All Statuses</option>
            {Object.entries(statusConfig).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowWsCreate(true)} icon={<HiPlus />}>
            Workspace
          </Button>
          <Button variant="primary" size="md" onClick={() => setShowCreate(true)} icon={<HiPlus />}>
            New Project
          </Button>
        </div>
      </div>

      {/* Workspace info */}
      {workspaces.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {workspaces.map(ws => (
            <Badge key={ws._id} variant="accent" icon="📁">{ws.name}</Badge>
          ))}
        </div>
      )}

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-surface border border-border rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-border rounded w-3/4 mb-3" />
              <div className="h-3 bg-border rounded w-full mb-2" />
              <div className="h-3 bg-border rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const dl = deadlineCountdown(project.deadline);
            const sc = statusConfig[project.status] || statusConfig.planning;
            const pc = priorityConfig[project.priority] || priorityConfig.medium;
            return (
              <Card key={project._id} padding="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-heading line-clamp-1 flex-1">{project.title}</h3>
                  <button onClick={() => handleDelete(project._id)} className="text-muted hover:text-alert text-xs ml-2 transition-colors">✕</button>
                </div>
                {project.description && (
                  <p className="text-xs text-muted line-clamp-2 mb-3">{project.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant={sc.variant}>{sc.label}</Badge>
                  <Badge variant={pc.variant}>{pc.label}</Badge>
                  {dl && <Badge variant={dl.variant} icon={<HiClock />}>{dl.text}</Badge>}
                </div>
                {project.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border">
                    {project.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-canvas rounded text-[10px] text-muted">
                        <HiTag className="text-[8px]" />{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-[10px] text-muted mt-2 pt-2 border-t border-border">
                  {project.tasks?.length || 0} tasks · {project.sprintCapacity || 40}h capacity
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card hover={false} className="text-center py-12">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-heading font-semibold">No projects yet</h3>
          <p className="text-muted text-sm mt-1">Create a workspace first, then add your first project</p>
          <Button variant="primary" size="md" className="mt-4" onClick={() => setShowCreate(true)} icon={<HiPlus />}>
            Create Project
          </Button>
        </Card>
      )}

      {/* Create Project Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Title</label>
            <input
              type="text" required value={projectForm.title}
              onChange={e => setProjectForm({ ...projectForm, title: e.target.value })}
              className="input-field" placeholder="e.g. AVL Tree Implementation"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Description</label>
            <textarea
              value={projectForm.description}
              onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
              className="input-field resize-none h-20" placeholder="Project description..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Workspace</label>
            <select
              required value={projectForm.workspace}
              onChange={e => setProjectForm({ ...projectForm, workspace: e.target.value })}
              className="input-field"
            >
              <option value="">Select workspace</option>
              {workspaces.map(ws => (
                <option key={ws._id} value={ws._id}>{ws.name}</option>
              ))}
            </select>
            {workspaces.length === 0 && (
              <p className="text-xs text-alert mt-1">Create a workspace first</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Status</label>
              <select value={projectForm.status} onChange={e => setProjectForm({ ...projectForm, status: e.target.value })} className="input-field">
                {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Priority</label>
              <select value={projectForm.priority} onChange={e => setProjectForm({ ...projectForm, priority: e.target.value })} className="input-field">
                {Object.entries(priorityConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Deadline</label>
            <input type="datetime-local" value={projectForm.deadline}
              onChange={e => setProjectForm({ ...projectForm, deadline: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Tags (comma-separated)</label>
            <input type="text" value={projectForm.tags}
              onChange={e => setProjectForm({ ...projectForm, tags: e.target.value })}
              className="input-field" placeholder="dsa, algorithm, tree"
            />
          </div>
          {formError && <p className="text-sm text-alert">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Project</Button>
          </div>
        </form>
      </Modal>

      {/* Create Workspace Modal */}
      <Modal isOpen={showWsCreate} onClose={() => setShowWsCreate(false)} title="New Workspace">
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Name</label>
            <input type="text" required value={wsForm.name}
              onChange={e => setWsForm({ ...wsForm, name: e.target.value })}
              className="input-field" placeholder="e.g. Semester 3 Projects"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Description</label>
            <textarea value={wsForm.description}
              onChange={e => setWsForm({ ...wsForm, description: e.target.value })}
              className="input-field resize-none h-20" placeholder="Workspace description..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowWsCreate(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Workspace</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
