// scripts/question-banks.ts

export type BankMeta = { // <-- 类型名为 BankMeta
  name: string;
  description: string;
  cover_image_url: string;
  mode: 'qa' | 'mcq' | 'poetry_pair' | 'poetry_completion';
  dataFile: string;
};

// 【修复】将 BankData 修改为 BankMeta
export const banksToSeed: BankMeta[] = [ 
  {
    name: '中国文化常识',
    description: '中国文化常识达标考试读本',
    cover_image_url: '/covers/C_knowledge_qa.png',
    mode: 'qa',
    dataFile: 'C_knowledge_qa.json',
  },
  {
    name: '前端开发基础',
    description: 'HTML, CSS, JavaScript 基础面试题。',
    cover_image_url: '/covers/frontend.png',
    mode: 'mcq',
    dataFile: 'frontend_mcq.json',
  },
  {
    name: '名句配对',
    description: '给出半句，说出另外半句。',
    cover_image_url: '/covers/poetry_pair.png',
    mode: 'poetry_pair',
    dataFile: 'poetry_pair.json',
  },
  {
    name: '古诗补全',
    description: '补全诗词中的缺失部分。',
    cover_image_url: '/covers/poetry_completion.png',
    mode: 'poetry_completion',
    dataFile: 'poetry_completion.json',
  },
];

