// 题库清单：每一项描述一个题库（及其子题库）的元信息，由 seed-banks.ts 读取后灌进数据库
//
// 目前保留两个题库：
//   1.「第十七屆外交知識競賽預習題」—— 官方預習題 300 題（三選一），按 50 題一组拆成 6 个子题库；
//      题目与答案完全对齐《第十七屆澳門青少年外交知識競賽＿預習題》PDF（答案即原卷标 * 的选项）。
//   2.「外交讀本訓練習題」—— 《外交讀本》1-5 章配套习题 110 题（四選一），按章节拆成 2 个子题库。
// 父题库的 dataFile 指向合并文件（*-all.json），对应分类页上的「（全部）」卡片；
// 子题库各自指向自己的分段文件。
//
// 其余题库（Word Skill / Mindset / Decoding / 名句 / 思考题 / 问答题 / 7000 Words /
// 中国文化常识 / 古诗补全）的完整定义已移到 archive/question-banks.archived.ts，对应的题目数据在
// archive/data/、封面图在 archive/covers/。需要恢复某个题库时，把它的定义从归档文件复制回下面的
// 数组，并把数据/封面移回 scripts/data/ 与 public/covers/ 即可。
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
    name: '第十七屆外交知識競賽預習題',
    description: '澳門青少年外交知識競賽官方預習題，共 300 題，三選一',
    cover_image_url: '/covers/diplomatic.png',
    mode: 'mcq',
    dataFile: '/banks/diplomatic-all.json',
    category: '历史',
    subBanks: [
      {
        name: '01 古代使節與近代外交史（1-50）',
        description: '古代使節與鄭和下西洋、鴉片戰爭與不平等條約、洋務運動、五四運動、抗戰爆發',
        cover_image_url: '',
        mode: 'mcq',
        dataFile: '/banks/diplomatic1.json',
        category: '外交知識競賽',
      },
      {
        name: '02 戰後秩序與新中國外交（51-100）',
        description: '二戰後國際秩序與聯合國成立、建國初三大方針、和平共處五項原則、萬隆會議、援外與邊界、上合組織成立',
        cover_image_url: '',
        mode: 'mcq',
        dataFile: '/banks/diplomatic2.json',
        category: '外交知識競賽',
      },
      {
        name: '03 改革開放與新時代外交（101-150）',
        description: '中蘇中美中日關係、一國兩制、入世與維和、一帶一路與三大全球倡議、澳門回歸 25 周年講話',
        cover_image_url: '',
        mode: 'mcq',
        dataFile: '/banks/diplomatic3.json',
        category: '外交知識競賽',
      },
      {
        name: '04 周邊大國關係與國際組織（151-200）',
        description: '周邊與南海問題、東盟與 APEC、中非與中美元首外交、領事保護、聯合國機構與國際法',
        cover_image_url: '',
        mode: 'mcq',
        dataFile: '/banks/diplomatic4.json',
        category: '外交知識競賽',
      },
      {
        name: '05 外交制度禮賓與國際組織（201-250）',
        description: '駐外人員法與維也納公約、國事訪問與禮炮位次等禮賓常識、聯合國專門機構與國際經濟組織、澳門早期歷史',
        cover_image_url: '',
        mode: 'mcq',
        dataFile: '/banks/diplomatic5.json',
        category: '外交知識競賽',
      },
      {
        name: '06 澳門歷史基本法與涉澳外交（251-300）',
        description: '澳門近代史與中葡條約、澳門基本法與高度自治、涉澳外交事務與國際參與',
        cover_image_url: '',
        mode: 'mcq',
        dataFile: '/banks/diplomatic6.json',
        category: '外交知識競賽',
      },
    ],
  },
  {
    name: '外交讀本訓練習題',
    description: '《外交讀本》1-5 章配套訓練習題，共 110 題，四選一',
    cover_image_url: '/covers/diplomatic.png',
    mode: 'mcq',
    dataFile: '/banks/readbook-all.json',
    category: '历史',
    subBanks: [
      {
        name: '第1-2章 外交基礎與駐外機構（50題）',
        description: '外交主體與新型外交類別、一帶一路、維也納公約、澳門對外事務、外交部與使領館建制、發言人制度',
        cover_image_url: '',
        mode: 'mcq',
        dataFile: '/banks/readbook1.json',
        category: '外交讀本',
      },
      {
        name: '第3-5章 新中國外交歷程（60題）',
        description: '建國初三大方針與中蘇關係、抗美援朝、萬隆與日內瓦會議、恢復聯合國席位、乒乓外交與中美中日建交、改革開放後的獨立自主外交',
        cover_image_url: '',
        mode: 'mcq',
        dataFile: '/banks/readbook2.json',
        category: '外交讀本',
      },
    ],
  },
];
