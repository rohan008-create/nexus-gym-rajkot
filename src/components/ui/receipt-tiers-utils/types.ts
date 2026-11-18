export type Plan = {
  id: string;
  name: string;
  tagline: string;
  cta: string;
  badge?: string;
  features: readonly string[];
  price: { monthly: number; annual: number } | null;
};
