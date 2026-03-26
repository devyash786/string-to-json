import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Braces, FileJson, FileText, FileCode, CheckCircle2, AlertCircle, Copy, Trash2,
  Palette, ShieldCheck, UploadCloud, SplitSquareHorizontal, Bug
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
  const [theme, setTheme] = useState<ThemeType>('theme-midnight');
  const [mode, setMode] = useState<Mode>('formatter');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Editor State
  const [inputData, setInputData] = useState<string>('');
  const [diffOriginal, setDiffOriginal] = useState<string>('{\n  "paste_original_here": true\n}');
  const [outputData, setOutputData] = useState<string>('');
  
  // Status and Stats
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'fixing'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [stats, setStats] = useState({ sizeKB: '0', keysCount: 0, maxDepth: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    if (isThemeMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isThemeMenuOpen]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  // Sync back to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputData.length > 0 && inputData.length < 500000) {
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
      
      setStats(getJsonStats(inputData));
    } catch (err: any) {
      setOutputData('');
      setStatus('error');
      setErrorMsg(err.message || 'Syntax Error near input');
    }
  }, [inputData, mode]);

  useEffect(() => {
    processInput();
  }, [processInput]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey)) {
        if (e.key === 'Enter') {
          processInput();
          showToast('Forced Format', 'success');
        } else if (e.key === 'm') {
          e.preventDefault();
          try {
            setInputData(JSON.stringify(JSON.parse(inputData)));
            showToast('Minified JSON', 'success');
          } catch(e) {}
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputData, processInput]);

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

  const copyFormatted = () => {
    navigator.clipboard.writeText(outputData);
    showToast('Copied Formatted', 'success');
  };

  const copyMinified = () => {
    try {
      const mini = JSON.stringify(JSON.parse(outputData));
      navigator.clipboard.writeText(mini);
      showToast('Copied Minified', 'success');
    } catch (e) {
      navigator.clipboard.writeText(outputData.replace(/\s+/g, ''));
      showToast('Copied Minified Space', 'success');
    }
  };

  const copyEscaped = () => {
    const escaped = JSON.stringify(outputData);
    navigator.clipboard.writeText(escaped);
    showToast('Copied Escaped', 'success');
  };

  return (
    <div 
      className="app-container"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <header className="header">
        <h1>
          <Braces size={36} color="var(--accent-primary)" />
          JSON Debugger & Fixer
        </h1>
        <p>Fix messy API JSON instantly. Debug broken JSON in seconds.</p>
        
        <div className="security-banner">
          <div className="security-item">
            <ShieldCheck size={18} className="text-success" />
            <span><strong>Zero Data Leakage:</strong> Processing happens 100% locally. No network requests are made.</span>
          </div>
        </div>

        <div className="theme-selector-container" ref={menuRef}>
          <button className="theme-toggle-btn" onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}>
            <Palette size={18} />
            <span>Theme</span>
          </button>
          
          {isThemeMenuOpen && (
            <div className="theme-dropdown">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id as ThemeType); setIsThemeMenuOpen(false); }}
                  className={`theme-dropdown-item ${theme === t.id ? 'active' : ''}`}
                >
                  <span className="theme-color-dot" style={{ backgroundColor: t.color }}></span>
                  <span className="theme-name">{t.name}</span>
                  {theme === t.id && <CheckCircle2 size={16} className="theme-check" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Mode Tabs - Much clearer than a sidebar! */}
      <div className="mode-tabs">
        <button className={`tab-btn ${mode === 'formatter' ? 'active' : ''}`} onClick={() => setMode('formatter')}>
          <FileJson size={18} /> Formatter & Fixer
        </button>
        <button className={`tab-btn ${mode === 'diff' ? 'active' : ''}`} onClick={() => setMode('diff')}>
          <SplitSquareHorizontal size={18} /> Compare Diff
        </button>
        <button className={`tab-btn ${mode === 'yaml' ? 'active' : ''}`} onClick={() => setMode('yaml')}>
          <FileText size={18} /> To YAML
        </button>
        <button className={`tab-btn ${mode === 'ts' ? 'active' : ''}`} onClick={() => setMode('ts')}>
          <FileCode size={18} /> To TypeScript
        </button>
        <div style={{flex: 1}}></div>
        <button className="tab-btn outline" onClick={() => fileInputRef.current?.click()}>
          <UploadCloud size={18} /> Upload JSON File
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" hidden />
        </button>
      </div>

      <main className="main-content">
        <div className="workspace-card">
          {mode === 'diff' ? (
            <div className="diff-layout-container">
               <div className="diff-toolbars">
                  <div className="pane-toolbar" style={{flex: 1}}>
                    <span className="toolbar-title">Original JSON</span>
                  </div>
                  <div className="pane-toolbar" style={{flex: 1}}>
                    <span className="toolbar-title">Modified JSON</span>
                  </div>
               </div>
              <DiffEditor
                height="600px"
                language="json"
                theme={theme === 'theme-light' ? 'light' : 'vs-dark'}
                original={diffOriginal}
                modified={inputData}
                options={{ renderSideBySide: true, minimap: { enabled: false }, originalEditable: true }}
                onMount={(editor) => {
                  editor.getOriginalEditor().onDidChangeModelContent(() => {
                    setDiffOriginal(editor.getOriginalEditor().getValue());
                  });
                  editor.getModifiedEditor().onDidChangeModelContent(() => {
                    setInputData(editor.getModifiedEditor().getValue());
                  });
                }}
              />
            </div>
          ) : (
            <div className="split-layout">
              <div className="pane-wrapper">
                <div className="pane-toolbar">
                  <span className="toolbar-title">Input JSON (Cmd+F to Search)</span>
                  <div className="toolbar-actions">
                    <button onClick={() => setInputData('')} className="tool-btn"><Trash2 size={14} /> Clear</button>
                    <button onClick={() => handleCopy(inputData)} className="tool-btn"><Copy size={14} /> Copy</button>
                  </div>
                </div>
                <div className="editor-container">
                  <Editor
                    height="100%"
                    defaultLanguage="json"
                    value={inputData}
                    onChange={(val) => setInputData(val || '')}
                    theme={theme === 'theme-light' ? 'light' : 'vs-dark'}
                    options={{ minimap: { enabled: false }, wordWrap: 'on', formatOnPaste: true, scrollbar: { verticalScrollbarSize: 8 }, padding: { top: 16 } }}
                  />
                </div>
              </div>

              <div className="pane-wrapper">
                <div className="pane-toolbar">
                  <span className="toolbar-title">{mode === 'formatter' ? 'Fixed & Formatted Output' : `${mode.toUpperCase()} Output`}</span>
                  <div className="toolbar-actions">
                    <button onClick={copyFormatted} className="tool-btn" title="Copy Formatted JSON"><Copy size={14} /> Formatted</button>
                    <button onClick={copyMinified} className="tool-btn" title="Copy Minified (1 Line)"><Copy size={14} /> Minified</button>
                    <button onClick={copyEscaped} className="tool-btn" title="Copy Escaped String"><Copy size={14} /> Escaped</button>
                  </div>
                </div>
                
                <div className="editor-container">
                  {status === 'error' ? (
                    <div className="error-display">
                      <Bug size={48} color="var(--error-color)" style={{marginBottom: '1rem'}} />
                      <h3 style={{margin: 0, fontSize: '1.2rem'}}>❌ Parse Error Detected</h3>
                      <div className="error-text-highlight">{errorMsg}</div>
                      <button className="repair-btn" onClick={() => {
                          const repaired = formatOrRepairJson(inputData, 2);
                          if (repaired.fixed) setInputData(repaired.result);
                      }}>Force Auto-Repair Messy JSON</button>
                      <p style={{fontSize: '0.85rem', opacity: 0.7, marginTop: '1rem'}}>
                        This tool fixes single quotes, Python's True/False/None, and trailing commas seamlessly.
                      </p>
                    </div>
                  ) : (
                    <Editor
                      height="100%"
                      language={mode === 'formatter' ? 'json' : mode === 'ts' ? 'typescript' : mode}
                      value={outputData}
                      theme={theme === 'theme-light' ? 'light' : 'vs-dark'}
                      options={{ readOnly: true, minimap: { enabled: false }, wordWrap: 'on', scrollbar: { verticalScrollbarSize: 8 }, padding: { top: 16 } }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* JSON Stats Footer aligned below editors */}
        <div className="stats-footer">
           <div className="stat-pill"><span className="stat-label">Status:</span> <span className={`status-dot ${status}`}></span> {status === 'idle' ? 'Ready' : status === 'success' ? 'Valid JSON' : status === 'fixing' ? 'Auto-Repaired JSON' : 'Syntax Error'}</div>
           <div className="stat-pill"><span className="stat-label">Size:</span> {stats.sizeKB} KB</div>
           <div className="stat-pill"><span className="stat-label">Keys:</span> {stats.keysCount}</div>
           <div className="stat-pill"><span className="stat-label">Depth:</span> {stats.maxDepth}</div>
           <div style={{flex: 1}}></div>
           <div className="stat-pill subtle">[Cmd+Enter] Format</div>
           <div className="stat-pill subtle">[Cmd+M] Minify</div>
        </div>
      </main>

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
