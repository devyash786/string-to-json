import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Braces, FileJson, FileText, FileCode, CheckCircle2, AlertCircle,
  Palette, ShieldCheck, UploadCloud, SplitSquareHorizontal, ToggleLeft, ToggleRight
} from 'lucide-react';
import { DiffEditor } from '@monaco-editor/react';
import { convertToYaml, convertToCsv, convertToTS, getJsonStats } from './utils/jsonUtils';
import { fixJson } from './utils/fixJson';

import './App.css';
import { JsonEditor } from './components/JsonEditor';
import { OutputViewer } from './components/OutputViewer';

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

  // New toggle state
  const [autoFormat, setAutoFormat] = useState(true);

  // Editor State
  const [inputData, setInputData] = useState<string>('');
  const [diffOriginal, setDiffOriginal] = useState<string>('{\n  "paste_original_here": true\n}');
  const [outputData, setOutputData] = useState<string>('');
  
  // Status and Stats
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'fixing'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>('');
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [errorCol, setErrorCol] = useState<number | null>(null);
  const [stats, setStats] = useState({ sizeKB: '0', keysCount: 0, maxDepth: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

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

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  // Core parsing mapped through fixJson util
  const processInput = useCallback(() => {
    if (!inputData.trim()) {
      setOutputData('');
      setStatus('idle');
      return;
    }

    try {
      if (mode === 'formatter') {
        const { repaired, isFixed, error, line, col } = fixJson(inputData);
        if (error) {
          setOutputData('');
          setStatus('error');
          setErrorMsg(error);
          setErrorLine(line);
          setErrorCol(col);
        } else {
          setOutputData(repaired);
          setStatus(isFixed ? 'fixing' : 'success');
          setErrorMsg(null);
        }
      } else if (mode === 'yaml') { setOutputData(convertToYaml(inputData)); setStatus('success'); }
      else if (mode === 'csv') { setOutputData(convertToCsv(inputData)); setStatus('success'); }
      else if (mode === 'ts') { setOutputData(convertToTS(inputData)); setStatus('success'); }
      
      setStats(getJsonStats(inputData));
    } catch (err: any) {
      setOutputData('');
      setStatus('error');
      setErrorMsg(err.message || 'Syntax Error near input');
    }
  }, [inputData, mode]);

  useEffect(() => {
    if (autoFormat) processInput();
  }, [inputData, mode, autoFormat]);

  const forceAutoRepair = () => {
    const result = fixJson(inputData);
    if (!result.error && result.repaired !== inputData) {
      setInputData(result.repaired);
      showToast('Successfully repaired Messy JSON!', 'success');
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

  const copyOut = (type: 'formatted' | 'minified' | 'escaped') => {
    if (type === 'formatted') {
      navigator.clipboard.writeText(outputData);
      showToast('Copied Formatted', 'success');
    } else if (type === 'minified') {
      try { navigator.clipboard.writeText(JSON.stringify(JSON.parse(outputData))); showToast('Copied Minified', 'success'); } 
      catch { navigator.clipboard.writeText(outputData.replace(/\s+/g, '')); showToast('Copied Minified Space', 'success'); }
    } else if (type === 'escaped') {
      navigator.clipboard.writeText(JSON.stringify(outputData));
      showToast('Copied Escaped', 'success');
    }
  };

  return (
    <div className="app-container" onDrop={(e) => { e.preventDefault(); handleFileUpload({ target: { files: e.dataTransfer.files } } as any); }} onDragOver={(e) => e.preventDefault()}>
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
            <Palette size={18} /> <span>Theme</span>
          </button>
          {isThemeMenuOpen && (
            <div className="theme-dropdown">
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => { setTheme(t.id as ThemeType); setIsThemeMenuOpen(false); }} className={`theme-dropdown-item ${theme === t.id ? 'active' : ''}`}>
                  <span className="theme-color-dot" style={{ backgroundColor: t.color }}></span> <span className="theme-name">{t.name}</span>
                  {theme === t.id && <CheckCircle2 size={16} className="theme-check" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

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

        {/* Auto Format Toggle */}
        <button className={`tab-btn ${autoFormat ? 'active' : ''}`} onClick={() => { setAutoFormat(!autoFormat); !autoFormat && processInput(); }}>
          {autoFormat ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          Auto Format
        </button>

        <button className="tab-btn outline" onClick={() => fileInputRef.current?.click()}>
          <UploadCloud size={18} /> Upload JSON File
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" hidden />
        </button>
      </div>

      <main className="main-content">
        <div className="workspace-card">
          {mode === 'diff' ? (
            <div className="diff-layout-container" style={{ width: '100%', height: '100%' }}>
              <div className="diff-toolbars">
                <div className="pane-toolbar" style={{flex: 1}}><span className="toolbar-title">Original JSON</span></div>
                <div className="pane-toolbar" style={{flex: 1}}><span className="toolbar-title">Modified JSON</span></div>
              </div>
              <DiffEditor
                height="65vh"
                language="json"
                theme={theme === 'theme-light' ? 'light' : 'vs-dark'}
                original={diffOriginal}
                modified={inputData}
                options={{ renderSideBySide: true, minimap: { enabled: false }, originalEditable: true }}
                onMount={(editor) => {
                  editor.getOriginalEditor().onDidChangeModelContent(() => setDiffOriginal(editor.getOriginalEditor().getValue()));
                  editor.getModifiedEditor().onDidChangeModelContent(() => setInputData(editor.getModifiedEditor().getValue()));
                }}
              />
            </div>
          ) : (
            <div className="split-layout">
              <JsonEditor
                value={inputData}
                onChange={setInputData}
                theme={theme}
                onClear={() => setInputData('')}
                onCopy={() => { navigator.clipboard.writeText(inputData); showToast('Copied', 'success'); }}
              />
              <OutputViewer
                value={outputData}
                theme={theme}
                mode={mode}
                status={status}
                errorMsg={errorMsg}
                errorLine={errorLine}
                errorCol={errorCol}
                onFix={forceAutoRepair}
                onCopyFormatted={() => copyOut('formatted')}
                onCopyMinified={() => copyOut('minified')}
                onCopyEscaped={() => copyOut('escaped')}
              />
            </div>
          )}
        </div>

        <div className="stats-footer">
           <div className="stat-pill"><span className="stat-label">Status:</span> <span className={`status-dot ${status}`}></span> {status === 'idle' ? 'Ready' : status === 'success' ? 'Valid JSON' : status === 'fixing' ? 'Auto-Repaired JSON' : 'Syntax Error'}</div>
           <div className="stat-pill"><span className="stat-label">Size:</span> {stats.sizeKB} KB</div>
           <div className="stat-pill"><span className="stat-label">Keys:</span> {stats.keysCount}</div>
           <div className="stat-pill"><span className="stat-label">Depth:</span> {stats.maxDepth}</div>
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
