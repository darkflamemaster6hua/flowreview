/**
 * FlowReview — DeepSeek AI Integration
 * API Key is stored in user's localStorage, never in source code.
 */

const AI = (() => {
  const API_URL = 'https://api.deepseek.com/chat/completions';
  const MODEL = 'deepseek-chat';
  const STORAGE_KEY = 'flowreview_api_key';

  function getApiKey() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }

  function setApiKey(key) {
    localStorage.setItem(STORAGE_KEY, key.trim());
  }

  function hasApiKey() {
    return !!getApiKey();
  }

  async function chat(messages, maxTokens = 500) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('NO_API_KEY');
    }
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          max_tokens: maxTokens,
          temperature: 0.7
        })
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`API Error ${res.status}: ${err}`);
      }

      const data = await res.json();
      return data.choices[0].message.content;
    } catch (e) {
      console.error('DeepSeek API error:', e);
      throw e;
    }
  }

  async function explainWord(word, definition) {
    return chat([
      {
        role: 'system',
        content: '你是一个专业的英语教师。用中文简洁回答，格式清晰。每个部分用emoji标题，总字数控制在200字以内。'
      },
      {
        role: 'user',
        content: `请帮我深入理解单词 "${word}"（${definition}）：
1. 🧠 记忆技巧（词根词缀或联想）
2. 📝 2个实用例句（中英对照）
3. 🔗 相关词汇（同义词/反义词各1-2个）`
      }
    ]);
  }

  async function freeChat(userMessage, history = []) {
    const messages = [
      {
        role: 'system',
        content: '你是FlowReview的AI英语学习助手。用中文回答，简洁友好。可以帮用户解释单词、语法、翻译句子、提供学习建议。回答控制在150字以内。'
      },
      ...history,
      { role: 'user', content: userMessage }
    ];
    return chat(messages, 400);
  }

  return { explainWord, freeChat, getApiKey, setApiKey, hasApiKey };
})();
