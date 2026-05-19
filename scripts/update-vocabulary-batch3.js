/**
 * 更新中考词库 - 补全缺失字段 (第3批)
 * 使用方法: node scripts/update-vocabulary-batch3.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supplementData = {
  blackboard: { phonetic: "/ˈblækbɔːrd/", meaning_en: "a dark board for writing with chalk", sentence: "The teacher wrote on the blackboard.", sentence_cn: "老师在黑板上写字。" },
  blanket: { phonetic: "/ˈblæŋkɪt/", meaning_en: "a warm cover for a bed", sentence: "Please pass me a blanket.", sentence_cn: "请递给我一条毯子。" },
  blind: { phonetic: "/blaɪnd/", meaning_en: "unable to see", sentence: "The blind man uses a guide dog.", sentence_cn: "盲人使用导盲犬。" },
  block: { phonetic: "/blɒk/", meaning_en: "a large piece; a group of buildings", sentence: "Our school is on this block.", sentence_cn: "我们的学校在这个街区。" },
  blood: { phonetic: "/blʌd/", meaning_en: "the red liquid in our bodies", sentence: "Blood carries oxygen through the body.", sentence_cn: "血液在体内输送氧气。" },
  blow: { phonetic: "/bləʊ/", meaning_en: "to move air; wind moving", sentence: "The wind blows strongly in winter.", sentence_cn: "冬天风刮得很大。" },
  blue: { phonetic: "/bluː/", meaning_en: "the color of the sky", sentence: "The sky is blue today.", sentence_cn: "今天天空是蓝色的。" },
  board: { phonetic: "/bɔːrd/", meaning_en: "a flat piece of wood", sentence: "Please write your answer on the board.", sentence_cn: "请把答案写在板上。" },
  boat: { phonetic: "/bəʊt/", meaning_en: "a small vessel for water", sentence: "We went fishing on a small boat.", sentence_cn: "我们坐小船去钓鱼。" },
  body: { phonetic: "/ˈbɒdi/", meaning_en: "the whole physical structure of a person", sentence: "Exercise is good for your body.", sentence_cn: "锻炼对你的身体有好处。" },
  boil: { phonetic: "/bɔɪl/", meaning_en: "to heat water until it bubbles", sentence: "Boil the water before drinking it.", sentence_cn: "喝水前要煮沸。" },
  book: { phonetic: "/bʊk/", meaning_en: "to arrange something in advance", sentence: "I need to book a hotel room.", sentence_cn: "我需要预订一个酒店房间。" },
  bored: { phonetic: "/bɔːrd/", meaning_en: "feeling tired and uninterested", sentence: "I felt bored during the long meeting.", sentence_cn: "在漫长的会议中我感到无聊。" },
  boring: { phonetic: "/ˈbɔːrɪŋ/", meaning_en: "not interesting; dull", sentence: "The movie was really boring.", sentence_cn: "这部电影真的很无聊。" },
  born: { phonetic: "/bɔːrn/", meaning_en: "brought into life", sentence: "I was born in Shanghai.", sentence_cn: "我出生在上海。" },
  borrow: { phonetic: "/ˈbɒrəʊ/", meaning_en: "to take something to use and return later", sentence: "Can I borrow your pen?", sentence_cn: "我可以借你的钢笔吗？" },
  boss: { phonetic: "/bɒs/", meaning_en: "the person in charge at work", sentence: "My boss is very kind.", sentence_cn: "我的老板很友善。" },
  both: { phonetic: "/bəʊθ/", meaning_en: "two together", sentence: "Both of my parents are teachers.", sentence_cn: "我的父母都是老师。" },
  bottle: { phonetic: "/ˈbɒtl/", meaning_en: "a container for liquids", sentence: "Please drink a bottle of water.", sentence_cn: "请喝一瓶水。" },
  bottom: { phonetic: "/ˈbɒtəm/", meaning_en: "the lowest part", sentence: "Write your name at the bottom of the page.", sentence_cn: "在页面底部写上你的名字。" },
  bowl: { phonetic: "/bəʊl/", meaning_en: "a round deep dish", sentence: "I eat rice from a bowl.", sentence_cn: "我用碗吃饭。" },
  box: { phonetic: "/bɒks/", meaning_en: "a square container", sentence: "Put the books in the box.", sentence_cn: "把书放进盒子里。" },
  boy: { phonetic: "/bɔɪ/", meaning_en: "a male child", sentence: "The boy is playing football.", sentence_cn: "那个男孩在踢足球。" },
  brain: { phonetic: "/breɪn/", meaning_en: "the organ for thinking", sentence: "The brain controls the whole body.", sentence_cn: "大脑控制整个身体。" },
  brave: { phonetic: "/breɪv/", meaning_en: "having no fear", sentence: "The brave firefighter saved the child.", sentence_cn: "勇敢的消防员救了那个孩子。" },
  bread: { phonetic: "/bred/", meaning_en: "a common food made from flour", sentence: "I have bread for breakfast.", sentence_cn: "我早餐吃面包。" },
  break: { phonetic: "/breɪk/", meaning_en: "to damage; to rest", sentence: "Don't break the glass.", sentence_cn: "不要打碎玻璃杯。" },
  breakfast: { phonetic: "/ˈbrekfəst/", meaning_en: "the first meal of the day", sentence: "What did you have for breakfast?", sentence_cn: "你早餐吃了什么？" },
  breath: { phonetic: "/breθ/", meaning_en: "air taken into the body", sentence: "Take a deep breath and relax.", sentence_cn: "深呼吸，放松一下。" },
  bridge: { phonetic: "/brɪdʒ/", meaning_en: "a structure over water or road", sentence: "We walked across the bridge.", sentence_cn: "我们走过桥。" },
  bright: { phonetic: "/braɪt/", meaning_en: "shining; smart", sentence: "The sun is very bright today.", sentence_cn: "今天阳光很明媚。" },
  bring: { phonetic: "/brɪŋ/", meaning_en: "to carry something to a place", sentence: "Please bring your book to class.", sentence_cn: "请把你的书带到课堂上来。" },
  Britain: { phonetic: "/ˈbrɪtn/", meaning_en: "Great Britain", sentence: "Britain is an island country.", sentence_cn: "英国是一个岛国。" },
  British: { phonetic: "/ˈbrɪtɪʃ/", meaning_en: "from Britain", sentence: "The British people love tea.", sentence_cn: "英国人喜欢喝茶。" },
  Briton: { phonetic: "/ˈbrɪtn/", meaning_en: "a person from Britain", sentence: "A Briton won the race.", sentence_cn: "一个英国人赢了比赛。" },
  broadcast: { phonetic: "/ˈbrɔːdkɑːst/", meaning_en: "to send out on radio or TV", sentence: "The news will be broadcast at 7 pm.", sentence_cn: "新闻将在晚上7点播出。" },
  brother: { phonetic: "/ˈbrʌðər/", meaning_en: "a male sibling", sentence: "My brother is two years older than me.", sentence_cn: "我哥哥比我大两岁。" },
  brown: { phonetic: "/braʊn/", meaning_en: "a dark color like earth", sentence: "She has brown hair.", sentence_cn: "她有棕色的头发。" },
  brush: { phonetic: "/brʌʃ/", meaning_en: "to clean with a tool", sentence: "Brush your teeth twice a day.", sentence_cn: "每天刷两次牙。" },
  build: { phonetic: "/bɪld/", meaning_en: "to make something", sentence: "They built a new school last year.", sentence_cn: "他们去年建了一所新学校。" },
  building: { phonetic: "/ˈbɪldɪŋ/", meaning_en: "a structure with walls and a roof", sentence: "That building is 50 stories tall.", sentence_cn: "那座建筑有50层高。" },
  burn: { phonetic: "/bɜːrn/", meaning_en: "to be on fire", sentence: "Don't burn the toast!", sentence_cn: "不要把吐司烤焦了！" },
  bus: { phonetic: "/bʌs/", meaning_en: "a large vehicle for passengers", sentence: "I take the bus to school every day.", sentence_cn: "我每天坐公交车上学。" },
  business: { phonetic: "/ˈbɪznəs/", meaning_en: "work; buying and selling", sentence: "My father is in business.", sentence_cn: "我父亲做生意。" },
  businessman: { phonetic: "/ˈbɪznəsmən/", meaning_en: "a man who works in business", sentence: "My uncle is a successful businessman.", sentence_cn: "我叔叔是一位成功的商人。" },
  busy: { phonetic: "/ˈbɪzi/", meaning_en: "having much to do", sentence: "I'm too busy to go out today.", sentence_cn: "我今天太忙了，不能出去。" },
  but: { phonetic: "/bʌt/", meaning_en: "however; on the contrary", sentence: "I like coffee but not tea.", sentence_cn: "我喜欢咖啡但不喜欢茶。" },
  butter: { phonetic: "/ˈbʌtər/", meaning_en: "a yellow spread made from milk", sentence: "I put butter on my toast.", sentence_cn: "我在吐司上涂了黄油。" },
  butterfly: { phonetic: "/ˈbʌtəflaɪ/", meaning_en: "an insect with colorful wings", sentence: "The butterfly landed on the flower.", sentence_cn: "蝴蝶停在花上。" },
  button: { phonetic: "/ˈbʌtn/", meaning_en: "a small thing to press; a fastener", sentence: "Press the button to start.", sentence_cn: "按按钮启动。" },
  buy: { phonetic: "/baɪ/", meaning_en: "to get something with money", sentence: "I want to buy a new phone.", sentence_cn: "我想买一部新手机。" },
  by: { phonetic: "/baɪ/", meaning_en: "near; through; by means of", sentence: "I go to school by bike.", sentence_cn: "我骑车上学。" },
  bye: { phonetic: "/baɪ/", meaning_en: "goodbye", sentence: "Bye! See you tomorrow.", sentence_cn: "再见！明天见。" },
  cabbage: { phonetic: "/ˈkæbɪdʒ/", meaning_en: "a green leafy vegetable", sentence: "We eat cabbage in soup.", sentence_cn: "我们在汤里放卷心菜。" },
  cafe: { phonetic: "/ˈkæfeɪ/", meaning_en: "a small restaurant for drinks", sentence: "Let's meet at the cafe.", sentence_cn: "我们在咖啡馆见面吧。" },
  cake: { phonetic: "/keɪk/", meaning_en: "a sweet baked food", sentence: "I had chocolate cake for dessert.", sentence_cn: "我吃了巧克力蛋糕作为甜点。" },
  call: { phonetic: "/kɔːl/", meaning_en: "to telephone; to name", sentence: "I will call you tonight.", sentence_cn: "我今晚会给你打电话。" },
  calm: { phonetic: "/kɑːm/", meaning_en: "quiet and not excited", sentence: "Stay calm during the exam.", sentence_cn: "考试时保持冷静。" },
  camp: { phonetic: "/kæmp/", meaning_en: "living outdoors in tents", sentence: "We went to summer camp in July.", sentence_cn: "我们七月去了夏令营。" },
  can: { phonetic: "/kæn/", meaning_en: "be able to; a metal container", sentence: "Can you swim?", sentence_cn: "你会游泳吗？" },
  Canada: { phonetic: "/ˈkænədə/", meaning_en: "a country in North America", sentence: "My cousin studies in Canada.", sentence_cn: "我表姐在加拿大学习。" },
  Canadian: { phonetic: "/kəˈneɪdiən/", meaning_en: "from Canada", sentence: "A Canadian team won the match.", sentence_cn: "一支加拿大队赢了比赛。" },
  cancel: { phonetic: "/ˈkænsl/", meaning_en: "to stop something planned", sentence: "We had to cancel the trip.", sentence_cn: "我们不得不取消旅行。" },
  capital: { phonetic: "/ˈkæpɪtl/", meaning_en: "the main city of a country", sentence: "Beijing is the capital of China.", sentence_cn: "北京是中国的首都。" },
  captain: { phonetic: "/ˈkæptɪn/", meaning_en: "the leader of a team", sentence: "He is the captain of our basketball team.", sentence_cn: "他是我们篮球队的队长。" },
  car: { phonetic: "/kɑːr/", meaning_en: "a vehicle with four wheels", sentence: "My father drives a red car.", sentence_cn: "我爸爸开一辆红色的车。" },
  card: { phonetic: "/kɑːrd/", meaning_en: "a piece of paper for messages", sentence: "I sent a birthday card to my friend.", sentence_cn: "我给朋友寄了一张生日卡。" },
  care: { phonetic: "/keər/", meaning_en: "to be concerned; to look after", sentence: "I care about my family.", sentence_cn: "我关心我的家人。" },
  careful: { phonetic: "/ˈkeəfl/", meaning_en: "paying attention", sentence: "Be careful when crossing the street.", sentence_cn: "过马路时要小心。" },
  carefully: { phonetic: "/ˈkeəfəli/", meaning_en: "in a careful way", sentence: "Please read the text carefully.", sentence_cn: "请仔细阅读课文。" },
  careless: { phonetic: "/ˈkeələs/", meaning_en: "not paying attention", sentence: "A careless mistake cost us the game.", sentence_cn: "粗心的错误让我们输掉了比赛。" },
  carrot: { phonetic: "/ˈkærət/", meaning_en: "an orange vegetable", sentence: "Rabbits like to eat carrots.", sentence_cn: "兔子喜欢吃胡萝卜。" },
  carry: { phonetic: "/ˈkæri/", meaning_en: "to hold and move something", sentence: "Can you carry this bag for me?", sentence_cn: "你能帮我拿这个包吗？" },
  cartoon: { phonetic: "/kɑːrˈtuːn/", meaning_en: "an animated film or show", sentence: "Children love watching cartoons.", sentence_cn: "孩子们喜欢看动画片。" },
  case: { phonetic: "/keɪs/", meaning_en: "a situation; a container", sentence: "In case of fire, call 119.", sentence_cn: "如果发生火灾，拨打119。" },
  cat: { phonetic: "/kæt/", meaning_en: "a small furry pet", sentence: "My cat likes to sleep on the sofa.", sentence_cn: "我的猫喜欢睡在沙发上。" },
  catch: { phonetic: "/kætʃ/", meaning_en: "to stop and hold something", sentence: "Can you catch the ball?", sentence_cn: "你能接住球吗？" },
  cause: { phonetic: "/kɔːz/", meaning_en: "the reason for something", sentence: "What was the cause of the accident?", sentence_cn: "事故的原因是什么？" },
  cave: { phonetic: "/keɪv/", meaning_en: "a large hole in rock", sentence: "Bats live in the cave.", sentence_cn: "蝙蝠住在洞穴里。" },
  cent: { phonetic: "/sent/", meaning_en: "one hundredth of a dollar", sentence: "This pen costs 50 cents.", sentence_cn: "这支钢笔卖50美分。" },
  center: { phonetic: "/ˈsentər/", meaning_en: "the middle part", sentence: "There is a park in the center of the city.", sentence_cn: "市中心有一个公园。" },
  century: { phonetic: "/ˈsentʃəri/", meaning_en: "100 years", sentence: "We are living in the 21st century.", sentence_cn: "我们生活在21世纪。" },
  certainly: { phonetic: "/ˈsɜːtnli/", meaning_en: "surely; of course", sentence: "Certainly, I can help you.", sentence_cn: "当然，我可以帮你。" },
  chain: { phonetic: "/tʃeɪn/", meaning_en: "connected metal links", sentence: "Use a chain to lock your bike.", sentence_cn: "用链条锁住你的自行车。" },
  chair: { phonetic: "/tʃeər/", meaning_en: "a seat for one person", sentence: "Please sit on the chair.", sentence_cn: "请坐在椅子上。" },
  chance: { phonetic: "/tʃɑːns/", meaning_en: "an opportunity", sentence: "This is a good chance to learn.", sentence_cn: "这是一个学习的好机会。" },
  change: { phonetic: "/tʃeɪndʒ/", meaning_en: "to make different", sentence: "I want to change my clothes.", sentence_cn: "我想换衣服。" },
  changeable: { phonetic: "/ˈtʃeɪndʒəbl/", meaning_en: "likely to change", sentence: "The weather is changeable in spring.", sentence_cn: "春天气候多变。" },
  channel: { phonetic: "/ˈtʃænl/", meaning_en: "a TV station", sentence: "I like watching this channel.", sentence_cn: "我喜欢看这个频道。" }
};

const vocabPath = path.join(__dirname, '../data/words-shanghai-zhongkao.json');
const data = JSON.parse(fs.readFileSync(vocabPath, 'utf-8'));

let updatedCount = 0;

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

fs.writeFileSync(vocabPath, JSON.stringify(data, null, 2), 'utf-8');

console.log(`\n✅ Done! Updated ${updatedCount} words.`);
