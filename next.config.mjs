import nextConstants from 'next/constants.js';

// The editor can start its own dev preview while the phone uses next start.
// Separate outputs prevent dev recompiles from corrupting the production site.
export default function config(phase) {
  return { distDir: phase === nextConstants.PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next' };
}
