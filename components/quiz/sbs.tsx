// components/quiz/SBS.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Question } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  question: Question;
  onReadingComplete: () => void;
}

type Sentence = {
  text: string;
  isMajorBreak: boolean;
};

export default function SBS({ question, onReadingComplete }: Props) {
  const [revealedCount, setRevealedCount] = useState(0);
  
  const sentences = useMemo(() => {
    if (!question?.answer) return [];
    const majorParts = question.answer.split('||');
    const result: Sentence[] = [];
    majorParts.forEach((majorPart, majorIndex) => {
      const minorParts = majorPart.trim().split('|');
      minorParts.forEach((text, minorIndex) => {
        if (text.trim()) {
          const isMajorBreak = minorIndex === 0 && majorIndex > 0;
          result.push({ text: text.trim(), isMajorBreak });
        }
      });
    });
    return result;
  }, [question.answer]);

  const allSentencesShown = revealedCount === sentences.length && sentences.length > 0;

  useEffect(() => {
    setRevealedCount(0);
  }, [question]);

  useEffect(() => {
    if (allSentencesShown) {
      onReadingComplete();
    }
  }, [allSentencesShown, onReadingComplete]);

  const handleNextSentence = () => {
    if (revealedCount < sentences.length) {
      setRevealedCount(prev => prev + 1);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg shadow-lg p-6 sm:p-8 flex flex-col min-h-[450px]">
      <h2 className="text-2xl sm:text-3xl font-bold text-center text-slate-100 mb-6">
        {question.content}
      </h2>
      <div className="flex-grow">
        <AnimatePresence>
          {sentences.slice(0, revealedCount).map((sentence, index) => (
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`text-lg sm:text-xl text-slate-300 leading-relaxed ${sentence.isMajorBreak ? 'mt-8' : 'mt-4'}`}
            >
              {sentence.text}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>
      <div className="mt-6 text-center h-12">
        {!allSentencesShown && (
          <Button onClick={handleNextSentence} size="lg" className="bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white">
            下一句 ({revealedCount}/{sentences.length})
          </Button>
        )}
      </div>
    </div>
  );
}
