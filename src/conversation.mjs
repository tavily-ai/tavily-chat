export function conversationHistory(messages) {
  const pairs = [];
  for (let i = 0; i < messages.length - 1; i++) {
    const user = messages[i], assistant = messages[i + 1];
    if (user.role === 'user' && assistant.role === 'assistant' && assistant.status === 'complete') {
      pairs.push([{role: 'user', content: user.content.slice(0, 2000)}, {role: 'assistant', content: assistant.content.slice(0, 8000)}]);
    }
  }
  return pairs.slice(-3).flat();
}

export const safeLink = url => {
  if (typeof url !== 'string') return undefined;
  if (/^#source-[a-zA-Z0-9-]+$/.test(url)) return url;
  try { const parsed = new URL(url); return ['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : undefined; } catch { return undefined; }
};

// Some Research responses append a bibliography despite the concise-answer prompt.
// Remove it only when it is a trailing list of the same links rendered below the answer.
export function remarkSourceList({sources = []} = {}) {
  const known = new Set(sources.map(source => source.url));
  return tree => {
    const nodes = tree.children || [];
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index];
      if (node.type !== 'heading' || !/^(sources|references|bibliography)$/i.test((node.children || []).map(child => child.value || '').join('').trim())) continue;
      const tail = nodes.slice(index + 1);
      if (!tail.length || !tail.every(child => ['list', 'thematicBreak'].includes(child.type))) continue;
      const links = [];
      const collect = child => {if (child.type === 'link') links.push(safeLink(child.url)); for (const item of child.children || []) collect(item);};
      tail.forEach(collect);
      if (links.length && links.every(url => known.has(url))) {tree.children = nodes.slice(0, nodes[index - 1]?.type === 'thematicBreak' ? index - 1 : index); break;}
    }
  };
}

// Convert plain [1] / [1, 2] citations only after Tavily supplies its final source ordering.
export function remarkCitations({sources = [], prefix = ''} = {}) {
  const ids = new Set(sources.map(source => source.id));
  return tree => {
    function visit(node) {
      if (!node.children || ['link', 'linkReference', 'code', 'inlineCode'].includes(node.type)) return;
      node.children = node.children.flatMap(child => {
        if (child.type !== 'text') { visit(child); return [child]; }
        const nodes = []; let offset = 0;
        for (const match of child.value.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)) {
          const numbers = match[1].split(',').map(Number);
          if (!numbers.every(id => ids.has(id))) continue;
          if (match.index > offset) nodes.push({type: 'text', value: child.value.slice(offset, match.index)});
          for (const id of numbers) nodes.push({type: 'link', url: `#source-${prefix}-${id}`, children: [{type: 'text', value: `[${id}]`}]});
          offset = match.index + match[0].length;
        }
        if (offset < child.value.length) nodes.push({type: 'text', value: child.value.slice(offset)});
        return nodes;
      });
    }
    visit(tree);
  };
}
