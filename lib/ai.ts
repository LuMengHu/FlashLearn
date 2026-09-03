// 单词解析的 AI 调用：对接任意 OpenAI 兼容的 /chat/completions 接口（当前用 DMXAPI）
// 只在服务端使用，API Key 从环境变量读取，不会进入浏览器。
import type { WordSense, WordFamilyItem, ConfusableItem } from '@/lib/schema';

/** AI 返回并经过校验后的单词解析结果 */
export type WordDraft = {
  word: string;
  phonetic: string;
  meaning: string;
  senses: WordSense[];
  family: WordFamilyItem[];
  confusables: ConfusableItem[];
  etymology: string;
};

const SYSTEM_PROMPT = `你是一个帮助中文母语者记忆英语单词的助手。
用户给你一个英文单词，你要输出一份便于记忆的资料，必须是**纯 JSON**，不要任何解释文字，不要 markdown 代码块。

JSON 结构如下：
{
  "word": "单词原形（小写）",
  "phonetic": "英式或美式音标，形如 /rɪˈzɪst/，没有把握就留空字符串",
  "meaning": "最核心的中文释义，一行以内，背单词时作为答案显示",
  "senses": [
    { "pos": "词性缩写，如 n. / v. / adj.", "meaning": "这个义项的中文释义", "example": "一个地道的英文例句", "translation": "例句的中文翻译" }
  ],
  "family": [
    { "word": "同词根/派生的变形词", "pos": "词性", "meaning": "中文释义" }
  ],
  "confusables": [
    { "word": "拼写或发音上容易和它混淆的单词", "meaning": "该词的中文释义", "tip": "一句话说明怎么区分" }
  ],
  "etymology": "词源/构词法说明，用中文写，讲清词根词缀怎么拼出这个意思，帮助联想记忆"
}

要求：
- senses 给 1-4 条，覆盖最常用的义项，按常用度排序。
- family 给 0-6 条，是真正同词根的派生词（如 resist -> resistance / resistant / irresistible），不要硬凑。
- confusables 给 0-4 条，必须是**长得像或读起来像**因而真的容易认错的词（如 adapt/adopt/adept），不要放单纯近义词。
- 所有中文用简体中文。
- 只输出 JSON 对象本身。`;

/** 从可能带 markdown 包裹的模型输出里提取 JSON 对象 */
function extractJson(raw: string): unknown {
  const text = raw.trim();
  // 去掉 ```json ... ``` 之类的围栏
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate);
  } catch {
    // 退一步：截取第一个 { 到最后一个 } 之间的内容
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('AI 返回的内容里找不到 JSON 对象');
    }
    return JSON.parse(candidate.slice(start, end + 1));
  }
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** 把模型返回的任意结构规整成我们要存的形状，缺字段一律降级为空值而不是报错 */
function normalizeDraft(parsed: unknown, fallbackWord: string): WordDraft {
  const obj = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
  const toArray = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : [];

  return {
    word: asString(obj.word) || fallbackWord,
    phonetic: asString(obj.phonetic),
    meaning: asString(obj.meaning),
    senses: toArray(obj.senses).map(item => ({
      pos: asString(item.pos),
      meaning: asString(item.meaning),
      example: asString(item.example),
      translation: asString(item.translation),
    })).filter(item => item.meaning),
    family: toArray(obj.family).map(item => ({
      word: asString(item.word),
      pos: asString(item.pos),
      meaning: asString(item.meaning),
    })).filter(item => item.word),
    confusables: toArray(obj.confusables).map(item => ({
      word: asString(item.word),
      meaning: asString(item.meaning),
      tip: asString(item.tip),
    })).filter(item => item.word),
    etymology: asString(obj.etymology),
  };
}

/** 调用 AI 解析一个英文单词，返回可供用户审阅编辑的草稿 */
export async function generateWordDraft(word: string): Promise<WordDraft> {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!baseUrl || !apiKey || !model) {
    throw new Error('AI 接口未配置：请在 .env 里设置 AI_BASE_URL、AI_API_KEY、AI_MODEL');
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: word },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`AI 接口返回 ${response.status}${detail ? `：${detail.slice(0, 300)}` : ''}`);
  }

  const payload = await response.json();
  const content: unknown = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI 接口没有返回文本内容');
  }

  return normalizeDraft(extractJson(content), word.trim());
}
