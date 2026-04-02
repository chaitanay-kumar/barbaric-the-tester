import React from 'react';

/**
 * Render text with {{variables}} highlighted inline.
 * Used in node cards to visually distinguish variable references.
 *
 * Colors:
 *  - Orange: known/resolved variable
 *  - Red: unresolved/unknown variable
 *  - Faded orange: incomplete (still typing)
 */
export function highlightVariables(
  text: string,
  knownVars?: Set<string>
): React.ReactNode {
  if (!text || !text.includes('{{')) return text;

  const parts: React.ReactNode[] = [];
  const regex = /(\{\{[\w.]*}?}?)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[1];
    const isComplete = token.startsWith('{{') && token.endsWith('}}');
    const varName = isComplete ? token.slice(2, -2) : token.slice(2);
    const rootVar = varName.split('.')[0];
    const isKnown = !knownVars || (isComplete && knownVars.has(rootVar));

    parts.push(
      <span
        key={match.index}
        className={
          isComplete
            ? isKnown
              ? 'text-orange-500 font-semibold'
              : 'text-red-400'
            : 'text-orange-400/60'
        }
      >
        {token}
      </span>
    );

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
