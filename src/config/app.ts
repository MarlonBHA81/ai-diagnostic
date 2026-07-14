/**
 * App-level configuration and unresolved brief placeholders, centralised so
 * they're easy to fill in once confirmed. Values marked TODO(confirm) are
 * placeholders pending real inputs from the brief's {{...}} slots.
 */
export const appConfig = {
  /** Footer + consent link. TODO(confirm): real privacy policy URL. */
  privacyPolicyUrl: 'https://storyadvantage.co/privacy',
  /** Footer line per brief. */
  footerLine: 'A Story Advantage diagnostic',
  /** Domain used for embed docs / default email-from. TODO(confirm). */
  domain: 'storyadvantage.co',
};
