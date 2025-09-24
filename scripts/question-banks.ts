// scripts/question-banks.ts

export type BankMeta = { // <-- 类型名为 BankMeta
  name: string;
  description: string;
  cover_image_url: string;
  mode: 'qa' | 'mcq' | 'P_pair' | 'P_completion'| 'lr';
  dataFile: string;
  category: string;
  subBanks?: Omit<BankMeta, 'subBanks'>[];
};

// 【修复】将 BankData 修改为 BankMeta
export const banksToSeed: BankMeta[] = [ 
  {
    name: '7000 Words',
    description: '逐层揭示单词的多个释义和例句',
    cover_image_url: '/covers/7000.png', 
    mode: 'lr',
    dataFile: 'E_7000_lr.json',
    category: '英文',
    subBanks: [
      {
        name: 'U7 & U8',
        description: '',
        cover_image_url: '',
        mode: 'lr',
        dataFile: 'E_7000_lr.json',
        category: '7000 Words',
      },
    ]
  },
  {
    name: '名句背诵',
    description: '给出半句，对出另外半句。',
    cover_image_url: '/covers/P_pair.png',
    mode: 'P_pair',
    dataFile: 'P_pair.json',
    category: '诗句',
  },
  {
    name: '中国文化常识',
    description: '中国文化常识达标考试读本',
    cover_image_url: '/covers/C_knowledge_qa.png',
    mode: 'qa',
    dataFile: 'C_knowledge_qa.json',
    category: '常识',
  },
  {
    name: '历史知识选择',
    description: '',
    cover_image_url: '/covers/history.png',
    mode: 'mcq',
    dataFile: 'diplomatic_mcq.json',
    category: '历史',
  },
  {
    name: '古诗补全',
    description: '补全诗词中的缺失部分。',
    cover_image_url: '/covers/P_completion.png',
    mode: 'P_completion',
    dataFile: 'P_completion.json',
    category: '诗句',
  },
];

