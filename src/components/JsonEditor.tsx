import React from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';

interface JsonEditorProps {
  value: string;
  onChange: (val: string | undefined) => void;
  readOnly?: boolean;
  theme?: string;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({ value, onChange, readOnly, theme }) => {
  return (
    <Editor
      height="100%"
      defaultLanguage="json"
      value={value}
      onChange={onChange}
      theme={theme === 'theme-light' ? 'light' : 'vs-dark'}
      options={{
        readOnly,
        minimap: { enabled: true },
        wordWrap: 'on',
        formatOnPaste: true,
        smoothScrolling: true,
        scrollbar: { verticalScrollbarSize: 8 },
        padding: { top: 16 }
      }}
    />
  );
};

export const JsonDiffEditor: React.FC<{ original: string; modified: string; theme?: string }> = ({ original, modified, theme }) => {
  return (
    <DiffEditor
      height="100%"
      language="json"
      original={original}
      modified={modified}
      theme={theme === 'theme-light' ? 'light' : 'vs-dark'}
      options={{
        renderSideBySide: true,
        minimap: { enabled: true }
      }}
    />
  );
};
