import React, { useRef, useState } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import { Copy, Trash2, Search as SearchIcon } from 'lucide-react';
import { SearchBar } from './SearchBar';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  theme: string;
  onClear: () => void;
  onCopy: () => void;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({ value, onChange, theme, onClear, onCopy }) => {
  const editorRef = useRef<any>(null);
  const [showSearch, setShowSearch] = useState(false);

  const handleEditorDidMount = (editor: any, _monacoInstance: Monaco) => {
    editorRef.current = editor;
  };

  const handleSearch = (query: string) => {
    if (!editorRef.current) return;
    const model = editorRef.current.getModel();
    if (!model || !query) return;
    
    // Natively trigger Monaco find widget
    const findController = editorRef.current.getContribution('editor.contrib.findController');
    if (findController && typeof findController.start === 'function') {
      findController.start({ searchString: query });
    }
  };

  const handleNextMatch = () => { /* Monaco built-in handled by start */ };
  const handlePrevMatch = () => { /* Monaco built-in */ };

  return (
    <div className="pane-wrapper">
      <div className="pane-toolbar">
        <div className="toolbar-title">
          ORIGINAL INPUT
          <span className="sub-label" style={{ marginLeft: '8px' }}>Paste your escaped string</span>
        </div>
        <div className="toolbar-actions">
          <button onClick={() => setShowSearch(!showSearch)} className={`tool-btn ${showSearch ? 'active' : ''}`} title="Search (Cmd+F)"><SearchIcon size={14} /> Search</button>
          <button onClick={onClear} className="tool-btn" title="Clear All Text"><Trash2 size={14} /> Clear</button>
          <button onClick={onCopy} className="tool-btn" title="Copy Input Source"><Copy size={14} /> Copy</button>
        </div>
      </div>
      
      <div style={{ height: '100%', flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {value === '' && (
          <div style={{ position: 'absolute', top: '16px', left: '16px', color: 'var(--text-muted)', opacity: 0.3, fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', pointerEvents: 'none', zIndex: 1 }}>
            {'"{\\"name\\":\\"Yash\\",\\"role\\":\\"developer\\"}"'}
          </div>
        )}
        <div style={{ position: 'absolute', bottom: '12px', left: '16px', fontSize: '10px', color: 'var(--text-muted)', zIndex: 5, pointerEvents: 'none', opacity: 0.4 }}>
          ⌘ Enter to parse
        </div>
        {showSearch && (
          <SearchBar onSearch={handleSearch} onNext={handleNextMatch} onPrev={handlePrevMatch} isActive={showSearch} />
        )}
        <Editor
          height="100%"
          language="json"
          value={value}
          onChange={(val) => onChange(val || '')}
          theme={theme === 'theme-light' ? 'light' : 'vs-dark'}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            wordWrap: 'on',
            formatOnPaste: false,
            scrollbar: { verticalScrollbarSize: 8 },
            padding: { top: 16 }
          }}
        />
      </div>
    </div>
  );
};
