'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, BookOpen, Layers3, Plus, Sprout, MessageCircle } from 'lucide-react';
import { WorkspaceProvider } from './workspace-provider';

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const links = [{ href: '/english', label: '学习', icon: BookOpen }, { href: '/english/collections', label: '词表', icon: Layers3 }, { href: '/english/new', label: '添加', icon: Plus }];
  return <WorkspaceProvider><div className="english-workspace">
    <aside className="en-sidebar">
      <Link href="/" className="en-brand"><span className="en-brand-icon"><Sprout size={23} /></span><span>英语词汇</span></Link>
      <nav aria-label="英文导航" className="en-navigation">{links.map(({ href, label, icon: Icon }) => {
        const active = href === '/english' ? ['/english','/english/study','/english/confusions','/english/phrases'].includes(path) : href === '/english/collections' ? path.startsWith('/english/collections') || path.startsWith('/english/list') : path.startsWith(href);
        return <Link key={href} href={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}><Icon size={19} />{label}<ArrowUpRight size={15} className="en-nav-arrow" /></Link>;
      })}</nav>
      <div className="en-sidebar-footer"><Link href="/english/connect"><MessageCircle size={16} />微信小复习</Link><Link href="/"><ArrowLeft size={16} />返回所有学科</Link></div>
    </aside>
    <main className="en-main"><div className="en-content">{children}</div></main>
  </div></WorkspaceProvider>;
}
