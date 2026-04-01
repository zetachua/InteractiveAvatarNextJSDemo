import React, { useMemo, useState } from 'react';

interface SectionProps {
  title: string;
  feedback?: string;
}

const Section: React.FC<SectionProps> = ({ title, feedback }) => {
  if (!feedback) return null; // Hide section if no feedback is available
  const [expanded, setExpanded] = useState(false);
  const cleanedFeedback = feedback
    .replace(/^["'\s]*\.+\s*/, '')
    .replace(/\.\.+/g, '.')
    .replace(/^\s*\.+\s*/, '')
    .replace(/\s*\.+\s*$/, '')
    .replace(/([.?!])\s+/g, '$1\n\n')
    .trim();
  const MAX_CHARS = 320;
  const isLong = cleanedFeedback.length > MAX_CHARS;
  const collapsedText = useMemo(() => {
    if (!isLong) return cleanedFeedback;
    const sliced = cleanedFeedback.slice(0, MAX_CHARS);
    const lastSafeCut = Math.max(sliced.lastIndexOf('.'), sliced.lastIndexOf('\n'));
    const finalText = lastSafeCut > 180 ? sliced.slice(0, lastSafeCut + 1) : sliced;
    return `${finalText.trim()}...`;
  }, [cleanedFeedback, isLong]);

  return (
    <div
      style={{
        background: '#444',
        padding: '0.9rem',
        borderRadius: '10px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        fontSize: '0.92rem',
        lineHeight: 1.45,
      }}
    >
      <b style={{ fontSize: '0.95rem' }}>{title}:</b>
      <p style={{ whiteSpace: 'pre-line' }}>{expanded ? cleanedFeedback : collapsedText}</p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            marginTop: '0.35rem',
            border: 'none',
            background: 'transparent',
            color: '#9bb5ff',
            fontSize: '0.82rem',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
};

export default Section;
