import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

// A small, safe recursive-descent parser for basic arithmetic — replaces
// eval(), which executes arbitrary JavaScript (not just math expressions).
// Even though this tool never sends the expression anywhere, eval() is
// still bad practice: it's the exact pattern that turns "harmless" input
// fields into an XSS/injection vector the moment the surrounding code
// changes even slightly (e.g. if the expression were ever persisted,
// shared via URL, or rendered elsewhere). This only understands numbers,
// + - * / ( ) and unary minus — nothing else can execute.
function evaluateArithmetic(input: string): number {
  const tokens = input.match(/\d+\.?\d*|\.\d+|[+\-*/()]/g);
  if (!tokens || tokens.join('') !== input.replace(/\s+/g, '')) {
    throw new Error('Invalid characters in expression');
  }

  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseExpression(): number {
    let value = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = next();
      const rhs = parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = next();
      const rhs = parseFactor();
      if (op === '/' && rhs === 0) throw new Error('Division by zero');
      value = op === '*' ? value * rhs : value / rhs;
    }
    return value;
  }

  function parseFactor(): number {
    if (peek() === '-') {
      next();
      return -parseFactor();
    }
    if (peek() === '(') {
      next();
      const value = parseExpression();
      if (next() !== ')') throw new Error('Mismatched parentheses');
      return value;
    }
    const token = next();
    const value = parseFloat(token);
    if (token === undefined || Number.isNaN(value)) throw new Error('Expected a number');
    return value;
  }

  if (tokens.length === 0) throw new Error('Empty expression');
  const result = parseExpression();
  if (pos !== tokens.length) throw new Error('Unexpected trailing input');
  return result;
}

export function Calculator({ onBack }: { onBack: () => void }) {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('');

  const calculate = () => {
    try {
      setResult(evaluateArithmetic(expr).toString());
    } catch {
      setResult('Error');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto text-white">
      <button onClick={onBack} className="flex items-center text-gray-400 hover:text-white mb-6">
        <ArrowLeft className="mr-2" /> Back to Home
      </button>
      <h2 className="text-3xl font-bold mb-6">Smart Calculator</h2>
      <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
        <input 
          value={expr} 
          onChange={(e) => setExpr(e.target.value)} 
          className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white mb-4 font-mono text-xl"
          placeholder="e.g. 2 + 2 * 4"
        />
        <button onClick={calculate} className="w-full bg-brand-purple py-3 rounded-lg font-bold">Calculate</button>
        {result && <div className="mt-4 text-2xl font-mono text-brand-purple">Result: {result}</div>}
      </div>
    </div>
  );
}
