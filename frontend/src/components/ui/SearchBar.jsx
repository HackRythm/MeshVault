import { useState, useEffect, useRef } from 'react';
import { dsaApi } from '../../services/api';
import { HiSearch } from 'react-icons/hi';

export default function SearchBar({ onSelect, placeholder = 'Search projects, topics...' }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Trie autocomplete
  useEffect(() => {
    if (query.length < 1) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await dsaApi.autocomplete(query, 8);
        setSuggestions(data.suggestions || []);
        setIsOpen(data.suggestions?.length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
      }
    }, 150); // Debounce

    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (term) => {
    setQuery(term);
    setIsOpen(false);
    onSelect?.(term);
  };

  // Highlight matching prefix
  const highlightMatch = (text) => {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-accent font-semibold">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-lg" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-canvas border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-body
            placeholder-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30
            transition-all duration-200"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted font-medium border-b border-border">
            Trie Autocomplete — {suggestions.length} results
          </div>
          {suggestions.map((term, i) => (
            <button
              key={term}
              onClick={() => handleSelect(term)}
              className={`
                w-full text-left px-4 py-2.5 text-sm transition-colors
                ${i === activeIndex ? 'bg-accent/10 text-accent' : 'text-body hover:bg-surface-hover'}
              `}
            >
              {highlightMatch(term)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
