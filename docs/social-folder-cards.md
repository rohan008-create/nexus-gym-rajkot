# Social bento-card redesign

Current design replaces the rejected folder cards with the user's supplied BentoGrid/BentoCard pattern. Supplied UI files are integrated at src/components/ui/bento-grid.tsx and button.tsx. Added @radix-ui/react-icons, @radix-ui/react-slot and class-variance-authority; existing Tailwind, TypeScript, aliases and framer-motion remain.

Nexus customization: black section, dark image-backed panels, per-platform accent icons, a wide Instagram card, tall YouTube card and smaller Facebook/WhatsApp cards. Hover lifts text and reveals the action; keyboard focus activates that state too. Touch devices and narrow screens show actions without hover. Tablet uses a 2x2 grid and mobile uses a single column. Reduced motion disables transitions. Existing local gym images and platform destinations are retained; links remain generic platform URLs rather than verified club profiles.

Policy: compact planning, dependency-level reads, no delegation. Scope: social section/CSS, supplied bento/button components and required dependency manifests. Previous membership/About/tour changes remain. Local preview returned HTTP 200 and git diff --check found no whitespace errors. No browser visual checks, typecheck, test suite or production build was run per the prior testing preference.
