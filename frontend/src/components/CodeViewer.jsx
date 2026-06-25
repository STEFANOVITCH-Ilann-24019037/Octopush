import React from 'react';

// Minimal syntax highlight for TS/JS keywords. Lightweight, no external deps.
const KEYWORDS = [
  'import', 'from', 'export', 'default', 'const', 'let', 'var',
  'function', 'return', 'if', 'else', 'for', 'while', 'class',
  'extends', 'implements', 'interface', 'type', 'enum', 'async', 'await',
  'new', 'this', 'super', 'true', 'false', 'null', 'undefined', 'as',
];

const tokenize = (line) => {
  const tokens = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    // Comment
    if (ch === '/' && line[i + 1] === '/') {
      tokens.push({ t: 'comment', v: line.slice(i) });
      break;
    }
    // String
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\') j++;
        j++;
      }
      tokens.push({ t: 'string', v: line.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    // Word
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < line.length && /[A-Za-z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);
      if (KEYWORDS.includes(word)) tokens.push({ t: 'kw', v: word });
      else if (/^[A-Z]/.test(word)) tokens.push({ t: 'type', v: word });
      else tokens.push({ t: 'id', v: word });
      i = j;
      continue;
    }
    // Number
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      tokens.push({ t: 'num', v: line.slice(i, j) });
      i = j;
      continue;
    }
    tokens.push({ t: 'p', v: ch });
    i++;
  }
  return tokens;
};

const colorFor = (t) => {
  switch (t) {
    case 'kw': return 'text-[#ff7b72] dark:text-[#ff7b72]';
    case 'string': return 'text-[#a5d6ff] dark:text-[#a5d6ff]';
    case 'comment': return 'text-[#8b949e] italic';
    case 'num': return 'text-[#79c0ff]';
    case 'type': return 'text-[#ffa657]';
    default: return 'text-foreground';
  }
};

const CodeViewer = ({ code }) => {
  const lines = code.split('\n');
  return (
    <div className="border border-border rounded-md overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="code-block min-w-full">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-muted/40">
                <td className="select-none text-right pr-4 pl-3 text-muted-foreground border-r border-border w-12">
                  {idx + 1}
                </td>
                <td className="pl-4 pr-4 whitespace-pre">
                  {tokenize(line).map((tok, i) => (
                    <span key={i} className={colorFor(tok.t)}>{tok.v}</span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CodeViewer;
