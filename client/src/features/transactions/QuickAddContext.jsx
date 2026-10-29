import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { TransactionFormModal } from './TransactionFormModal.jsx';

const QuickAddContext = createContext(null);

export function QuickAddProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [defaultType, setDefaultType] = useState('expense');
  const [version, setVersion] = useState(0);

  const openQuickAdd = useCallback((type = 'expense') => {
    setDefaultType(type === 'income' ? 'income' : 'expense');
    setOpen(true);
  }, []);

  const closeQuickAdd = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ openQuickAdd, version, notifySaved: () => setVersion((current) => current + 1) }),
    [openQuickAdd, version],
  );

  return (
    <QuickAddContext.Provider value={value}>
      {children}
      <TransactionFormModal
        open={open}
        onClose={closeQuickAdd}
        defaultType={defaultType}
        onSaved={() => setVersion((current) => current + 1)}
      />
    </QuickAddContext.Provider>
  );
}

// Context hooks intentionally live beside their providers; this rule only affects hot reload.
// eslint-disable-next-line react-refresh/only-export-components
export function useQuickAdd() {
  const context = useContext(QuickAddContext);
  if (!context) throw new Error('useQuickAdd must be used inside QuickAddProvider');
  return context;
}
