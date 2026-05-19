/**
 * 更新中考词库 - 补全缺失字段
 * 使用方法: node scripts/update-vocabulary.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 补全数据 - 第1批 (50条)
const supplementData = {
  ability: {
    phonetic: "/əˈbɪləti/",
    meaning_en: "the power or skill to do something",
    sentence: "She has the ability to learn languages quickly.",
    sentence_cn: "她有快速学习语言的能力。"
  },
  able: {
    phonetic: "/ˈeɪbl/",
    meaning_en: "having the power or skill to do something",
    sentence: "Will you be able to come to my birthday party?",
    sentence_cn: "你能来参加我的生日聚会吗？"
  },
  about: {
    phonetic: "/əˈbaʊt/",
    meaning_en: "on the subject of; approximately",
    sentence: "This book is about a boy and his dog.",
    sentence_cn: "这本书是关于一个男孩和他的狗的。"
  },
  above: {
    phonetic: "/əˈbʌv/",
    meaning_en: "higher than; over",
    sentence: "The plane flew above the clouds.",
    sentence_cn: "飞机在云层上方飞行。"
  },
  abroad: {
    phonetic: "/əˈbrɔːd/",
    meaning_en: "in or to a foreign country",
    sentence: "My uncle went abroad to study last year.",
    sentence_cn: "我叔叔去年出国留学了。"
  },
  accept: {
    phonetic: "/əkˈsept/",
    meaning_en: "to take or receive something willingly",
    sentence: "Please accept my invitation to dinner.",
    sentence_cn: "请接受我的晚餐邀请。"
  },
  ache: {
    phonetic: "/eɪk/",
    meaning_en: "a continuous pain",
    sentence: "I have a stomachache after eating too much.",
    sentence_cn: "我吃太多后胃疼。"
  },
  across: {
    phonetic: "/əˈkrɒs/",
    meaning_en: "from one side to the other",
    sentence: "The boy ran across the street carefully.",
    sentence_cn: "男孩小心地跑过街道。"
  },
  act: {
    phonetic: "/ækt/",
    meaning_en: "to perform in a play or movie",
    sentence: "She wants to act in the school play.",
    sentence_cn: "她想在学校戏剧中表演。"
  },
  active: {
    phonetic: "/ˈæktɪv/",
    meaning_en: "doing things; energetic",
    sentence: "My grandfather is still very active at 70.",
    sentence_cn: "我爷爷70岁了还很活跃。"
  },
  activity: {
    phonetic: "/ækˈtɪvəti/",
    meaning_en: "something you do for fun or work",
    sentence: "What's your favorite after-school activity?",
    sentence_cn: "你最喜欢的课后活动是什么？"
  },
  actor: {
    phonetic: "/ˈæktər/",
    meaning_en: "a man who performs in plays or movies",
    sentence: "My dream is to become a famous actor.",
    sentence_cn: "我的梦想是成为一名著名演员。"
  },
  actress: {
    phonetic: "/ˈæktrəs/",
    meaning_en: "a woman who performs in plays or movies",
    sentence: "She is a talented actress in our city.",
    sentence_cn: "她是我们城市一位有才华的女演员。"
  },
  actually: {
    phonetic: "/ˈæktʃuəli/",
    meaning_en: "really; in fact",
    sentence: "Actually, I don't like ice cream very much.",
    sentence_cn: "实际上，我不太喜欢冰淇淋。"
  },
  add: {
    phonetic: "/æd/",
    meaning_en: "to put something together with something else",
    sentence: "Please add some sugar to my coffee.",
    sentence_cn: "请在我的咖啡里加点糖。"
  },
  addition: {
    phonetic: "/əˈdɪʃn/",
    meaning_en: "the act of adding something",
    sentence: "In addition to English, I study French.",
    sentence_cn: "除了英语，我还学法语。"
  },
  address: {
    phonetic: "/əˈdres/",
    meaning_en: "the details of where a person lives",
    sentence: "What's your home address?",
    sentence_cn: "你家的地址是什么？"
  },
  adult: {
    phonetic: "/ˈædʌlt/",
    meaning_en: "a fully grown person",
    sentence: "Adults should set a good example for children.",
    sentence_cn: "成年人应该为孩子们树立好榜样。"
  },
  adventure: {
    phonetic: "/ədˈventʃər/",
    meaning_en: "an exciting or unusual experience",
    sentence: "We had an adventure in the forest last summer.",
    sentence_cn: "去年夏天我们在森林里有一次冒险经历。"
  },
  advertisement: {
    phonetic: "/ədˈvɜːtɪsmənt/",
    meaning_en: "a notice telling people about a product",
    sentence: "I saw an advertisement for a new phone.",
    sentence_cn: "我看到了一款新手机的广告。"
  },
  advice: {
    phonetic: "/ədˈvaɪs/",
    meaning_en: "suggestions about what to do",
    sentence: "Can you give me some advice about learning English?",
    sentence_cn: "你能给我一些学习英语的建议吗？"
  },
  advise: {
    phonetic: "/ədˈvaɪz/",
    meaning_en: "to give advice to someone",
    sentence: "The doctor advised me to drink more water.",
    sentence_cn: "医生建议我多喝水。"
  },
  affect: {
    phonetic: "/əˈfekt/",
    meaning_en: "to influence or change something",
    sentence: "The weather can affect our mood.",
    sentence_cn: "天气会影响我们的心情。"
  },
  afford: {
    phonetic: "/əˈfɔːrd/",
    meaning_en: "to have enough money or time for something",
    sentence: "I can't afford to buy a new bike now.",
    sentence_cn: "我现在买不起新自行车。"
  },
  afraid: {
    phonetic: "/əˈfreɪd/",
    meaning_en: "feeling fear; scared",
    sentence: "Don't be afraid of making mistakes.",
    sentence_cn: "不要害怕犯错误。"
  },
  Africa: {
    phonetic: "/ˈæfrɪkə/",
    meaning_en: "a continent south of Europe",
    sentence: "My friend is from Africa.",
    sentence_cn: "我的朋友来自非洲。"
  },
  after: {
    phonetic: "/ˈæftər/",
    meaning_en: "later than; following",
    sentence: "Let's go for a walk after dinner.",
    sentence_cn: "我们晚饭后去散步吧。"
  },
  afternoon: {
    phonetic: "/ˌæftərˈnuːn/",
    meaning_en: "the time between noon and evening",
    sentence: "I usually take a nap in the afternoon.",
    sentence_cn: "我下午通常会午睡。"
  },
  again: {
    phonetic: "/əˈɡen/",
    meaning_en: "once more; another time",
    sentence: "Can you say that again, please?",
    sentence_cn: "请再说一遍好吗？"
  },
  against: {
    phonetic: "/əˈɡenst/",
    meaning_en: "opposing; in competition with",
    sentence: "Our team played against the best school team.",
    sentence_cn: "我们队和最好的校队比赛。"
  },
  age: {
    phonetic: "/eɪdʒ/",
    meaning_en: "how old someone is",
    sentence: "What's your age? I'm fourteen.",
    sentence_cn: "你多大年纪？我十四岁。"
  },
  aged: {
    phonetic: "/eɪdʒd/",
    meaning_en: "of a certain age; old",
    sentence: "My grandmother is aged 75.",
    sentence_cn: "我奶奶75岁了。"
  },
  ago: {
    phonetic: "/əˈɡəʊ/",
    meaning_en: "in the past; before now",
    sentence: "I visited Beijing three years ago.",
    sentence_cn: "我三年前参观了北京。"
  },
  agree: {
    phonetic: "/əˈɡriː/",
    meaning_en: "to have the same opinion",
    sentence: "I agree with you on this matter.",
    sentence_cn: "在这件事上我同意你的看法。"
  },
  ahead: {
    phonetic: "/əˈhed/",
    meaning_en: "in front; forward",
    sentence: "Go ahead and tell us your idea.",
    sentence_cn: "请继续，告诉我们你的想法。"
  },
  aim: {
    phonetic: "/eɪm/",
    meaning_en: "a goal or purpose",
    sentence: "Her aim is to become a doctor.",
    sentence_cn: "她的目标是成为一名医生。"
  },
  air: {
    phonetic: "/er/",
    meaning_en: "the gas we breathe",
    sentence: "The air in the mountains is very fresh.",
    sentence_cn: "山里的空气非常清新。"
  },
  airline: {
    phonetic: "/ˈerlaɪn/",
    meaning_en: "a company that provides flights",
    sentence: "Which airline are you flying with?",
    sentence_cn: "你乘坐哪家航空公司？"
  },
  alarm: {
    phonetic: "/əˈlɑːrm/",
    meaning_en: "a warning sound or signal",
    sentence: "The fire alarm went off in our school.",
    sentence_cn: "我们学校的火警警报响了。"
  },
  alive: {
    phonetic: "/əˈlaɪv/",
    meaning_en: "living; not dead",
    sentence: "It's amazing that the plant is still alive.",
    sentence_cn: "令人惊讶的是这株植物还活着。"
  },
  all: {
    phonetic: "/ɔːl/",
    meaning_en: "the whole amount; everyone or everything",
    sentence: "All the students passed the exam.",
    sentence_cn: "所有学生都通过了考试。"
  },
  allow: {
    phonetic: "/əˈlaʊ/",
    meaning_en: "to let someone do something",
    sentence: "My parents allow me to watch TV on weekends.",
    sentence_cn: "我父母允许我在周末看电视。"
  },
  almost: {
    phonetic: "/ˈɔːlməʊst/",
    meaning_en: "nearly; not quite",
    sentence: "I'm almost finished with my homework.",
    sentence_cn: "我差不多做完作业了。"
  },
  alone: {
    phonetic: "/əˈləʊn/",
    meaning_en: "by oneself; without others",
    sentence: "She likes to read alone in her room.",
    sentence_cn: "她喜欢独自在房间里看书。"
  },
  along: {
    phonetic: "/əˈlɒŋ/",
    meaning_en: "following the length of something",
    sentence: "We walked along the river for an hour.",
    sentence_cn: "我们沿着河走了一个小时。"
  },
  also: {
    phonetic: "/ˈɔːlsəʊ/",
    meaning_en: "in addition; too",
    sentence: "I like music, and I also enjoy painting.",
    sentence_cn: "我喜欢音乐，也喜欢绘画。"
  },
  altogether: {
    phonetic: "/ˌɔːltəˈɡeðər/",
    meaning_en: "completely; in total",
    sentence: "That will be 50 yuan altogether.",
    sentence_cn: "总共是50元。"
  },
  always: {
    phonetic: "/ˈɔːlweɪz/",
    meaning_en: "at all times; every time",
    sentence: "She always arrives at school on time.",
    sentence_cn: "她总是准时到校。"
  },
  America: {
    phonetic: "/əˈmerɪkə/",
    meaning_en: "the United States of America",
    sentence: "My cousin is studying in America now.",
    sentence_cn: "我表哥现在在美国学习。"
  },
  American: {
    phonetic: "/əˈmerɪkən/",
    meaning_en: "from the United States",
    sentence: "An American student visited our school yesterday.",
    sentence_cn: "一位美国学生昨天参观了我们的学校。"
  }
};

// 读取词库
const vocabPath = path.join(__dirname, '../data/words-shanghai-zhongkao.json');
const data = JSON.parse(fs.readFileSync(vocabPath, 'utf-8'));

let updatedCount = 0;

// 更新词库
data.words.forEach(word => {
  const supplement = supplementData[word.word];
  if (supplement && (!word.phonetic || word.phonetic === '')) {
    word.phonetic = supplement.phonetic;
    word.meaning_en = supplement.meaning_en;
    word.sentence = supplement.sentence;
    word.sentence_cn = supplement.sentence_cn;
    updatedCount++;
    console.log(`Updated: ${word.word}`);
  }
});

// 保存更新后的词库
fs.writeFileSync(vocabPath, JSON.stringify(data, null, 2), 'utf-8');

console.log(`\n✅ Done! Updated ${updatedCount} words.`);
console.log(`Total words in vocabulary: ${data.words.length}`);
