# Membership auto-print integration

2026-11-18. Integrates the user-provided Receipt Printer component (original header credits Aakash Mehra) in src/components/ui/receipt-printer.tsx. Existing shadcn aliases, TypeScript, Tailwind, motion and lucide-react dependencies are already present; no dependency install or stock imagery is needed.

YOUR PLAN. YOUR MOVE. now has Basic/Pro/Elite printers. Each machine rises into view and triggers one silent button press/feed sequence after entering the viewport, with a short stagger. On narrower screens the machines stack and independently print when visible. The continuous-strip mechanics and printer appearance come from the supplied component; membership mode supplies custom receipt content, replaces the strip on replay and disables tearing so the plan actions and native touch scrolling remain usable. Autoplay never unlocks WebAudio; sound is available only after manual interaction.

Plan details come from membershipPlans.ts. Unconfirmed pricing/duration remain ON REQUEST / ASK NEXUS. Enquiry buttons use the existing plan-name callback and remain disabled until the full receipt has printed. The old scratch overlay is replaced by the requested automatic paper reveal. Manual PRINT can pause a feed or start a new receipt; a manual press prevents a pending automatic press from interrupting it. A reduced-motion setting skips the machine rise and reveals the paper immediately after activation.

Timers, feed animation, receipt ResizeObservers and visibility observers have cleanup. Printer scale is owned by each column using container width, with a one-column layout at 1050px and below. Print, sound and enquiry buttons have at least 44px targets.

Policy: compact planning, dependency-level reads, no delegation. Scope: membership integration, supplied UI printer and local CSS/documentation. Previous About and gym-tour changes are preserved. No test suite, typecheck, production build or device/browser QA was run per the earlier testing preference. The local preview route returned HTTP 200 during integration; this is not evidence of animation appearance or device compatibility.
