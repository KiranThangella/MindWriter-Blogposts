import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

export function ColorPalette({ onBack }: { onBack: () => void }) {
  const [colors, setColors] = useState(['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FFFF33']);

  const regenerate = () => {
    setColors(Array.from({ length: 5 }, () => '#' + Math.floor(Math.random()*16777215).toString(16)));
  };

  return (
    <div className="p-8 max-w-2xl mx-auto text-white">
      <button onClick={onBack} className="flex items-center text-gray-400 hover:text-white mb-6">
        <ArrowLeft className="mr-2" /> Back to Home
      </button>
      <h2 className="text-3xl font-bold mb-6">Color Palette Generator</h2>
      <button onClick={regenerate} className="bg-brand-purple px-6 py-2 rounded-lg mb-6">Generate New Palette</button>
      <div className="flex gap-2">
        {colors.map(color => (
          <div key={color} style={{ backgroundColor: color }} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
