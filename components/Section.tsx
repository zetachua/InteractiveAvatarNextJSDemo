import React from 'react';

interface SectionProps {
  title: string;
  feedback?: string;
}

const Section: React.FC<SectionProps> = ({ title, feedback }) => {
  if (!feedback) return null; // Hide section if no feedback is available

  return (
    <div
      style={{
        background: '#444',
        padding: '0.9rem',
        borderRadius: '10px',
      }}
    >
      <b>{title}:</b>
      <p>{feedback}</p>
    </div>
  );
};

export default Section;
