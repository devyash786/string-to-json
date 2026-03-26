import { useState, useEffect, useRef } from 'react';
import { 
  Braces, 
  Copy, 
  Trash2, 
  ArrowRightLeft, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Palette
} from 'lucide-react';
import './App.css';

type ConversionMode = 'string2json' | 'json2string';
type ThemeType = 'theme-light' | 'theme-midnight' | 'theme-ocean' | 'theme-forest' | 'theme-rose' | 'theme-netflix';

const THEMES = [
  { id: 'theme-light', color: '#f8fafc', name: 'Light' },
  { id: 'theme-midnight', color: '#6366f1', name: 'Midnight' },
  { id: 'theme-ocean', color: '#0ea5e9', name: 'Ocean' },
  { id: 'theme-forest', color: '#10b981', name: 'Forest' },
  { id: 'theme-rose', color: '#f43f5e', name: 'Rose' },
  { id: 'theme-netflix', color: '#e50914', name: 'Netflix' },
] as const;

function App() {
  const [mode, setMode] = useState<ConversionMode>('string2json');
  const [theme, setTheme] = useState<ThemeType>('theme-midnight');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [inputData, setInputData] = useState('');
  const [outputData, setOutputData] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    if (isThemeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isThemeMenuOpen]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const handleSwapMode = () => {
    const newMode = mode === 'string2json' ? 'json2string' : 'string2json';
    setMode(newMode);
    
    if (status === 'success' && outputData) {
      setInputData(outputData);
    } else {
      setInputData('');
      setOutputData('');
    }
    
    setError(null);
    setStatus('idle');
  };

  const convertStringToJson = (input: string) => {
    let processedString = input.trim();
    if (
      (processedString.startsWith('"') && processedString.endsWith('"')) ||
      (processedString.startsWith("'") && processedString.endsWith("'"))
    ) {
      try {
        const unescaped = JSON.parse(processedString);
        if (typeof unescaped === 'string') {
          processedString = unescaped;
        }
      } catch (e) {
        processedString = processedString
          .replace(/^['"](.*)['"]$/, '$1')
          .replace(/\\\\/g, '\\')
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'");
      }
    }
    const parsed = JSON.parse(processedString);
    return JSON.stringify(parsed, null, 2);
  };

  const convertJsonToString = (input: string) => {
    const parsed = JSON.parse(input);
    return JSON.stringify(JSON.stringify(parsed));
  };

  const processConversion = () => {
    if (!inputData.trim()) {
      setOutputData('');
      setError(null);
      setStatus('idle');
      return;
    }

    try {
      let result = '';
      if (mode === 'string2json') {
        result = convertStringToJson(inputData);
      } else {
        result = convertJsonToString(inputData);
      }
      
      setOutputData(result);
      setError(null);
      setStatus('success');
    } catch (err: any) {
      setOutputData('');
      setError(mode === 'string2json' ? `Invalid JSON String: ${err.message}` : `Invalid JSON: ${err.message}`);
      setStatus('error');
    }
  };

  useEffect(() => {
    if (inputData) {
      processConversion();
    } else {
      setOutputData('');
      setError(null);
      setStatus('idle');
    }
  }, [inputData, mode]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard', 'success');
    } catch (err) {
      showToast('Failed to copy', 'error');
    }
  };

  const handleClear = () => {
    setInputData('');
  };

  const titleText = mode === 'string2json' ? 'String to JSON' : 'JSON to String';
  const descText = mode === 'string2json' 
    ? 'Convert escaped stringified JSON into beautifully formatted JSON instantly'
    : 'Convert beautifully formatted JSON into an escaped string instantly';
  const leftPaneTitle = mode === 'string2json' ? 'Input String' : 'Input JSON';
  const rightPaneTitle = mode === 'string2json' ? 'JSON Output' : 'String Output';
  const placeholderText = mode === 'string2json' 
    ? 'Paste your escaped JSON string here...\n\n(e.g. "{\\"hello\\":\\"world\\"}")'
    : 'Paste your formatted JSON here...\n\n(e.g. {\n  "hello": "world"\n})';

  return (
    <div className="app-container">
      <header className="header">
        <h1>
          <Braces size={36} color="var(--accent-primary)" />
          {titleText}
        </h1>
        <p>{descText}, seamlessly without ever leaving your device.</p>
        
        <div className="security-banner">
          <div className="security-item">
            <ShieldCheck size={18} className="text-success" />
            <span><strong>Zero Data Leakage:</strong> Processing happens 100% locally. No network requests are made.</span>
          </div>
          <div className="security-item">
            <Trash2 size={18} className="text-success" />
            <span><strong>No Data Saved:</strong> We use no databases or cookies. Refresh the page to permanently obliterate your data.</span>
          </div>
        </div>

        <div className="theme-selector-container" ref={menuRef}>
          <button 
            className="theme-toggle-btn" 
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            title="Change Theme"
            aria-label="Change Theme"
          >
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

      <main className="workspace">
        <div className="pane">
          <div className="pane-header">
            <span className="pane-title">{leftPaneTitle}</span>
            <div className="pane-actions">
              <button 
                type="button"
                className="icon-button" 
                onClick={handleClear} 
                title="Clear input"
                aria-label="Clear input"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
          <div className="editor-content">
            <textarea
              placeholder={placeholderText}
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              spellCheck="false"
            />
          </div>
        </div>

        <div className="center-controls">
          <button 
            type="button"
            className="primary-button"
            onClick={handleSwapMode}
            title={mode === 'string2json' ? 'Switch to JSON to String' : 'Switch to String to JSON'}
          >
            <ArrowRightLeft size={24} />
            <span className="sr-only">Toggle Mode</span>
          </button>
        </div>

        <div className="pane">
          <div className="pane-header">
            <span className="pane-title">{rightPaneTitle}</span>
            <div className="pane-actions">
              <button 
                type="button"
                className="icon-button" 
                onClick={() => handleCopy(outputData || error || '')}
                title="Copy output"
                aria-label="Copy output"
                disabled={!outputData && !error}
              >
                <Copy size={18} />
              </button>
            </div>
          </div>
          <div className="editor-content">
            {error ? (
              <div className="output-area error">
                {error}
              </div>
            ) : (
              <div className="output-area">
                {outputData || 'Waiting for valid input...'}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="status-bar">
        <div className="status-indicator">
          <span className={`status-dot ${status}`}></span>
          <span>
            {status === 'idle' ? 'Ready to process incoming text' : 
             status === 'success' ? 'Conversion processed successfully' : 
             'Attention: Error parsing input data'}
          </span>
        </div>
        <div className="privacy-badge">
          <ShieldCheck size={18} strokeWidth={2.5} />
          100% Client-Side Processing
        </div>
      </footer>

      {toast && (
        <div className="toast">
          {toast.type === 'success' ? <CheckCircle2 size={20} color="var(--success-color)" /> : <AlertCircle size={20} color="var(--error-color)" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;
