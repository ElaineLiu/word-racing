/**
 * 批量更新中考词库 - 自动分批处理
 *
 * 使用方法:
 *   node scripts/batch-update-vocabulary.js
 *
 * 特性:
 * - 自动扫描 data/vocabulary-supplement-*.md 文件
 * - 分批更新，每批100词
 * - 进度持久化到 data/update-progress.json
 * - 出错可断点续传
 * - 日志输出到 data/update-log.txt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VOCAB_FILE = path.join(__dirname, '../data/words-shanghai-zhongkao.json');
const PROGRESS_FILE = path.join(__dirname, '../data/update-progress.json');
const LOG_FILE = path.join(__dirname, '../data/update-log.txt');
const BATCH_SIZE = 100;

// 日志函数
function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n', 'utf-8');
}

// 加载进度
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return {
    lastProcessedWord: '',
    totalUpdated: 0,
    startTime: new Date().toISOString()
  };
}

// 保存进度
function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8');
}

// 解析Markdown表格行
function parseMarkdownTable(content) {
  const lines = content.split('\n');
  const data = {};

  for (const line of lines) {
    // 匹配表格行: | 123 | word | /phonetic/ | meaning | sentence | sentence_cn |
    const match = line.match(/^\|\s*\d+\s*\|\s*(\w[\w\s-]*)\s*\|\s*(\/[^\/]+\/)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/);
    if (match) {
      const word = match[1].trim();
      data[word] = {
        phonetic: match[2].trim(),
        meaning_en: match[3].trim(),
        sentence: match[4].trim(),
        sentence_cn: match[5].trim()
      };
    }
  }

  return data;
}

// 主函数
function main() {
  log('=== 批量更新任务开始 ===');

  // 加载词汇库
  const vocabData = JSON.parse(fs.readFileSync(VOCAB_FILE, 'utf-8'));
  const progress = loadProgress();

  log(`词库总数: ${vocabData.words.length}`);
  log(`已更新: ${progress.totalUpdated}`);
  log(`上次处理到: ${progress.lastProcessedWord || '无'}`);

  // 扫描所有supplement文件
  const dataDir = path.join(__dirname, '../data');
  const supplementFiles = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('vocabulary-supplement-') && f.endsWith('.md'))
    .sort();

  log(`找到 ${supplementFiles.length} 个数据文件`);

  let updatedThisRun = 0;
  let updatedCount = 0;

  for (const file of supplementFiles) {
    const filePath = path.join(dataDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const supplementData = parseMarkdownTable(content);

    log(`处理文件: ${file}, 包含 ${Object.keys(supplementData).length} 个词汇`);

    vocabData.words.forEach(word => {
      const supplement = supplementData[word.word];
      if (supplement && (!word.phonetic || word.phonetic === '')) {
        word.phonetic = supplement.phonetic;
        word.meaning_en = supplement.meaning_en;
        word.sentence = supplement.sentence;
        word.sentence_cn = supplement.sentence_cn;
        updatedCount++;
        updatedThisRun++;

        if (updatedThisRun % 50 === 0) {
          log(`已更新 ${updatedThisRun} 个词汇...`);
          // 中间保存
          fs.writeFileSync(VOCAB_FILE, JSON.stringify(vocabData, null, 2), 'utf-8');
          progress.totalUpdated += 50;
          progress.lastProcessedWord = word.word;
          saveProgress(progress);
        }
      }
    });
  }

  // 最终保存
  fs.writeFileSync(VOCAB_FILE, JSON.stringify(vocabData, null, 2), 'utf-8');

  // 更新进度
  progress.totalUpdated += (updatedThisRun % 50);
  progress.lastProcessedWord = 'completed';
  progress.endTime = new Date().toISOString();
  saveProgress(progress);

  log(`=== 任务完成 ===`);
  log(`本次更新: ${updatedThisRun} 个词汇`);
  log(`累计更新: ${progress.totalUpdated} 个词汇`);

  // 统计剩余
  const remaining = vocabData.words.filter(w => !w.phonetic || w.phonetic === '').length;
  log(`剩余待补全: ${remaining} 个词汇`);
}

main();
