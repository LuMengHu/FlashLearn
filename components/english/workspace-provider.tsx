'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Workspace } from '@/lib/english/types';

export async function requestJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body === undefined ? { cache: 'no-store' } : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || '连接暂时中断，请重试。');
  return data as T;
}
type ContextValue = { data: Workspace | null; error: string; refresh: () => Promise<Workspace>; setData: React.Dispatch<React.SetStateAction<Workspace | null>> };
const Context = createContext<ContextValue | null>(null);
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const next = await requestJson<Workspace>('/api/english/workspace');
      setData(next); setError(''); return next;
    } catch (e) { setError(e instanceof Error ? e.message : '读取失败'); throw e; }
  }, []);
  useEffect(() => { refresh().catch(() => {}); }, [refresh]);
  useEffect(() => {
    let lastRefresh = 0;
    const syncWhenVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastRefresh < 1000) return;
      lastRefresh = Date.now();
      refresh().catch(() => {});
    };
    document.addEventListener('visibilitychange', syncWhenVisible);
    window.addEventListener('focus', syncWhenVisible);
    return () => {
      document.removeEventListener('visibilitychange', syncWhenVisible);
      window.removeEventListener('focus', syncWhenVisible);
    };
  }, [refresh]);
  return <Context.Provider value={{ data, error, refresh, setData }}>{children}</Context.Provider>;
}
export function useWorkspace() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('WorkspaceProvider is required');
  return ctx;
}
