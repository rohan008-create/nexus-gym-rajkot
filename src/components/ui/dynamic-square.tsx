import Link from "next/link";

export const Component = ({
  title,
  tag,
  description,
  buttonText,
  buttonHref,
}: Readonly<{
  title: string;
  tag: string;
  description: string;
  buttonText: string;
  buttonHref: string;
}>) => {
  return (
    <>
      <style>
        {`
        @keyframes tiles {
          0%, 40%, 80% {
            opacity: 0;
          }
          20%, 60% {
            opacity: 1;
          }
        }
        .dynamic-square-grid {
          background-image:
            repeating-linear-gradient(to right, rgba(115,115,115,.22) 0 1px, transparent 1px 15px),
            repeating-linear-gradient(to bottom, rgba(115,115,115,.22) 0 1px, transparent 1px 16px);
        }
        .dynamic-square-flash {
          position: absolute;
          width: 15px;
          height: 16px;
          opacity: 0;
          animation: tiles 14s ease infinite;
          will-change: opacity;
        }
      `}
      </style>
      <div className="relative flex w-80 flex-col gap-8 overflow-hidden rounded-xl border border-neutral-400/20 px-8 py-4 shadow-sm dark:shadow-black">
        <DecorativeTilesBackground />
        <div className="z-20">
          <div className="">
            <h3 className="inline text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {title}
            </h3>
            <p className="ml-2 inline rounded-sm border border-neutral-900 px-0.5 align-top text-xs font-medium uppercase tracking-tight dark:border-neutral-400">
              {tag}
            </p>
          </div>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        </div>
        <Link
          className="z-20 inline-flex h-12 w-full items-center justify-center rounded-lg border border-neutral-500/15 bg-neutral-200/20 font-medium text-neutral-600 backdrop-blur-md transition-colors hover:border-neutral-500/30 hover:bg-neutral-200/50 dark:bg-neutral-500/20 dark:text-neutral-300 dark:hover:bg-neutral-500/40"
          href={buttonHref}
        >
          {buttonText}
        </Link>
      </div>
    </>
  );
};

const DecorativeTilesBackground = () => {
  // The original grid rendered 20 x 22 animated divs (440 per card) — with
  // four cards that meant 1760 always-running animations. The exact same
  // look is achievable with static CSS grid lines plus a handful of
  // scattered flickering tiles, which keeps the effect but removes the cost.
  const flashes = Array.from({ length: 16 }, (_, index) => ({
    left: `${(index * 37) % 94}%`,
    top: `${(index * 61) % 92}%`,
    delay: (index * 0.87) % 14,
  }));

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 select-none overflow-hidden"
    >
      <div className="dynamic-square-grid absolute inset-0" />
      {flashes.map((flash, index) => (
        <span
          key={index}
          className="dynamic-square-flash bg-fuchsia-600/10 dark:bg-fuchsia-400/15"
          style={{
            left: flash.left,
            top: flash.top,
            animationDelay: `${flash.delay}s`,
          }}
        />
      ))}
    </div>
  );
};
