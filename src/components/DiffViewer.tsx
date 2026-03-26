import React, { useRef } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { Wand2 } from 'lucide-react';
import { fixJson } from '../utils/fixJson';

interface DiffViewerProps {
  theme: string;
  initialOriginal: string;
  initialModified: string;
  onOriginalChange: (val: string) => void;
  onModifiedChange: (val: string) => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  theme,
  initialOriginal,
  initialModified,
  onOriginalChange,
  onModifiedChange,
  onToast
}) => {
  const diffEditorRef = useRef<any>(null);

  const handleEditorMount = (editor: any) => {
    diffEditorRef.current = editor;

    // We only send updates back to parent state on blur or debounce, NOT on every keystroke, 
    // to prevent cursor jumping/model recreating bugs in Monaco Diff Editor.
    editor.getOriginalEditor().onDidBlurEditorText(() => {
      onOriginalChange(editor.getOriginalEditor().getValue());
    });
    editor.getModifiedEditor().onDidBlurEditorText(() => {
      onModifiedChange(editor.getModifiedEditor().getValue());
    });
  };

  const autoFormatCompare = () => {
    if (!diffEditorRef.current) return;
    
    const oEditor = diffEditorRef.current.getOriginalEditor();
    const mEditor = diffEditorRef.current.getModifiedEditor();
    
    const oVal = oEditor.getValue();
    const mVal = mEditor.getValue();

    const oFix = fixJson(oVal);
    const mFix = fixJson(mVal);

    if (oFix.error || mFix.error) {
      onToast(`Parse Error: ${oFix.error || mFix.error}`, 'error');
    } else {
      // Use pushEditOperations to format without breaking undo stack
      const oModel = oEditor.getModel();
      const mModel = mEditor.getModel();
      
      if (oVal !== oFix.repaired) {
        oEditor.executeEdits('auto-format', [{ range: oModel.getFullModelRange(), text: oFix.repaired }]);
        onOriginalChange(oFix.repaired);
      }
      if (mVal !== mFix.repaired) {
        mEditor.executeEdits('auto-format', [{ range: mModel.getFullModelRange(), text: mFix.repaired }]);
        onModifiedChange(mFix.repaired);
      }
      
      onToast('Pretty Formatted Diff applied! ✨', 'success');
    }
  };

  return (
    <div className="diff-layout-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="diff-toolbars" style={{ display: 'flex' }}>
        <div className="pane-toolbar" style={{ flex: 1, borderRight: '1px solid var(--border-color)' }}>
          <span className="toolbar-title">Original Payload</span>
          <div className="toolbar-actions">
            <button className="tool-btn active-btn" onClick={autoFormatCompare} style={{ color: 'var(--accent-glow)' }}>
              <Wand2 size={14} /> Auto-Format & Compare
            </button>
          </div>
        </div>
        <div className="pane-toolbar" style={{ flex: 1 }}>
          <span className="toolbar-title">Modified Payload</span>
        </div>
      </div>
      
      <div style={{ flex: 1, minHeight: '500px' }}>
        <DiffEditor
          height="100%"
          language="json"
          theme={theme === 'theme-light' ? 'light' : 'vs-dark'}
          original={initialOriginal}
          modified={initialModified}
          onMount={handleEditorMount}
          options={{
            renderSideBySide: true,
            minimap: { enabled: false },
            originalEditable: true,
            formatOnPaste: false,
            scrollbar: { verticalScrollbarSize: 8 },
            padding: { top: 16 }
          }}
        />
      </div>
    </div>
  );
};
