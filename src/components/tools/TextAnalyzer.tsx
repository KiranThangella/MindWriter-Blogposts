import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

export function TextAnalyzer({ onBack }: { onBack: () => void }) {
  const [text, setText] = useState('');

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

  return (
    <div className="p-8 max-w-2xl mx-auto text-white">
      <button onClick={onBack} className="flex items-center text-gray-400 hover:text-white mb-6">
        <ArrowLeft className="mr-2" /> Back to Home
      </button>
      <h2 className="text-3xl font-bold mb-6">Text Analyzer</h2>
      <textarea 
        value={text} 
        onChange={(e) => setText(e.target.value)} 
        className="w-full h-64 bg-white/5 border border-white/10 rounded-lg p-4 text-white mb-4"
        placeholder="Type or paste your text here..."
      />
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 p-4 rounded-lg font-mono">Word Count: {wordCount}</div>
        <div className="bg-white/5 p-4 rounded-lg font-mono">Char Count: {charCount}</div>
      </div>
    </div>
  );
}
