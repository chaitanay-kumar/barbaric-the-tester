/**
 * Code Generator — generates cURL, Python requests, and JS fetch snippets
 * from captured request/response data in execution results.
 */

interface RequestData {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

export function generateCurl(req: RequestData): string {
  const parts: string[] = [`curl -X ${req.method}`];

  // URL
  parts.push(`  '${req.url}'`);

  // Headers
  if (req.headers) {
    Object.entries(req.headers).forEach(([k, v]) => {
      parts.push(`  -H '${k}: ${v}'`);
    });
  }

  // Body
  if (req.body) {
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    parts.push(`  -d '${bodyStr.replace(/'/g, "'\\''")}'`);
  }

  return parts.join(' \\\n');
}

export function generatePython(req: RequestData): string {
  const lines: string[] = ['import requests', ''];

  // URL
  lines.push(`url = "${req.url}"`);

  // Headers
  if (req.headers && Object.keys(req.headers).length > 0) {
    lines.push('headers = {');
    Object.entries(req.headers).forEach(([k, v]) => {
      lines.push(`    "${k}": "${v}",`);
    });
    lines.push('}');
  }

  // Body
  if (req.body) {
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body, null, 4);
    lines.push(`payload = ${bodyStr}`);
  }

  // Request call
  const method = req.method.toLowerCase();
  const args: string[] = ['url'];
  if (req.headers && Object.keys(req.headers).length > 0) args.push('headers=headers');
  if (req.body) args.push('json=payload');

  lines.push('');
  lines.push(`response = requests.${method}(${args.join(', ')})`);
  lines.push('');
  lines.push('print(response.status_code)');
  lines.push('print(response.json())');

  return lines.join('\n');
}

export function generateJsFetch(req: RequestData): string {
  const lines: string[] = [];
  const opts: string[] = [];

  opts.push(`  method: '${req.method}'`);

  if (req.headers && Object.keys(req.headers).length > 0) {
    const headerLines = Object.entries(req.headers)
      .map(([k, v]) => `    '${k}': '${v}'`)
      .join(',\n');
    opts.push(`  headers: {\n${headerLines}\n  }`);
  }

  if (req.body) {
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    opts.push(`  body: JSON.stringify(${bodyStr})`);
  }

  lines.push(`const response = await fetch('${req.url}', {`);
  lines.push(opts.join(',\n'));
  lines.push('});');
  lines.push('');
  lines.push('const data = await response.json();');
  lines.push('console.log(response.status, data);');

  return lines.join('\n');
}

export type CodeLanguage = 'curl' | 'python' | 'javascript';

export function generateCode(req: RequestData, lang: CodeLanguage): string {
  switch (lang) {
    case 'curl': return generateCurl(req);
    case 'python': return generatePython(req);
    case 'javascript': return generateJsFetch(req);
  }
}

