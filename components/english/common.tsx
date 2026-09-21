'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { useWorkspace } from './workspace-provider';

export function Heading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className="en-heading"><div><p className="en-eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="en-muted">{description}</p>}</div>{action}</header>;
}
export function LoadGate({ children }: { children: React.ReactNode }) {
  const { data, error, refresh } = useWorkspace();
  if (!data) return error ? <div className="en-empty"><p role="alert">{error}</p><button className="en-button" onClick={() => refresh().catch(() => {})}>重新连接</button></div> : <div className="en-loading"><Loader2 className="animate-spin" size={24} /><p>正在打开你的词库…</p></div>;
  return <>{children}</>;
}
export function Empty({ title, text, href = '/english/new', label = '添加词汇' }: { title: string; text: string; href?: string; label?: string }) {
  return <div className="en-empty"><span className="en-empty-symbol">Aa</span><h2>{title}</h2><p>{text}</p><Link className="en-button en-primary" href={href}><Plus size={17} />{label}</Link></div>;
}
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current; el?.showModal(); return () => el?.close(); }, []);
  return <dialog ref={ref} className="en-dialog" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-label={title}>
    <div className="en-dialog-body"><div className="en-dialog-title"><h2>{title}</h2><button className="en-icon-button" onClick={onClose} aria-label="关闭"><X size={20} /></button></div>{children}</div>
  </dialog>;
}
export function ErrorMessage({ message }: { message: string }) { return message ? <p className="en-error" role="alert">{message}</p> : null; }
export function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="en-field"><span>{label}</span>{children}</label>; }
export const labelForKind = { word: '单词', phrase: '短语', confusion: '易混词' };
