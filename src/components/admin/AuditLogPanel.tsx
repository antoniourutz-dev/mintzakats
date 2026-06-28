import { useCallback, useEffect, useState } from 'react';
import { getAdminAuditLog } from '../../services/admin';
import type { AdminAuditEntry } from '../../types/admin';
import { formatMadridDateTime } from '../../utils/datetime';
import { cardStyle, buttonBaseStyle } from '../../styles';
import { TableSkeleton } from '../Skeleton';

export function AuditLogPanel() {
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setEntries(await getAdminAuditLog(100));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ezin izan da auditoretza kargatu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <TableSkeleton />;

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-100 border-4 border-red-900 p-4 font-bold">{error}</div>
        <button type="button" onClick={() => void load()} className={`${buttonBaseStyle} w-full`}>
          Saiatu berriro
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-3">
      <div className="space-y-3 md:hidden">
        {entries.length === 0 ? (
          <div className={`${cardStyle} p-4 font-bold text-neutral-600`}>
            Oraindik ez dago erregistrorik auditoretza honetan.
          </div>
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className={`${cardStyle} p-4 space-y-2`}>
              <p className="text-sm font-bold break-anywhere">{formatMadridDateTime(entry.created_at)}</p>
              <p className="font-black break-anywhere">{entry.action}</p>
              <p className="text-sm break-anywhere">
                {entry.target_type ?? '—'}
                {entry.target_id ? ` · ${entry.target_id}` : ''}
              </p>
              <p className="text-sm break-anywhere">{entry.actor_username ?? '—'}</p>
              <p className="text-sm break-anywhere">{entry.summary ?? '—'}</p>
            </article>
          ))
        )}
      </div>

      <div className={`${cardStyle} overflow-hidden hidden md:block`}>
        <table className="w-full text-left">
          <thead className="bg-neutral-900 text-white">
            <tr>
              <th className="p-3 text-xs font-black uppercase">Data</th>
              <th className="p-3 text-xs font-black uppercase">Ekintza</th>
              <th className="p-3 text-xs font-black uppercase">Helburua</th>
              <th className="p-3 text-xs font-black uppercase">Egilea</th>
              <th className="p-3 text-xs font-black uppercase">Laburpena</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 font-bold text-neutral-600">
                  Oraindik ez dago erregistrorik auditoretza honetan.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="border-t-4 border-neutral-900">
                  <td className="p-3 font-bold">{formatMadridDateTime(entry.created_at)}</td>
                  <td className="p-3 break-anywhere">{entry.action}</td>
                  <td className="p-3 break-anywhere">
                    {entry.target_type ?? '—'}
                    {entry.target_id ? ` · ${entry.target_id}` : ''}
                  </td>
                  <td className="p-3 break-anywhere">{entry.actor_username ?? '—'}</td>
                  <td className="p-3 break-anywhere">{entry.summary ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
