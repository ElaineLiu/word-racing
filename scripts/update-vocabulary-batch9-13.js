/**
 * 更新中考词库 - 补全缺失字段 (第9-13批)
 * 使用方法: node scripts/update-vocabulary-batch9-13.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supplementData = {
  economy: { phonetic: "/ɪˈkɒnəmi/", meaning_en: "the system of money and trade", sentence: "The economy is growing fast.", sentence_cn: "经济增长很快。" },
  educational: { phonetic: "/ˌedʒuˈkeɪʃənl/", meaning_en: "related to teaching and learning", sentence: "This is an educational program.", sentence_cn: "这是一个教育节目。" },
  effect: { phonetic: "/ɪˈfekt/", meaning_en: "a result or change", sentence: "The effect was immediate.", sentence_cn: "效果立竿见影。" },
  effective: { phonetic: "/ɪˈfektɪv/", meaning_en: "working well", sentence: "This method is very effective.", sentence_cn: "这个方法非常有效。" },
  effort: { phonetic: "/ˈefərt/", meaning_en: "hard work", sentence: "Success requires effort.", sentence_cn: "成功需要努力。" },
  egg: { phonetic: "/eɡ/", meaning_en: "a round object from a hen", sentence: "I eat eggs for breakfast.", sentence_cn: "我早餐吃鸡蛋。" },
  either: { phonetic: "/ˈaɪðər/", meaning_en: "one or the other", sentence: "You can have either tea or coffee.", sentence_cn: "你可以喝茶或咖啡。" },
  elder: { phonetic: "/ˈeldər/", meaning_en: "older", sentence: "My elder brother is a doctor.", sentence_cn: "我哥哥是一名医生。" },
  electric: { phonetic: "/ɪˈlektrɪk/", meaning_en: "powered by electricity", sentence: "We bought an electric car.", sentence_cn: "我们买了一辆电动车。" },
  elementary: { phonetic: "/ˌelɪˈmentri/", meaning_en: "basic; for young children", sentence: "He goes to elementary school.", sentence_cn: "他在上小学。" },
  else: { phonetic: "/els/", meaning_en: "other; different", sentence: "What else do you want?", sentence_cn: "你还想要什么？" },
  "E-mail": { phonetic: "/ˈiːmeɪl/", meaning_en: "electronic mail", sentence: "Send me an e-mail when you arrive.", sentence_cn: "到了给我发电子邮件。" },
  embarrassed: { phonetic: "/ɪmˈbærəst/", meaning_en: "feeling shy or ashamed", sentence: "I was embarrassed by my mistake.", sentence_cn: "我的错误让我很尴尬。" },
  emergency: { phonetic: "/ɪˈmɜːrdʒənsi/", meaning_en: "a dangerous situation", sentence: "Call 120 in an emergency.", sentence_cn: "紧急情况拨打120。" },
  empty: { phonetic: "/ˈempti/", meaning_en: "having nothing inside", sentence: "The room is empty.", sentence_cn: "房间是空的。" },
  enable: { phonetic: "/ɪˈneɪbl/", meaning_en: "to make able", sentence: "This tool enables faster work.", sentence_cn: "这个工具可以加快工作速度。" },
  end: { phonetic: "/end/", meaning_en: "the last part; to finish", sentence: "The movie ended at 10 pm.", sentence_cn: "电影在晚上10点结束。" },
  enemy: { phonetic: "/ˈenəmi/", meaning_en: "someone who fights against you", sentence: "They became enemies after the war.", sentence_cn: "战争后他们成了敌人。" },
  England: { phonetic: "/ˈɪŋɡlənd/", meaning_en: "a country in Britain", sentence: "London is in England.", sentence_cn: "伦敦在英格兰。" },
  English: { phonetic: "/ˈɪŋɡlɪʃ/", meaning_en: "the language of England", sentence: "I study English every day.", sentence_cn: "我每天学英语。" },
  enjoy: { phonetic: "/ɪnˈdʒɔɪ/", meaning_en: "to like something", sentence: "I enjoy reading books.", sentence_cn: "我喜欢读书。" },
  enjoyable: { phonetic: "/ɪnˈdʒɔɪəbl/", meaning_en: "giving pleasure", sentence: "The trip was very enjoyable.", sentence_cn: "这次旅行非常愉快。" },
  enough: { phonetic: "/ɪˈnʌf/", meaning_en: "as much as needed", sentence: "Do you have enough money?", sentence_cn: "你有足够的钱吗？" },
  enrich: { phonetic: "/ɪnˈrɪtʃ/", meaning_en: "to make richer", sentence: "Reading enriches our minds.", sentence_cn: "阅读丰富我们的思想。" },
  enter: { phonetic: "/ˈentər/", meaning_en: "to go into", sentence: "Please enter through the front door.", sentence_cn: "请从前门进入。" },
  entertainment: { phonetic: "/ˌentərˈteɪnmənt/", meaning_en: "things that amuse people", sentence: "TV provides entertainment.", sentence_cn: "电视提供娱乐。" },
  entrance: { phonetic: "/ˈentrəns/", meaning_en: "a way in", sentence: "The entrance is on the left.", sentence_cn: "入口在左边。" },
  envelope: { phonetic: "/ˈenvələʊp/", meaning_en: "a paper cover for letters", sentence: "Put the letter in the envelope.", sentence_cn: "把信放进信封里。" },
  equal: { phonetic: "/ˈiːkwəl/", meaning_en: "the same in value", sentence: "All people are equal.", sentence_cn: "人人平等。" },
  escape: { phonetic: "/ɪˈskeɪp/", meaning_en: "to get away", sentence: "The bird escaped from the cage.", sentence_cn: "鸟从笼子里逃走了。" },
  Europe: { phonetic: "/ˈjʊərəp/", meaning_en: "a continent", sentence: "France is in Europe.", sentence_cn: "法国在欧洲。" },
  eve: { phonetic: "/iːv/", meaning_en: "the day before a festival", sentence: "We stay up late on New Year's Eve.", sentence_cn: "除夕夜我们熬夜。" },
  even: { phonetic: "/ˈiːvn/", meaning_en: "used to emphasize", sentence: "Even a child knows that.", sentence_cn: "连孩子都知道。" },
  evening: { phonetic: "/ˈiːvnɪŋ/", meaning_en: "the time after afternoon", sentence: "I watch TV in the evening.", sentence_cn: "我晚上看电视。" },
  event: { phonetic: "/ɪˈvent/", meaning_en: "something that happens", sentence: "The sports event was exciting.", sentence_cn: "体育赛事很精彩。" },
  ever: { phonetic: "/ˈevər/", meaning_en: "at any time", sentence: "Have you ever been to Beijing?", sentence_cn: "你去过北京吗？" },
  every: { phonetic: "/ˈevri/", meaning_en: "each one", sentence: "Every student must attend.", sentence_cn: "每个学生都必须参加。" },
  everyday: { phonetic: "/ˈevrideɪ/", meaning_en: "daily; ordinary", sentence: "This is my everyday routine.", sentence_cn: "这是我的日常惯例。" },
  everything: { phonetic: "/ˈevriθɪŋ/", meaning_en: "all things", sentence: "Everything is ready.", sentence_cn: "一切都准备好了。" },
  everywhere: { phonetic: "/ˈevriweər/", meaning_en: "in all places", sentence: "I looked everywhere for my keys.", sentence_cn: "我到处找钥匙。" },
  exactly: { phonetic: "/ɪɡˈzæktli/", meaning_en: "precisely", sentence: "That's exactly what I meant.", sentence_cn: "那正是我的意思。" },
  example: { phonetic: "/ɪɡˈzɑːmpl/", meaning_en: "something showing what others are like", sentence: "Give me an example.", sentence_cn: "给我一个例子。" },
  except: { phonetic: "/ɪkˈsept/", meaning_en: "not including", sentence: "Everyone came except Tom.", sentence_cn: "除了汤姆大家都来了。" },
  exchange: { phonetic: "/ɪksˈtʃeɪndʒ/", meaning_en: "to give and receive", sentence: "Let's exchange phone numbers.", sentence_cn: "让我们交换电话号码。" },
  exciting: { phonetic: "/ɪkˈsaɪtɪŋ/", meaning_en: "making you feel happy", sentence: "It was an exciting game.", sentence_cn: "这是一场激动人心的比赛。" },
  excuse: { phonetic: "/ɪkˈskjuːz/", meaning_en: "to forgive; a reason", sentence: "Please excuse my mistake.", sentence_cn: "请原谅我的错误。" },
  exist: { phonetic: "/ɪɡˈzɪst/", meaning_en: "to be real", sentence: "Do aliens exist?", sentence_cn: "外星人存在吗？" },
  exit: { phonetic: "/ˈeksɪt/", meaning_en: "a way out", sentence: "The exit is at the back.", sentence_cn: "出口在后面。" },
  expect: { phonetic: "/ɪkˈspekt/", meaning_en: "to think something will happen", sentence: "I expect to finish by Friday.", sentence_cn: "我预计周五完成。" },
  expensive: { phonetic: "/ɪkˈspensɪv/", meaning_en: "costing a lot of money", sentence: "This bag is too expensive.", sentence_cn: "这个包太贵了。" },
  explore: { phonetic: "/ɪkˈsplɔːr/", meaning_en: "to search and discover", sentence: "We will explore the forest.", sentence_cn: "我们将探索森林。" },
  express: { phonetic: "/ɪkˈspres/", meaning_en: "to show feelings", sentence: "She expressed her thanks.", sentence_cn: "她表达了感谢。" },
  extra: { phonetic: "/ˈekstrə/", meaning_en: "more than usual", sentence: "I need extra time.", sentence_cn: "我需要额外的时间。" },
  eye: { phonetic: "/aɪ/", meaning_en: "the part you see with", sentence: "Close your eyes.", sentence_cn: "闭上眼睛。" },
  fable: { phonetic: "/ˈfeɪbl/", meaning_en: "a story with a moral", sentence: "Aesop's fables are famous.", sentence_cn: "伊索寓言很有名。" },
  face: { phonetic: "/feɪs/", meaning_en: "the front of the head; to meet", sentence: "She has a beautiful face.", sentence_cn: "她有一张漂亮的脸。" },
  fact: { phonetic: "/fækt/", meaning_en: "something that is true", sentence: "It is a fact that the earth is round.", sentence_cn: "地球是圆的是事实。" },
  fair: { phonetic: "/feər/", meaning_en: "just; right", sentence: "That's not fair!", sentence_cn: "那不公平！" },
  fall: { phonetic: "/fɔːl/", meaning_en: "to drop down; autumn", sentence: "Leaves fall in autumn.", sentence_cn: "秋天树叶落下。" },
  familiar: { phonetic: "/fəˈmɪliər/", meaning_en: "well known", sentence: "This place looks familiar.", sentence_cn: "这个地方看起来很熟悉。" },
  family: { phonetic: "/ˈfæməli/", meaning_en: "parents and children", sentence: "I love my family.", sentence_cn: "我爱我的家人。" },
  fan: { phonetic: "/fæn/", meaning_en: "someone who likes something; a cooling device", sentence: "I'm a big football fan.", sentence_cn: "我是一个超级足球迷。" },
  far: { phonetic: "/fɑːr/", meaning_en: "a long distance", sentence: "The school is far from my home.", sentence_cn: "学校离我家很远。" },
  fare: { phonetic: "/feər/", meaning_en: "the price of a trip", sentence: "The bus fare is 2 yuan.", sentence_cn: "公交车费是2元。" },
  farm: { phonetic: "/fɑːrm/", meaning_en: "land for growing crops", sentence: "We visited a farm last weekend.", sentence_cn: "上周末我们参观了一个农场。" },
  farmer: { phonetic: "/ˈfɑːrmər/", meaning_en: "a person who works on a farm", sentence: "The farmer grows vegetables.", sentence_cn: "农民种蔬菜。" },
  fashion: { phonetic: "/ˈfæʃn/", meaning_en: "popular style", sentence: "She loves fashion.", sentence_cn: "她喜欢时尚。" },
  fast: { phonetic: "/fɑːst/", meaning_en: "quick", sentence: "He runs very fast.", sentence_cn: "他跑得很快。" },
  fasten: { phonetic: "/ˈfɑːsn/", meaning_en: "to tie securely", sentence: "Fasten your seat belt.", sentence_cn: "系好安全带。" },
  fat: { phonetic: "/fæt/", meaning_en: "having too much weight", sentence: "Don't eat too much fat.", sentence_cn: "不要吃太多脂肪。" },
  father: { phonetic: "/ˈfɑːðər/", meaning_en: "a male parent", sentence: "My father is a teacher.", sentence_cn: "我爸爸是一名老师。" },
  favour: { phonetic: "/ˈfeɪvər/", meaning_en: "a kind act", sentence: "Can you do me a favour?", sentence_cn: "你能帮我一个忙吗？" },
  favourite: { phonetic: "/ˈfeɪvərɪt/", meaning_en: "liked the most", sentence: "Blue is my favourite colour.", sentence_cn: "蓝色是我最喜欢的颜色。" },
  fear: { phonetic: "/fɪər/", meaning_en: "the feeling of being afraid", sentence: "He has no fear.", sentence_cn: "他没有恐惧。" },
  February: { phonetic: "/ˈfebruəri/", meaning_en: "the second month", sentence: "My birthday is in February.", sentence_cn: "我的生日在二月。" },
  feed: { phonetic: "/fiːd/", meaning_en: "to give food", sentence: "We feed the dog twice a day.", sentence_cn: "我们每天喂狗两次。" },
  feel: { phonetic: "/fiːl/", meaning_en: "to experience a sensation", sentence: "I feel happy today.", sentence_cn: "我今天感觉很开心。" },
  female: { phonetic: "/ˈfiːmeɪl/", meaning_en: "of the sex that can have babies", sentence: "My female cat had kittens.", sentence_cn: "我的母猫生了小猫。" },
  fence: { phonetic: "/fens/", meaning_en: "a barrier around an area", sentence: "They built a fence around the garden.", sentence_cn: "他们在花园周围建了围栏。" },
  ferry: { phonetic: "/ˈferi/", meaning_en: "a boat that carries people", sentence: "We took a ferry to the island.", sentence_cn: "我们乘渡轮去了岛上。" },
  festival: { phonetic: "/ˈfestɪvl/", meaning_en: "a celebration", sentence: "The Spring Festival is important in China.", sentence_cn: "春节在中国很重要。" },
  fever: { phonetic: "/ˈfiːvər/", meaning_en: "high body temperature", sentence: "She has a high fever.", sentence_cn: "她发高烧了。" },
  few: { phonetic: "/fjuː/", meaning_en: "not many", sentence: "Few people came to the meeting.", sentence_cn: "很少人来开会。" },
  field: { phonetic: "/fiːld/", meaning_en: "an area of land; a subject", sentence: "They play football in the field.", sentence_cn: "他们在田野里踢足球。" },
  fight: { phonetic: "/faɪt/", meaning_en: "to use force against someone", sentence: "Don't fight with your brother.", sentence_cn: "不要和你哥哥打架。" },
  figure: { phonetic: "/ˈfɪɡjər/", meaning_en: "a number; a shape", sentence: "Write the correct figure.", sentence_cn: "写出正确的数字。" },
  fill: { phonetic: "/fɪl/", meaning_en: "to make full", sentence: "Please fill in the form.", sentence_cn: "请填写表格。" },
  film: { phonetic: "/fɪlm/", meaning_en: "a movie", sentence: "Let's watch a film tonight.", sentence_cn: "我们今晚看电影吧。" },
  final: { phonetic: "/ˈfaɪnl/", meaning_en: "last", sentence: "This is the final exam.", sentence_cn: "这是期末考试。" },
  finally: { phonetic: "/ˈfaɪnəli/", meaning_en: "at last", sentence: "We finally arrived at the hotel.", sentence_cn: "我们终于到了酒店。" },
  find: { phonetic: "/faɪnd/", meaning_en: "to discover", sentence: "I can't find my keys.", sentence_cn: "我找不到钥匙。" },
  fine: { phonetic: "/faɪn/", meaning_en: "good; okay", sentence: "I'm fine, thank you.", sentence_cn: "我很好，谢谢。" },
  finger: { phonetic: "/ˈfɪŋɡər/", meaning_en: "one of the five parts of the hand", sentence: "Point with your finger.", sentence_cn: "用手指指。" },
  fire: { phonetic: "/faɪər/", meaning_en: "burning flames", sentence: "Fire is dangerous.", sentence_cn: "火很危险。" },
  fireman: { phonetic: "/ˈfaɪərmən/", meaning_en: "a person who puts out fires", sentence: "The fireman saved the child.", sentence_cn: "消防员救了那个孩子。" },
  firework: { phonetic: "/ˈfaɪərwɜːrk/", meaning_en: "a device that explodes with lights", sentence: "We watch fireworks on New Year's Eve.", sentence_cn: "我们在除夕夜看烟花。" },
  first: { phonetic: "/fɜːrst/", meaning_en: "coming before all others", sentence: "Who came first in the race?", sentence_cn: "谁在比赛中得了第一？" },
  fish: { phonetic: "/fɪʃ/", meaning_en: "an animal that lives in water", sentence: "I caught a big fish.", sentence_cn: "我抓到了一条大鱼。" },
  fisherman: { phonetic: "/ˈfɪʃərmən/", meaning_en: "a person who catches fish", sentence: "The fisherman sells his fish at the market.", sentence_cn: "渔夫在市场上卖鱼。" },
  fit: { phonetic: "/fɪt/", meaning_en: "to be the right size; healthy", sentence: "These shoes fit me well.", sentence_cn: "这双鞋很适合我。" },
  fix: { phonetic: "/fɪks/", meaning_en: "to repair", sentence: "Can you fix my bike?", sentence_cn: "你能修我的自行车吗？" },
  flash: { phonetic: "/flæʃ/", meaning_en: "a sudden bright light", sentence: "There was a flash of lightning.", sentence_cn: "闪过一道闪电。" },
  flexible: { phonetic: "/ˈfleksəbl/", meaning_en: "able to bend easily", sentence: "My schedule is flexible.", sentence_cn: "我的时间表很灵活。" },
  flight: { phonetic: "/flaɪt/", meaning_en: "a trip in an airplane", sentence: "The flight takes three hours.", sentence_cn: "航班需要三个小时。" },
  floor: { phonetic: "/flɔːr/", meaning_en: "the surface you walk on", sentence: "The floor is clean.", sentence_cn: "地板很干净。" },
  flower: { phonetic: "/ˈflaʊər/", meaning_en: "the colorful part of a plant", sentence: "The flowers are beautiful.", sentence_cn: "花很美。" },
  flu: { phonetic: "/fluː/", meaning_en: "a common illness", sentence: "I have the flu.", sentence_cn: "我得了流感。" },
  fly: { phonetic: "/flaɪ/", meaning_en: "to move through the air", sentence: "Birds can fly.", sentence_cn: "鸟会飞。" },
  focus: { phonetic: "/ˈfəʊkəs/", meaning_en: "to pay attention", sentence: "Focus on your work.", sentence_cn: "专注于你的工作。" },
  follow: { phonetic: "/ˈfɒləʊ/", meaning_en: "to go after", sentence: "Follow me, please.", sentence_cn: "请跟我来。" },
  following: { phonetic: "/ˈfɒləʊɪŋ/", meaning_en: "coming after", sentence: "Read the following text.", sentence_cn: "阅读下面的课文。" },
  fond: { phonetic: "/fɒnd/", meaning_en: "liking someone or something", sentence: "I'm fond of music.", sentence_cn: "我喜欢音乐。" },
  food: { phonetic: "/fuːd/", meaning_en: "things we eat", sentence: "What food do you like?", sentence_cn: "你喜欢什么食物？" },
  fool: { phonetic: "/fuːl/", meaning_en: "a silly person", sentence: "Don't be a fool.", sentence_cn: "别做傻瓜。" },
  foolish: { phonetic: "/ˈfuːlɪʃ/", meaning_en: "not wise", sentence: "It was a foolish decision.", sentence_cn: "那是一个愚蠢的决定。" },
  foot: { phonetic: "/fʊt/", meaning_en: "the part of the leg you stand on", sentence: "My feet are tired.", sentence_cn: "我的脚很累。" },
  football: { phonetic: "/ˈfʊtbɔːl/", meaning_en: "a ball game", sentence: "I play football with my friends.", sentence_cn: "我和朋友踢足球。" },
  for: { phonetic: "/fɔːr/", meaning_en: "used to show purpose", sentence: "This gift is for you.", sentence_cn: "这个礼物是给你的。" },
  forecast: { phonetic: "/ˈfɔːrkɑːst/", meaning_en: "a prediction", sentence: "The weather forecast says it will rain.", sentence_cn: "天气预报说会下雨。" },
  foreign: { phonetic: "/ˈfɒrən/", meaning_en: "from another country", sentence: "I like foreign food.", sentence_cn: "我喜欢外国食物。" },
  forest: { phonetic: "/ˈfɒrɪst/", meaning_en: "a large area with trees", sentence: "The forest is full of trees.", sentence_cn: "森林里到处都是树。" },
  forever: { phonetic: "/fərˈrevər/", meaning_en: "for all time", sentence: "I will love you forever.", sentence_cn: "我会永远爱你。" },
  forgetful: { phonetic: "/fərˈɡetfl/", meaning_en: "often forgetting things", sentence: "My grandmother is getting forgetful.", sentence_cn: "我奶奶变得健忘了。" },
  forgive: { phonetic: "/fərˈɡɪv/", meaning_en: "to stop being angry", sentence: "Please forgive me.", sentence_cn: "请原谅我。" },
  fork: { phonetic: "/fɔːrk/", meaning_en: "a tool for eating", sentence: "Use a fork to eat the noodles.", sentence_cn: "用叉子吃面条。" },
  form: { phonetic: "/fɔːrm/", meaning_en: "a shape; a document", sentence: "Fill out this form.", sentence_cn: "填写这张表格。" },
  forward: { phonetic: "/ˈfɔːrwərd/", meaning_en: "toward the front", sentence: "Move forward, please.", sentence_cn: "请向前移动。" },
  fountain: { phonetic: "/ˈfaʊntən/", meaning_en: "a structure that sends water into the air", sentence: "There is a fountain in the park.", sentence_cn: "公园里有一个喷泉。" },
  France: { phonetic: "/frɑːns/", meaning_en: "a country in Europe", sentence: "Paris is in France.", sentence_cn: "巴黎在法国。" },
  free: { phonetic: "/friː/", meaning_en: "not busy; costing no money", sentence: "Are you free tonight?", sentence_cn: "你今晚有空吗？" },
  freedom: { phonetic: "/ˈfriːdəm/", meaning_en: "the state of being free", sentence: "We all want freedom.", sentence_cn: "我们都想要自由。" },
  freeze: { phonetic: "/friːz/", meaning_en: "to become very cold and hard", sentence: "Water freezes in winter.", sentence_cn: "冬天水会结冰。" },
  freezing: { phonetic: "/ˈfriːzɪŋ/", meaning_en: "very cold", sentence: "It's freezing outside.", sentence_cn: "外面冷极了。" },
  French: { phonetic: "/frentʃ/", meaning_en: "of France; the language", sentence: "I'm learning French.", sentence_cn: "我在学法语。" },
  fresh: { phonetic: "/freʃ/", meaning_en: "new; not old", sentence: "Fresh vegetables are healthy.", sentence_cn: "新鲜蔬菜很健康。" },
  Friday: { phonetic: "/ˈfraɪdeɪ/", meaning_en: "the sixth day of the week", sentence: "We have no class on Friday.", sentence_cn: "我们周五没有课。" },
  fridge: { phonetic: "/frɪdʒ/", meaning_en: "a machine that keeps food cold", sentence: "Put the milk in the fridge.", sentence_cn: "把牛奶放进冰箱。" },
  fried: { phonetic: "/fraɪd/", meaning_en: "cooked in hot oil", sentence: "I like fried chicken.", sentence_cn: "我喜欢炸鸡。" },
  friend: { phonetic: "/frend/", meaning_en: "a person you like", sentence: "She is my best friend.", sentence_cn: "她是我最好的朋友。" },
  friendly: { phonetic: "/ˈfrendli/", meaning_en: "acting like a friend", sentence: "He is very friendly.", sentence_cn: "他很友善。" },
  friendship: { phonetic: "/ˈfrendʃɪp/", meaning_en: "the relationship between friends", sentence: "Our friendship is important to me.", sentence_cn: "我们的友谊对我很重要。" },
  frighten: { phonetic: "/ˈfraɪtn/", meaning_en: "to make afraid", sentence: "Don't frighten the children.", sentence_cn: "不要吓唬孩子。" },
  frightened: { phonetic: "/ˈfraɪtnd/", meaning_en: "afraid", sentence: "The child was frightened by the noise.", sentence_cn: "孩子被噪音吓到了。" },
  frightening: { phonetic: "/ˈfraɪtnɪŋ/", meaning_en: "making you afraid", sentence: "That was a frightening experience.", sentence_cn: "那是一次可怕的经历。" }
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
