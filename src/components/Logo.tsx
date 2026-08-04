// A speech-bubble mark built around a single flowing stroke, echoing a Telugu
// script curve — ties the icon to what actually makes this site distinct
// (Telugu-language content) instead of a generic AI/tech glyph.
export function LogoMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3.5c-4.97 0-9 3.36-9 7.5 0 2.8 1.8 5.24 4.5 6.55L7 21l4.42-2.51c.19.01.38.01.58.01 4.97 0 9-3.36 9-7.5s-4.03-7.5-9-7.5z" />
      <path d="M9.1 10.7c0-1.95 1.4-3.3 3.3-3.3" />
    </svg>
  );
}

interface LogoWordmarkProps {
  textClassName?: string;
  onClick?: () => void;
}

export function LogoWordmark({ textClassName = "text-xl font-bold tracking-widest text-white", onClick }: LogoWordmarkProps) {
  const content = (
    <>
      <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-brand-purple to-blue-500 flex-shrink-0">
        <LogoMark className="h-5 w-5 text-white" />
      </div>
      <span className={textClassName}>MINDWRITER</span>
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="flex items-center gap-2 focus:outline-none" aria-label="MindWriter home">
        {content}
      </button>
    );
  }

  return <div className="flex items-center gap-2">{content}</div>;
}
