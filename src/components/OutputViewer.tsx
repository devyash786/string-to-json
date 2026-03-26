import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, ChevronDown } from 'lucide-react';
import { ErrorDisplay } from './ErrorDisplay';

interface OutputViewerProps {
  value: string;
  theme: 'theme-midnight' | 'theme-light' | 'theme-ocean' | 'theme-forest' | 'theme-rose' | 'theme-netflix';
  mode: 'formatter' | 'diff' | 'yaml' | 'csv' | 'ts';
  status: 'idle' | 'success' | 'fixing' | 'error';
  errorMsg: string | null;
  errorLine: number | null;
  errorCol: number | null;
  onFix: () => void;
  onCopyFormatted: () => void;
  onCopyMinified: () => void;
  onCopyJS: () => void;
}

export const OutputViewer: React.FC<OutputViewerProps> = ({
  value,
  theme,
  mode,
  status,
  errorMsg,
  errorLine,
  errorCol,
  onFix,
  onCopyFormatted,
  onCopyMinified,
  onCopyJS
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="pane-wrapper">
      <div className="pane-toolbar">
        <div className="toolbar-title">
          FIXED JSON
          <span className="sub-label" style={{ marginLeft: '8px' }}>Parsed result</span>
        </div>
        <div className="toolbar-actions" style={{ position: 'relative' }} ref={dropdownRef}>
          <button onClick={onCopyFormatted} className="modular-btn" style={{ padding: '4px 10px', backgroundColor: 'var(--accent-primary)', color: 'white', borderColor: 'transparent' }}><Copy size={13} /> Copy</button>
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="modular-btn" style={{ padding: '4px 8px' }}>More <ChevronDown size={12} style={{ opacity: 0.6 }} /></button>
          
          {dropdownOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '4px', zIndex: 100, display: 'flex', flexDirection: 'column', width: '140px', boxShadow: 'var(--shadow-lg)' }}>
              <button onClick={() => { onCopyFormatted(); setDropdownOpen(false); }} className="dropdown-menu-item" style={{ padding: '0.5rem', fontSize: '0.8rem', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>Beautify & Copy</button>
              <button onClick={() => { onCopyMinified(); setDropdownOpen(false); }} className="dropdown-menu-item" style={{ padding: '0.5rem', fontSize: '0.8rem', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>Minify & Copy</button>
              <button onClick={() => { onCopyJS(); setDropdownOpen(false); }} className="dropdown-menu-item" style={{ padding: '0.5rem', fontSize: '0.8rem', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }} title="Copies output as a JS object literal">Copy as JS</button>
            </div>
          )}
        </div>
      </div>
      
      <div style={{ height: '100%', flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {!value && (
          <div style={{ position: 'absolute', top: '16px', left: '16px', color: 'var(--text-muted)', opacity: 0.3, fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', pointerEvents: 'none', zIndex: 1 }}>
            Your fixed JSON will appear here
          </div>
        )}
        {status === 'error' ? (
          <ErrorDisplay message={errorMsg} line={errorLine} col={errorCol} onFix={onFix} />
        ) : (
          <Editor
            height="100%"
            language={mode === 'ts' ? 'typescript' : mode === 'yaml' ? 'yaml' : mode === 'csv' ? 'text' : 'json'}
            value={value}
            theme={theme === 'theme-light' ? 'light' : 'vs-dark'}
            options={{
              readOnly: true,
              minimap: { enabled: true },
              wordWrap: 'on',
              formatOnPaste: true,
              scrollBeyondLastLine: false,
              padding: { top: 16 }
            }}
          />
        )}
      </div>
    </div>
  );
};
