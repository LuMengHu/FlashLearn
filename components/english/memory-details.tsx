import { visibleNote } from '@/lib/english/learning';
import type { Vocabulary } from '@/lib/english/types';

export default function MemoryDetails({ word }: { word?: Vocabulary }) {
  if (!word) return null;
  const senses = (word.senses || []).filter(sense => sense.meaning?.trim() && sense.meaning.trim() !== word.meaning.trim());
  const note = visibleNote(word.notes);
  if (!senses.length && !word.family?.length && !word.etymology && !note) return null;
  return <section className="en-memory-card" aria-label="补充记忆资料">
    <h3>补充记忆</h3>
    <div className="en-memory-grid">
      {senses.length > 0 && <div className="en-memory-item"><strong>其他释义</strong>{senses.map((sense, index) => <p key={index}>{sense.pos && <b>{sense.pos} </b>}{sense.meaning}{sense.example && <em>{sense.example}</em>}</p>)}</div>}
      {!!word.family?.length && <div className="en-memory-item"><strong>同族词</strong><p>{word.family.map(item => `${item.word}（${item.meaning}）`).join(' · ')}</p></div>}
      {word.etymology && <div className="en-memory-item"><strong>词源</strong><p>{word.etymology}</p></div>}
      {note && <div className="en-memory-item"><strong>笔记</strong><p className="whitespace-pre-wrap">{note}</p></div>}
    </div>
  </section>;
}