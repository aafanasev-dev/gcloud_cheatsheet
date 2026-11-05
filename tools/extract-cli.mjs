#!/usr/bin/env node
// Pulls every `gcloud …` / `bq …` invocation out of the site data (shell
// commands only, not source files) for tools/check-cli.py to verify against
// the real CLI.  Usage: node tools/extract-cli.mjs > calls.json
import { topics } from '../js/data/index.js';

// Cut one invocation out of a shell line: stop at an unquoted | ; & > or a
// closing paren of an enclosing $( … ). Quotes and nested $( ) are respected.
function invocation(text, start) {
  let i = start, quote = null, depth = 0;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === "'" || ch === '"') { quote = ch; continue; }
    if (ch === '$' && text[i + 1] === '(') { depth++; i++; continue; }
    if (ch === '(') { depth++; continue; }
    if (ch === ')') { if (depth === 0) break; depth--; continue; }
    if (depth === 0 && '|;&>\n'.includes(ch)) break;
  }
  return text.slice(start, i);
}

function tokens(s) {
  const out = [];
  let cur = '', quote = null, any = false;
  for (const ch of s) {
    if (quote) { if (ch === quote) quote = null; else cur += ch; continue; }
    if (ch === "'" || ch === '"') { quote = ch; any = true; continue; }
    if (/\s/.test(ch)) { if (cur || any) out.push(cur); cur = ''; any = false; continue; }
    cur += ch;
  }
  if (cur || any) out.push(cur);
  return out;
}

const calls = [];
for (const t of topics) for (const s of t.subtopics) for (const sec of s.sections) for (const c of sec.cmds) {
  const text = c.c.replace(/\\\n/g, ' ');
  for (const line of text.split('\n')) {
    if (/^\s*#/.test(line)) continue;
    for (const m of line.matchAll(/(?<![\w./:-])(gcloud|bq)(?=\s)/g)) {
      const [tool, ...args] = tokens(invocation(line, m.index));
      calls.push({ where: `${t.id}/${s.id} · ${sec.title}`, tool, args });
    }
  }
}
process.stdout.write(JSON.stringify(calls));
