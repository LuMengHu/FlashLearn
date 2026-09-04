// 用 AI 批量生成中文六类知识条目的种子数据，写到 scripts/data/chinese/<type>.json
// 用法: npx tsx scripts/generate-chinese.ts [type]  （不传 type 则生成全部六类）
// 生成的内容需要人工复核后再灌库。
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

type Spec = {
  type: string;
  label: string;
  perCall: number;
  rounds: number;
  shape: string;
  rules: string;
};

const SPECS: Spec[] = [
  {
    type: 'char_confusion',
    label: '易错字辨析',
    perCall: 15,
    rounds: 2,
    shape: `{ "front": "正确的词语写法", "wrong": "把其中一个字写错后的常见错版", "back": "错字订正，形如 步→部", "note": "为什么用这个字，一句话讲清字义" }`,
    rules: `- 选中学生和公务员考试里真正高频的易错成语/词语（如 按部就班、川流不息、再接再厉、迫不及待）。
- wrong 必须是现实中真的有人写错的版本，只错一个字。
- back 写成「错字→正字」的形式。
- note 用一句话解释正字的字义，让人能记住为什么。`,
  },
  {
    type: 'pinyin',
    label: '拼音',
    perCall: 15,
    rounds: 2,
    shape: `{ "front": "词语或单字", "back": "正确拼音（带声调符号，词语用空格分开，如 cēn cī）", "wrong": "常见的错误读音（同样带声调）", "note": "一句话说明为什么容易读错" }`,
    rules: `- 选真正容易读错的字词：多音字、生僻声调、形声字误读。
- 例如 参差 cēn cī（易误读 cān chā）、强迫 qiǎng pò（易误读 qiáng pò）、创伤 chuāng shāng（易误读 chuàng shāng）。
- wrong 必须是常见误读，不能瞎编。
- 拼音一律用带声调符号的形式。`,
  },
  {
    type: 'liushu',
    label: '六书',
    perCall: 12,
    rounds: 2,
    shape: `{ "front": "一个汉字", "back": "六书类别，只能是 象形/指事/会意/形声/转注/假借 之一", "note": "解释这个字为什么属于该类，讲清字形构造" }`,
    rules: `- 六类都要覆盖到，其中象形、指事、会意、形声是重点，转注和假借各给 1-2 个典型例子即可。
- 选教材里常见的典型字（如 日、月、本、末、休、明、江、河、令、长）。
- note 要讲清字形怎么构成的，比如「休：人 + 木，人靠在树旁休息」。`,
  },
  {
    type: 'culture',
    label: '文化常识',
    perCall: 15,
    rounds: 2,
    shape: `{ "front": "一个问题", "back": "答案", "note": "补充说明或延伸知识" }`,
    rules: `- 覆盖古代文化常识：科举、官职、称谓、礼仪、节日、纪年、天文历法、地理别称等。
- 问题要具体可答，例如「古代科举中，乡试第一名称为什么？」答案「解元」。
- note 补充一点延伸（如会试第一名是会元，殿试第一名是状元）。`,
  },
  {
    type: 'author',
    label: '作者常识',
    perCall: 12,
    rounds: 2,
    shape: `{ "front": "作者姓名", "back": "一句话概括：朝代 + 称号 + 风格定位", "note": "生平或文学史地位的补充", "payload": { "dynasty": "朝代", "aka": "字号/别称/合称", "works": ["代表作1", "代表作2", "代表作3"] } }`,
    rules: `- 选中学语文必考作家：先秦到清代的文学家为主，兼顾现代重要作家。
- payload.works 给 2-5 部真实代表作，不要编造。
- payload.aka 写字号或称号，如「字太白，号青莲居士，人称诗仙」。
- back 是背诵时先看到的答案主体，要简短有信息量。`,
  },
  {
    type: 'classical',
    label: '文言常识',
    perCall: 12,
    rounds: 2,
    shape: `{ "front": "文言实词或虚词", "back": "最核心的释义", "note": "用法提示", "payload": { "senses": [ { "meaning": "义项", "example": "出自课文的文言例句" } ] } }`,
    rules: `- 选高频文言实词虚词：之、其、而、以、于、乃、则、者、所、焉、莫、致、假、绝、兵、走、去、益、股、走 等。
- payload.senses 给 2-4 个义项，每个配一句真实的文言例句（尽量出自中学课文）。
- back 是最核心的那个释义，背诵时作为答案主体。`,
  },
];

async function callAI(system: string, user: string): Promise<string> {
  const baseUrl = process.env.AI_BASE_URL!;
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL,
      temperature: 0.6,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

function extractArray(raw: string): any[] {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text = (fenced ? fenced[1] : raw).trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('返回内容里找不到 JSON 数组');
  return JSON.parse(text.slice(start, end + 1));
}

async function generate(spec: Spec) {
  const outDir = path.join(__dirname, 'data', 'chinese');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${spec.type}.json`);

  const all: any[] = [];
  const seen = new Set<string>();

  for (let round = 1; round <= spec.rounds; round++) {
    const avoid = all.length ? `\n已经生成过下面这些，请**不要重复**：${all.map(i => i.front).join('、')}` : '';
    const system = `你在为中文学习网站生成「${spec.label}」的背诵条目。
必须输出**纯 JSON 数组**，不要任何解释文字，不要 markdown 代码块。
数组每个元素的结构：
${spec.shape}

要求：
${spec.rules}
- 所有内容用简体中文，必须真实准确，不确定的宁可不写。
- 只输出 JSON 数组本身。`;

    const user = `请生成 ${spec.perCall} 条「${spec.label}」条目。${avoid}`;
    process.stdout.write(`  第 ${round}/${spec.rounds} 批...`);
    const raw = await callAI(system, user);
    const items = extractArray(raw);
    let added = 0;
    for (const item of items) {
      const front = typeof item?.front === 'string' ? item.front.trim() : '';
      if (!front || seen.has(front)) continue;
      if (typeof item?.back !== 'string' || !item.back.trim()) continue;
      seen.add(front);
      all.push({ ...item, type: spec.type, front, back: item.back.trim() });
      added++;
    }
    console.log(` 拿到 ${items.length} 条，去重后新增 ${added} 条`);
  }

  fs.writeFileSync(outFile, JSON.stringify(all, null, 2), 'utf-8');
  console.log(`✅ ${spec.label}：共 ${all.length} 条 → ${path.relative(process.cwd(), outFile)}\n`);
}

async function main() {
  const only = process.argv[2];
  const targets = only ? SPECS.filter(s => s.type === only) : SPECS;
  if (targets.length === 0) {
    console.error(`未知类型 ${only}，可选：${SPECS.map(s => s.type).join(', ')}`);
    process.exit(1);
  }

  for (const spec of targets) {
    console.log(`🤖 生成「${spec.label}」...`);
    try {
      await generate(spec);
    } catch (err) {
      console.error(`❌ ${spec.label} 生成失败:`, err instanceof Error ? err.message : err);
    }
  }
}

main();
