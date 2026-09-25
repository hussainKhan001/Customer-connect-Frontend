/* The fixed set of Trigger Calendar categories a WhatsApp message can
   be templated for — same key list the backend validates against
   (backend/src/routes/settings.js's MESSAGE_TEMPLATE_KEYS) and what
   triggerTemplateKey() (utils/derived.js) resolves a trigger's own
   label to. Kept as [key, display label] pairs for the Master Data
   editor's section headings. */
export const MESSAGE_TEMPLATE_TYPES = [
  ['birthday', 'Birthday'],
  ['wedding_anniversary', 'Wedding anniversary'],
  ['booking_anniversary', 'Booking anniversary'],
  ['registry_anniversary', 'Registry anniversary'],
  ['loan_closure', 'Home loan closure'],
  ['ltcg_window', 'LTCG / 54F window'],
];
