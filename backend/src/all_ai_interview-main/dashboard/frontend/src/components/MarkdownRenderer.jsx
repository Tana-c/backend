import React from 'react';

/**
 * Simple Markdown Renderer Component
 * Converts markdown-style text to styled HTML
 */
export const MarkdownRenderer = ({ content }) => {
  const renderMarkdown = (text) => {
    if (!text) return null;

    // Split by lines
    const lines = text.split('\n');
    const elements = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (line.trim() === '') {
        elements.push(<div key={key++} className="h-4" />);
        continue;
      }

      // H2 headers (##)
      if (line.startsWith('## ')) {
        const text = line.replace(/^## /, '');
        elements.push(
          <h2 key={key++} className="text-2xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2">
            {text}
          </h2>
        );
        continue;
      }

      // H3 headers (###)
      if (line.startsWith('### ')) {
        const text = line.replace(/^### /, '');
        elements.push(
          <h3 key={key++} className="text-xl font-semibold text-slate-700 mt-6 mb-3 flex items-center gap-2">
            {text}
          </h3>
        );
        continue;
      }

      // Bold text with bullets (**text:**)
      if (line.match(/^\*\*.*\*\*/)) {
        const text = line.replace(/\*\*/g, '');
        elements.push(
          <div key={key++} className="font-bold text-slate-800 mt-4 mb-2">
            {text}
          </div>
        );
        continue;
      }

      // Numbered lists (1., 2., 3.)
      if (line.match(/^\d+\.\s/)) {
        const text = line.replace(/^\d+\.\s/, '');
        const processedText = processInlineFormatting(text);
        elements.push(
          <div key={key++} className="ml-6 mb-2 text-slate-700">
            <span className="font-semibold text-slate-800">{line.match(/^\d+\./)[0]}</span> {processedText}
          </div>
        );
        continue;
      }

      // Bullet points (- or •)
      if (line.match(/^[-•]\s/)) {
        const text = line.replace(/^[-•]\s/, '');
        const processedText = processInlineFormatting(text);
        elements.push(
          <div key={key++} className="ml-6 mb-2 text-slate-700 flex gap-2">
            <span className="text-slate-500">•</span>
            <span>{processedText}</span>
          </div>
        );
        continue;
      }

      // Horizontal rule (---)
      if (line.trim() === '---') {
        elements.push(
          <hr key={key++} className="my-6 border-slate-200" />
        );
        continue;
      }

      // Regular paragraph with inline formatting
      const processedText = processInlineFormatting(line);
      elements.push(
        <p key={key++} className="text-slate-700 mb-3 leading-relaxed">
          {processedText}
        </p>
      );
    }

    return elements;
  };

  const processInlineFormatting = (text) => {
    const parts = [];
    let currentText = text;
    let key = 0;

    // Process **bold** text
    const boldRegex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(currentText)) !== null) {
      // Add text before bold
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${key++}`}>
            {currentText.substring(lastIndex, match.index)}
          </span>
        );
      }
      // Add bold text
      parts.push(
        <strong key={`bold-${key++}`} className="font-semibold text-slate-800">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < currentText.length) {
      parts.push(
        <span key={`text-${key++}`}>
          {currentText.substring(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="markdown-content">
      {renderMarkdown(content)}
    </div>
  );
};
