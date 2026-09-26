"""Build the reviewed two-category English dataset from the supplied HTML and PDF notes.

The PDF supplements below are manually transcribed from the four user-provided pages.
Review this output before running the destructive rebuild command.
"""
from __future__ import annotations
import html
import json
import pathlib
import re
import sys

SOURCE = pathlib.Path(sys.argv[1])
OUTPUT = pathlib.Path(sys.argv[2])
doc = SOURCE.read_text(encoding="utf-8")

def clean(value: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", value)).split()).strip(" ◆")

def key(value: str) -> str:
    return " ".join(value.lower().split())

def part(start: str, end: str) -> str:
    return doc[doc.index(start):doc.index(end)]

def parsed_groups(chunk: str):
    for body in re.findall(r'<div class="grp">([\s\S]*?)</table></div>', chunk):
        title = clean(re.search(r'<span class="grp-t">([\s\S]*?)</span>', body).group(1))
        tip = clean(re.search(r'<span class="grp-tip">([\s\S]*?)</span>', body).group(1)) if 'class="grp-tip"' in body else ""
        rows = []
        for tr in re.findall(r'<tr>([\s\S]*?)</tr>', body):
            cells = {cls: clean(value) for cls, value in re.findall(r'<td class="(en|zh|nt|bx)">([\s\S]*?)</td>', tr)}
            if cells.get("en") and cells.get("zh"):
                rows.append({"word": cells["en"], "meaning": cells["zh"], "example": cells.get("nt", "")})
        if rows:
            yield title, tip, rows

groups = []
phrases = {}

def add_group(name: str, pairs: list[tuple[str, str]], source: str, tip: str = ""):
    pairs = [(word.strip(), meaning.strip()) for word, meaning in pairs if word.strip() and meaning.strip()]
    if len(pairs) < 2:
        return
    groups.append({"name": name, "tip": tip, "source": source, "entries": [{"word": w, "meaning": m} for w,m in pairs]})

def add_phrase(word: str, meaning: str, source: str, cluster: str, example: str = ""):
    word, meaning = re.sub(r"\s*补$", "", word.strip()), meaning.strip()
    if not word or not meaning or " " not in word:
        return
    k = key(word)
    if k not in phrases:
        phrases[k] = {"word": word, "meaning": meaning, "source": source, "cluster": cluster, "example": example}

for title, tip, rows in parsed_groups(part('<h2 id="p1">', '<h2 id="p2">')):
    add_group(title, [(row["word"], row["meaning"]) for row in rows], "Practice 2 HTML p.133", tip)

selected_second = {
    frozenset(["review", "preview", "revision"]),
    frozenset(["especially", "specially", "specifically", "specialty"]),
}
for title, tip, rows in parsed_groups(part('<h3>A. 易混词汇', '<h3>B. 口语交际表达')):
    selected = rows
    words = {key(row["word"]) for row in rows}
    if {"review", "preview", "revision"}.issubset(words):
        selected = [row for row in rows if key(row["word"]) != "proposal"]
    elif frozenset(words) not in selected_second:
        continue
    add_group(title, [(row["word"], row["meaning"]) for row in selected], "Practice 2 HTML p.133", tip)

for start, end in [('<h2 id="p2">','<h2 id="p3">'),('<h3>B. 口语交际表达','<h2 id="p4">')]:
    for title, tip, rows in parsed_groups(part(start, end)):
        for row in rows:
            add_phrase(row["word"], row["meaning"], "Practice 2 HTML p.133", title, row["example"])

# 132.pdf is an image-only page. Each line below was checked against the rendered table.
PDF132 = """
aboard / abroad|aboard=在船上；在飞机上|abroad=在国外
abound / bound|abound=大量存在|bound=被束缚的；必定的
ache / acre|ache=疼痛|acre=英亩
action / auction|action=行动；行为|auction=拍卖
adapt / adopt / adept|adapt=适应|adopt=采用；收养|adept=熟练的；擅长的
advice / advise|advice=建议；忠告|advise=建议；劝告
affect / effect|affect=影响（动词）|effect=效果；影响（名词）
alert / avert|alert=警惕的；警报|avert=避免；防止
alien / align|alien=外星人；陌生的|align=对齐；调整
alone / lonely|alone=独自的|lonely=孤独的
revise / revive|revise=修订；修改|revive=复活；恢复
aloud / loud|aloud=大声地|loud=大声的
altitude / latitude / attitude|altitude=高度；海拔|latitude=纬度|attitude=态度
analyse / analysis|analyse=分析（动词）|analysis=分析（名词）
angel / angle|angel=天使|angle=角度
evacuate / evaluate|evacuate=疏散；撤离|evaluate=评估；评价
literacy / literary / literally|literacy=读写能力|literary=文学的|literally=字面上；确实地
local / vocal|local=当地的；局部的|vocal=声音的；嗓音的
vacation / vocation|vacation=假期；度假|vocation=职业；使命
outlet / outset|outlet=出口；插座|outset=开始；开端
fixture / mixture|fixture=固定装置|mixture=混合物
fiction / friction|fiction=小说；虚构|friction=摩擦
loyalty / royalty|loyalty=忠诚|royalty=王室；版税
rebel / repel|rebel=反叛者；反抗|repel=击退；驱逐
major / mayor|major=主要的；重要的|mayor=市长
fellow / follow|fellow=同伴；同事|follow=跟随
massive / passive|massive=大规模的|passive=被动的；消极的
mature / nature|mature=成熟的|nature=自然；性质
medal / metal|medal=奖牌；勋章|metal=金属
mediate / meditate|mediate=调解；调停|meditate=冥想；沉思
except / excerpt|except=除了|excerpt=摘录；节选
pasture / posture|pasture=牧场|posture=姿势；体态
down / gown / town|down=向下|gown=长袍；礼服|town=城镇
craft / draft / drift|craft=手艺；工艺|draft=草稿；起草|drift=漂流；漂移
project / protect|project=项目；计划|protect=保护；防护
employee / employer|employee=雇员|employer=雇主
dumb / numb|dumb=哑的；无言的|numb=麻木的
dust / rust|dust=灰尘|rust=生锈；铁锈
dwell / swell|dwell=居住；细想|swell=膨胀；肿胀
fill / full|fill=填满|full=满的
ease / erase|ease=缓解；减轻|erase=擦掉；抹去
reject / eject / elect / erect / select|reject=拒绝；排斥|eject=逐出；弹出|elect=选举；当选|erect=直立的；竖立|select=选择；挑选
"""
for raw in PDF132.strip().splitlines():
    name, *cells = raw.split("|")
    add_group(name, [tuple(cell.split("=", 1)) for cell in cells], "132.pdf")

# Practice 1 2.2 mixes unrelated distractors with useful comparisons.
add_group("vary / various / varieties", [("vary","变化；不同"),("various","各种各样的"),("varieties","种类（variety 的复数）")], "Practice 1 2.2.pdf")
add_group("dependently / independently", [("dependently","依赖地"),("independently","独立地")], "Practice 1 2.2.pdf")
add_group("accuse / accustom", [("accuse","指控；控告"),("accustom","使习惯")], "Practice 1 2.2.pdf", "accuse ... of；accustom ... to")

# Core meanings of phrasal verbs / expressions from the three exercise PDFs.
# Inflected answer choices are normalized to base form. Duplicate entries keep the
# richer HTML definition when one already exists there.
PDF_PHRASES = """
give up|放弃
hold up|耽搁；阻碍；支撑
be carried away|激动得失去自制
drive away|赶走
fall through|落空；失败
get through|完成；通过；接通电话
clear up|澄清；解决；转晴
look up|查阅；好转
take on|承担；雇用；呈现
bring in|引入；带来；赚得
wipe away|擦掉；消除
bring about|引起；导致
worry about|担心
care about|关心；在意
go about|着手做；继续做
make out|辨认出；理解
make into|把……变成
make up|组成；编造；化妆
make for|促成；导致；朝……走去
shake off|摆脱；甩掉
take off|起飞；脱下；突然成功
pay off|还清；取得回报
kick off|开始；开球
put out|扑灭；出版；伸出
roll out|推出；发布
reach out|伸出手；主动联系
give rise to|引起；导致
make way for|给……让路
take part in|参加
keep pace with|跟上……的步伐
break into|闯入；突然开始
turn into|变成
dive into|全身心投入；跳入
fit into|适应；与……相协调
pick up|拾起；接人；学会；好转
split up|分开；解散
take up|开始从事；占用
spring up|突然出现
cut back on|削减
crack down on|严厉打击
follow up on|跟进
hold out on|隐瞒；不给予
dive in|开始投入
switch off|不再关注；关掉
pull out|退出；撤离
catch on|流行起来；理解
push on|继续前进
carry on|继续
count on|依靠；指望
relate to|理解；与……有关
live with|忍受；与……同住
answer for|对……负责
pull through|渡过难关；康复
lay out|布置；规划；陈列
call up|打电话；召集；使想起
give away|赠送；泄露
count in|把……算进去
count up|加起来；数出总数
count out|不把……算在内
put down|放下；记下
put off|推迟
put on|穿上；上演
put up|住宿；张贴；搭建
take down|取下；记下
get one's way|如愿以偿
get away with|做错事而未受惩罚
keep away from|远离
have power over|控制；对……有权力
turn to|求助于；转向
adapt to|适应
occur to|被想到；突然想到
contribute to|促成；有助于
come up with|想出；提出
come down to|归结为
come down with|染上疾病
come up against|遭遇困难
take over|接管
take in|收留；吸收；理解
bring up|抚养；提出
hold back|阻止；抑制
set down|写下；放下
set out|出发；着手
set off|出发；引发
set about|着手做
set on|袭击；使攻击
rise up|起义；升起
break away|脱离
keep away|远离
take away|拿走
build up|逐渐增强；建立
turn up|出现；调高
hang up|挂断电话
hang down|垂下
hang on|坚持；稍等
hang out|闲逛
figure out|弄明白
put forward|提出
leave for|动身前往
account for|解释；说明原因
care for|照顾；喜欢
pull one's weight|尽本分；做好分内事
in one's own right|凭自身资格
tick all the right boxes|符合所有要求
the other way round|反过来；相反
within reach|够得着；可实现
beyond one's range|超出能力或价格范围
in the lead|领先
under discussion|正在讨论中
certainly not|当然不
enjoy yourself|玩得开心
don't trouble me|别打扰我
yes, please|好的；请
you've got me there|你把我问住了
just my luck|真倒霉
are you kidding me|你在开玩笑吗
I have no idea|我不知道
"""
p1_only = {"give up","hold up","be carried away","drive away","fall through","get through","clear up","look up","take on","bring in","wipe away","bring about","worry about","care about","go about","make out","make into","make up","make for","shake off","take off","pay off","kick off","put out","roll out","reach out","give rise to","make way for","take part in","keep pace with","break into","turn into","dive into","fit into","pick up","split up","take up","spring up","cut back on","crack down on","follow up on","hold out on","dive in","switch off","pull out","catch on","push on","carry on","count on","relate to","live with","answer for","pull through","lay out","call up","give away"}
p12 = {"pull one's weight","in one's own right","tick all the right boxes","the other way round","within reach","beyond one's range","in the lead","under discussion","certainly not","enjoy yourself","don't trouble me","yes, please","you've got me there","just my luck","are you kidding me","I have no idea"}
for raw in PDF_PHRASES.strip().splitlines():
    word, meaning = raw.split("|",1)
    source = "Practice 1 2.1.pdf" if word in p1_only else "Practice 1 2.2.pdf" if word in p12 else "Practice 3 2.1.pdf"
    cluster = word.split()[0].lower()
    add_phrase(word, meaning, source, cluster)

# Remove exact duplicate groups; a word may still appear in different legitimate comparisons.
seen = set()
unique_groups = []
for group in groups:
    identity = tuple(sorted(key(e["word"]) for e in group["entries"]))
    if identity in seen:
        continue
    seen.add(identity)
    unique_groups.append(group)

# Keep comparisons that are useful for distinguishing exam vocabulary.
# The source sheets also contain elementary look-alikes and conversational distractors.
LOW_VALUE_GROUPS = {
    "ant / aunt", "away / way", "back / bark", "bad / band / bend / blend",
    "bag / beg", "mind / mere / merge", "mild / wild", "mine / nine",
    "month / mouth", "moon / noon", "nerve / serve", "noise / noisy / note",
    "dose / hose", "even / oven", "dye / eye", "mask / mass",
    "down / gown / town", "dust / rust", "fill / full",
}
unique_groups = [group for group in unique_groups if group["name"] not in LOW_VALUE_GROUPS]
LOW_VALUE_PHRASES = {
    "i can't agree more.", "you are telling me!", "i wouldn't say that.",
    "you must be kidding me.", "who cares?", "you've gone too far.",
    "go for it!", "you can make it.", "good for you!", "come on!",
    "you'd better get started.", "never mind.", "i won't worry about it too much.",
    "it's up to you.", "dear me!", "thank goodness!", "how come?",
    "no wonder.", "what's wrong?", "help yourself.",
    "can i help you with anything?", "you bet.",
    "certainly not", "enjoy yourself", "don't trouble me", "yes, please",
    "you've got me there", "just my luck", "are you kidding me", "i have no idea",
}
phrases = {key: value for key, value in phrases.items() if key not in LOW_VALUE_PHRASES}

# Keep hand-reviewed distinction cues when refreshing from the same source sheets.
# A changed membership gets a new identity and must be reviewed again.
if OUTPUT.exists():
    previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
    reviewed = {
        tuple(sorted(key(entry["word"]) for entry in group["entries"])): group.get("tip", "")
        for group in previous.get("groups", []) if group.get("tip")
    }
    for group in unique_groups:
        identity = tuple(sorted(key(entry["word"]) for entry in group["entries"]))
        if identity in reviewed:
            group["tip"] = reviewed[identity]
payload = {"version": 1, "groups": unique_groups, "phrases": list(phrases.values())}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({
    "groups": len(unique_groups),
    "confusion_terms": len({key(e["word"]) for group in unique_groups for e in group["entries"]}),
    "phrases": len(phrases),
    "output": str(OUTPUT),
}, ensure_ascii=False))
