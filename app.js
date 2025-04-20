const { OpenAI } = require('openai');

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
  loadingText: document.getElementById("loading-text")
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  elements.systemPrompt.value = localStorage.getItem("system-prompt") || "";
  
  // Event Listeners
  elements.saveSystemBtn.addEventListener("click", saveSystemPrompt);
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

function saveSystemPrompt() {
  const prompt = elements.systemPrompt.value.trim();
  if (!prompt) {
    alert("请先输入系统提示再保存。");
    return;
  }
  localStorage.setItem("system-prompt", prompt);
  showToast("系统提示已保存！");
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
    const messageDiv = document.createElement("div");
    messageDiv.className = "message ai-message streaming";
    const contentDiv = document.createElement("div");
    messageDiv.appendChild(contentDiv);
    elements.chatDisplay.appendChild(messageDiv);

    let fullResponse = "";
    for await (const chunk of stream) {
      const chunkContent = chunk.choices[0]?.delta?.content || '';
      fullResponse += chunkContent;
      contentDiv.innerHTML = mdToHTML(fullResponse);
      elements.chatDisplay.scrollTop = elements.chatDisplay.scrollHeight;
    }

    // Update the class when streaming is complete
    messageDiv.classList.remove("streaming");

    // Add to chat history and return
    chatHistory.push({ role: "assistant", content: fullResponse });
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
  contentDiv.innerHTML = isUser ? sanitize(content) : mdToHTML(content);
  
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

function mdToHTML(md) {
    let ret = md
        .replace(/&lt;think&gt;/g, "<p class='think'>") // replace thinking
        .replace(/&lt;\/think&gt;/g, "</p>")
        .replace(/</g, "&lt;") // Escape HTML tags
        .replace(/>/g, "&gt;")
        .replace(/(?:\r\n|\r|\n)/g, "<br>") // Convert newlines to <br>
        .replace(/######\s?(.*?)(?:<br>|$)/g, "<h6>$1</h6>") // H6 headers
        .replace(/#####\s?(.*?)(?:<br>|$)/g, "<h5>$1</h5>") // H5 headers
        .replace(/####\s?(.*?)(?:<br>|$)/g, "<h4>$1</h4>") // H4 headers
        .replace(/###\s?(.*?)(?:<br>|$)/g, "<h3>$1</h3>") // H3 headers
        .replace(/##\s?(.*?)(?:<br>|$)/g, "<h2>$1</h2>") // H2 headers
        .replace(/#\s?(.*?)(?:<br>|$)/g, "<h1>$1</h1>") // H1 headers
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold **text**
        .replace(/\*(.*?)\*/g, "<em>$1</em>") // Italic *text*
        .replace(/__(.*?)__/g, "<u>$1</u>") // Underline __text__
        .replace(/~~(.*?)~~/g, "<del>$1</del>") // Strikethrough ~~text~~
        .replace(/`(.*?)`/g, "<code>$1</code>") // Inline code `text`
        .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>") // Code blocks ```text```
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">') // Images ![alt](url)
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>') // Links [text](url)
        .replace(/^- (.*?)(?:<br>|$)/gm, "<li>$1</li>") // Unordered list items - text
        .replace(/<li>(.*?)<\/li>(?!(<br>|$))/g, "<ul><li>$1</li></ul>") // Wrap list items in <ul>
        .replace(/^\d+\.\s(.*?)(?:<br>|$)/gm, "<li>$1</li>") // Ordered list items 1. text
        .replace(/<li>(.*?)<\/li>(?!(<br>|$))/g, "<ol><li>$1</li></ol>") // Wrap list items in <ol>
        .replace(/\|(.+?)\|(?:<br>|$)/g, function(_, row) { // Tables
            const cells = row.split("|").map(cell => `<td>${cell.trim()}</td>`).join("");
            return `<tr>${cells}</tr>`;
        })
        .replace(/<tr>(.*?)<\/tr>(?!(<br>|$))/g, "<table><tr>$1</tr></table>"); // Wrap rows in <table>
    return ret;
}