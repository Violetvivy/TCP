// 聊天客户端
class ChatClient {
    constructor() {
        this.stompClient = null;
        this.username = null;
        this.currentChatUser = '所有人';
        this.chatHistories = new Map(); // 存储与每个用户的聊天历史
        this.fileToSend = null;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.loadChatHistory();
    }
    
    initializeElements() {
        // 输入元素
        this.usernameInput = document.getElementById('username-input');
        this.messageInput = document.getElementById('message-input');
        
        // 按钮元素
        this.connectBtn = document.getElementById('connect-btn');
        this.disconnectBtn = document.getElementById('disconnect-btn');
        this.sendBtn = document.getElementById('send-btn');
        this.fileBtn = document.getElementById('file-btn');
        this.imageBtn = document.getElementById('image-btn');
        
        // 状态元素
        this.connectionStatus = document.getElementById('connection-status');
        this.onlineCount = document.getElementById('online-count');
        this.userList = document.getElementById('user-list');
        this.chatMessages = document.getElementById('chat-messages');
        
        // 当前聊天信息
        this.currentChatName = document.getElementById('current-chat-name');
        this.currentChatAvatar = document.getElementById('current-chat-avatar');
        this.currentChatStatus = document.getElementById('current-chat-status');
        
        // 文件上传相关
        this.fileModal = document.getElementById('file-modal');
        this.fileInput = document.getElementById('file-input');
        this.chooseFileBtn = document.getElementById('choose-file-btn');
        this.sendFileBtn = document.getElementById('send-file-btn');
        this.cancelFileBtn = document.getElementById('cancel-file-btn');
        this.filePreviewImage = document.getElementById('file-preview-image');
        this.fileNameDisplay = document.getElementById('file-name');
        this.closeModalBtn = document.querySelector('.close-modal');
    }
    
    initializeEventListeners() {
        // 连接按钮
        this.connectBtn.addEventListener('click', () => this.connect());
        
        // 断开连接按钮
        this.disconnectBtn.addEventListener('click', () => this.disconnect());
        
        // 发送消息按钮
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // 按Enter发送消息（Ctrl+Enter换行）
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.ctrlKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // 文件按钮
        this.fileBtn.addEventListener('click', () => this.openFileModal());
        this.imageBtn.addEventListener('click', () => this.openImageModal());
        
        // 文件上传相关
        this.chooseFileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.sendFileBtn.addEventListener('click', () => this.sendFile());
        this.cancelFileBtn.addEventListener('click', () => this.closeFileModal());
        this.closeModalBtn.addEventListener('click', () => this.closeFileModal());
        
        // 点击模态框外部关闭
        this.fileModal.addEventListener('click', (e) => {
            if (e.target === this.fileModal) {
                this.closeFileModal();
            }
        });
    }
    
    // 连接到WebSocket服务器
    connect() {
        const username = this.usernameInput.value.trim();
        
        if (!username) {
            alert('请输入用户名！');
            return;
        }
        
        if (username.length > 20) {
            alert('用户名不能超过20个字符！');
            return;
        }
        
        this.username = username;
        
        // 更新UI
        this.usernameInput.disabled = true;
        this.connectBtn.classList.add('hidden');
        this.disconnectBtn.classList.remove('hidden');
        
        // 创建WebSocket连接
        const socket = new SockJS('/ws-chat');
        this.stompClient = Stomp.over(socket);
        
        // 连接配置
        this.stompClient.connect({}, (frame) => {
            console.log('Connected: ' + frame);
            
            // 更新连接状态
            this.updateConnectionStatus(true);
            
            // 发送加入聊天消息
            this.sendJoinMessage();
            
            // 订阅公共消息（用于系统消息和群聊）
            this.stompClient.subscribe('/topic/public', (message) => {
                const msg = JSON.parse(message.body);
                // 区分系统消息和普通消息
                if (msg.type === 'JOIN' || msg.type === 'LEAVE') {
                    this.handlePublicMessage(msg);
                } else {
                    // 群聊消息
                    this.handleGroupMessage(msg);
                }
            });
            
            // 订阅私聊消息
            this.stompClient.subscribe('/user/queue/private', (message) => {
                this.handlePrivateMessage(JSON.parse(message.body));
            });
            
            // 订阅在线用户列表更新
            this.stompClient.subscribe('/topic/online-users', (message) => {
                this.updateOnlineUsers(JSON.parse(message.body));
            });
            
            // 获取初始在线用户列表
            this.fetchOnlineUsers();
            
        }, (error) => {
            console.error('Connection error: ', error);
            this.updateConnectionStatus(false);
            alert('连接服务器失败，请检查服务器是否运行！');
            this.resetConnection();
        });
    }
    
    // 断开连接
    disconnect() {
        if (this.stompClient !== null) {
            // 发送离开消息
            this.sendLeaveMessage();
            
            // 断开连接
            this.stompClient.disconnect(() => {
                console.log('Disconnected');
            });
        }
        
        this.resetConnection();
        this.updateConnectionStatus(false);
    }
    
    // 重置连接状态
    resetConnection() {
        this.username = null;
        this.usernameInput.disabled = false;
        this.connectBtn.classList.remove('hidden');
        this.disconnectBtn.classList.add('hidden');
        this.stompClient = null;
        
        // 清空用户列表
        this.updateOnlineUsers(new Set());
    }
    
    // 更新连接状态显示
    updateConnectionStatus(connected) {
        if (connected) {
            this.connectionStatus.textContent = `已连接为: ${this.username}`;
            this.connectionStatus.className = 'status connected';
            this.connectionStatus.innerHTML = `<i class="fas fa-check-circle"></i> 已连接为: ${this.username}`;
        } else {
            this.connectionStatus.textContent = '未连接';
            this.connectionStatus.className = 'status disconnected';
            this.connectionStatus.innerHTML = '<i class="fas fa-times-circle"></i> 未连接';
        }
    }
    
    // 发送加入聊天消息
    sendJoinMessage() {
        const message = {
            type: 'JOIN',
            sender: this.username,
            timestamp: new Date().toISOString()
        };
        
        this.stompClient.send('/app/chat.join', {}, JSON.stringify(message));
    }
    
    // 发送离开聊天消息
    sendLeaveMessage() {
        const message = {
            type: 'LEAVE',
            sender: this.username,
            timestamp: new Date().toISOString()
        };
        
        this.stompClient.send('/app/chat.leave', {}, JSON.stringify(message));
    }
    
    // 发送文本消息
    sendMessage() {
        const content = this.messageInput.value.trim();
        
        if (!content) {
            return;
        }
        
        if (!this.stompClient || !this.username) {
            alert('请先连接服务器！');
            return;
        }
        
        const message = {
            type: 'TEXT',
            sender: this.username,
            receiver: this.currentChatUser === '所有人' ? '所有人' : this.currentChatUser,
            content: content,
            timestamp: new Date().toISOString()
        };
        
        // 发送消息
        this.stompClient.send('/app/chat.private', {}, JSON.stringify(message));
        
        // 清空输入框
        this.messageInput.value = '';
        
        // 添加到聊天历史（发送方视角）
        this.addMessageToHistory(message, true);
    }
    
    // 发送文件
    sendFile() {
        if (!this.fileToSend) {
            alert('请先选择文件！');
            return;
        }
        
        if (!this.stompClient || !this.username) {
            alert('请先连接服务器！');
            return;
        }
        
        // 检查文件大小（限制为5MB）
        if (this.fileToSend.size > 5 * 1024 * 1024) {
            alert('文件大小不能超过5MB！');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const base64Data = e.target.result.split(',')[1];
                
                const message = {
                    type: this.fileToSend.type.startsWith('image/') ? 'IMAGE' : 'FILE',
                    sender: this.username,
                    receiver: this.currentChatUser === '所有人' ? '所有人' : this.currentChatUser,
                    content: base64Data,
                    fileName: this.fileToSend.name,
                    fileType: this.fileToSend.type,
                    fileSize: this.fileToSend.size,
                    timestamp: new Date().toISOString()
                };
                
                // 发送消息
                this.stompClient.send('/app/chat.private', {}, JSON.stringify(message));
                
                // 添加到聊天历史（发送方视角）
                this.addMessageToHistory(message, true);
                
                // 关闭模态框
                this.closeFileModal();
            } catch (error) {
                console.error('发送文件失败:', error);
                alert('发送文件失败，请重试！');
            }
        };
        
        reader.onerror = () => {
            alert('读取文件失败，请重试！');
        };
        
        reader.readAsDataURL(this.fileToSend);
    }
    
    // 处理公共消息（用户加入/离开）
    handlePublicMessage(message) {
        this.addSystemMessage(message.content);
    }
    
    // 处理群聊消息
    handleGroupMessage(message) {
        // 群聊消息总是显示在"所有人"聊天中
        const isFromMe = message.sender === this.username;
        
        // 如果当前正在查看"所有人"聊天，则显示消息
        if (this.currentChatUser === '所有人') {
            this.addMessageToDisplay(message, isFromMe);
        }
        
        // 保存到聊天历史
        this.addMessageToHistory(message, isFromMe);
        
        // 更新本地存储
        this.saveChatHistory();
    }
    
    // 处理私聊消息
    handlePrivateMessage(message) {
        // 确定消息的发送者和接收者
        const isFromMe = message.sender === this.username;
        const isToMe = message.receiver === this.username;
        
        // 如果消息是发送给我的，或者是我发送的
        if (isToMe || isFromMe) {
            // 确定消息属于哪个聊天
            let chatUser;
            if (isFromMe) {
                // 我发送的消息，接收者就是聊天对象
                chatUser = message.receiver;
            } else {
                // 我接收的消息，发送者就是聊天对象
                chatUser = message.sender;
            }
            
            // 如果当前正在查看这个聊天，则显示消息
            if (chatUser === this.currentChatUser) {
                this.addMessageToDisplay(message, isFromMe);
            }
            
            // 保存到聊天历史
            this.addMessageToHistory(message, isFromMe);
            
            // 更新本地存储
            this.saveChatHistory();
        }
    }
    
    // 添加消息到显示
    addMessageToDisplay(message, isFromMe) {
        const messageElement = this.createMessageElement(message, isFromMe);
        this.chatMessages.appendChild(messageElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    // 添加系统消息
    addSystemMessage(content) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message received';
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-sender">系统</span>
                <span class="message-time">${this.formatTime(new Date())}</span>
            </div>
            <div class="message-content">${content}</div>
        `;
        this.chatMessages.appendChild(messageElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    // 创建消息元素
    createMessageElement(message, isFromMe) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isFromMe ? 'sent' : 'received'}`;
        
        let contentHtml = '';
        
        if (message.type === 'TEXT') {
            contentHtml = `<div class="message-content">${this.escapeHtml(message.content)}</div>`;
        } else if (message.type === 'FILE') {
            contentHtml = `
                <div class="message-content">
                    <div>${this.escapeHtml(message.fileName)} (${this.formatFileSize(message.fileSize)})</div>
                    <div class="file-message">
                        <a href="#" class="file-link" data-filename="${message.fileName}" data-content="${message.content}">
                            <i class="fas fa-download"></i> 下载文件
                        </a>
                    </div>
                </div>
            `;
        } else if (message.type === 'IMAGE') {
            contentHtml = `
                <div class="message-content">
                    <div>${this.escapeHtml(message.fileName)}</div>
                    <img src="data:${message.fileType};base64,${message.content}" 
                         alt="${message.fileName}" 
                         class="image-message"
                         onclick="this.classList.toggle('expanded')">
                </div>
            `;
        }
        
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${isFromMe ? '我' : this.escapeHtml(message.sender)}</span>
                <span class="message-time">${this.formatTime(new Date(message.timestamp))}</span>
            </div>
            ${contentHtml}
        `;
        
        // 添加文件下载功能
        if (message.type === 'FILE') {
            const downloadLink = messageElement.querySelector('.file-link');
            downloadLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.downloadFile(message.fileName, message.content, message.fileType);
            });
        }
        
        return messageElement;
    }
    
    // 下载文件
    downloadFile(filename, base64Data, fileType) {
        try {
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: fileType });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('下载文件失败:', error);
            alert('下载文件失败，请重试！');
        }
    }
    
    // 更新在线用户列表
    updateOnlineUsers(users) {
        // 清空当前列表（保留"所有人"）
        const userItems = this.userList.querySelectorAll('.user-item:not([data-user="所有人"])');
        userItems.forEach(item => item.remove());
        
        // 添加在线用户
        users.forEach(user => {
            if (user !== this.username) {
                this.addUserToList(user);
            }
        });
        
        // 更新在线人数
        this.onlineCount.textContent = users.size;
    }
    
    // 添加用户到列表
    addUserToList(username) {
        const userItem = document.createElement('li');
        userItem.className = 'user-item';
        userItem.dataset.user = username;
        
        // 获取用户首字母作为头像
        const firstChar = username.charAt(0).toUpperCase();
        
        userItem.innerHTML = `
            <div class="user-avatar">${firstChar}</div>
            <div class="user-name">${this.escapeHtml(username)}</div>
        `;
        
        // 点击用户切换聊天
        userItem.addEventListener('click', () => this.switchChatUser(username));
        
        this.userList.appendChild(userItem);
    }
    
    // 切换聊天用户
    switchChatUser(username) {
        // 更新当前聊天用户
        this.currentChatUser = username;
        
        // 更新UI
        this.updateCurrentChatInfo();
        
        // 清空当前消息显示
        this.chatMessages.innerHTML = '';
        
        // 加载该用户的聊天历史
        this.loadChatHistoryForUser(username);
        
        // 更新用户列表中的活动状态
        this.updateActiveUserInList();
    }
    
    // 更新当前聊天信息
    updateCurrentChatInfo() {
        this.currentChatName.textContent = this.currentChatUser;
        
        if (this.currentChatUser === '所有人') {
            this.currentChatAvatar.textContent = '全';
            this.currentChatStatus.textContent = '群聊模式';
        } else {
            const firstChar = this.currentChatUser.charAt(0).toUpperCase();
            this.currentChatAvatar.textContent = firstChar;
            this.currentChatStatus.textContent = '私聊模式';
        }
    }
    
    // 更新用户列表中的活动状态
    updateActiveUserInList() {
        const userItems = this.userList.querySelectorAll('.user-item');
        userItems.forEach(item => {
            if (item.dataset.user === this.currentChatUser) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    // 获取在线用户列表
    fetchOnlineUsers() {
        fetch('/api/online-users')
            .then(response => response.json())
            .then(users => {
                this.updateOnlineUsers(new Set(users));
            })
            .catch(error => {
                console.error('Error fetching online users:', error);
            });
    }
    
    // 打开文件上传模态框
    openFileModal() {
        if (!this.stompClient || !this.username) {
            alert('请先连接服务器！');
            return;
        }
        
        this.fileModal.classList.remove('hidden');
        this.fileToSend = null;
        this.filePreviewImage.classList.add('hidden');
        this.fileNameDisplay.textContent = '未选择文件';
        this.sendFileBtn.disabled = true;
    }
    
    // 打开图片上传模态框
    openImageModal() {
        this.openFileModal();
        // 可以在这里设置只接受图片文件
        this.fileInput.accept = 'image/*';
    }
    
    // 关闭文件上传模态框
    closeFileModal() {
        this.fileModal.classList.add('hidden');
        this.fileInput.value = '';
        this.fileToSend = null;
    }
    
    // 处理文件选择
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.fileToSend = file;
        this.fileNameDisplay.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
        this.sendFileBtn.disabled = false;
        
        // 如果是图片，显示预览
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.filePreviewImage.src = e.target.result;
                this.filePreviewImage.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            this.filePreviewImage.classList.add('hidden');
        }
    }
    
    // 添加消息到聊天历史
    addMessageToHistory(message, isFromMe) {
        const chatUser = isFromMe ? (message.receiver || '所有人') : message.sender;
        
        if (!this.chatHistories.has(chatUser)) {
            this.chatHistories.set(chatUser, []);
        }
        
        const history = this.chatHistories.get(chatUser);
        history.push({
            ...message,
            isFromMe: isFromMe
        });
        
        // 限制历史记录大小
        if (history.length > 100) {
            history.shift();
        }
    }
    
    // 加载聊天历史
    loadChatHistory() {
        const savedHistory = localStorage.getItem('chatHistory');
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                for (const [user, messages] of Object.entries(parsed)) {
                    this.chatHistories.set(user, messages);
                }
            } catch (e) {
                console.error('Failed to load chat history:', e);
            }
        }
    }
    
    // 加载特定用户的聊天历史
    loadChatHistoryForUser(username) {
        const history = this.chatHistories.get(username) || [];
        
        // 显示历史消息
        history.forEach(message => {
            this.addMessageToDisplay(message, message.isFromMe);
        });
        
        // 如果没有历史消息，显示提示
        if (history.length === 0) {
            if (username === '所有人') {
                this.addSystemMessage('这是群聊，发送的消息所有在线用户都能看到。');
            } else {
                this.addSystemMessage(`开始与 ${username} 的私聊。`);
            }
        }
    }
    
    // 保存聊天历史到本地存储
    saveChatHistory() {
        const obj = {};
        for (const [user, messages] of this.chatHistories) {
            obj[user] = messages;
        }
        
        try {
            localStorage.setItem('chatHistory', JSON.stringify(obj));
        } catch (e) {
            console.error('Failed to save chat history:', e);
        }
    }
    
    // 工具函数：转义HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 工具函数：格式化时间
    formatTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) {
            return '刚刚';
        } else if (diffMins < 60) {
            return `${diffMins}分钟前`;
        } else if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    }
    
    // 工具函数：格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0 || !bytes) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 页面加载完成后初始化聊天客户端
document.addEventListener('DOMContentLoaded', () => {
    window.chatClient = new ChatClient();
    
    // 为"所有人"添加点击事件
    const everyoneItem = document.querySelector('.user-item[data-user="所有人"]');
    if (everyoneItem) {
        everyoneItem.addEventListener('click', () => {
            window.chatClient.switchChatUser('所有人');
        });
    }
});
