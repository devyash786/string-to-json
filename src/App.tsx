import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Braces, CheckCircle2, AlertCircle,
  UploadCloud, Palette, Zap, Search, ShieldCheck
} from 'lucide-react';
import { convertToYaml, convertToCsv, convertToTS, getJsonStats } from './utils/jsonUtils';
import { fixJson } from './utils/fixJson';

import './App.css';
import { JsonEditor } from './components/JsonEditor';
import { OutputViewer } from './components/OutputViewer';
import { DiffViewer } from './components/DiffViewer';

type Mode = 'formatter' | 'diff' | 'yaml' | 'csv' | 'ts';
type ThemeType = 'theme-midnight' | 'theme-ocean' | 'theme-forest' | 'theme-rose' | 'theme-netflix' | 'theme-light';

function App() {
  const [theme, setTheme] = useState<ThemeType>('theme-midnight');
  const [mode, setMode] = useState<Mode>('formatter');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const autoFormat = true; // Always on for seamless UX

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
  const [activeSample, setActiveSample] = useState<string | null>(null);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

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

  // Core Processing Engine
  const processInput = useCallback(() => {
    if (!inputData.trim()) {
      setStatus('idle');
      setOutputData('');
      setStats({ sizeKB: '0.00', keysCount: 0, maxDepth: 0 });
      setErrorLine(null);
      setErrorCol(null);
      setErrorMsg(null);
      setSuggestion(null);
      return;
    }

    try {
      // Smart Detection Banner Logic (Vercel/Linear style insight)
      const trimmed = inputData.trim();
      let activeSuggestion = null;
      if (trimmed.match(/([\{\[].*[\}\]])/s) && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        activeSuggestion = 'Log format detected ⸺ Extracted JSON automatically ✨';
      } else if (trimmed.includes('\\"')) {
        activeSuggestion = 'Escaped JSON detected ⸺ Unescaped automatically ✨';
      } else if (trimmed.includes('True') || trimmed.includes('None') || trimmed.match(/([{,]\s*)['"][a-zA-Z0-9_]+['"]\s*:/) === null && trimmed.includes(':')) {
        activeSuggestion = 'Broken/Python JSON detected ⸺ Auto-Repaired ✨';
      }
      setSuggestion(activeSuggestion);

      const fixed = fixJson(inputData);
      
      if (fixed.error) {
        setStatus('error');
        setErrorMsg(fixed.error);
        setErrorLine(fixed.line);
        setErrorCol(fixed.col);
        return;
      }

      const parsed = JSON.parse(fixed.repaired);

      if (mode === 'yaml') {
        setOutputData(convertToYaml(parsed));
      } else if (mode === 'csv') {
        setOutputData(convertToCsv(parsed));
      } else if (mode === 'ts') {
        setOutputData(convertToTS(parsed));
      } else {
        setOutputData(JSON.stringify(parsed, null, 2));
      }

      if (fixed.isFixed) {
        setStatus('fixing');
        setErrorMsg(null);
        if (activeSuggestion?.includes('Escaped')) {
           setSuggestion('Fixed: unescaped nested strings \u00B7 removed 1 layer of encoding');
        } else if (activeSuggestion?.includes('Broken')) {
           setSuggestion('Fixed: repaired syntax errors \u00B7 standardized keys & values');
        }
      } else {
        setStatus('success');
        setErrorMsg(null);
        setSuggestion('Valid JSON \u2014 no fixes needed \u2728');
      }
      
      setErrorLine(null);
      setErrorCol(null);
      
      setStats(getJsonStats(parsed));

    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Invalid JSON format');
    }
  }, [inputData, mode]);

  useEffect(() => {
    if (autoFormat) {
      const timer = setTimeout(() => {
        processInput();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [inputData, mode, autoFormat]);

  const forceAutoRepair = () => {
    const fixed = fixJson(inputData);
    if (!fixed.error && fixed.repaired !== inputData) {
      setInputData(fixed.repaired);
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

  // Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        processInput();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [processInput]);

  const copyOut = (format: 'formatted' | 'minified' | 'escaped' | 'js') => {
    if (!outputData) return;

    if (format === 'formatted') {
      navigator.clipboard.writeText(outputData);
      showToast('Copied Formatted', 'success');
    } else if (format === 'minified') {
      try { navigator.clipboard.writeText(JSON.stringify(JSON.parse(outputData))); showToast('Copied Minified', 'success'); }
      catch { navigator.clipboard.writeText(outputData.replace(/\s+/g, '')); showToast('Copied Minified Space', 'success'); }
    } else if (format === 'escaped') {
      navigator.clipboard.writeText(JSON.stringify(outputData));
      showToast('Copied Escaped', 'success');
    } else if (format === 'js') {
      const jsStr = outputData.replace(/"([^"]+)":/g, '$1:').replace(/"/g, "'");
      navigator.clipboard.writeText(jsStr);
      showToast('Copied as JS Object', 'success');
    }
  };
  // Resize logic
  const splitRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(45); // 45% default

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const handleMouseMove = (e: MouseEvent) => {
      if (!splitRef.current) return;
      const bounds = splitRef.current.getBoundingClientRect();
      let newWidth = ((e.clientX - bounds.left) / bounds.width) * 100;
      if (newWidth < 20) newWidth = 20;
      if (newWidth > 80) newWidth = 80;
      setLeftWidth(newWidth);
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    const handleClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="app-container" onDrop={(e) => { e.preventDefault(); handleFileUpload({ target: { files: e.dataTransfer.files } } as any); }} onDragOver={(e) => e.preventDefault()}>
      <div className="theme-selector-container" ref={themeMenuRef}>
        <button className="theme-toggle-btn" onClick={() => setThemeMenuOpen(!themeMenuOpen)}>
          <Palette size={16} /> Theme
        </button>
        {themeMenuOpen && (
          <div className="theme-dropdown">
            <button onClick={() => { setTheme('theme-midnight'); setThemeMenuOpen(false); }} className={`theme-dropdown-item ${theme === 'theme-midnight' ? 'active' : ''}`}>
              <div className="theme-color-dot" style={{ backgroundColor: '#09090b' }}></div> Midnight
            </button>
            <button onClick={() => { setTheme('theme-ocean'); setThemeMenuOpen(false); }} className={`theme-dropdown-item ${theme === 'theme-ocean' ? 'active' : ''}`}>
              <div className="theme-color-dot" style={{ backgroundColor: '#020617' }}></div> Ocean Blue
            </button>
            <button onClick={() => { setTheme('theme-forest'); setThemeMenuOpen(false); }} className={`theme-dropdown-item ${theme === 'theme-forest' ? 'active' : ''}`}>
              <div className="theme-color-dot" style={{ backgroundColor: '#022c22' }}></div> Forest Green
            </button>
            <button onClick={() => { setTheme('theme-rose'); setThemeMenuOpen(false); }} className={`theme-dropdown-item ${theme === 'theme-rose' ? 'active' : ''}`}>
              <div className="theme-color-dot" style={{ backgroundColor: '#4c0519' }}></div> Rose Pink
            </button>
            <button onClick={() => { setTheme('theme-light'); setThemeMenuOpen(false); }} className={`theme-dropdown-item ${theme === 'theme-light' ? 'active' : ''}`}>
              <div className="theme-color-dot" style={{ backgroundColor: '#f8fafc' }}></div> Clean Light
            </button>
            <button onClick={() => { setTheme('theme-netflix'); setThemeMenuOpen(false); }} className={`theme-dropdown-item ${theme === 'theme-netflix' ? 'active' : ''}`}>
              <div className="theme-color-dot" style={{ backgroundColor: '#000000' }}></div> Netflix Red
            </button>
          </div>
        )}
      </div>

      <header className="dashboard-header">
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', fontSize: '2.4rem', fontWeight: 700, margin: 0 }}>
          <Braces size={36} color="var(--accent-primary)" />
          Fix Broken JSON
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: '520px', margin: '0.6rem auto 0', lineHeight: 1.4, opacity: 0.8 }}>
          Because backslashes are JSON's way of crying for help.
        </p>
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
          <div className="stat-card" style={{ background: 'rgba(52, 211, 153, 0.05)', borderColor: 'rgba(52, 211, 153, 0.2)', color: 'var(--success-color)' }}>
            <ShieldCheck size={12} /> 100% Data Privacy
          </div>
        </div>

        <div className="segmented-control">
          {[
            { id: 'formatter', label: 'Fixer', icon: <CheckCircle2 size={14}/> },
            { id: 'diff', label: 'Compare', icon: <Search size={14}/> },
            { id: 'yaml', label: 'To YAML', icon: <Palette size={14}/> },
            { id: 'ts', label: 'To TS', icon: <Zap size={14}/> }
          ].map(m => (
            <button key={m.id} className={`segment-btn ${mode === m.id ? 'active' : ''}`} onClick={() => setMode(m.id as Mode)}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </header>

      <main className="main-content">
        <div className="mode-tabs" style={{ padding: '0 0 1rem 0', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem', display: 'flex' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
            <button className={`tab-btn ${mode === 'formatter' ? 'active' : ''}`} onClick={() => setMode('formatter')}>Formatter</button>
            <button className={`tab-btn ${mode === 'diff' ? 'active' : ''}`} onClick={() => setMode('diff')}>Diff</button>
            <button className={`tab-btn ${mode === 'yaml' ? 'active' : ''}`} onClick={() => setMode('yaml')}>To YAML</button>
            <button className={`tab-btn ${mode === 'ts' ? 'active' : ''}`} onClick={() => setMode('ts')}>To TS</button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-color)', margin: '0 0.5rem' }}></div>
            <div className="modular-selector">
              <button 
                className={`modular-selector-btn ${activeSample === 'escaped' ? 'active' : ''}`}
                onClick={() => { setInputData('"{\\"user\\": \\"Yash\\", \\"settings\\": {\\"theme\\": \\"dark\\"}}"'); setActiveSample('escaped'); }}
                title="Try Escaped String"
              >
                Escaped
              </button>
              <button 
                className={`modular-selector-btn ${activeSample === 'broken' ? 'active' : ''}`}
                onClick={() => { setInputData("{'name': 'Dev', active: True, val: None,}"); setActiveSample('broken'); }}
                title="Try Broken JSON"
              >
                Broken
              </button>
              <button 
                className={`modular-selector-btn ${activeSample === 'log' ? 'active' : ''}`}
                onClick={() => { setInputData("2026-03-26 [INFO] Payload received: {\"status\": 200, \"data\": [1,2,3]}"); setActiveSample('log'); }}
                title="Try Log Payload"
              >
                Log
              </button>
            </div>
            <button className="icon-btn-round" title="Upload JSON" onClick={() => fileInputRef.current?.click()}>
              <UploadCloud size={16} />
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" hidden />
            </button>
          </div>
        </div>

        <div className="workspace-card">
          {suggestion && (
            <div style={{ 
              backgroundColor: status === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-hover)', 
              color: status === 'success' ? 'var(--text-success)' : 'var(--text-muted)', 
              borderBottom: '1px solid var(--border-color)', 
              padding: '0.4rem 1rem', 
              fontSize: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              fontWeight: 500 
            }}>
              {status === 'success' ? <Zap size={14} color="var(--text-success)" /> : <Palette size={14} color="var(--accent-primary)" strokeWidth={2.5} />}
              {suggestion}
            </div>
          )}

          {mode === 'diff' ? (
            <DiffViewer
              theme={theme}
              initialOriginal={diffOriginal}
              initialModified={inputData}
              onOriginalChange={setDiffOriginal}
              onModifiedChange={setInputData}
              onToast={showToast}
            />
          ) : (
            <div className="split-layout" ref={splitRef} style={{ height: '100%', display: 'flex', flex: 1 }}>
              <div className="split-pane" style={{ height: '100%', flex: `0 0 ${leftWidth}%`, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
                <JsonEditor
                  value={inputData}
                  onChange={setInputData}
                  theme={theme}
                  onClear={() => setInputData('')}
                  onCopy={() => { navigator.clipboard.writeText(inputData); showToast('Copied Input', 'success'); }}
                />
              </div>

              <div
                className="resizer-handle"
                onMouseDown={handleMouseDown}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-primary)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--border-color)'}
              ></div>

              <div className="split-pane" style={{ height: '100%', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
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
                  onCopyJS={() => copyOut('js')}
                />
              </div>
            </div>
          )}
        </div>

      <footer className="stats-footer">
        <div className="stat-card" style={{ color: 'var(--success-color)', background: 'rgba(52, 211, 153, 0.05)' }}>
          <ShieldCheck size={12}/> 100% Private
        </div>
        <div className="stat-card">
          <span className={`status-dot ${status}`}></span> 
          {status === 'idle' ? 'Ready' : status === 'success' ? 'Valid' : 'Fixed'}
        </div>
        <div className="stat-card">Size: <b>{stats.sizeKB} KB</b></div>
        <div className="stat-card">Keys: <b>{stats.keysCount}</b></div>
        <div className="stat-card">Depth: <b>{stats.maxDepth}</b></div>
        <div className="stat-card" style={{ opacity: 0.5 }}>Built by Dev Yash</div>
      </footer>
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
