let ws = null
let username = ""
let currentUserId = ""
let typingTimeout = null

// Elements
const loginScreen = document.getElementById("loginScreen")
const chatScreen = document.getElementById("chatScreen")
const usernameInput = document.getElementById("username")
const joinBtn = document.getElementById("joinBtn")
const status = document.getElementById("status")
const messages = document.getElementById("messages")
const messageInput = document.getElementById("messageInput")
const sendBtn = document.getElementById("sendBtn")
const usersList = document.getElementById("usersList")
const userCount = document.getElementById("userCount")
const serverInfo = document.getElementById("serverInfo")
const typing = document.getElementById("typing")
const typingText = document.getElementById("typingText")
const messageCount = document.getElementById("messageCount")
const sidebar = document.getElementById("sidebar")
const toggleSidebar = document.getElementById("toggleSidebar")
const closeSidebar = document.getElementById("closeSidebar")
const sidebarOverlay = document.getElementById("sidebarOverlay")

// Auto-detect server URL
function getServerUrl() {
  return "http://192.168.181.81:3000"
}

// Generate unique user ID
function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
}

// Connect to WebSocket
function connect() {
  try {
    const wsUrl = getServerUrl();
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[DEBUG] WebSocket connected");
      status.textContent = "Connected to mystical realm";
      status.className = "text-center text-sm text-green-400";
      joinBtn.disabled = false;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleMessage(data);
    };

    ws.onclose = () => {
      console.warn("[DEBUG] WebSocket closed, reconnecting in 3s...");
      status.textContent = "Disconnected - Reconnecting...";
      status.className = "text-center text-sm text-yellow-400";
      joinBtn.disabled = true;
      setTimeout(connect, 3000); // coba reconnect tiap 3 detik
    };

    ws.onerror = (err) => {
      console.error("[DEBUG] WebSocket error", err);
      ws.close(); // trigger reconnect
    };
  } catch (error) {
    console.error("[DEBUG] Failed to connect", error);
    status.textContent = "Connection error";
    setTimeout(connect, 3000); // coba lagi
  }
}


function handleMessage(data) {
  switch (data.type) {
    case "server_info":
      serverInfo.textContent = `Connected to ${data.server}`
      break
    case "messages_history":
      messages.innerHTML = ""
      if (data.messages.length === 0) {
        showWelcomeMessage()
      } else {
        data.messages.forEach((msg) => addMessage(msg))
      }
      break
    case "chat":
      addMessage(data)
      updateMessageCount()
      break
    case "user_list":
      updateUsersList(data.users)
      userCount.textContent = data.totalUsers
      break
    case "user_joined":
      if (data.users) {
        updateUsersList(data.users)
        userCount.textContent = data.users.length
      }
      break
    case "user_left":
      if (data.users) {
        updateUsersList(data.users)
        userCount.textContent = data.users.length
      }
      break
    case "typing":
      handleTyping(data)
      break
  }
}

function addMessage(msg) {
  // Remove welcome message if it exists
  const welcomeMsg = messages.querySelector(".welcome-message")
  if (welcomeMsg) {
    welcomeMsg.remove()
  }

  const div = document.createElement("div")
  div.className = "message-bubble"

  if (msg.isSystem) {
    // System message (center)
    div.innerHTML = `
      <div class="flex justify-center mb-4">
        <div class="bubble-system px-4 py-2 text-sm text-center max-w-xs">
          ${escapeHtml(msg.text)}
        </div>
      </div>
    `
  } else {
    const isOwnMessage = msg.userId === currentUserId
    const avatarColor = getAvatarColor(msg.username)
    const timeStr = new Date(msg.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })

    if (isOwnMessage) {
      // Own message (right side) - BIRU
      div.innerHTML = `
        <div class="flex justify-end mb-4">
          <div class="flex items-end space-x-3 max-w-xs lg:max-w-md">
            <div class="text-right">
              <div class="bubble-right px-4 py-3">
                <p class="break-words font-medium">${escapeHtml(msg.text)}</p>
              </div>
              <div class="flex items-center justify-end space-x-2 mt-1">
                <span class="text-xs text-gray-400">${timeStr}</span>
                ${msg.server ? `<span class="text-xs bg-blue-600 px-2 py-1 rounded text-white">${msg.server}</span>` : ""}
              </div>
            </div>
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style="background: ${avatarColor}">
              ${msg.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      `
    } else {
      // Other's message (left side) - ABU-ABU
      div.innerHTML = `
        <div class="flex justify-start mb-4">
          <div class="flex items-end space-x-3 max-w-xs lg:max-w-md">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style="background: ${avatarColor}">
              ${msg.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="bubble-left px-4 py-3">
                <p class="break-words font-medium">${escapeHtml(msg.text)}</p>
              </div>
              <div class="flex items-center space-x-2 mt-1">
                <span class="text-xs font-medium text-purple-300">${escapeHtml(msg.username)}</span>
                <span class="text-xs text-gray-400">${timeStr}</span>
                ${msg.server ? `<span class="text-xs bg-gray-600 px-2 py-1 rounded text-gray-300">${msg.server}</span>` : ""}
              </div>
            </div>
          </div>
        </div>
      `
    }
  }

  messages.appendChild(div)
  scrollToBottom()
}

function showWelcomeMessage() {
  const div = document.createElement("div")
  div.className = "welcome-message text-center py-12"
  div.innerHTML = `
    <div class="w-16 h-16 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
      <span class="text-2xl">💬</span>
    </div>
    <h3 class="text-lg font-semibold text-gray-300 mb-2">Welcome to Narria</h3>
    <p class="text-gray-500">Start your mystical conversation...</p>
  `
  messages.appendChild(div)
}

function updateUsersList(users) {
  usersList.innerHTML = ""
  users.forEach((user) => {
    const div = document.createElement("div")
    div.className = "flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-700/30 transition-colors"

    const avatarColor = getAvatarColor(user.username)
    const isCurrentUser = user.id === currentUserId

    div.innerHTML = `
      <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style="background: ${avatarColor}">
        ${user.username.charAt(0).toUpperCase()}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center space-x-2">
          <span class="font-medium truncate ${isCurrentUser ? "text-blue-300" : "text-white"}">${escapeHtml(user.username)}</span>
          ${isCurrentUser ? '<span class="text-xs text-gray-400 bg-blue-600 px-2 py-1 rounded">(You)</span>' : ""}
        </div>
        <div class="flex items-center space-x-2 mt-1">
          <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span class="text-xs text-gray-400">Online</span>
          ${user.server ? `<span class="text-xs text-gray-500">${user.server}</span>` : ""}
        </div>
      </div>
    `

    usersList.appendChild(div)
  })
}

function updateMessageCount() {
  const count = messages.children.length
  if (messageCount) {
    messageCount.textContent = count
  }
}

function handleTyping(data) {
  if (data.userId === currentUserId) return

  if (data.isTyping) {
    typingText.textContent = `${data.username} is weaving mystical words...`
    typing.classList.remove("hidden")
  } else {
    typing.classList.add("hidden")
  }
}

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight
}

function getAvatarColor(username) {
  const colors = [
    "linear-gradient(135deg, #6366f1, #8b5cf6)",
    "linear-gradient(135deg, #3b82f6, #6366f1)",
    "linear-gradient(135deg, #8b5cf6, #ec4899)",
    "linear-gradient(135deg, #06b6d4, #3b82f6)",
    "linear-gradient(135deg, #10b981, #06b6d4)",
    "linear-gradient(135deg, #f59e0b, #ef4444)",
    "linear-gradient(135deg, #ec4899, #8b5cf6)",
  ]
  const index = username.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  return colors[index]
}

function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

// Event listeners
joinBtn.addEventListener("click", () => {
  const name = usernameInput.value.trim()
  if (name && ws && ws.readyState === WebSocket.OPEN) {
    username = name
    currentUserId = generateId()
    ws.send(JSON.stringify({ type: "join", username: name, userId: currentUserId }))
    loginScreen.classList.add("hidden")
    chatScreen.classList.remove("hidden")
    messageInput.focus()
  }
})

sendBtn.addEventListener("click", () => {
  const text = messageInput.value.trim()
  if (text && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "chat", text: text }))
    messageInput.value = ""
    sendBtn.disabled = true
  }
})

messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendBtn.click()
  }
})

messageInput.addEventListener("input", (e) => {
  sendBtn.disabled = !e.target.value.trim()

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "typing", isTyping: true }))

    clearTimeout(typingTimeout)
    typingTimeout = setTimeout(() => {
      ws.send(JSON.stringify({ type: "typing", isTyping: false }))
    }, 1000)
  }
})

usernameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    joinBtn.click()
  }
})

// Sidebar controls
toggleSidebar?.addEventListener("click", () => {
  sidebar.classList.remove("translate-x-full")
  sidebarOverlay.classList.remove("hidden")
})

closeSidebar?.addEventListener("click", () => {
  sidebar.classList.add("translate-x-full")
  sidebarOverlay.classList.add("hidden")
})

sidebarOverlay?.addEventListener("click", () => {
  sidebar.classList.add("translate-x-full")
  sidebarOverlay.classList.add("hidden")
})

// Handle window resize
window.addEventListener("resize", () => {
  if (window.innerWidth >= 1024) {
    sidebar.classList.add("translate-x-full")
    sidebarOverlay.classList.add("hidden")
  }
})

// Connect on page load
connect()
