'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

type Option = { value: string; label: string };
export default function ChoiceSelect({ value, options, onChange, label, className = '', disabled = false }: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  const current = options.find(option => option.value === value)?.label || options[0]?.label || '请选择';
  function select(next: string) { onChange(next); setOpen(false); trigger.current?.focus(); }
  return <div ref={root} className={`en-choice ${className}`} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    if (open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const buttons = [...root.current!.querySelectorAll<HTMLButtonElement>('[role="option"]')];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    }
  }}>
    <button ref={trigger} type="button" className="en-choice-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => setOpen(!open)}>
      <span>{current}</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <div role="listbox" aria-label={label} className="en-choice-menu">
      {options.map(option => <button key={option.value} type="button" role="option" aria-selected={option.value === value} className={option.value === value ? 'selected' : ''} onClick={() => select(option.value)}>
        <span>{option.label}</span>{option.value === value && <Check size={15} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>;
}
