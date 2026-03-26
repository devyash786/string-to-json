import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Copy } from 'lucide-react';
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
      <div className="toolbar small">
        <span className="toolbar-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {mode === 'formatter' ? 'Fixed JSON' : `${mode.toUpperCase()} Output`}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>Parsed result</span>
        </span>
        <div className="toolbar-actions" style={{ position: 'relative' }} ref={dropdownRef}>
          <button onClick={onCopyFormatted} className="tool-btn primary" title="Copy Output" style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}><Copy size={14} /> Copy</button>
          
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="select-dropdown" style={{ padding: '4px 8px' }}>More...</button>
          
          {dropdownOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '4px', zIndex: 100, display: 'flex', flexDirection: 'column', width: '140px', boxShadow: 'var(--shadow-lg)' }}>
              <button onClick={() => { onCopyFormatted(); setDropdownOpen(false); }} className="dropdown-menu-item" style={{ padding: '0.5rem', fontSize: '0.8rem', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>Beautify & Copy</button>
              <button onClick={() => { onCopyMinified(); setDropdownOpen(false); }} className="dropdown-menu-item" style={{ padding: '0.5rem', fontSize: '0.8rem', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>Minify & Copy</button>
              <button onClick={() => { onCopyJS(); setDropdownOpen(false); }} className="dropdown-menu-item" style={{ padding: '0.5rem', fontSize: '0.8rem', textAlign: 'left', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }} title="Copies output as a JS object literal">Copy as JS</button>
            </div>
          )}
        </div>
      </div>
      
      <div style={{ flex: 1, position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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
