import WorkspaceShell from '@/components/english/workspace-shell';
import './english.css';
export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
