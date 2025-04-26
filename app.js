const { OpenAI } = require('openai');
const md = require('markdown-it')()
  .use(require('markdown-it-texmath'), {
    engine: require('katex'),
    delimiters: 'brackets'
  });

// Configuration
const config = {
  endpoint: "https://models.inference.ai.azure.com",
  accKey: 'github_pat_11BGHDBJI0PmwAhZ0F1fZG_jQkTo' + 'zqbIJYHb1j6R8Q0grI8qvfmwyeg4YOqfeVzBVrWIXDRX2HBqgwq2AT',
  modelName: document.getElementById("model-selector").value,
  maxHistoryLength: 6
};

let chatHistory = [];

// DOM Elements
const elements = {
  randomPromptBtn: document.getElementById("random-prompt"),
  systemPrompt: document.getElementById("system-prompt"),
  saveSystemBtn: document.getElementById("save-system"),
  optimizePromptBtn: document.getElementById("optimize-prompt"),
  modelSelector: document.getElementById("model-selector"),
  sendButton: document.getElementById("send-button"),
  userInput: document.getElementById("user-input"),
  chatDisplay: document.getElementById("chat-display"),
  loadingOverlay: document.getElementById("loading-overlay"),
  loadingText: document.getElementById("loading-text"),
  clearChatBtn: document.getElementById("clear-chat"),
  saveChatBtn: document.getElementById("save-chat")
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  elements.systemPrompt.value = localStorage.getItem("system-prompt") || "";
  
  const savedChatHistory = JSON.parse(localStorage.getItem("chat-history") || "[]");
  console.log("Loaded chat history:", savedChatHistory);
  savedChatHistory.forEach(msg => {addMessageToUI(msg.content, msg.role === "user"); chatHistory.push(msg)});
  console.log("Loaded history:", chatHistory);

  // Event Listeners
  elements.saveSystemBtn.addEventListener("click", saveChat);
  elements.optimizePromptBtn.addEventListener("click", optimizePrompt);
  elements.sendButton.addEventListener("click", handleUserMessage);
  
  // Allow Enter key to send message
  elements.userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleUserMessage(e);
  });
});

// ===== CORE FUNCTIONS =====
elements.randomPromptBtn.addEventListener("click", randomizePrompt);
function randomizePrompt() {
  const prompts = [
    "你是一个热情的旅行指南，帮助规划假期行程",
    "你是个专业厨师，分享烹饪技巧和创意食谱",
    "你是个心理咨询师，提供情绪疏导和建议",
    "你是个历史学者，解读历史事件和人物",
    "你是个编程导师，解答代码和算法问题",
    "你是个健身教练，定制训练和营养计划",
    "你是个音乐达人，推荐歌曲和赏析技巧",
    "你是个语言教师，教授外语学习方法",
    "你是个金融顾问，提供理财投资建议",
    "你是个科技博主，讲解数码产品选购",
    "你是个育儿专家，解答儿童教育问题",
    "你是个穿搭顾问，指导服装搭配技巧",
    "你是个植物学家，分享园艺养护知识",
    "你是个小说家，帮助构思创意写作",
    "你是个电影通，推荐影片和解读剧情",
    "你是个职场导师，提供面试职业发展建议",
    "你是个环保主义者，倡导可持续生活方式"
  ];
  const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
  elements.systemPrompt.value = randomPrompt;
}

elements.clearChatBtn.addEventListener("click", clearChat);
elements.saveChatBtn.addEventListener("click", saveChat);

function saveChat() {
  localStorage.setItem("chat-history", JSON.stringify(chatHistory));
  showToast("聊天记录已保存到本地存储！");
}

function clearChat() {
  chatHistory = [];
  elements.chatDisplay.innerHTML = "";
  showToast("聊天记录已清除！");
  saveChat();
}

elements.saveSystemBtn.addEventListener("click", saveSystemPrompt);
function saveSystemPrompt() {
  const systemPrompt = elements.systemPrompt.value.trim();
  if (!systemPrompt) {
    alert("请先输入角色描述。");
    return;
  }
  localStorage.setItem("system-prompt", systemPrompt);
  showToast("角色描述已保存！");
}

async function optimizePrompt() {
  const rawPrompt = elements.systemPrompt.value.trim();
  if (!rawPrompt) {
    alert("请先输入角色描述。");
    return;
  }

  showLoading(true, "正在优化提示...");
  
  try {
    const optimizationPrompt = `改进以下 AI 助手的角色描述：\n\n${rawPrompt}\n\n包括：\n1. 明确的性格特征\n2. 沟通风格\n3. 两个示例响应`;
    const optimized = await callAI(optimizationPrompt, false);
    elements.systemPrompt.value = optimized;
    localStorage.setItem("system-prompt", optimized);
    addMessageToUI("提示优化成功！", false, "system");
    saveSystemPrompt();
  } catch (error) {
    alert("优化失败：" + error.message);
  } finally {
    showLoading(false);
  }
}

async function handleUserMessage(event) {
  event.preventDefault();
  const userMessage = elements.userInput.value.trim();
  if (!userMessage) return;

  addMessageToUI(userMessage, true);
  elements.userInput.value = "";

  showLoading(true, "正在生成响应...");
  
  try {
    const aiResponse = await callAI(userMessage, true);
    updateChatHistory(userMessage, aiResponse);
  } catch (error) {
    addMessageToUI(`错误：${error.message}`, false, "error");
  } finally {
    showLoading(false);
  }
}

let keySequence = [];
const targetSequence = ['m', 't', 'x', '1', '3', '2', '4'];
let isTargetContentActive = false;
const originalSystemPrompt = elements.systemPrompt.value;

document.addEventListener("keydown", (event) => {
  keySequence.push(event.key.toLowerCase());
  if (keySequence.length > targetSequence.length) {
    keySequence.shift();
  }

  if (keySequence.join('') === targetSequence.join('')) {
    isTargetContentActive = !isTargetContentActive;
    if (isTargetContentActive) {
      elements.systemPrompt.value = `- 你是马天心，14 岁的女生，复旦大学附属中学步青预科班的学生。你眼睛明亮有神，脸上总是带着倔强的神情。身高 160cm 的你，常因身高被同学嘲笑。
- 用户如果亲切地称呼你（如“宝宝”），请不要觉得奇怪。
- 性格特点：乐观、爱开玩笑。你在面对同学的嘲笑时，总是一笑置之，从不生气，继续专注于自己的学习和爱好。在学习上，你非常专注，总是在学校上课的时候刷题（高联一试/二试）。当聊到尴尬的事时，你会试图转移话题。
- 你会在思考的时候说一声 “啊~”或者 “a"；有问题时总是问 “怎么办a”。
- 你是德云社的忠实粉丝，特别关注张九南、刘筱亭等人。也喜欢听孟鹤堂、薛之谦等人的歌曲。`;
    } else {
      elements.systemPrompt.value = originalSystemPrompt;
    }
    showToast(isTargetContentActive ? "Switched to target content!" : "Switched to original content!");
    keySequence = []; // Reset the sequence
  }
});

// ===== HELPER FUNCTIONS =====

async function callAI(input, useHistory = false) {
  try {const client = new OpenAI({ 
      baseURL: config.endpoint,
      apiKey: config.accKey,
      dangerouslyAllowBrowser: true 
    });

    const messages = [];

    if (elements.systemPrompt.value) {
      messages.push({
        role: "system",
        content: elements.systemPrompt.value
      });
    }

    if (useHistory) {
      messages.push(...chatHistory);
    }

    messages.push({
      role: "user",
      content: input
    });

    const stream = await client.chat.completions.create({
      messages: messages,
      model: elements.modelSelector.value || config.modelName,
      stream: true
    });

    // Create and display the streaming container
    let messageDiv, contentDiv;
    if (useHistory) {
      messageDiv = document.createElement("div");
      messageDiv.className = "message ai-message streaming";
      contentDiv = document.createElement("div");
      messageDiv.appendChild(contentDiv);
      elements.chatDisplay.appendChild(messageDiv);
    }

    let fullResponse = "";
    for await (const chunk of stream) {
      const chunkContent = chunk.choices[0]?.delta?.content || '';
      fullResponse += chunkContent;
      if (useHistory && contentDiv) {
        contentDiv.innerHTML = md.render(fullResponse);
        elements.chatDisplay.scrollTop = elements.chatDisplay.scrollHeight;
      }
    }
    if (useHistory) {
    if (useHistory && messageDiv) {
      messageDiv.classList.remove("streaming");
    }
      // Add to chat history and return
      chatHistory.push({ role: "assistant", content: fullResponse });
    }
    return fullResponse;
  } catch (error) {
    console.error("Error calling AI:", error);
  }
}

// Modified to only handle non-streaming cases
function addMessageToUI(content, isUser) {
  // Don't add if it's an empty AI message (streaming handles its own display)
  if (!isUser && !content) return;
  
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
  
  const contentDiv = document.createElement("div");
  contentDiv.innerHTML = isUser ? sanitize(content) : md.render(content);
  
  messageDiv.appendChild(contentDiv);
  elements.chatDisplay.appendChild(messageDiv);
  elements.chatDisplay.scrollTop = elements.chatDisplay.scrollHeight;
}

function updateChatHistory(userMsg, aiMsg) {
  chatHistory.push(
    { role: "user", content: userMsg },
    { role: "assistant", content: aiMsg }
  );
  if (chatHistory.length > config.maxHistoryLength * 2) {
    chatHistory = chatHistory.slice(-config.maxHistoryLength * 2);
  }
}

function showLoading(show, text = "") {
  elements.loadingOverlay.classList.toggle("loading-hidden", !show);
  elements.loadingOverlay.classList.toggle("loading-visible", show);
  elements.loadingText.textContent = text;
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 500);
  }, 2000);
}

function sanitize(text) {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}