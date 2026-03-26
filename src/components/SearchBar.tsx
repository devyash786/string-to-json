import React, { useRef } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onNext: () => void;
  onPrev: () => void;
  isActive: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onNext, onPrev, isActive }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) onPrev();
      else onNext();
    }
  };

  return (
    <div className={`search-bar-container ${isActive ? 'active' : ''}`}>
      <Search size={14} className="search-icon" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search JSON... (Enter / Shift+Enter)"
        className="search-input"
        onChange={(e) => onSearch(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="search-actions">
        <button className="search-nav-btn" onClick={onPrev} title="Previous (Shift+Enter)"><ChevronUp size={16} /></button>
        <button className="search-nav-btn" onClick={onNext} title="Next (Enter)"><ChevronDown size={16} /></button>
      </div>
    </div>
  );
};
