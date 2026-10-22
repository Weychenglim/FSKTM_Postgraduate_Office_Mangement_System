import { useEffect, useRef, useState } from 'react';
import { downloadExcel, type ExportColumn } from './excelExport';

/** Share generation feedback and prevent duplicate downloads while XLSX is being built. */
export function useExcelExport() {
  const pending = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function download<T>(filename: string, rows: T[], columns: ExportColumn<T>[]) {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true); setError(null);
    try {
      await downloadExcel(filename, rows, columns);
      return true;
    } catch (reason) {
      if (mounted.current) setError(reason instanceof Error ? reason.message : 'The Excel export could not be completed.');
      return false;
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return { busy, error, download };
}
