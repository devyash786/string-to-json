import { Bug } from 'lucide-react';
import React from 'react';

interface ErrorDisplayProps {
  message: string | null;
  line: number | null;
  col: number | null;
  onFix: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, line, col, onFix }) => {
  if (!message) return null;

  return (
    <div className="error-display">
      <Bug size={36} color="var(--error-color)" />
      <h3 style={{ margin: '1rem 0 0.5rem', fontSize: '1.2rem', color: 'var(--error-color)' }}>
        ❌ Parse Error Detected
      </h3>
      
      <div className="error-text-highlight">
        {message}
        {(line !== null || col !== null) && (
          <div style={{ marginTop: '0.8rem', fontWeight: 600 }}>
            📍 Location: {line !== null ? `Line ${line}` : ''} {col !== null ? `, Column ${col}` : ''}
          </div>
        )}
      </div>

      <button className="repair-btn" onClick={onFix} style={{ marginTop: '1rem' }}>
        Force Auto-Repair Messy JSON
      </button>
      
      <p style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '1rem', maxWidth: '400px', marginInline: 'auto' }}>
        This tool automatically fixes single quotes, Python's True/False/None, trailing commas, and unquoted keys.
      </p>
    </div>
  );
};
