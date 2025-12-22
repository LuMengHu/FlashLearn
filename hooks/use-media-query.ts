// components/hooks/useMediaQuery.ts
'use client';

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // 确保只在客户端执行
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    // 新版浏览器推荐使用 addEventListener
    media.addEventListener('change', listener);
    
    // 清理函数，组件卸载时移除监听器
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}
