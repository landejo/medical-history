import { marked } from 'marked'
import { useMemo } from 'react'

marked.setOptions({ gfm: true, breaks: false })

export function Markdown({ text, className = '' }: { text: string; className?: string }) {
  const html = useMemo(() => marked.parse(text) as string, [text])
  return <div className={`md ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
}
