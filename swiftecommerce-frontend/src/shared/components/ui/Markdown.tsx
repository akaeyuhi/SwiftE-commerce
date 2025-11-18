import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import {
  AnchorHTMLAttributes,
  BlockquoteHTMLAttributes,
  ClassAttributes,
  HTMLAttributes,
  LiHTMLAttributes,
  OlHTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import { JSX } from 'react/jsx-runtime';

interface MarkdownProps {
  children: string;
}

export function Markdown({ children }: MarkdownProps) {
  const components: Components = {
    h1: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLHeadingElement> &
        HTMLAttributes<HTMLHeadingElement>
    ) => (
      <h1
        className="text-xl font-bold text-foreground mb-4 mt-6 border-b pb-2"
        {...props}
      />
    ),
    h2: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLHeadingElement> &
        HTMLAttributes<HTMLHeadingElement>
    ) => (
      <h2 className="text-lg font-bold text-foreground mb-3 mt-5" {...props} />
    ),
    h3: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLHeadingElement> &
        HTMLAttributes<HTMLHeadingElement>
    ) => (
      <h3
        className="text-base font-semibold text-foreground mb-2 mt-4"
        {...props}
      />
    ),
    h4: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLHeadingElement> &
        HTMLAttributes<HTMLHeadingElement>
    ) => (
      <h4
        className="text-sm font-semibold text-foreground mb-2 mt-3"
        {...props}
      />
    ),
    p: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLParagraphElement> &
        HTMLAttributes<HTMLParagraphElement>
    ) => (
      <p className="text-sm text-foreground mb-4 leading-relaxed" {...props} />
    ),
    ul: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLUListElement> &
        HTMLAttributes<HTMLUListElement>
    ) => (
      <ul
        className="list-disc list-inside mb-4 space-y-2 text-sm text-foreground"
        {...props}
      />
    ),
    ol: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLOListElement> &
        OlHTMLAttributes<HTMLOListElement>
    ) => (
      <ol
        className="list-decimal list-inside mb-4 space-y-2 text-sm text-foreground"
        {...props}
      />
    ),
    li: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLLIElement> &
        LiHTMLAttributes<HTMLLIElement>
    ) => <li className="text-foreground ml-4" {...props} />,
    table: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLTableElement> &
        TableHTMLAttributes<HTMLTableElement>
    ) => (
      <div className="overflow-x-auto mb-4">
        <table
          className="min-w-full divide-y divide-border border border-border rounded-lg"
          {...props}
        />
      </div>
    ),
    thead: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLTableSectionElement> &
        HTMLAttributes<HTMLTableSectionElement>
    ) => <thead className="bg-muted" {...props} />,
    tbody: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLTableSectionElement> &
        HTMLAttributes<HTMLTableSectionElement>
    ) => <tbody className="divide-y divide-border bg-card" {...props} />,
    tr: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLTableRowElement> &
        HTMLAttributes<HTMLTableRowElement>
    ) => <tr {...props} />,
    th: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLTableHeaderCellElement> &
        ThHTMLAttributes<HTMLTableHeaderCellElement>
    ) => (
      <th
        className="px-4 py-3 text-left text-xs font-semibold
        text-foreground uppercase tracking-wider"
        {...props}
      />
    ),
    td: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLTableDataCellElement> &
        TdHTMLAttributes<HTMLTableDataCellElement>
    ) => (
      <td
        className="px-4 py-3 text-sm text-foreground whitespace-normal"
        {...props}
      />
    ),
    code: ({
      inline,
      children,
      ...props
    }: {
      inline: string;
      children: React.ReactElement;
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLTableDataCellElement> &
        TdHTMLAttributes<HTMLTableDataCellElement>;
    }) =>
      inline ? (
        <code
          className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary"
          {...props}
        >
          {children}
        </code>
      ) : (
        <code
          className="block bg-muted p-4 rounded-lg
          overflow-x-auto text-xs font-mono text-foreground mb-4"
          {...props}
        >
          {children}
        </code>
      ),
    pre: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLPreElement> &
        HTMLAttributes<HTMLPreElement>
    ) => <pre className="mb-4 overflow-hidden rounded-lg" {...props} />,
    blockquote: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLQuoteElement> &
        BlockquoteHTMLAttributes<HTMLQuoteElement>
    ) => (
      <blockquote
        className="border-l-4 border-primary/50 pl-4 italic my-4 text-sm text-muted-foreground"
        {...props}
      />
    ),
    a: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLAnchorElement> &
        AnchorHTMLAttributes<HTMLAnchorElement>
    ) => (
      <a
        className="text-primary hover:underline underline-offset-2"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      />
    ),
    strong: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLElement> &
        HTMLAttributes<HTMLElement>
    ) => <strong className="font-bold text-foreground" {...props} />,
    em: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLElement> &
        HTMLAttributes<HTMLElement>
    ) => <em className="italic" {...props} />,
    hr: (
      props: JSX.IntrinsicAttributes &
        ClassAttributes<HTMLHRElement> &
        HTMLAttributes<HTMLHRElement>
    ) => <hr className="my-6 border-border" {...props} />,
  } as any;

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
