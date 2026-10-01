import { Fragment } from "react";

// Matches http(s) URLs only. Other protocols (javascript:, data:) are never linkified.
const URL_RE = /(https?:\/\/[^\s<>"'`]+)/gi;
const TRAILING = /[.,!?;:)\]}"'״׳]+$/;

const safeUrl = (raw: string): string | null => {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
};

export const LinkifiedText = ({ text }: { text: string | null | undefined }) => {
  if (!text) return null;
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const trail = part.match(TRAILING)?.[0] ?? "";
        const core = trail ? part.slice(0, -trail.length) : part;
        const href = safeUrl(core);
        if (!href) return <Fragment key={i}>{part}</Fragment>;
        return (
          <Fragment key={i}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              dir="ltr"
              onClick={(e) => e.stopPropagation()}
              className="inline break-all rounded-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
            >
              {core}
            </a>
            {trail}
          </Fragment>
        );
      })}
    </>
  );
};
