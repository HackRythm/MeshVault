import SearchBar from './ui/SearchBar';
import { HiBell } from 'react-icons/hi';

const viewTitles = {
  dashboard: 'Dashboard',
  projects: 'Project Hub',
  sprint: 'Sprint Optimizer',
  audit: 'Audit Trail',
};

export default function Navbar({ activeView }) {
  return (
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
          <SearchBar
            onSelect={(term) => console.log('Selected:', term)}
            placeholder="Search with Trie..."
          />
          <button className="relative p-2.5 text-muted hover:text-body hover:bg-surface rounded-lg transition-colors">
            <HiBell className="text-xl" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent animate-pulse-soft" />
          </button>
        </div>
      </div>
    </header>
  );
}
