import { Mermaid } from './mermaid';

type RichText = {
  plain_text: string;
  annotations: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    color?: string;
  };
  href: string | null;
};

function RenderRich({ rich }: { rich: RichText[] }) {
  return (
    <>
      {rich.map((r, i) => {
        let node: React.ReactNode = r.plain_text;
        if (r.annotations?.bold) node = <strong key={i}>{node}</strong>;
        if (r.annotations?.italic) node = <em key={i}>{node}</em>;
        if (r.annotations?.strikethrough) node = <s key={i}>{node}</s>;
        if (r.annotations?.underline) node = <u key={i}>{node}</u>;
        if (r.annotations?.code) {
          node = (
            <code key={i} className="px-1 py-0.5 rounded bg-[#f7f7f8] text-[12px] font-mono">
              {node}
            </code>
          );
        }
        if (r.href) {
          node = (
            <a key={i} href={r.href} target="_blank" rel="noreferrer" className="underline hover:text-[#5e6ad2]">
              {node}
            </a>
          );
        }
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

export function BlocksRenderer({ blocks }: { blocks: any[] }) {
  return (
    <div>
      {blocks.map((b: any) => {
        switch (b.type) {
          case 'paragraph':
            return (
              <p key={b.id} className="text-[14px] leading-[1.65] mb-3 break-words">
                <RenderRich rich={b.paragraph.rich_text} />
              </p>
            );
          case 'heading_1':
            return (
              <h2
                key={b.id}
                className="text-lg sm:text-[20px] lg:text-[22px] font-semibold mt-6 sm:mt-7 lg:mt-8 mb-3 sm:mb-3.5 tracking-[-0.01em] break-words"
              >
                <RenderRich rich={b.heading_1.rich_text} />
              </h2>
            );
          case 'heading_2':
            return (
              <h3
                key={b.id}
                className="text-base sm:text-[17px] lg:text-[18px] font-semibold mt-5 sm:mt-6 mb-2.5 sm:mb-3 tracking-[-0.005em] break-words"
              >
                <RenderRich rich={b.heading_2.rich_text} />
              </h3>
            );
          case 'heading_3':
            return (
              <h4 key={b.id} className="text-sm sm:text-[14px] lg:text-[15px] font-semibold mt-4 sm:mt-5 mb-2 sm:mb-2.5 break-words">
                <RenderRich rich={b.heading_3.rich_text} />
              </h4>
            );
          case 'bulleted_list_item':
            return (
              <li key={b.id} className="text-[14px] leading-[1.65] list-disc ml-5 mb-1">
                <RenderRich rich={b.bulleted_list_item.rich_text} />
              </li>
            );
          case 'numbered_list_item':
            return (
              <li key={b.id} className="text-[14px] leading-[1.65] list-decimal ml-5 mb-1">
                <RenderRich rich={b.numbered_list_item.rich_text} />
              </li>
            );
          case 'callout':
            return (
              <div
                key={b.id}
                className="flex gap-2.5 p-3 bg-[#faf0db] border border-[#efddb6] rounded-md my-4 text-[13px] leading-[1.5] text-[#6b4f18]"
              >
                <span>{b.callout.icon?.emoji ?? '💡'}</span>
                <div>
                  <RenderRich rich={b.callout.rich_text} />
                </div>
              </div>
            );
          case 'divider':
            return <hr key={b.id} className="my-5 border-border" />;
          case 'quote':
            return (
              <blockquote
                key={b.id}
                className="border-l-2 border-border pl-3 text-muted-foreground italic my-3"
              >
                <RenderRich rich={b.quote.rich_text} />
              </blockquote>
            );
          case 'code': {
            const source = b.code.rich_text.map((r: RichText) => r.plain_text).join('');
            if (b.code.language === 'mermaid') {
              return <Mermaid key={b.id} chart={source} />;
            }
            return (
              <pre
                key={b.id}
                className="p-3 rounded-md bg-[#f7f7f8] text-[12px] font-mono overflow-x-auto my-3 max-w-full whitespace-pre"
              >
                <code>{source}</code>
              </pre>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
