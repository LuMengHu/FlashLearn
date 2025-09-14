// scripts/question-banks.ts

export type BankMeta = { // <-- 类型名为 BankMeta
  name: string;
  description: string;
  cover_image_url: string;
  mode: 'qa' | 'mcq' | 'P_pair' | 'P_completion'| 'lr';
  dataFile: string;
};

// 【修复】将 BankData 修改为 BankMeta
export const banksToSeed: BankMeta[] = [ 
  {
    name: '7000 Words',
    description: '逐层揭示单词的多个释义和例句',
    cover_image_url: '/covers/7000.png', 
    mode: 'lr',
    dataFile: 'E_7000_lr.json',
  },
  {
    name: '名句背诵',
    description: '给出半句，对出另外半句。',
    cover_image_url: '/covers/P_pair.png',
    mode: 'P_pair',
    dataFile: 'P_pair.json',
  },
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
    name: '古诗补全',
    description: '补全诗词中的缺失部分。',
    cover_image_url: '/covers/P_completion.png',
    mode: 'P_completion',
    dataFile: 'P_completion.json',
  },
];

