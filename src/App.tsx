import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Braces, FileJson, FileText, FileCode, CheckCircle2, AlertCircle, Copy, Trash2,
  Palette, ShieldCheck, UploadCloud, SplitSquareHorizontal, Bug, FileSpreadsheet
} from 'lucide-react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { formatOrRepairJson, convertToYaml, convertToCsv, convertToTS, getJsonStats } from './utils/jsonUtils';
import './App.css';

type Mode = 'formatter' | 'diff' | 'yaml' | 'csv' | 'ts';
type ThemeType = 'theme-midnight' | 'theme-ocean' | 'theme-forest' | 'theme-rose' | 'theme-netflix' | 'theme-light';

const THEMES = [
  { id: 'theme-midnight', color: '#6366f1', name: 'Midnight' },
  { id: 'theme-ocean', color: '#0ea5e9', name: 'Ocean' },
  { id: 'theme-forest', color: '#10b981', name: 'Forest' },
  { id: 'theme-rose', color: '#f43f5e', name: 'Rose' },
  { id: 'theme-netflix', color: '#e50914', name: 'Netflix' },
  { id: 'theme-light', color: '#f8fafc', name: 'Light' },
] as const;

function App() {
  // Global State
  const [theme, setTheme] = useState<ThemeType>('theme-midnight');
  const [mode, setMode] = useState<Mode>('formatter');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Editor State
  const [inputData, setInputData] = useState<string>('');
  const [diffOriginal] = useState<string>('{\n  "paste_original_here": true\n}');
  const [outputData, setOutputData] = useState<string>('');
  const [autoFormat, setAutoFormat] = useState(true);
  
  // Status and Stats
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'fixing'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [stats, setStats] = useState({ sizeKB: '0', keysCount: 0, maxDepth: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update Theme
  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  // Toast Cleanup
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  // Handle URL Sync (Base64) - Load initially
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const decoded = decodeURIComponent(atob(hash));
        setInputData(decoded);
      } catch (e) {
        console.error('Invalid URL Hash');
      }
    }
  }, []);

  // Sync back to URL (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputData.length > 0 && inputData.length < 500000) { // Limit to 500kb approx
        window.history.replaceState(null, '', `#${btoa(encodeURIComponent(inputData))}`);
      } else {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [inputData]);

  // Master Processor
  const processInput = useCallback(() => {
    if (!inputData.trim()) {
      setOutputData('');
      setStatus('idle');
      return;
    }

    try {
      if (mode === 'formatter') {
        const { result, fixed, error } = formatOrRepairJson(inputData);
        if (error) throw new Error(error);
        
        setOutputData(result);
        if (autoFormat && result !== inputData && !fixed) {
           // We might not want to auto-replace input unless asked, but output gets formatted
        }
        setStatus(fixed ? 'fixing' : 'success');
        setErrorMsg('');
      } else if (mode === 'yaml') {
        setOutputData(convertToYaml(inputData));
        setStatus('success');
      } else if (mode === 'csv') {
        setOutputData(convertToCsv(inputData));
        setStatus('success');
      } else if (mode === 'ts') {
        setOutputData(convertToTS(inputData));
        setStatus('success');
      }
      
      // Update Stats
      setStats(getJsonStats(inputData));
    } catch (err: any) {
      setOutputData('');
      setStatus('error');
      setErrorMsg(err.message || 'Syntax Error near input');
    }
  }, [inputData, mode, autoFormat]);

  useEffect(() => {
    processInput();
  }, [processInput]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey)) {
        if (e.key === 'Enter') {
          processInput();
          showToast('Forced Format', 'success');
        } else if (e.key === 'm') {
          e.preventDefault();
          try {
            const minified = JSON.stringify(JSON.parse(inputData));
            setInputData(minified);
            showToast('Minified JSON', 'success');
          } catch(e) {}
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputData, processInput]);

  // Drag and drop Handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
      const reader = new FileReader();
      reader.onload = (ev) => setInputData(ev.target?.result as string);
      reader.readAsText(file);
      showToast(`Loaded ${file.name}`, 'success');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setInputData(ev.target?.result as string);
      reader.readAsText(file);
      showToast(`Loaded ${file.name}`, 'success');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
  };

  return (
    <div 
      className="ide-container"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* IDE Header */}
      <header className="ide-header">
        <div className="branding">
          <Braces className="brand-icon" size={24} />
          <h1>Developer JSON Tools</h1>
          <div className="privacy-badge-sm">
            <ShieldCheck size={14} /> 100% Client-Side
          </div>
        </div>

        <div className="header-actions">
           <label className="toggle-switch">
             <input type="checkbox" checked={autoFormat} onChange={e => setAutoFormat(e.target.checked)} />
             <span className="slider"></span>
             <span className="label-text">Auto Format</span>
           </label>

           <div className="theme-selector-container">
            <button className="icon-button" onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}>
              <Palette size={18} />
            </button>
            {isThemeMenuOpen && (
              <div className="theme-dropdown">
                {THEMES.map((t) => (
                  <button key={t.id} onClick={() => { setTheme(t.id); setIsThemeMenuOpen(false); }} className={`theme-dropdown-item ${theme === t.id ? 'active' : ''}`}>
                    <span className="theme-color-dot" style={{ backgroundColor: t.color }}></span>
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="ide-workspace">
        {/* Activity Bar (Sidebar) */}
        <aside className="activity-bar">
          <button className={`nav-btn ${mode === 'formatter' ? 'active' : ''}`} onClick={() => setMode('formatter')} title="Formatter & Repair">
            <FileJson size={24} />
          </button>
          <button className={`nav-btn ${mode === 'diff' ? 'active' : ''}`} onClick={() => setMode('diff')} title="JSON Diff">
            <SplitSquareHorizontal size={24} />
          </button>
          <button className={`nav-btn ${mode === 'yaml' ? 'active' : ''}`} onClick={() => setMode('yaml')} title="JSON to YAML">
            <FileText size={24} />
          </button>
          <button className={`nav-btn ${mode === 'csv' ? 'active' : ''}`} onClick={() => setMode('csv')} title="JSON to CSV">
            <FileSpreadsheet size={24} />
          </button>
          <button className={`nav-btn ${mode === 'ts' ? 'active' : ''}`} onClick={() => setMode('ts')} title="Generate TS Interfaces">
            <FileCode size={24} />
          </button>
          <div className="spacer"></div>
          <button className="nav-btn" onClick={() => fileInputRef.current?.click()} title="Upload Local File">
             <UploadCloud size={24} />
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" hidden />
          </button>
        </aside>

        {/* Editor Area */}
        <main className="editor-area">
          {mode === 'diff' ? (
            <div className="diff-layout">
              <DiffEditor
                height="100%"
                language="json"
                theme={theme === 'theme-light' ? 'light' : 'vs-dark'}
                original={diffOriginal}
                modified={inputData}
                options={{ renderSideBySide: true, minimap: { enabled: false } }}
              />
            </div>
          ) : (
            <div className="split-layout">
              <div className="pane-wrapper">
                <div className="pane-toolbar">
                  <span>Input JSON</span>
                  <div className="toolbar-actions">
                    <button onClick={() => setInputData('')} className="tool-btn"><Trash2 size={14} /> Clear</button>
                    <button onClick={() => handleCopy(inputData)} className="tool-btn"><Copy size={14} /> Copy</button>
                  </div>
                </div>
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  value={inputData}
                  onChange={(val) => setInputData(val || '')}
                  theme={theme === 'theme-light' ? 'light' : 'vs-dark'}
                  options={{ minimap: { enabled: false }, wordWrap: 'on', formatOnPaste: true, scrollbar: { verticalScrollbarSize: 8 } }}
                />
              </div>

              <div className="pane-wrapper">
                <div className="pane-toolbar">
                  <span>{mode === 'formatter' ? 'Formatted Output' : `${mode.toUpperCase()} Output`}</span>
                  <div className="toolbar-actions">
                    <button onClick={() => handleCopy(outputData)} className="tool-btn"><Copy size={14} /> Copy</button>
                  </div>
                </div>
                {status === 'error' ? (
                  <div className="error-display">
                    <Bug size={32} />
                    <h3>Parse Error</h3>
                    <p>{errorMsg}</p>
                    <button className="repair-btn" onClick={() => {
                        const repaired = formatOrRepairJson(inputData, 2);
                        if (repaired.fixed) setInputData(repaired.result);
                    }}>Attempt Auto-Repair</button>
                  </div>
                ) : (
                  <Editor
                    height="100%"
                    language={mode === 'formatter' ? 'json' : mode === 'ts' ? 'typescript' : mode}
                    value={outputData}
                    theme={theme === 'theme-light' ? 'light' : 'vs-dark'}
                    options={{ readOnly: true, minimap: { enabled: false }, wordWrap: 'on', scrollbar: { verticalScrollbarSize: 8 } }}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* StatusBar */}
      <footer className="ide-statusbar">
        <div className="status-left">
          <span className={`status-dot ${status}`}></span>
          <span className="status-text">
            {status === 'idle' ? 'Ready' : 
             status === 'success' ? 'Valid JSON' : 
             status === 'fixing' ? 'Auto-Repaired Messy JSON' : 
             'Syntax Error'}
          </span>
        </div>
        <div className="status-right">
          <span>{stats.sizeKB} KB</span>
          <span>{stats.keysCount} Keys</span>
          <span>Depth: {stats.maxDepth}</span>
          <span>[Cmd+Enter] Format</span>
        </div>
      </footer>

      {toast && (
        <div className="toast">
          {toast.type === 'success' ? <CheckCircle2 size={18} className="text-success" /> : <AlertCircle size={18} className="text-error" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;
