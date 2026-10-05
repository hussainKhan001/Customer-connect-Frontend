/* The owner-scoped tab set — shared by CustomerMaster.jsx's own page
   and MemberProfileDrawer.jsx's in-drawer view of a family group
   member, both of which just render `<Tab c={someCustomer} />` for
   whichever tab is picked. Kept in its own module rather than defined
   inside CustomerMaster.jsx so MemberProfileDrawer can import it
   without circularly importing CustomerMaster.jsx itself.

   An optional 3rd element gates the tab behind a capability — same as
   PAGES' own `capability` field in navigation.js. Audit log shares the
   exact row the global Audit Log page uses ('Module: Audit log'), so
   whoever can see the system-wide trail can see this owner-scoped
   slice of it, and nobody else gets a tab pointing at a route they'd
   just get a 403 from. */
import MOverview from './MOverview.jsx';
import MPortfolio from './MPortfolio.jsx';
import MInvestor from './MInvestor.jsx';
import MLedger from './MLedger.jsx';
import MRelationship from './MRelationship.jsx';
import MFollowUps from './MFollowUps.jsx';
import MDocuments from './MDocuments.jsx';
import MActivity from './MActivity.jsx';
import MGovernance from './MGovernance.jsx';
import MAuditLog from './MAuditLog.jsx';

export const CTABS = [
  ['overview', 'Overview'], ['portfolio', 'Portfolio'], ['investor', 'Investor'], ['ledger', 'Ledger'],
  ['relationship', 'Relationship'], ['followups', 'Timeline'],
  ['documents', 'Documents'], ['activity', 'Activity log'], ['governance', 'Consent & gate'],
  ['audit', 'Audit log', 'Module: Audit log'],
];

export const TAB_VIEWS = {
  overview: MOverview, portfolio: MPortfolio, investor: MInvestor, ledger: MLedger,
  relationship: MRelationship, followups: MFollowUps, documents: MDocuments,
  activity: MActivity, governance: MGovernance, audit: MAuditLog,
};
