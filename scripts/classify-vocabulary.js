/**
 * 词库难度分类脚本
 *
 * 分类规则：
 * - 词长：≤4字母=0, 5-6=1, 7-8=2, ≥9=3
 * - 音节：1=0, 2=1, 3=2, ≥4=3
 * - 常见度：基于词频和词性
 * - 多义：单义=0, 多义/语法词=1
 *
 * Level: 0-1分=L1, 2-3分=L2, 4-5分=L3, 6-7分=L4, ≥8分=L5
 */

import fs from 'fs';

// 基础词汇表（小学阶段已学，Level 1 候选）
const BASIC_WORDS = new Set([
  // 常见小学词汇
  'air', 'ice', 'key', 'out', 'pair', 'term', 'dear', 'dog', 'cat', 'book',
  'pen', 'bag', 'red', 'blue', 'big', 'small', 'new', 'old', 'good', 'bad',
  'happy', 'sad', 'hot', 'cold', 'fast', 'slow', 'one', 'two', 'three', 'four',
  'five', 'six', 'seven', 'eight', 'nine', 'ten', 'day', 'week', 'month', 'year',
  'morning', 'afternoon', 'evening', 'night', 'today', 'tomorrow', 'yesterday',
  'father', 'mother', 'brother', 'sister', 'son', 'daughter', 'man', 'woman',
  'boy', 'girl', 'child', 'baby', 'friend', 'teacher', 'student', 'school',
  'home', 'room', 'door', 'window', 'table', 'chair', 'bed', 'food', 'water',
  'milk', 'bread', 'apple', 'orange', 'banana', 'cake', 'meat', 'rice',
  'head', 'hand', 'foot', 'eye', 'ear', 'nose', 'mouth', 'face', 'arm', 'leg',
  'finger', 'toe', 'hair', 'body', 'heart', 'name', 'age', 'time', 'number',
  'color', 'picture', 'music', 'song', 'game', 'sport', 'ball', 'play', 'run',
  'walk', 'jump', 'swim', 'fly', 'eat', 'drink', 'sleep', 'wake', 'read', 'write',
  'speak', 'listen', 'look', 'see', 'watch', 'feel', 'think', 'know', 'want', 'need',
  'like', 'love', 'hate', 'have', 'has', 'do', 'does', 'did', 'will', 'would',
  'can', 'could', 'may', 'might', 'must', 'should', 'is', 'am', 'are', 'was', 'were',
  'be', 'been', 'being', 'go', 'goes', 'went', 'gone', 'come', 'comes', 'came',
  'get', 'got', 'give', 'gave', 'take', 'took', 'make', 'made', 'let', 'put',
  'sit', 'sat', 'stand', 'stood', 'lie', 'lay', 'say', 'said', 'tell', 'told',
  'ask', 'answer', 'call', 'cry', 'laugh', 'smile', 'open', 'close', 'start', 'stop',
  'begin', 'end', 'finish', 'help', 'show', 'find', 'found', 'bring', 'brought',
  'send', 'sent', 'use', 'try', 'work', 'study', 'learn', 'teach', 'taught',
  'live', 'die', 'grow', 'grew', 'keep', 'kept', 'let', 'meet', 'met', 'miss',
  'move', 'pass', 'pay', 'paid', 'pick', 'pull', 'push', 'reach', 'remember', 'forget',
  'ride', 'rode', 'rise', 'rose', 'save', 'sell', 'sold', 'serve', 'set', 'shake',
  'share', 'shine', 'shout', 'show', 'showed', 'shut', 'sing', 'sang', 'sink', 'sit',
  'sleep', 'slept', 'smell', 'smile', 'speak', 'spoke', 'spend', 'spent', 'stand',
  'stole', 'stick', 'stuck', 'sweep', 'swim', 'swam', 'swing', 'take', 'took',
  'teach', 'taught', 'tear', 'tell', 'told', 'think', 'thought', 'throw', 'threw',
  'touch', 'turn', 'understand', 'understood', 'wait', 'wake', 'woke', 'walk',
  'want', 'wash', 'watch', 'wear', 'wore', 'win', 'won', 'wish', 'work', 'worry',
  'write', 'wrote', 'yes', 'no', 'not', 'and', 'or', 'but', 'so', 'because',
  'if', 'then', 'else', 'when', 'where', 'what', 'who', 'whose', 'which', 'why',
  'how', 'here', 'there', 'now', 'never', 'always', 'often', 'sometimes', 'usually',
  'very', 'too', 'also', 'only', 'just', 'still', 'already', 'again', 'ever',
  'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'mine', 'yours', 'hers', 'ours', 'theirs', 'me', 'you', 'him', 'her', 'it', 'us', 'them',
  'I', 'you', 'he', 'she', 'it', 'we', 'they', 'a', 'an', 'the', 'some', 'any',
  'many', 'much', 'few', 'little', 'lot', 'all', 'each', 'every', 'both', 'other',
  'another', 'such', 'same', 'different', 'first', 'second', 'third', 'last', 'next',
  'high', 'low', 'long', 'short', 'tall', 'wide', 'narrow', 'thick', 'thin',
  'heavy', 'light', 'hard', 'soft', 'easy', 'difficult', 'right', 'wrong', 'true', 'false',
  'clean', 'dirty', 'dry', 'wet', 'full', 'empty', 'rich', 'poor', 'young',
  'nice', 'fine', 'great', 'beautiful', 'pretty', 'ugly', 'kind', 'angry', 'afraid',
  'tired', 'hungry', 'thirsty', 'ill', 'sick', 'well', 'better', 'best', 'worse', 'worst',
  'more', 'most', 'less', 'least', 'near', 'far', 'inside', 'outside', 'up', 'down',
  'on', 'off', 'in', 'into', 'out', 'of', 'to', 'from', 'with', 'without',
  'by', 'for', 'at', 'about', 'after', 'before', 'between', 'under', 'over', 'above',
  'across', 'through', 'around', 'behind', 'beside', 'along', 'during', 'until', 'since',
  'space', 'sun', 'moon', 'star', 'sky', 'cloud', 'rain', 'snow', 'wind', 'fire',
  'tree', 'flower', 'grass', 'plant', 'animal', 'bird', 'fish', 'horse', 'cow', 'pig',
  'sheep', 'chicken', 'duck', 'rabbit', 'mouse', 'elephant', 'lion', 'tiger', 'monkey',
  'park', 'zoo', 'hospital', 'shop', 'store', 'market', 'office', 'station', 'airport',
  'road', 'street', 'way', 'city', 'town', 'village', 'country', 'world', 'earth',
  'car', 'bus', 'train', 'plane', 'ship', 'boat', 'bike', 'bicycle',
  'thing', 'people', 'family', 'group', 'team', 'class', 'grade', 'lesson', 'word',
  'letter', 'story', 'news', 'paper', 'book', 'page', 'text', 'test', 'exam',
  'job', 'work', 'money', 'price', 'cost', 'pay', 'buy', 'bought', 'sell', 'sold',
  'shop', 'store', 'market', 'gift', 'present', 'card', 'phone', 'computer', 'TV',
  'radio', 'camera', 'clock', 'watch', 'map', 'ticket', 'letter', 'email', 'message',
  'please', 'thanks', 'sorry', 'excuse', 'welcome', 'hello', 'hi', 'bye', 'goodbye',
  'morning', 'afternoon', 'evening', 'night', 'dear', 'love', 'friend', 'yours',
]);

// 常见后缀（用于识别派生词）
const COMMON_SUFFIXES = [
  'er', 'or', 'ist',           // 人
  'tion', 'sion', 'ment', 'ness',  // 名词后缀
  'ly',                        // 副词后缀
  'ful', 'less', 'ous', 'ive', 'able', 'ible',  // 形容词后缀
  'un', 'dis', 'im', 'in', 'ir',  // 否定前缀
  're', 'pre', 'mis',          // 其他前缀
];

// 语法功能词
const GRAMMAR_WORDS = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'done',
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
  'and', 'or', 'but', 'so', 'yet', 'for', 'nor',
  'if', 'when', 'where', 'while', 'because', 'although', 'though',
  'who', 'whom', 'whose', 'which', 'what', 'that', 'whether',
  'about', 'above', 'across', 'after', 'against', 'along', 'among',
  'around', 'at', 'before', 'behind', 'below', 'beneath', 'beside',
  'between', 'beyond', 'by', 'down', 'during', 'except', 'for',
  'from', 'in', 'inside', 'into', 'like', 'near', 'of', 'off',
  'on', 'out', 'outside', 'over', 'past', 'since', 'through',
  'throughout', 'to', 'toward', 'under', 'until', 'up', 'upon',
  'with', 'within', 'without',
  'each', 'every', 'all', 'both', 'some', 'any', 'no', 'none',
  'many', 'much', 'few', 'little', 'several', 'enough',
  'other', 'another', 'such', 'same', 'different',
  'here', 'there', 'now', 'then', 'soon', 'still', 'already', 'yet',
  'always', 'often', 'usually', 'sometimes', 'never', 'ever',
  'very', 'too', 'quite', 'rather', 'so', 'just', 'only', 'even',
  'not', 'never', 'hardly', 'seldom', 'rarely',
]);

/**
 * 估算音节数
 */
function countSyllables(word) {
  word = word.toLowerCase().trim();
  if (word.length <= 2) return 1;

  // 特殊处理常见词
  const exceptions = {
    'the': 1, 'a': 1, 'an': 1, 'is': 1, 'are': 1, 'was': 1, 'were': 1,
    'have': 1, 'has': 1, 'had': 1, 'do': 1, 'does': 1, 'did': 1,
    'make': 1, 'made': 1, 'take': 1, 'took': 1, 'come': 1, 'came': 1,
    'some': 1, 'come': 1, 'love': 1, 'move': 1, 'give': 1, 'live': 1,
    'eye': 1, 'ear': 1, 'our': 1, 'hour': 1, 'fire': 2,
  };
  if (exceptions[word] !== undefined) return exceptions[word];

  // 移除不发音的e结尾
  let w = word;
  if (w.endsWith('e')) {
    w = w.slice(0, -1);
  }

  // 计算元音组
  const vowels = 'aeiouy';
  let count = 0;
  let prevIsVowel = false;

  for (const char of w) {
    const isVowel = vowels.includes(char);
    if (isVowel && !prevIsVowel) {
      count++;
    }
    prevIsVowel = isVowel;
  }

  // 处理特殊情况
  if (word.endsWith('le') && word.length > 2 && !vowels.includes(word[word.length - 3])) {
    count++;
  }
  if (word.endsWith('es') || word.endsWith('ed')) {
    // 简单处理，可能不准确
    if (count > 1) count--;
  }

  return Math.max(1, count);
}

/**
 * 判断是否为派生词（有常见词缀）
 */
function isDerivative(word, basicWords) {
  const w = word.toLowerCase();

  for (const suffix of COMMON_SUFFIXES) {
    if (w.endsWith(suffix) && w.length > suffix.length + 2) {
      const root = w.slice(0, -suffix.length);
      if (basicWords.has(root) || root.length >= 3) {
        return true;
      }
    }
    // 前缀
    if (w.startsWith(suffix) && w.length > suffix.length + 2) {
      const root = w.slice(suffix.length);
      if (basicWords.has(root)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 判断是否为多义词
 */
function hasMultipleMeanings(meaningCn) {
  if (!meaningCn) return false;
  // 检查中文分号、顿号、逗号分隔
  const separators = ['；', '、', '，', ',', ';'];
  let count = 1;
  for (const sep of separators) {
    if (meaningCn.includes(sep)) {
      count += meaningCn.split(sep).length - 1;
    }
  }
  // 检查"近义"、"反义"等标注
  if (meaningCn.includes('近义') || meaningCn.includes('反义')) {
    return true;
  }
  return count >= 2;
}

/**
 * 计算常见度分数
 * 0 = 小学词汇, 1 = 初中常见, 2 = 初中进阶, 3 = 高中词汇
 */
function getFrequencyScore(word, meaningCn, category, pos, basicWords) {
  const w = word.toLowerCase();

  // 1. 在基础词汇表中
  if (basicWords.has(w)) {
    return 0;
  }

  // 2. 语法功能词
  if (GRAMMAR_WORDS.has(w)) {
    return 0;
  }

  // 3. 派生词（如果词根是基础词）
  if (isDerivative(w, basicWords)) {
    return 1;  // 派生词通常在初中阶段学习
  }

  // 4. 根据词性和类别判断
  // 代词、冠词、介词等通常是基础词
  if (['pron.', 'art.', 'prep.', 'conj.', 'int.'].includes(pos)) {
    return 0;
  }

  // 5. 根据词长和音节综合判断
  const syllables = countSyllables(w);
  const len = w.length;

  if (len <= 4 && syllables <= 2) {
    return 1;  // 短词通常是初中常见词
  } else if (len <= 6 && syllables <= 3) {
    return 1;  // 中等长度
  } else if (len <= 8 && syllables <= 3) {
    return 2;  // 稍长，可能是进阶词
  } else {
    return 2;  // 长词
  }
}

/**
 * 计算单词难度等级
 */
function calculateLevel(wordData, basicWords) {
  const { word, meaning_cn, category, pos } = wordData;
  const w = word.toLowerCase();

  // 1. 词长分数
  let lengthScore = 0;
  if (w.length <= 4) lengthScore = 0;
  else if (w.length <= 6) lengthScore = 1;
  else if (w.length <= 8) lengthScore = 2;
  else lengthScore = 3;

  // 2. 音节分数
  const syllables = countSyllables(w);
  let syllableScore = 0;
  if (syllables === 1) syllableScore = 0;
  else if (syllables === 2) syllableScore = 1;
  else if (syllables === 3) syllableScore = 2;
  else syllableScore = 3;

  // 3. 常见度分数
  const freqScore = getFrequencyScore(word, meaning_cn, category, pos, basicWords);

  // 4. 多义性分数
  const polysemyScore = hasMultipleMeanings(meaning_cn) || GRAMMAR_WORDS.has(w) ? 1 : 0;

  // 5. 总分
  const totalScore = lengthScore + syllableScore + freqScore + polysemyScore;

  // 6. 映射到Level
  let level;
  if (totalScore <= 1) level = 1;
  else if (totalScore <= 3) level = 2;
  else if (totalScore <= 5) level = 3;
  else if (totalScore <= 7) level = 4;
  else level = 5;

  // 7. 特殊调整
  // 语法功能词不超过Level 2
  if (GRAMMAR_WORDS.has(w) && level > 2) {
    level = 2;
  }

  // 基础词汇表中的词不超过Level 2
  if (BASIC_WORDS.has(w) && level > 2) {
    level = 1;
  }

  return {
    level,
    scores: {
      length: lengthScore,
      syllable: syllableScore,
      frequency: freqScore,
      polysemy: polysemyScore,
      total: totalScore,
    }
  };
}

/**
 * 主处理函数
 */
function processVocabulary(inputPath, outputPath) {
  console.log(`读取词库: ${inputPath}`);
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  console.log(`总词数: ${data.words.length}`);

  // 统计
  const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const samples = { 1: [], 2: [], 3: [], 4: [], 5: [] };

  // 处理每个词
  data.words.forEach((wordData, index) => {
    const result = calculateLevel(wordData, BASIC_WORDS);
    wordData.level = result.level;

    stats[result.level]++;

    // 收集样本
    if (samples[result.level].length < 10) {
      samples[result.level].push({
        word: wordData.word,
        meaning: wordData.meaning_cn,
        scores: result.scores
      });
    }

    if ((index + 1) % 500 === 0) {
      console.log(`已处理: ${index + 1}/${data.words.length}`);
    }
  });

  // 更新元数据
  data.meta.difficulty_note = "Level 1: 基础入门 | Level 2: 核心词汇 | Level 3: 进阶词汇 | Level 4: 挑战词汇 | Level 5: 拓展词汇";
  data.meta.level_distribution = stats;
  data.meta.classification_date = new Date().toISOString().split('T')[0];

  // 保存
  console.log(`\n保存到: ${outputPath}`);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');

  // 输出统计
  console.log('\n=== 难度分布 ===');
  for (let i = 1; i <= 5; i++) {
    const percent = ((stats[i] / data.words.length) * 100).toFixed(1);
    console.log(`Level ${i}: ${stats[i]} 词 (${percent}%)`);
  }

  // 输出样本
  console.log('\n=== 各级别示例 ===');
  for (let i = 1; i <= 5; i++) {
    console.log(`\nLevel ${i}:`);
    samples[i].forEach(s => {
      console.log(`  ${s.word} - ${s.meaning} (得分: ${s.scores.total})`);
    });
  }
}

// 执行
const inputPath = './data/words-shanghai-zhongkao.json';
const outputPath = './data/words-shanghai-zhongkao.json';

processVocabulary(inputPath, outputPath);

console.log('\n处理完成！');
