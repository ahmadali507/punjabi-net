/**
 * Site-wide settings. The site name is a WORKING NAME. The final name and
 * domain are not chosen yet: change them here and in astro.config.mjs `site`.
 */
export const SITE = {
  name: 'punjabi.net',
  /** Shown in the footer only when set. Set it once the account exists. */
  instagram: null as string | null,
  /** Closing couplet in the footer: a poem slug + verse index, shown only if that verse exists. */
  footerCouplet: null as { poem: string; verse: number } | null,
  /**
   * Where the contribution form posts. '/api/contribute' is the Cloudflare Pages
   * Function in functions/api/contribute.ts. To use Formspree instead, put the
   * Formspree form URL here (https://formspree.io/f/…).
   */
  contributeAction: '/api/contribute',
  description: 'A non-commercial archive of Punjabi poetry, poets, proverbs and vocabulary, in Shahmukhi.',
  descriptionPa: 'پنجابی شاعری، شاعراں، اکھاناں تے لفظاں دا غیر تجارتی ذخیرہ، شاہ مکھی وچ۔',
};
