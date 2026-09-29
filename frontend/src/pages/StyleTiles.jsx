import React, { useState } from 'react';
import { 
  Shield, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ExternalLink, 
  GitCommit, 
  GitPullRequest, 
  Layers, 
  UserCheck, 
  Activity, 
  Search, 
  Command, 
  ChevronRight,
  Database,
  Cpu,
  Lock,
  ArrowRight,
  FolderGit2
} from 'lucide-react';

export default function StyleTiles() {
  const [activeTab, setActiveTab] = useState('tiles'); // 'tiles' | 'login' | 'dashboard' | 'project'
  const [projectTab, setProjectTab] = useState('overview');
  const [activeStep, setActiveStep] = useState(2); // 0..3

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans selection:bg-blue-600 selection:text-white pb-16 relative">
      
      {/* Top Banner: Style Tile Switcher */}
      <header className="border-b border-white/10 bg-black/90 sticky top-0 z-40 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300">
            MESHVAULT // MISSION CONTROL CONSOLE — LIVE STYLE TILES
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <button 
            onClick={() => setActiveTab('tiles')}
            className={`px-3 py-1 rounded transition-colors ${activeTab === 'tiles' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white bg-zinc-900 border border-white/5'}`}
          >
            ALL 3 TILES
          </button>
          <button 
            onClick={() => setActiveTab('login')}
            className={`px-3 py-1 rounded transition-colors ${activeTab === 'login' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white bg-zinc-900 border border-white/5'}`}
          >
            1. LOGIN
          </button>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1 rounded transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white bg-zinc-900 border border-white/5'}`}
          >
            2. DASHBOARD
          </button>
          <button 
            onClick={() => setActiveTab('project')}
            className={`px-3 py-1 rounded transition-colors ${activeTab === 'project' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white bg-zinc-900 border border-white/5'}`}
          >
            3. PROJECT DETAIL
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-16">
        
        {/* DESIGN SYSTEM TOKEN HIGHLIGHTS */}
        {(activeTab === 'tiles') && (
          <section className="space-y-6">
            <div className="mc-eyebrow">
              <span>// DESIGN TOKEN SPECIFICATION</span>
              <span className="text-sky-400 text-xs">· MISSION CONTROL CONSOLE V2</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Token 1: Background & Depth */}
              <div className="mc-card space-y-2">
                <div className="mc-eyebrow text-slate-400">SURFACE & DEPTH</div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Canvas:</span>
                  <span className="text-sky-400 font-bold">#000000 (Pure Black)</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Depth:</span>
                  <span className="text-slate-200">1px Hairline Borders</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Hairline:</span>
                  <span className="text-slate-400">rgba(255,255,255,0.08)</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 border-t border-white/5">
                  No glassmorphism, no backdrop blur, no soft drop shadows.
                </p>
              </div>

              {/* Token 2: Dual Blue Palette */}
              <div className="mc-card space-y-2">
                <div className="mc-eyebrow text-slate-400">DUAL BLUE ACCENT</div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Primary:</span>
                  <span className="flex items-center gap-1.5 text-blue-400 font-bold">
                    <span className="w-2.5 h-2.5 bg-blue-600 rounded-sm"></span>
                    #2563EB / #3B82F6
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Secondary:</span>
                  <span className="flex items-center gap-1.5 text-sky-400 font-bold">
                    <span className="w-2.5 h-2.5 bg-sky-400 rounded-sm"></span>
                    #38BDF8 / #60A5FA
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 border-t border-white/5">
                  No amber, no orange, no gradient blends. Pure corporate-technical signal colors.
                </p>
              </div>

              {/* Token 3: Typography */}
              <div className="mc-card space-y-2">
                <div className="mc-eyebrow text-slate-400">TYPOGRAPHY SPLIT</div>
                <div className="text-xs">
                  <span className="text-slate-400 block font-mono text-[10px]">HEADLINES / UI:</span>
                  <span className="font-bold text-slate-100 text-sm tracking-tight">Geist Sans (Grotesk)</span>
                </div>
                <div className="text-xs pt-1">
                  <span className="text-slate-400 block font-mono text-[10px]">CODES / READOUTS:</span>
                  <span className="font-mono text-sky-400 text-xs font-semibold">JetBrains Mono [WS-CS201]</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 border-t border-white/5">
                  Uppercase eyebrow labels with letter-spacing 0.08em.
                </p>
              </div>

              {/* Token 4: Status Badges */}
              <div className="mc-card space-y-2">
                <div className="mc-eyebrow text-slate-400">MUTED STATE BADGES</div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="mc-badge mc-badge-success">COMPLETED</span>
                  <span className="mc-badge mc-badge-warning">PENDING</span>
                  <span className="mc-badge mc-badge-error">OVERDUE</span>
                  <span className="mc-badge mc-badge-info">SYNCED</span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 border-t border-white/5">
                  Semantic colors stay isolated strictly in state badges.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* STYLE TILE 1: LOGIN PAGE PREVIEW */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {(activeTab === 'tiles' || activeTab === 'login') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="mc-eyebrow">STYLE TILE 01 // AUTHENTICATION INTERFACE</div>
                <h2 className="text-xl font-bold tracking-tight text-white">Login Console Tile</h2>
              </div>
              <span className="mc-badge mc-badge-info">FORMAL & SECURE</span>
            </div>

            <div className="bg-black border border-white/10 rounded p-8 flex items-center justify-center min-h-[460px] relative">
              <div className="w-full max-w-md space-y-6">
                
                {/* Header */}
                <div className="space-y-2 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-white/10 rounded text-xs font-mono text-sky-400">
                    <Shield className="w-3.5 h-3.5 text-blue-500" />
                    <span>UNIVERSITY PORTAL AUTHENTICATION</span>
                  </div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">
                    MeshVault <span className="font-mono text-blue-500 text-sm font-normal">v2.4</span>
                  </h1>
                  <p className="text-xs text-slate-400 font-mono">
                    ENTER CREDENTIALS TO INITIALIZE SESSION
                  </p>
                </div>

                {/* Form Card */}
                <div className="mc-card space-y-4">
                  <div className="space-y-1.5">
                    <label className="mc-eyebrow">UNIVERSITY EMAIL</label>
                    <div className="relative">
                      <input 
                        type="email" 
                        defaultValue="faculty.dsa@university.edu" 
                        className="mc-input font-mono text-slate-200" 
                        placeholder="user@university.edu"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="mc-eyebrow">SECURITY PASSWORD</label>
                      <span className="text-[11px] font-mono text-blue-400 hover:underline cursor-pointer">RESET KEY</span>
                    </div>
                    <input 
                      type="password" 
                      defaultValue="••••••••••••" 
                      className="mc-input font-mono text-slate-200" 
                    />
                  </div>

                  <div className="pt-2">
                    <button className="mc-btn-primary w-full group">
                      <span>AUTHENTICATE SESSION</span>
                      <ArrowRight className="w-4 h-4 text-blue-200 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Telemetry info box */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-white/5 pt-3">
                  <span>SYS_STATUS: ONLINE</span>
                  <span>IP: 192.168.1.104</span>
                  <span>ENCRYPTION: AES-256</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* STYLE TILE 2: DASHBOARD PREVIEW WITH SIDEBAR */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {(activeTab === 'tiles' || activeTab === 'dashboard') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="mc-eyebrow">STYLE TILE 02 // COMMAND DASHBOARD & SIDEBAR</div>
                <h2 className="text-xl font-bold tracking-tight text-white">Dashboard Telemetry & Navigation Tile</h2>
              </div>
              <span className="mc-badge mc-badge-info">MISSION CONTROL LAYOUT</span>
            </div>

            {/* Simulated Shell Container */}
            <div className="bg-black border border-white/10 rounded flex min-h-[580px] overflow-hidden">
              
              {/* PERSISTENT SIDEBAR */}
              <aside className="w-60 bg-black border-r border-white/10 flex flex-col justify-between p-4 shrink-0">
                <div className="space-y-6">
                  {/* Brand header */}
                  <div className="flex items-center gap-2.5 px-2 py-1 border-b border-white/5 pb-3">
                    <div className="w-6 h-6 rounded-sm bg-blue-600 flex items-center justify-center font-mono font-bold text-white text-xs">
                      MV
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white tracking-wide">MESHVAULT</div>
                      <div className="font-mono text-[10px] text-slate-400">WS-CS201 · FACULTY</div>
                    </div>
                  </div>

                  {/* Nav Section 1 */}
                  <div className="space-y-1">
                    <div className="mc-eyebrow px-2">NAVIGATION</div>
                    
                    <a className="flex items-center justify-between px-2.5 py-2 rounded-sm text-xs font-semibold text-white bg-zinc-950 border-l-2 border-blue-500">
                      <div className="flex items-center gap-2.5">
                        <Activity className="w-4 h-4 text-blue-400" />
                        <span>Dashboard</span>
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    </a>

                    <a className="flex items-center justify-between px-2.5 py-2 rounded-sm text-xs text-slate-400 hover:text-white hover:bg-zinc-900 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <Layers className="w-4 h-4 text-slate-500" />
                        <span>Workspaces</span>
                      </div>
                    </a>

                    <a className="flex items-center justify-between px-2.5 py-2 rounded-sm text-xs text-slate-400 hover:text-white hover:bg-zinc-900 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <FolderGit2 className="w-4 h-4 text-slate-500" />
                        <span>Projects</span>
                      </div>
                    </a>

                    <a className="flex items-center justify-between px-2.5 py-2 rounded-sm text-xs text-slate-400 hover:text-white hover:bg-zinc-900 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span>Review Queue</span>
                      </div>
                      {/* Monospace pending badge */}
                      <span className="font-mono text-[10px] bg-blue-950/60 text-sky-400 border border-sky-800/50 px-1.5 py-0.5 rounded font-bold">
                        3
                      </span>
                    </a>
                  </div>

                  {/* Nav Section 2: DSA Engines */}
                  <div className="space-y-1">
                    <div className="mc-eyebrow px-2">ALGORITHM TELEMETRY</div>
                    
                    <a className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors font-mono">
                      <Cpu className="w-3.5 h-3.5 text-slate-500" />
                      <span>Topological Sort</span>
                    </a>

                    <a className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors font-mono">
                      <Database className="w-3.5 h-3.5 text-slate-500" />
                      <span>BST Milestone Map</span>
                    </a>
                  </div>
                </div>

                {/* Sidebar footer */}
                <div className="border-t border-white/5 pt-3 px-2 flex items-center justify-between font-mono text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>ONLINE</span>
                  </div>
                  <span>v2.4.0</span>
                </div>
              </aside>

              {/* DASHBOARD MAIN CONTENT */}
              <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                
                {/* Header */}
                <div className="flex items-start justify-between border-b border-white/10 pb-4">
                  <div>
                    <div className="mc-eyebrow">// SYSTEM TELEMETRY SUMMARY</div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Course Overview Dashboard</h1>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="mc-btn-secondary font-mono text-xs">
                      <Search className="w-3.5 h-3.5 text-slate-400" />
                      <span>SEARCH [⌘K]</span>
                    </button>
                    <button className="mc-btn-primary font-mono text-xs">
                      <span>+ NEW PROJECT</span>
                    </button>
                  </div>
                </div>

                {/* KPI STRIP */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="mc-card space-y-1">
                    <div className="mc-eyebrow">ASSIGNED GROUPS</div>
                    <div className="font-mono text-2xl font-extrabold text-blue-400">04</div>
                    <div className="text-[11px] font-mono text-slate-500">CS201 · LAB SEC A</div>
                  </div>

                  <div className="mc-card space-y-1">
                    <div className="mc-eyebrow">REGISTERED STUDENTS</div>
                    <div className="font-mono text-2xl font-extrabold text-slate-100">128</div>
                    <div className="text-[11px] font-mono text-slate-500">ACTIVE ENROLLMENT</div>
                  </div>

                  <div className="mc-card space-y-1">
                    <div className="mc-eyebrow">PROJECTS TRACKED</div>
                    <div className="font-mono text-2xl font-extrabold text-slate-100">18</div>
                    <div className="text-[11px] font-mono text-slate-500">14 SUBMITTED</div>
                  </div>

                  <div className="mc-card space-y-1">
                    <div className="mc-eyebrow">ACTIVE DEVELOPMENTS</div>
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-2xl font-extrabold text-sky-400">12</div>
                      <span className="flex items-center gap-1 font-mono text-[10px] text-sky-400 bg-sky-950/40 border border-sky-800/40 px-2 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                        LIVE SYNC
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">GITHUB WEBHOOKS ACTIVE</div>
                  </div>
                </div>

                {/* DEADLINES & ACTIVITY GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Table: Upcoming Deadlines (2 cols) */}
                  <div className="md:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="mc-eyebrow">UPCOMING MILESTONE DEADLINES</div>
                      <span className="font-mono text-xs text-blue-400 hover:underline cursor-pointer">VIEW ALL</span>
                    </div>

                    <div className="mc-table-container">
                      <table className="mc-table">
                        <thead>
                          <tr>
                            <th>PROJECT ID</th>
                            <th>NAME</th>
                            <th>GROUP</th>
                            <th>DEADLINE</th>
                            <th>PROGRESS</th>
                            <th>STATUS</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="font-mono text-sky-400 font-semibold">PRJ-8042</td>
                            <td className="font-semibold text-slate-100">GeoPhase Lunar Renderer</td>
                            <td className="font-mono text-slate-400">GRP-04</td>
                            <td className="font-mono text-slate-300">2026-10-04</td>
                            <td>
                              <div className="w-20 bg-zinc-900 border border-white/10 rounded-full h-1.5">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '85%' }}></div>
                              </div>
                            </td>
                            <td><span className="mc-badge mc-badge-success">SUBMITTED</span></td>
                          </tr>
                          <tr>
                            <td className="font-mono text-sky-400 font-semibold">PRJ-7901</td>
                            <td className="font-semibold text-slate-100">Distributed Hash Indexer</td>
                            <td className="font-mono text-slate-400">GRP-09</td>
                            <td className="font-mono text-slate-300">2026-10-08</td>
                            <td>
                              <div className="w-20 bg-zinc-900 border border-white/10 rounded-full h-1.5">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '60%' }}></div>
                              </div>
                            </td>
                            <td><span className="mc-badge mc-badge-warning">PENDING</span></td>
                          </tr>
                          <tr>
                            <td className="font-mono text-sky-400 font-semibold">PRJ-6512</td>
                            <td className="font-semibold text-slate-100">Kahn's DAG Visualizer</td>
                            <td className="font-mono text-slate-400">GRP-02</td>
                            <td className="font-mono text-slate-300">2026-09-28</td>
                            <td>
                              <div className="w-20 bg-zinc-900 border border-white/10 rounded-full h-1.5">
                                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: '30%' }}></div>
                              </div>
                            </td>
                            <td><span className="mc-badge mc-badge-error font-mono">OVERDUE</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Telemetry Audit Stream (1 col) */}
                  <div className="space-y-3">
                    <div className="mc-eyebrow">SYSTEM AUDIT STREAM</div>
                    <div className="mc-card space-y-3 font-mono text-xs">
                      <div className="flex items-start gap-2.5 pb-2.5 border-b border-white/5">
                        <GitCommit className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-slate-200">
                            <span className="font-bold text-sky-400">student_31</span> committed to <span className="text-slate-400">PRJ-8042</span>
                          </p>
                          <span className="text-[10px] text-slate-500">2m ago · hash: 7a8f90c</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 pb-2.5 border-b border-white/5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-slate-200">
                            <span className="font-bold text-slate-300">Prof. Miller</span> released grade for <span className="text-slate-400 font-bold">PRJ-7901</span>
                          </p>
                          <span className="text-[10px] text-slate-500">14m ago · Score: 96/100</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-slate-200">
                            Review request enqueued for <span className="text-slate-400 font-bold">PRJ-8042</span>
                          </p>
                          <span className="text-[10px] text-slate-500">1h ago · FIFO pos: #1</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* STYLE TILE 3: PROJECT DETAIL WITH DASHED ARCHITECTURE & TABS */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {(activeTab === 'tiles' || activeTab === 'project') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="mc-eyebrow">STYLE TILE 03 // PROJECT DOSSIER & ARCHITECTURE</div>
                <h2 className="text-xl font-bold tracking-tight text-white">Project Detail Telemetry & Tabs Tile</h2>
              </div>
              <span className="mc-badge mc-badge-info">ENGINEERING DOSSIER</span>
            </div>

            <div className="bg-black border border-white/10 rounded p-6 space-y-6 min-h-[580px]">
              
              {/* Project Dossier Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-blue-400 font-bold bg-blue-950/50 border border-blue-800/40 px-2 py-0.5 rounded">
                      PRJ-8042
                    </span>
                    <span className="text-xs text-slate-400 font-mono">WORKSPACE: CS201-2026</span>
                    <span className="mc-badge mc-badge-success">SUBMITTED</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    GeoPhase Lunar Surface Engine
                  </h1>
                  <p className="text-xs text-slate-400 max-w-2xl">
                    High-performance memory-resident terrain mesh indexing system built on Kahn's Topological Algorithm and custom BST progress trees.
                  </p>
                </div>

                {/* Stage dot sequence */}
                <div className="space-y-2 text-right">
                  <div className="mc-eyebrow justify-end">MILESTONE STAGE</div>
                  <div className="mc-stage-dots justify-end">
                    <span className="mc-stage-dot cursor-pointer" onClick={() => setActiveStep(0)}></span>
                    <span className="mc-stage-dot cursor-pointer" onClick={() => setActiveStep(1)}></span>
                    <span className="mc-stage-dot mc-stage-dot-active cursor-pointer" onClick={() => setActiveStep(2)}></span>
                    <span className="mc-stage-dot cursor-pointer" onClick={() => setActiveStep(3)}></span>
                  </div>
                  <div className="font-mono text-[11px] text-sky-400">STAGE 3 / 4 ACTIVE</div>
                </div>
              </div>

              {/* TAB SWITCHER (Flat Bottom Border Style) */}
              <div className="mc-tabs">
                <button 
                  onClick={() => setProjectTab('overview')}
                  className={`mc-tab ${projectTab === 'overview' ? 'mc-tab-active' : ''}`}
                >
                  ARCHITECTURE OVERVIEW
                </button>
                <button 
                  onClick={() => setProjectTab('milestones')}
                  className={`mc-tab ${projectTab === 'milestones' ? 'mc-tab-active' : ''}`}
                >
                  MILESTONE MATRIX
                </button>
                <button 
                  onClick={() => setProjectTab('github')}
                  className={`mc-tab ${projectTab === 'github' ? 'mc-tab-active' : ''}`}
                >
                  GITHUB TELEMETRY
                </button>
                <button 
                  onClick={() => setProjectTab('grading')}
                  className={`mc-tab ${projectTab === 'grading' ? 'mc-tab-active' : ''}`}
                >
                  FACULTY EVALUATION
                </button>
              </div>

              {/* DASHED CONNECTOR ARCHITECTURE DIAGRAM */}
              <div className="space-y-3">
                <div className="mc-eyebrow">// ALGORITHM DATA PIPELINE DIAGRAM</div>
                
                <div className="bg-zinc-950 border border-white/10 rounded p-5">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center relative">
                    
                    {/* Box 1 */}
                    <div className="mc-diagram-box space-y-1 text-center">
                      <div className="mc-eyebrow text-slate-500 justify-center">STAGE 01</div>
                      <div className="font-mono text-xs font-bold text-slate-200">REPO INGESTION</div>
                      <div className="text-[10px] font-mono text-slate-500">GitHub Commit Webhook</div>
                    </div>

                    {/* Dashed connector */}
                    <div className="hidden md:flex items-center justify-center relative">
                      <div className="w-full border-t-2 border-dashed border-blue-500/50"></div>
                      <span className="absolute font-mono text-[9px] bg-black text-sky-400 border border-blue-900 px-1.5 py-0.5 rounded">
                        O(1) HASH
                      </span>
                    </div>

                    {/* Box 2 */}
                    <div className="mc-diagram-box space-y-1 text-center border-blue-500/40 bg-blue-950/20">
                      <div className="mc-eyebrow text-blue-400 justify-center">STAGE 02</div>
                      <div className="font-mono text-xs font-bold text-sky-300">HASH SEARCH INDEX</div>
                      <div className="text-[10px] font-mono text-slate-400">ProjectSearchIndex</div>
                    </div>

                    {/* Dashed connector */}
                    <div className="hidden md:flex items-center justify-center relative">
                      <div className="w-full border-t-2 border-dashed border-slate-700"></div>
                      <span className="absolute font-mono text-[9px] bg-black text-slate-400 border border-white/10 px-1.5 py-0.5 rounded">
                        O(log N) BST
                      </span>
                    </div>

                  </div>

                  {/* Box 3 & 4 lower row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
                    <div className="mc-diagram-box flex items-center justify-between">
                      <div>
                        <div className="mc-eyebrow text-slate-500">DATA STRUCTURE</div>
                        <div className="font-mono text-xs text-slate-200">ProgressBST Engine</div>
                      </div>
                      <span className="font-mono text-xs text-emerald-400">18 NODES LOADED</span>
                    </div>

                    <div className="mc-diagram-box flex items-center justify-between">
                      <div>
                        <div className="mc-eyebrow text-slate-500">QUEUE PIPELINE</div>
                        <div className="font-mono text-xs text-slate-200">FIFO Review Queue</div>
                      </div>
                      <span className="font-mono text-xs text-blue-400">POSITION #1</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Table Preview */}
              <div className="space-y-3">
                <div className="mc-eyebrow">// STUDENT GRADING MATRIX SUMMARY</div>
                <div className="mc-table-container">
                  <table className="mc-table">
                    <thead>
                      <tr>
                        <th>STUDENT ID</th>
                        <th>NAME</th>
                        <th>ROLE</th>
                        <th>COMMITS</th>
                        <th>CRITERION SCORE</th>
                        <th>GRADE</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-mono text-sky-400">STD-2024-01</td>
                        <td className="font-semibold text-slate-200">Alex Morgan</td>
                        <td><span className="mc-badge mc-badge-info">LEADER</span></td>
                        <td className="font-mono text-slate-300">42 commits</td>
                        <td className="font-mono text-slate-200">95 / 100</td>
                        <td><span className="mc-badge mc-badge-success font-mono">A+</span></td>
                      </tr>
                      <tr>
                        <td className="font-mono text-sky-400">STD-2024-02</td>
                        <td className="font-semibold text-slate-200">Devon Vance</td>
                        <td><span className="mc-badge mc-badge-neutral">MEMBER</span></td>
                        <td className="font-mono text-slate-300">28 commits</td>
                        <td className="font-mono text-slate-200">88 / 100</td>
                        <td><span className="mc-badge mc-badge-success font-mono">A</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </section>
        )}

      </main>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* PERSISTENT THIN STATUS TICKER STRIP */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <footer className="mc-status-ticker">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SESSION ACTIVE</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-slate-500">PENDING REVIEWS:</span>
            <span className="text-sky-400 font-bold">3 ENQUEUED</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="text-slate-400">
            ACTIVE WS: <span className="text-slate-200">WS-CS201</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span>LAST SYNC: <span className="text-slate-300">2s AGO</span></span>
          <span className="text-slate-600">|</span>
          <span className="text-blue-400 font-bold">DSA ENGINE: ONLINE</span>
        </div>
      </footer>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* FLOATING COMMAND PALETTE PILL */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <div className="mc-command-pill">
        <Command className="w-3.5 h-3.5 text-blue-400" />
        <span>Navigate ⌘K</span>
      </div>

    </div>
  );
}
