import { Fragment, type ReactNode } from "react";

/**
 * A tiny, safe Markdown subset for doctor-reviewed content:
 * ## / ### headings, paragraphs, "- " bullets, "1. " numbered lists and **bold**.
 * Renders React elements only (no HTML injection).
 */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>));
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i]!.trimEnd();
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(<h3 key={key++}>{inline(line.slice(4))}</h3>);
      i++;
    } else if (line.startsWith("## ")) {
      blocks.push(<h2 key={key++}>{inline(line.slice(3))}</h2>);
      i++;
    } else if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i]!.trim())) items.push(lines[i++]!.trim().slice(2));
      blocks.push(<ul key={key++}>{items.map((x, j) => <li key={j}>{inline(x)}</li>)}</ul>);
    } else if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i]!.trim())) items.push(lines[i++]!.trim().replace(/^\d+\. /, ""));
      blocks.push(<ol key={key++}>{items.map((x, j) => <li key={j}>{inline(x)}</li>)}</ol>);
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i]!.trim() && !/^(#{2,3} |[-*] |\d+\. )/.test(lines[i]!.trim())) para.push(lines[i++]!.trim());
      blocks.push(<p key={key++}>{inline(para.join(" "))}</p>);
    }
  }
  return <div className={className ?? "prose-calm"}>{blocks}</div>;
}
