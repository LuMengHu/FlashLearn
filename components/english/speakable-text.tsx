'use client';
import { useSpeech } from '@/hooks/use-speech';

export default function SpeakableText({ text }: { text: string }) {
  const { speak } = useSpeech();
  return <>{text.split(/([A-Za-z]+(?:['’-][A-Za-z]+)*)/g).map((part, index) =>
    /^[A-Za-z]+(?:['’-][A-Za-z]+)*$/.test(part)
      ? <button type="button" className="en-inline-speak" key={index} onClick={() => speak(part)} title={'朗读 ' + part}>{part}</button>
      : <span key={index}>{part}</span>)}</>;
}
