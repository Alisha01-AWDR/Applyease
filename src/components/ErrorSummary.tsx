import { AlertCircle } from 'lucide-react';

export type ErrorSummaryItem = { label: string; message: string; id?: string };

export default function ErrorSummary({ items, title = 'Please check this answer.' }: { items: ErrorSummaryItem[]; title?: string }) {
  if (!items.length) return null;
  return (
    <div className="error-summary" role="alert" aria-labelledby="error-summary-title">
      <AlertCircle aria-hidden="true" />
      <div>
        <strong id="error-summary-title">{title}</strong>
        <ul>
          {items.map((item) => <li key={`${item.label}-${item.message}`}><span>{item.label}</span>: {item.message}</li>)}
        </ul>
      </div>
    </div>
  );
}
