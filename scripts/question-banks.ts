// 种子数据的题库清单：每一项描述一个题库（及其子题库）的元信息，由 seed.ts 读取插入数据库
//
// 目前只保留「外交知識」一个题库。其余题库（Word Skill / Mindset / Decoding / 名句 /
// 思考题 / 问答题 / 7000 Words / 中国文化常识 / 古诗补全）的完整定义已移到
// archive/question-banks.archived.ts，对应的题目数据在 archive/data/、封面图在 archive/covers/。
// 需要恢复某个题库时，把它的定义从归档文件复制回下面的数组，并把数据/封面移回
// scripts/data/ 与 public/covers/ 即可。
export type BankMeta = {
  name: string;
  description: string;
  cover_image_url: string;
  mode: 'qa' | 'mcq';
  dataFile?: string;
  category: string;
  subBanks?: Omit<BankMeta, 'subBanks'>[];
};

export const banksToSeed: BankMeta[] = [
  {
    name: '外交知識',
    description: '',
    cover_image_url: '/covers/diplomatic.png',
    mode: 'mcq',
    dataFile: '/mcq/diplomatic1.json',
    category: '历史',
    subBanks: [
      {
        name: '1-100',
        description: '',
        cover_image_url: '',
        mode: 'mcq',
        dataFile: '/mcq/diplomatic1.json',
        category: '外交知識',
      },
      {
        name: '101-200',
        description: '',
        cover_image_url: '',
        mode: 'mcq',
        dataFile: '/mcq/diplomatic2.json',
        category: '外交知識',
      },
      {
        name: '201-300',
        description: '',
        cover_image_url: '',
        mode: 'mcq',
        dataFile: '/mcq/diplomatic3.json',
        category: '外交知識',
      },
      {
        name: '50',
        description: '',
        cover_image_url: '',
        mode: 'mcq',
        dataFile: '/mcq/diplomatic4.json',
        category: '外交知識',
      },
    ],
  },
];
