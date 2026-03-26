import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Braces, CheckCircle2, AlertCircle,
  UploadCloud, Sun, Moon, Zap, ShieldCheck, BrainCircuit
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, []);

  return (
    <div className="app-container" onDrop={(e) => { e.preventDefault(); handleFileUpload({ target: { files: e.dataTransfer.files } } as any); }} onDragOver={(e) => e.preventDefault()}>
      <button className="theme-toggle-ghost" onClick={() => setTheme(theme === 'theme-light' ? 'theme-midnight' : 'theme-light')} title="Toggle Theme">
        {theme === 'theme-light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      <header className="header" style={{ textAlign: 'center', marginBottom: '1.2rem', paddingTop: '1rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', fontSize: '2.2rem', fontWeight: 700 }}>
          <Braces size={32} color="var(--accent-primary)" />
          Fix Broken JSON
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: '520px', margin: '0.4rem auto 1rem', lineHeight: 1.4 }}>
          100% client-side. Your data never leaves the browser.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <span className="badge"><Zap size={14} /> Instant</span>
          <span className="badge"><ShieldCheck size={14} /> Private</span>
          <span className="badge"><BrainCircuit size={14} /> Smart Parsing</span>
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
            <select className="select-dropdown" onChange={(e) => {
              if (e.target.value === 'escaped') setInputData('"{\\"user\\": \\"Yash\\", \\"settings\\": {\\"theme\\": \\"dark\\"}}"');
              if (e.target.value === 'broken') setInputData("{'name': 'Dev', active: True, val: None,}");
              if (e.target.value === 'log') setInputData("2026-03-26 [INFO] Payload received: {\"status\": 200, \"data\": [1,2,3]}");
              e.target.value = 'none';
            }}>
              <option value="none">Parse as...</option>
              <option value="escaped">Escaped string</option>
              <option value="broken">Broken JSON</option>
              <option value="log">Log payload</option>
            </select>
            <button className="icon-btn-ghost" title="Upload JSON" onClick={() => fileInputRef.current?.click()}>
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
              padding: '0.6rem 1rem', 
              fontSize: '13px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              fontWeight: 500 
            }}>
              {status === 'success' ? <Zap size={14} color="var(--text-success)" /> : <BrainCircuit size={14} color="var(--accent-primary)" strokeWidth={2.5} />}
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
