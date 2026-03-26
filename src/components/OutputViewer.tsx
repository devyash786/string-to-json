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
  onCopyMinified
}) => {
  return (
    <div className="pane-wrapper">
      <div className="pane-toolbar">
        <span className="toolbar-title">{mode === 'formatter' ? 'Fixed JSON' : `${mode.toUpperCase()} Output`}</span>
        <div className="toolbar-actions">
          <button onClick={onCopyFormatted} className="tool-btn" title="Copy Formatted JSON"><Copy size={14} /> Beautify & Copy</button>
          <button onClick={onCopyMinified} className="tool-btn" title="Copy Minified (1 Line)"><Copy size={14} /> Minify & Copy</button>
        </div>
      </div>
      
      <div className="editor-container" style={{ minHeight: '500px' }}>
        {status === 'error' ? (
          <ErrorDisplay message={errorMsg} line={errorLine} col={errorCol} onFix={onFix} />
        ) : (
          <Editor
            height="65vh"
            language={mode === 'formatter' ? 'json' : mode === 'ts' ? 'typescript' : mode}
            value={value}
            theme={theme === 'theme-light' ? 'light' : 'vs-dark'}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              wordWrap: 'on',
              formatOnPaste: false,
              scrollbar: { verticalScrollbarSize: 8 },
              padding: { top: 16 }
            }}
          />
        )}
      </div>
    </div>
  );
};
