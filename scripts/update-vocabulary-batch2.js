/**
 * 更新中考词库 - 补全缺失字段
 * 使用方法: node scripts/update-vocabulary-batch2.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 补全数据 - 第2批 (100条: among ~ black)
const supplementData = {
  among: { phonetic: "/əˈmʌŋ/", meaning_en: "in the middle of a group", sentence: "The prize was hidden among the books.", sentence_cn: "奖品藏在书堆中间。" },
  amount: { phonetic: "/əˈmaʊnt/", meaning_en: "a quantity of something", sentence: "A large amount of money was raised.", sentence_cn: "筹集了一大笔钱。" },
  amusement: { phonetic: "/əˈmjuːzmənt/", meaning_en: "enjoyment; entertainment", sentence: "The amusement park is very popular.", sentence_cn: "游乐园非常受欢迎。" },
  amusing: { phonetic: "/əˈmjuːzɪŋ/", meaning_en: "funny; entertaining", sentence: "He told us an amusing story.", sentence_cn: "他给我们讲了一个有趣的故事。" },
  ancient: { phonetic: "/ˈeɪnʃənt/", meaning_en: "very old; from long ago", sentence: "We visited some ancient buildings in Xi'an.", sentence_cn: "我们参观了西安的一些古建筑。" },
  and: { phonetic: "/ænd/", meaning_en: "used to connect words", sentence: "I like apples and oranges.", sentence_cn: "我喜欢苹果和橙子。" },
  angrily: { phonetic: "/ˈæŋɡrɪli/", meaning_en: "in an angry way", sentence: "He shouted angrily at the dog.", sentence_cn: "他生气地对狗大喊。" },
  angry: { phonetic: "/ˈæŋɡri/", meaning_en: "feeling strong displeasure", sentence: "Don't be angry with me.", sentence_cn: "别生我的气。" },
  animal: { phonetic: "/ˈænɪml/", meaning_en: "a living creature", sentence: "The zoo has many different animals.", sentence_cn: "动物园里有很多不同的动物。" },
  another: { phonetic: "/əˈnʌðər/", meaning_en: "one more; a different one", sentence: "Would you like another cup of tea?", sentence_cn: "你要再来一杯茶吗？" },
  any: { phonetic: "/ˈeni/", meaning_en: "some; one of", sentence: "Do you have any questions?", sentence_cn: "你有什么问题吗？" },
  anything: { phonetic: "/ˈeniθɪŋ/", meaning_en: "any thing at all", sentence: "I didn't eat anything for breakfast.", sentence_cn: "我早餐什么都没吃。" },
  anywhere: { phonetic: "/ˈeniweər/", meaning_en: "in any place", sentence: "You can sit anywhere you like.", sentence_cn: "你可以坐任何你喜欢的地方。" },
  apple: { phonetic: "/ˈæpl/", meaning_en: "a round red or green fruit", sentence: "An apple a day keeps the doctor away.", sentence_cn: "一天一个苹果，医生远离我。" },
  apply: { phonetic: "/əˈplaɪ/", meaning_en: "to ask for something officially", sentence: "I want to apply for a scholarship.", sentence_cn: "我想申请奖学金。" },
  April: { phonetic: "/ˈeɪprəl/", meaning_en: "the fourth month of the year", sentence: "My birthday is in April.", sentence_cn: "我的生日在四月。" },
  area: { phonetic: "/ˈeəriə/", meaning_en: "a region; a space", sentence: "This area is famous for its food.", sentence_cn: "这个地区以其美食闻名。" },
  argue: { phonetic: "/ˈɑːrɡjuː/", meaning_en: "to disagree with words", sentence: "Don't argue with your parents.", sentence_cn: "不要和父母争吵。" },
  arm: { phonetic: "/ɑːrm/", meaning_en: "the part of the body from shoulder to hand", sentence: "She carried the baby in her arms.", sentence_cn: "她把婴儿抱在怀里。" },
  army: { phonetic: "/ˈɑːrmi/", meaning_en: "a large group of soldiers", sentence: "My brother joined the army last year.", sentence_cn: "我哥哥去年参军了。" },
  around: { phonetic: "/əˈraʊnd/", meaning_en: "on all sides; about", sentence: "There are trees all around our school.", sentence_cn: "我们学校周围都是树。" },
  arrange: { phonetic: "/əˈreɪndʒ/", meaning_en: "to organize or plan", sentence: "Let's arrange a meeting for tomorrow.", sentence_cn: "让我们安排明天开个会。" },
  arrival: { phonetic: "/əˈraɪvl/", meaning_en: "the act of arriving", sentence: "The arrival of the train was delayed.", sentence_cn: "火车到站延误了。" },
  arrive: { phonetic: "/əˈraɪv/", meaning_en: "to reach a place", sentence: "What time will you arrive?", sentence_cn: "你什么时候到？" },
  art: { phonetic: "/ɑːrt/", meaning_en: "creative expression like painting", sentence: "She studies art at school.", sentence_cn: "她在学校学习美术。" },
  article: { phonetic: "/ˈɑːrtɪkl/", meaning_en: "a piece of writing", sentence: "I read an interesting article today.", sentence_cn: "我今天读了一篇有趣的文章。" },
  artist: { phonetic: "/ˈɑːrtɪst/", meaning_en: "someone who creates art", sentence: "My dream is to be an artist.", sentence_cn: "我的梦想是成为一名艺术家。" },
  as: { phonetic: "/æz/", meaning_en: "like; because; when", sentence: "Do as I say, not as I do.", sentence_cn: "照我说的做，别照我做的做。" },
  Asia: { phonetic: "/ˈeɪʒə/", meaning_en: "the largest continent", sentence: "China is the largest country in Asia.", sentence_cn: "中国是亚洲最大的国家。" },
  ask: { phonetic: "/æsk/", meaning_en: "to request information", sentence: "May I ask you a question?", sentence_cn: "我可以问你一个问题吗？" },
  assistant: { phonetic: "/əˈsɪstənt/", meaning_en: "a helper", sentence: "She works as a shop assistant.", sentence_cn: "她是一名商店售货员。" },
  at: { phonetic: "/æt/", meaning_en: "indicating time or place", sentence: "We have lunch at 12 o'clock.", sentence_cn: "我们在12点吃午饭。" },
  attack: { phonetic: "/əˈtæk/", meaning_en: "to try to hurt someone", sentence: "The player was attacked by fans.", sentence_cn: "那名球员遭到球迷攻击。" },
  attend: { phonetic: "/əˈtend/", meaning_en: "to be present at an event", sentence: "Will you attend the meeting tomorrow?", sentence_cn: "你明天会参加会议吗？" },
  attitude: { phonetic: "/ˈætɪtjuːd/", meaning_en: "a way of thinking or feeling", sentence: "She has a positive attitude toward life.", sentence_cn: "她对生活态度积极。" },
  attractive: { phonetic: "/əˈtræktɪv/", meaning_en: "good-looking; appealing", sentence: "The new store looks very attractive.", sentence_cn: "新商店看起来很吸引人。" },
  August: { phonetic: "/ˈɔːɡəst/", meaning_en: "the eighth month of the year", sentence: "It's very hot in August.", sentence_cn: "八月天气很热。" },
  aunt: { phonetic: "/ænt/", meaning_en: "the sister of your parent", sentence: "My aunt lives in Shanghai.", sentence_cn: "我阿姨住在上海。" },
  Australia: { phonetic: "/ɒˈstreɪliə/", meaning_en: "a country and continent", sentence: "Kangaroos live in Australia.", sentence_cn: "袋鼠生活在澳大利亚。" },
  Australian: { phonetic: "/ɒˈstreɪliən/", meaning_en: "from Australia", sentence: "An Australian friend visited us.", sentence_cn: "一位澳大利亚朋友来看望我们。" },
  automatic: { phonetic: "/ˌɔːtəˈmætɪk/", meaning_en: "working by itself", sentence: "This door is automatic.", sentence_cn: "这扇门是自动的。" },
  autumn: { phonetic: "/ˈɔːtəm/", meaning_en: "the season after summer", sentence: "Leaves fall from trees in autumn.", sentence_cn: "秋天树叶从树上落下。" },
  average: { phonetic: "/ˈævərɪdʒ/", meaning_en: "typical; middle level", sentence: "The average age of the class is 13.", sentence_cn: "全班的平均年龄是13岁。" },
  avoid: { phonetic: "/əˈvɔɪd/", meaning_en: "to stay away from something", sentence: "You should avoid eating too much sugar.", sentence_cn: "你应该避免吃太多糖。" },
  award: { phonetic: "/əˈwɔːrd/", meaning_en: "a prize or honor", sentence: "He won an award for his excellent work.", sentence_cn: "他因出色的工作而获奖。" },
  away: { phonetic: "/əˈweɪ/", meaning_en: "not here; at a distance", sentence: "Please put your phone away.", sentence_cn: "请把手机收起来。" },
  awful: { phonetic: "/ˈɔːfl/", meaning_en: "very bad or unpleasant", sentence: "The weather today is awful.", sentence_cn: "今天天气很糟糕。" },
  baby: { phonetic: "/ˈbeɪbi/", meaning_en: "a very young child", sentence: "The baby is sleeping in the crib.", sentence_cn: "婴儿正在婴儿床里睡觉。" },
  back: { phonetic: "/bæk/", meaning_en: "the rear part; return", sentence: "Please come back soon.", sentence_cn: "请快点回来。" },
  background: { phonetic: "/ˈbækɡraʊnd/", meaning_en: "the part behind the main thing", sentence: "The mountains made a beautiful background.", sentence_cn: "群山构成了美丽的背景。" },
  bad: { phonetic: "/bæd/", meaning_en: "not good; poor quality", sentence: "This is bad weather for a picnic.", sentence_cn: "这种天气不适合野餐。" },
  bag: { phonetic: "/bæɡ/", meaning_en: "a container made of cloth or plastic", sentence: "She carried a red bag on her shoulder.", sentence_cn: "她肩上背着一个红色的包。" },
  bakery: { phonetic: "/ˈbeɪkəri/", meaning_en: "a place where bread is made", sentence: "I bought some bread at the bakery.", sentence_cn: "我在面包店买了一些面包。" },
  balance: { phonetic: "/ˈbæləns/", meaning_en: "a state of being steady", sentence: "You need to keep a balance between work and rest.", sentence_cn: "你需要保持工作和休息的平衡。" },
  ball: { phonetic: "/bɔːl/", meaning_en: "a round object for games", sentence: "Let's play with the ball.", sentence_cn: "让我们玩球吧。" },
  balloon: { phonetic: "/bəˈluːn/", meaning_en: "a light rubber bag filled with air", sentence: "The children played with colorful balloons.", sentence_cn: "孩子们玩着五颜六色的气球。" },
  banana: { phonetic: "/bəˈnænə/", meaning_en: "a long yellow fruit", sentence: "Monkeys love to eat bananas.", sentence_cn: "猴子喜欢吃香蕉。" },
  bank: { phonetic: "/bæŋk/", meaning_en: "a place for money; the side of a river", sentence: "I need to go to the bank to get some money.", sentence_cn: "我需要去银行取点钱。" },
  bar: { phonetic: "/bɑːr/", meaning_en: "a place for drinks; a long piece", sentence: "We met at a small bar near the station.", sentence_cn: "我们在车站附近的一家小酒吧见面。" },
  base: { phonetic: "/beɪs/", meaning_en: "the bottom; a starting point", sentence: "This city is the base for our trip.", sentence_cn: "这座城市是我们旅行的基地。" },
  basic: { phonetic: "/ˈbeɪsɪk/", meaning_en: "simple; most important", sentence: "First, let's learn some basic words.", sentence_cn: "首先，让我们学习一些基本词汇。" },
  basket: { phonetic: "/ˈbɑːskɪt/", meaning_en: "a container made of woven material", sentence: "She put the fruits in a basket.", sentence_cn: "她把水果放进篮子里。" },
  basketball: { phonetic: "/ˈbɑːskɪtbɔːl/", meaning_en: "a sport played with a ball and hoop", sentence: "I play basketball every weekend.", sentence_cn: "我每个周末都打篮球。" },
  bath: { phonetic: "/bɑːθ/", meaning_en: "washing the body", sentence: "I take a bath every evening.", sentence_cn: "我每天晚上洗澡。" },
  bathroom: { phonetic: "/ˈbɑːθruːm/", meaning_en: "a room with a toilet and bath", sentence: "Where is the bathroom?", sentence_cn: "洗手间在哪里？" },
  battle: { phonetic: "/ˈbætl/", meaning_en: "a fight between armies", sentence: "The battle lasted for three days.", sentence_cn: "这场战斗持续了三天。" },
  be: { phonetic: "/biː/", meaning_en: "to exist; to become", sentence: "I want to be a teacher.", sentence_cn: "我想成为一名老师。" },
  beach: { phonetic: "/biːtʃ/", meaning_en: "sandy shore by the sea", sentence: "We spent the day at the beach.", sentence_cn: "我们在海滩度过了一天。" },
  bear: { phonetic: "/beər/", meaning_en: "a large wild animal", sentence: "There are many bears in the forest.", sentence_cn: "森林里有很多熊。" },
  beat: { phonetic: "/biːt/", meaning_en: "to win against; to hit", sentence: "Our team beat them in the match.", sentence_cn: "我们在比赛中击败了他们。" },
  beautiful: { phonetic: "/ˈbjuːtɪfl/", meaning_en: "very good-looking", sentence: "The sunset was beautiful.", sentence_cn: "日落很美。" },
  beautifully: { phonetic: "/ˈbjuːtɪfəli/", meaning_en: "in a beautiful way", sentence: "She sang beautifully at the concert.", sentence_cn: "她在音乐会上唱得很美。" },
  beauty: { phonetic: "/ˈbjuːti/", meaning_en: "the quality of being beautiful", sentence: "Everyone admires the beauty of nature.", sentence_cn: "每个人都欣赏大自然的美。" },
  because: { phonetic: "/bɪˈkɒz/", meaning_en: "for the reason that", sentence: "I was late because the bus broke down.", sentence_cn: "我迟到了，因为公共汽车坏了。" },
  become: { phonetic: "/bɪˈkʌm/", meaning_en: "to change into", sentence: "He became a doctor after many years of study.", sentence_cn: "经过多年的学习，他成为了一名医生。" },
  bed: { phonetic: "/bed/", meaning_en: "a piece of furniture for sleeping", sentence: "I go to bed at 10 o'clock.", sentence_cn: "我十点上床睡觉。" },
  bedroom: { phonetic: "/ˈbedruːm/", meaning_en: "a room for sleeping", sentence: "My bedroom is small but comfortable.", sentence_cn: "我的卧室虽小但很舒适。" },
  beef: { phonetic: "/biːf/", meaning_en: "meat from a cow", sentence: "I like beef noodles very much.", sentence_cn: "我非常喜欢牛肉面。" },
  before: { phonetic: "/bɪˈfɔːr/", meaning_en: "earlier than", sentence: "Please finish your homework before dinner.", sentence_cn: "请在晚饭前完成作业。" },
  beg: { phonetic: "/beɡ/", meaning_en: "to ask for something earnestly", sentence: "The beggar begged for food.", sentence_cn: "乞丐乞讨食物。" },
  begin: { phonetic: "/bɪˈɡɪn/", meaning_en: "to start", sentence: "The movie will begin at 7 pm.", sentence_cn: "电影将在晚上7点开始。" },
  beginning: { phonetic: "/bɪˈɡɪnɪŋ/", meaning_en: "the start", sentence: "This is just the beginning of our journey.", sentence_cn: "这只是我们旅程的开始。" },
  behavior: { phonetic: "/bɪˈheɪvjər/", meaning_en: "the way someone acts", sentence: "His behavior at school has improved.", sentence_cn: "他在学校的表现有所改善。" },
  behind: { phonetic: "/bɪˈhaɪnd/", meaning_en: "at the back of", sentence: "The garden is behind the house.", sentence_cn: "花园在房子后面。" },
  being: { phonetic: "/ˈbiːɪŋ/", meaning_en: "a person or thing that exists", sentence: "Human beings are social animals.", sentence_cn: "人类是群居动物。" },
  believe: { phonetic: "/bɪˈliːv/", meaning_en: "to think something is true", sentence: "I believe you can do it.", sentence_cn: "我相信你能做到。" },
  bell: { phonetic: "/bel/", meaning_en: "a metal object that makes a sound", sentence: "The school bell rang at noon.", sentence_cn: "学校的铃声在中午响了。" },
  belong: { phonetic: "/bɪˈlɒŋ/", meaning_en: "to be owned by", sentence: "This book belongs to me.", sentence_cn: "这本书是我的。" },
  below: { phonetic: "/bɪˈləʊ/", meaning_en: "lower than; under", sentence: "The temperature is below zero.", sentence_cn: "温度在零度以下。" },
  belt: { phonetic: "/belt/", meaning_en: "a band worn around the waist", sentence: "Fasten your seat belt in the car.", sentence_cn: "在车里系好安全带。" },
  beside: { phonetic: "/bɪˈsaɪd/", meaning_en: "next to", sentence: "Come and sit beside me.", sentence_cn: "过来坐在我旁边。" },
  besides: { phonetic: "/bɪˈsaɪdz/", meaning_en: "in addition to", sentence: "Besides English, I also study Chinese.", sentence_cn: "除了英语，我还学中文。" },
  between: { phonetic: "/bɪˈtwiːn/", meaning_en: "in the middle of two things", sentence: "There is a table between the two chairs.", sentence_cn: "两把椅子中间有一张桌子。" },
  big: { phonetic: "/bɪɡ/", meaning_en: "large in size", sentence: "Shanghai is a big city.", sentence_cn: "上海是一个大城市。" },
  bill: { phonetic: "/bɪl/", meaning_en: "a statement of money owed", sentence: "Let me pay the bill.", sentence_cn: "让我来付账。" },
  bin: { phonetic: "/bɪn/", meaning_en: "a container for waste", sentence: "Please throw the trash in the bin.", sentence_cn: "请把垃圾扔进垃圾桶。" },
  bird: { phonetic: "/bɜːrd/", meaning_en: "an animal with wings and feathers", sentence: "The bird is singing in the tree.", sentence_cn: "鸟在树上唱歌。" },
  birthday: { phonetic: "/ˈbɜːrθdeɪ/", meaning_en: "the day you were born", sentence: "Happy birthday to you!", sentence_cn: "祝你生日快乐！" },
  bit: { phonetic: "/bɪt/", meaning_en: "a small piece; a little", sentence: "I'm a bit tired today.", sentence_cn: "我今天有点累。" },
  bite: { phonetic: "/baɪt/", meaning_en: "to cut with teeth", sentence: "Be careful! The dog might bite.", sentence_cn: "小心！狗可能会咬人。" },
  black: { phonetic: "/blæk/", meaning_en: "the darkest color", sentence: "She was wearing a black dress.", sentence_cn: "她穿着一条黑色的裙子。" }
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
