import React from 'react';
import Editor from '@monaco-editor/react';
import { Copy } from 'lucide-react';
import { ErrorDisplay } from './ErrorDisplay';

interface OutputViewerProps {
  value: string;
  theme: string;
  mode: string;
  status: 'idle' | 'success' | 'error' | 'fixing';
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
  return (
    <div className="pane-wrapper">
      <div className="pane-toolbar">
        <span className="toolbar-title">{mode === 'formatter' ? 'Fixed JSON' : `${mode.toUpperCase()} Output`}</span>
        <div className="toolbar-actions">
          <button onClick={onCopyFormatted} className="tool-btn" title="Copy Formatted JSON"><Copy size={14} /> Beautify & Copy</button>
          <button onClick={onCopyJS} className="tool-btn" title="Copy as JS Object"><Copy size={14} /> Copy as JS</button>
          <button onClick={onCopyMinified} className="tool-btn" title="Copy Minified (1 Line)"><Copy size={14} /> Minify & Copy</button>
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
