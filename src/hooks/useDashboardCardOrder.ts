import { useState, useEffect } from 'react';

export type DashboardCardId = 
  | 'stats-row-1'
  | 'stats-row-2'
  | 'overdue-invoices'
  | 'mom-indicators'
  | 'revenue-chart'
  | 'charts-tables'
  | 'recent-users';

const DEFAULT_ORDER: DashboardCardId[] = [
  'stats-row-1',
  'stats-row-2',
  'overdue-invoices',
  'mom-indicators',
  'revenue-chart',
  'charts-tables',
  'recent-users'
];

const STORAGE_KEY = 'super-admin-dashboard-card-order';

export function useDashboardCardOrder() {
  const [cardOrder, setCardOrder] = useState<DashboardCardId[]>(DEFAULT_ORDER);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate that all cards are present
        if (Array.isArray(parsed) && parsed.length === DEFAULT_ORDER.length) {
          const allPresent = DEFAULT_ORDER.every(id => parsed.includes(id));
          if (allPresent) {
            setCardOrder(parsed);
          }
        }
      } catch {
        // Use default if parsing fails
      }
    }
  }, []);

  const updateOrder = (newOrder: DashboardCardId[]) => {
    setCardOrder(newOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
  };

  const resetOrder = () => {
    setCardOrder(DEFAULT_ORDER);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { cardOrder, updateOrder, resetOrder };
}
