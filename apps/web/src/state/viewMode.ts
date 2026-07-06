/**
 * View-only mode (?mode=view): hides editing UI — for projecting to the
 * room or sharing with dancers who shouldn't move marks.
 *
 * NOTE: this is a UI convenience, not security. Anyone with the room id can
 * open the link without `mode=view` and edit. Real enforcement needs the
 * authenticated backend (roadmap: permissions).
 */
export const isViewMode: boolean =
  new URLSearchParams(window.location.search).get('mode') === 'view';
