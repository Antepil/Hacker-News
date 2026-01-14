'use server';

import { translate } from 'google-translate-api-x';

/**
 * 服务器端翻译服务
 * 使用 google-translate-api-x 进行文本翻译。
 * 
 * @param text 需要翻译的文本
 * @param targetLang 目标语言代码，默认为简体中文 (zh-CN)
 * @returns 翻译后的文本，如果失败则返回原文
 */
export async function translateText(text: string, targetLang: string = 'zh-CN'): Promise<string> {
    if (!text) return '';
    try {
        const res = await translate(text, { to: targetLang });
        return res.text;
    } catch (error) {
        console.error('Translation failed:', error);
        return text; // 失败时回退到原文
    }
}
