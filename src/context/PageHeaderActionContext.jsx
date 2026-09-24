/* Lets a routed page put a button next to its own title in App.jsx's
   shared page header (rendered above <Routes>, so a page can't just
   render into that spot directly the way it renders its own content).
   Cleared on unmount so navigating away never leaves a stale button
   sitting in the NEXT page's header. */
import { createContext, useContext, useEffect, useState } from 'react';

const PageHeaderActionContext = createContext(null);

export function PageHeaderActionProvider({ children }) {
  const [action, setAction] = useState(null);
  return (
    <PageHeaderActionContext.Provider value={{ action, setAction }}>
      {children}
    </PageHeaderActionContext.Provider>
  );
}

/* Call from a page component with whatever should appear top-right,
   level with the page title — an action that belongs to the whole
   page (Add owner, Export, ...), not one specific filter/toolbar row
   further down. Pass `null` (or nothing) to clear it explicitly.

   `node` MUST be referentially stable (wrap it in useMemo, deps on
   whatever it actually depends on — usually just []) — it drives this
   hook's own effect dependency array. Passing a plain inline JSX
   literal recreates a new element every render, which re-fires the
   effect every render, which calls setAction, which re-renders
   whoever reads usePageHeaderActionNode() (App.jsx) and cascades a
   re-render straight back down into this same page — an infinite
   render loop that manifests as "the page never finishes rendering",
   not a thrown error. This bit a real page (OwnerBase.jsx) once
   already; don't repeat it. */
export function usePageHeaderAction(node = null) {
  const ctx = useContext(PageHeaderActionContext);
  useEffect(() => {
    ctx.setAction(node);
    return () => ctx.setAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);
}

export function usePageHeaderActionNode() {
  return useContext(PageHeaderActionContext).action;
}
