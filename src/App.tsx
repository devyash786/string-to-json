import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Braces, FileJson, FileText, FileCode, CheckCircle2, AlertCircle,
  Palette, UploadCloud, SplitSquareHorizontal
} from 'lucide-react';
import { convertToYaml, convertToCsv, convertToTS, getJsonStats } from './utils/jsonUtils';
import { fixJson } from './utils/fixJson';

import './App.css';
import { JsonEditor } from './components/JsonEditor';
import { OutputViewer } from './components/OutputViewer';
import { DiffViewer } from './components/DiffViewer';

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

      setStatus(fixed.isFixed ? 'fixing' : 'success');
      setErrorMsg(null);
      setErrorLine(null);
      setErrorCol(null);
      
      setStats(getJsonStats(parsed));

    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Invalid JSON format');
    }
  }, [inputData, mode]);

  useEffect(() => {
    if (autoFormat) processInput();
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

  return (
    <div className="app-container" onDrop={(e) => { e.preventDefault(); handleFileUpload({ target: { files: e.dataTransfer.files } } as any); }} onDragOver={(e) => e.preventDefault()}>
      <header className="header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', fontSize: '2.5rem', fontWeight: 800 }}>
          <Braces size={40} color="var(--accent-primary)" />
          Fix Broken JSON in 1 Click
        </h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.8, marginTop: '0.6rem' }}>Parse escaped strings, logs, and API payloads instantly — 100% client-side & private.</p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1.2rem' }}>
          <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>⚡ Instant</span>
          <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>🔒 Private</span>
          <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>🧠 Smart Parsing</span>
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

        <div className="sample-data-chips">
          <span style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 600 }}>Action:</span>
          <button className="chip" onClick={() => setInputData('"{\\"user\\": \\"Yash\\", \\"settings\\": {\\"theme\\": \\"dark\\"}}"')}>Try Escaped</button>
          <button className="chip" onClick={() => setInputData("{'name': 'Dev', active: True, val: None,}")}>Try Broken</button>
          <button className="chip" onClick={() => setInputData("2026-03-26 10:15:30 [INFO] Payload received: {\"status\": 200, \"data\": [1,2,3]}")}>Try Log Payload</button>
        </div>

        <button className="tab-btn outline" onClick={() => fileInputRef.current?.click()}>
          <UploadCloud size={18} /> Upload JSON
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" hidden />
        </button>
      </div>

      <main className="main-content">
        <div className="workspace-card">
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
            <>
              {suggestion && (
                <div style={{ backgroundColor: 'var(--accent-primary)', color: 'white', padding: '0.5rem 1rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 500, borderRadius: '4px', margin: '0 1rem 0.5rem' }}>
                  {suggestion}
                </div>
              )}
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
                  onCopyJS={() => copyOut('js')}
                />
              </div>
            </>
          )}
        </div>

        <div className="stats-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
             <div className="stat-pill"><span className="stat-label">Status:</span> <span className={`status-dot ${status}`}></span> {status === 'idle' ? 'Ready' : status === 'success' ? 'Valid JSON' : status === 'fixing' ? 'Auto-Fixed' : 'Error'}</div>
             <div className="stat-pill"><span className="stat-label">Size:</span> {stats.sizeKB} KB</div>
             <div className="stat-pill"><span className="stat-label">Keys:</span> {stats.keysCount}</div>
             <div className="stat-pill"><span className="stat-label">Depth:</span> {stats.maxDepth}</div>
           </div>
           <div style={{ opacity: 0.5, fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 500 }}>
             Built for developers who hate messy JSON
           </div>
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
