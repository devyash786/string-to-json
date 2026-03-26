import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Clipboard, Trash2, Search as SearchIcon } from 'lucide-react';
// SearchBar.tsx no longer needed, using native Monaco Find widget

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  theme: string;
  onClear: () => void;
  onCopy: () => void;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({ value, onChange, theme, onClear, onCopy }) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleToggleSearch = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      editorRef.current.trigger('keyboard', 'actions.find', null);
    }
  };

  return (
    <div className="pane-wrapper">
      <div className="pane-toolbar">
        <div className="toolbar-title">
          ORIGINAL INPUT
          <span className="sub-label" style={{ marginLeft: '8px' }}>Paste your escaped string</span>
        </div>
        <div className="toolbar-actions" style={{ display: 'flex', gap: '6px' }}>
          <button onClick={handleToggleSearch} className="modular-btn" style={{ padding: '6px' }} title="Search (Cmd+F)"><SearchIcon size={14} /></button>
          <button onClick={onClear} className="modular-btn" style={{ padding: '6px' }} title="Clear All Text"><Trash2 size={14} /></button>
          <button onClick={onCopy} className="modular-btn" style={{ padding: '6px', backgroundColor: 'transparent', color: 'var(--text-primary)' }} title="Copy Input Source"><Clipboard size={14} /></button>
        </div>
      </div>
      
      <div style={{ height: '100%', flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {!value.trim() && (
          <div style={{ position: 'absolute', top: '16px', left: '16px', color: 'var(--text-muted)', opacity: 0.3, fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', pointerEvents: 'none', zIndex: 1 }}>
            {'"{\\"name\\":\\"Yash\\",\\"role\\":\\"developer\\"}"'}
          </div>
        )}
        <div style={{ position: 'absolute', bottom: '12px', left: '16px', fontSize: '10px', color: 'var(--text-muted)', zIndex: 5, pointerEvents: 'none', opacity: 0.4 }}>
          ⌘ Enter to parse
        </div>
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
