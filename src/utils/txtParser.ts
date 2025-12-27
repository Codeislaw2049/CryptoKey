

/**
 * 纯前端解析Gutenberg TXT电子书（仅本地，无上传）
 * @param file 用户上传的TXT文件
 * @returns 解析结果（文本内容、字符总数、章节列表、虚拟行列表）
 */
export const parseGutenbergTxt = async (file: File): Promise<{
  fullText: string;
  totalChars: number;
  chapters: Array<{ id: number; start: number; end: number; text: string }>;
  virtualLines: string[]; // 固定80字符/行的虚拟行
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // 读取TXT文件内容
    reader.onload = (e) => {
      try {
        const fullText = e.target?.result as string;
        if (!fullText) reject(new Error('文件内容为空'));

        // 1. 计算总字符数（去除Gutenberg头部/尾部的版权声明）
        const cleanText = cleanGutenbergText(fullText);
        const totalChars = cleanText.length;

        // 2. 拆分章节（匹配Gutenberg书籍的章节标题，如"Chapter 1"、"第一章"）
        const chapters = splitChapters(cleanText);

        // 3. 生成虚拟行（80字符/行，不足补空格）
        const virtualLines = splitToVirtualLines(cleanText, 80);

        resolve({
          fullText: cleanText,
          totalChars,
          chapters,
          virtualLines
        });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file, 'utf-8');
  });
};

/**
 * 清理Gutenberg TXT的头部/尾部版权声明（仅保留正文）
 */
const cleanGutenbergText = (text: string): string => {
  // Gutenberg TXT的特征：头部以"*** START OF THE PROJECT GUTENBERG EBOOK ***"结尾
  // 尾部以"*** END OF THE PROJECT GUTENBERG EBOOK ***"开头
  const startMarker = /\*\*\* START OF THE PROJECT GUTENBERG EBOOK .+ \*\*\*/;
  const endMarker = /\*\*\* END OF THE PROJECT GUTENBERG EBOOK .+ \*\*\*/;

  const startMatch = text.match(startMarker);
  const endMatch = text.match(endMarker);

  const startIdx = startMatch ? startMatch.index! + startMatch[0].length : 0;
  const endIdx = endMatch ? endMatch.index! : text.length;

  // 提取正文并去除多余空白
  return text.slice(startIdx, endIdx).replace(/\s+/g, ' ').trim();
};

/**
 * 拆分章节（支持英文/中文书籍）
 */
const splitChapters = (text: string): Array<{ id: number; start: number; end: number; text: string }> => {
  // 匹配章节标题的正则（英文：Chapter 1/ONE，中文：第一章/第1章）
  const chapterRegex = /(Chapter\s+\d+|CHAPTER\s+\d+|第[\d一二三四五六七八九十]+章)/g;
  const chapters: Array<{ id: number; start: number; end: number; text: string }> = [];
  let matches: RegExpExecArray | null;
  let lastEnd = 0;
  let chapterId = 1;

  // 遍历所有章节标题
  while ((matches = chapterRegex.exec(text)) !== null) {
    const start = matches.index;
    // 上一章节的结束位置为当前章节的开始
    if (lastEnd < start) {
      chapters.push({
        id: chapterId++,
        start: lastEnd,
        end: start,
        text: text.slice(lastEnd, start).trim()
      });
    }
    lastEnd = start;
  }

  // 最后一个章节
  if (lastEnd < text.length) {
    chapters.push({
      id: chapterId,
      start: lastEnd,
      end: text.length,
      text: text.slice(lastEnd).trim()
    });
  }

  // 无章节的书籍返回默认章节
  if (chapters.length === 0) {
    return [{ id: 1, start: 0, end: text.length, text }];
  }
  return chapters;
};

/**
 * 拆分虚拟行（固定字符数/行）
 */
const splitToVirtualLines = (text: string, lineWidth: number = 80): string[] => {
  const lines: string[] = [];
  for (let i = 0; i < text.length; i += lineWidth) {
    lines.push(text.slice(i, i + lineWidth));
  }
  return lines;
};
