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
  description:
    'A non-commercial archive of Punjabi poetry, poets, proverbs and vocabulary, in Shahmukhi, Gurmukhi and Roman script.',
};
