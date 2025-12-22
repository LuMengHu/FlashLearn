// scripts/question-banks.ts

export type BankMeta = {
  name: string;
  description: string;
  cover_image_url: string;
  mode: 'qa' | 'mcq' | 'pos' | 'sbs' | 'verb_forms' |'poetry_pair' | 'poetry_completion'| 'layered_reveal'| 'initial_hint' | 'contextual_cloze';
  dataFile?: string; // <-- 改为可选
  category: string;
  subBanks?: Omit<BankMeta, 'subBanks'>[];
};

// 【修复】将 BankData 修改为 BankMeta
export const banksToSeed: BankMeta[] = [ 
  {
    name: 'Word Skill',
    description: '',
    cover_image_url: '/covers/word-skill.png',
    mode: 'initial_hint',
    dataFile: '/word-skill/U66.json',
    category: '英文',
    subBanks: [
      {
        name: 'U66',
        description: '',
        cover_image_url: '',
        mode: 'initial_hint',
        dataFile: '/word-skill/U66.json',
        category: 'Word Skill',
      },
      {
        name: 'U68',
        description: '',
        cover_image_url: '',
        mode: 'initial_hint',
        dataFile: '/word-skill/U68.json',
        category: 'Word Skill',
      },
    ],
  },
  {
    name: 'Mindset',
    description: '',
    cover_image_url: '/covers/mindset.png',
    mode: 'pos',
    dataFile: '/mindset/U1_pre.json',
    category: '英文',
    subBanks: [
      {
        name: 'U1',
        description: '',
        cover_image_url: '',
        mode: 'contextual_cloze',
        dataFile: '/mindset/U1.json',
        category: 'Mindset',
      },
      {
        name: 'U1_pre',
        description: '',
        cover_image_url: '',
        mode: 'pos',
        dataFile: '/mindset/U1_pre.json',
        category: 'Mindset',
      },
    ],
  },
  {
    name: 'Decoding',
    description: '',
    cover_image_url: '/covers/decoding.png',
    mode: 'verb_forms',
    dataFile: '/decoding/U1-12.json',
    category: '英文',
    subBanks: [
      {
        name: 'U1-12',
        description: '',
        cover_image_url: '',
        mode: 'verb_forms',
        dataFile: '/decoding/U1-12.json',
        category: 'Decoding',
      },
    ],
  },
  {
    name: '7000 Words',
    description: '逐层揭示单词的多个释义和例句',
    cover_image_url: '/covers/7000-words.png',
    mode: 'layered_reveal',
    dataFile: '/7000-words/U18&19&20.json',
    category: '英文',
    subBanks: [
      {
        name: 'U18',
        description: '',
        cover_image_url: '',
        mode: 'layered_reveal',
        dataFile: '/7000-words/U18.json',
        category: '7000 Words',
      },
      {
        name: 'U19',
        description: '',
        cover_image_url: '',
        mode: 'layered_reveal',
        dataFile: '/7000-words/U19.json',
        category: '7000 Words',
      },
      {
        name: 'U20',
        description: '',
        cover_image_url: '',
        mode: 'layered_reveal',
        dataFile: '/7000-words/U20.json',
        category: '7000 Words',
      },
    ],
  },
  {
    name: '名句',
    description: '给出半句，对出另外半句。',
    cover_image_url: '/covers/poetry-pair.png',
    mode: 'poetry_pair',
    dataFile: '/poetry-pair/T2.json',
    category: '中文',
    subBanks: [
      {
        name: 'T1',
        description: '',
        cover_image_url: '',
        mode: 'poetry_pair',
        dataFile: '/poetry-pair/T1.json',
        category: '名句',
      },
      {
        name: 'T2',
        description: '',
        cover_image_url: '',
        mode: 'poetry_pair',
        dataFile: '/poetry-pair/T2.json',
        category: '名句',
      },
      {
        name: 'T3',
        description: '',
        cover_image_url: '',
        mode: 'poetry_pair',
        dataFile: '/poetry-pair/T3.json',
        category: '名句',
      },
      {
        name: 'T4',
        description: '',
        cover_image_url: '',
        mode: 'poetry_pair',
        dataFile: '/poetry-pair/T4.json',
        category: '名句',
      },
      {
        name: 'E1',
        description: '',
        cover_image_url: '',
        mode: 'poetry_pair',
        dataFile: '/poetry-pair/E1.json',
        category: '名句',
      },
      {
        name: 'E2',
        description: '',
        cover_image_url: '',
        mode: 'poetry_pair',
        dataFile: '/poetry-pair/E2.json',
        category: '名句',
      },
    ],
  },
  {
    name: '思考题',
    description: '',
    cover_image_url: '/covers/q-a.png',
    mode: 'sbs',
    dataFile: '/q-a/C1_T1.json',
    category: '中文',
    subBanks: [
      {
        name: 'C1_T1',
        description: '',
        cover_image_url: '',
        mode: 'sbs',
        dataFile: '/q-a/C1_T1.json',
        category: '思考题',
      },
    ],
  },
  {
    name: '珠澳歷史',
    description: '',
    cover_image_url: '/covers/diplomatic.png',
    mode: 'mcq',
    dataFile: '/mcq/diplomatic.json',
    category: '历史',
  },
  {
    name: '问答题',
    description: '',
    cover_image_url: '/covers/q-a.png',
    mode: 'sbs',
    dataFile: '/q-a/T1.json',
    category: '历史',
    subBanks: [
      {
        name: 'T1',
        description: '',
        cover_image_url: '',
        mode: 'sbs',
        dataFile: '/q-a/T1.json',
        category: 'Q&A',
      },
    ],
  },
  {
    name: '中国文化常识达标',
    description: '',
    cover_image_url: '/covers/china-knowledge.png',
    mode: 'qa',
    dataFile: '/china-knowledge/china_knowledge.json',
    category: '常识',
  },
  {
    name: '古诗补全',
    description: '补全古诗中的缺失部分。',
    cover_image_url: '/covers/poetry-completion.png',
    mode: 'poetry_completion',
    dataFile: '/poetry-completion/poetry_completion.json',
    category: '诗词',
  },
];
