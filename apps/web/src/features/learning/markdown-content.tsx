import type { ComponentProps } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import 'katex/dist/katex.min.css';

import { getSafeExternalUrl } from './safe-external-url';

interface MarkdownContentProps {
  markdown: string;
}

export function MarkdownContent({ markdown }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      components={{ a: MarkdownLink }}
      disallowedElements={['img']}
      rehypePlugins={[rehypeKatex]}
      remarkPlugins={[remarkGfm, remarkMath]}
      skipHtml
      urlTransform={getSafeMarkdownUrl}
    >
      {markdown}
    </ReactMarkdown>
  );
}

function MarkdownLink({ children, href, ...props }: ComponentProps<'a'>) {
  if (!href) {
    return <span>{children}</span>;
  }

  const isExternal = getSafeExternalUrl(href) !== null;

  return (
    <a
      {...props}
      href={href}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      target={isExternal ? '_blank' : undefined}
    >
      {children}
    </a>
  );
}

function getSafeMarkdownUrl(value: string) {
  if (value.startsWith('#') || (value.startsWith('/') && !value.startsWith('//'))) {
    return value;
  }

  return getSafeExternalUrl(value)?.href;
}
