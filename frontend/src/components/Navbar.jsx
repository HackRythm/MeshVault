import { useState } from 'react';
import SearchBar from './ui/SearchBar';
import { HiBell, HiInformationCircle, HiX, HiCheckCircle } from 'react-icons/hi';

const viewTitles = {
  dashboard: 'Dashboard',
  projects: 'Project Hub',
  sprint: 'Sprint Optimizer',
  audit: 'Audit Trail',
};

export default function Navbar({ activeView }) {
  const [showPhaseModal, setShowPhaseModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-canvas/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-6 py-3">
          <div>
            <h2 className="text-xl font-bold text-heading">
              {viewTitles[activeView] || 'Dashboard'}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Mid-Sem DSA Phase Badge */}
            <button
              onClick={() => setShowPhaseModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 text-xs font-semibold transition-all shadow-glow-sm"
              title="Click to view Academic Evaluation DSA breakdown"
            >
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>Phase 1: Mid-Sem (Light DSAs)</span>
              <HiInformationCircle className="text-sm ml-0.5" />
            </button>

            <SearchBar
              onSelect={(term) => console.log('Selected:', term)}
              placeholder="Search terms & topics..."
            />
            <button className="relative p-2.5 text-muted hover:text-body hover:bg-surface rounded-lg transition-colors">
              <HiBell className="text-xl" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent animate-pulse-soft" />
            </button>
          </div>
        </div>
      </header>

      {/* Phase Info Modal */}
      {showPhaseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-heading flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-accent/20 text-accent">🛡️</span>
                  MeshVault DSA Evaluation Plan
                </h3>
                <p className="text-xs text-muted mt-0.5">Academic Project Management System</p>
              </div>
              <button
                onClick={() => setShowPhaseModal(false)}
                className="text-muted hover:text-heading p-1 rounded-lg hover:bg-canvas transition-colors"
              >
                <HiX className="text-xl" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Phase 1 */}
              <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-accent text-sm flex items-center gap-1.5">
                    <HiCheckCircle className="text-base" /> Phase 1: Mid-Sem (Active Evaluation)
                  </span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-accent/20 font-mono text-accent">Light DSAs</span>
                </div>
                <p className="text-xs text-body leading-relaxed">
                  Focuses on fundamental data structures for core operations:
                </p>
                <ul className="text-xs space-y-1 text-muted pl-4 list-disc font-mono">
                  <li><strong className="text-heading">Stack (LIFO):</strong> Undo/Redo Audit Trail</li>
                  <li><strong className="text-heading">Queue (FIFO):</strong> Sequential Task Execution & Greedy Sprint</li>
                  <li><strong className="text-heading">Doubly LinkedList:</strong> Navigation & Activity Trail</li>
                  <li><strong className="text-heading">Simple BST:</strong> Timestamp Log Indexing</li>
                  <li><strong className="text-heading">Min-Heap PQ:</strong> Urgent Review Deadlines</li>
                </ul>
              </div>

              {/* Phase 2 */}
              <div className="p-4 rounded-xl bg-surface/50 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-muted text-sm">Phase 2: End-Sem (Roadmap)</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-surface border border-border font-mono text-muted">Advanced DSAs</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Advanced structures planned for final submission:
                </p>
                <ul className="text-xs space-y-1 text-muted pl-4 list-disc font-mono">
                  <li>AVL Tree (Height-Balanced BST with Rotations)</li>
                  <li>SHA-256 Merkle Tree (Cryptographic Verification)</li>
                  <li>0-1 Knapsack DP (Optimal Sprint Allocator)</li>
                  <li>Trie Tree (Sub-linear Prefix Autocomplete)</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowPhaseModal(false)}
              className="w-full py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-blue-600 transition-colors shadow-glow-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
