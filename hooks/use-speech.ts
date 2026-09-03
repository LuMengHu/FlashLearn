// 封装浏览器 Web Speech API 的英文发音逻辑，供 layered-reveal / initial-hint 等背题卡片复用
'use client';

interface SpeakOptions {
  rate?: number;
}

export function useSpeech() {
  const speak = (text: string, { rate = 0.85 }: SpeakOptions = {}) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('你的浏览器不支持语音合成功能。');
      return;
    }
    // 先取消正在播放的语音，避免多次点击时声音重叠
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  };

  return { speak };
}
