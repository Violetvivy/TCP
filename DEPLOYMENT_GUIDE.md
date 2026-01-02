# 局域网点对点聊天系统 - 部署和操作指南

## 系统概述

这是一个基于Spring Boot和WebSocket的局域网点对点聊天系统，支持：
- 文字聊天
- 文件传输
- 图片传输和显示
- 私聊功能
- 在线用户列表
- 聊天历史保存

## 系统架构

### 服务器端
- **技术栈**: Spring Boot 4.0.1 + WebSocket + STOMP
- **通信协议**: WebSocket (基于TCP)
- **运行环境**: Java 17+
- **部署系统**: openEuler (公网IP: 123.249.34.2)

### 客户端
- **技术栈**: HTML5 + CSS3 + JavaScript (ES6)
- **通信库**: SockJS + STOMP
- **运行环境**: 现代浏览器 (Chrome, Firefox, Edge等)
- **支持系统**: Windows Web端

## 服务器端部署流程 (openEuler系统)

### 1. 环境准备

```bash
# 更新系统
sudo yum update -y

# 安装Java 17
sudo yum install java-17-openjdk-devel -y

# 验证Java安装
java -version

# 安装Maven (用于构建)
sudo yum install maven -y
```

### 2. 获取项目代码

```bash
# 克隆项目或上传项目文件到服务器
# 假设项目目录为 /opt/chat-app
cd /opt
mkdir chat-app
# 上传所有项目文件到此目录
```

### 3. 构建项目

```bash
cd /opt/chat-app
mvn clean package -DskipTests
```

构建成功后，会在 `target/` 目录下生成 `Chat-0.0.1-SNAPSHOT.jar` 文件。

### 4. 运行服务器

#### 方式一：直接运行
```bash
cd /opt/chat-app/target
java -jar Chat-0.0.1-SNAPSHOT.jar
```

#### 方式二：后台运行 (使用nohup)
```bash
cd /opt/chat-app/target
nohup java -jar Chat-0.0.1-SNAPSHOT.jar > chat.log 2>&1 &
```

#### 方式三：使用systemd服务 (推荐)

创建服务文件：
```bash
sudo vi /etc/systemd/system/chat.service
```

添加以下内容：
```ini
[Unit]
Description=Chat Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/chat-app/target
ExecStart=/usr/bin/java -jar Chat-0.0.1-SNAPSHOT.jar
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启用并启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable chat.service
sudo systemctl start chat.service
sudo systemctl status chat.service
```

### 5. 防火墙配置

```bash
# 开放8080端口
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# 验证端口开放
sudo firewall-cmd --list-ports
```

### 6. 验证部署

访问以下URL验证服务器是否正常运行：
- 服务器状态: `http://123.249.34.2:8080`
- WebSocket端点: `ws://123.249.34.2:8080/ws-chat`
- 在线用户API: `http://123.249.34.2:8080/api/online-users`

## 客户端使用流程

### 1. 访问聊天界面

在Windows系统的浏览器中打开：
```
http://123.249.34.2:8080
```

### 2. 操作步骤

#### 第一步：设置用户名
1. 在左侧面板的"用户设置"区域输入用户名
2. 用户名要求：1-20个字符，不能包含特殊字符
3. 点击"连接聊天"按钮

#### 第二步：选择聊天对象
1. 在"在线用户"列表中可以看到所有在线用户
2. 点击"所有人"进行群聊
3. 点击特定用户名进行私聊
4. 当前聊天对象会高亮显示

#### 第三步：发送消息
1. 在底部输入框输入消息内容
2. 按"Enter"发送消息，按"Ctrl+Enter"换行
3. 或点击发送按钮(纸飞机图标)

#### 第四步：发送文件/图片
1. 点击"回形针"图标发送普通文件
2. 点击"图片"图标发送图片文件
3. 在弹出的对话框中选择文件
4. 点击"发送文件"按钮

#### 第五步：管理聊天
1. 切换聊天对象：点击左侧不同的用户
2. 查看历史消息：切换用户时会自动加载历史记录
3. 下载文件：点击文件消息中的"下载文件"链接
4. 查看图片：点击图片可以放大/缩小

#### 第六步：断开连接
1. 点击"断开连接"按钮退出聊天
2. 系统会自动保存聊天历史到浏览器本地存储

## 功能说明

### 1. 文字聊天
- 支持实时文字消息发送和接收
- 消息显示发送者、时间和内容
- 自动滚动到最新消息

### 2. 文件传输
- 支持任意类型文件传输
- 文件大小限制：10MB
- 自动显示文件名和大小
- 提供下载功能

### 3. 图片传输
- 支持常见图片格式 (JPG, PNG, GIF等)
- 自动显示图片预览
- 点击图片可放大查看
- 保持原始图片质量

### 4. 私聊功能
- 一对一私密聊天
- 切换聊天对象时自动切换对话内容
- 独立的聊天历史记录
- 在线用户状态显示

### 5. 群聊功能
- "所有人"模式为群聊
- 所有在线用户都能看到群聊消息
- 适合小组讨论

### 6. 用户管理
- 实时显示在线用户列表
- 用户加入/离开系统通知
- 用户头像显示（基于用户名首字母）

### 7. 数据持久化
- 聊天历史自动保存到浏览器本地存储
- 支持离线查看历史记录
- 切换设备后历史记录不保留（如需持久化需服务器端存储）

## 故障排除

### 常见问题

#### 1. 无法连接服务器
- 检查服务器IP和端口是否正确
- 确认服务器防火墙已开放8080端口
- 验证服务器进程是否正常运行
- 检查浏览器控制台是否有错误信息

#### 2. 文件上传失败
- 确认文件大小不超过10MB
- 检查网络连接是否稳定
- 尝试重新选择文件
- 查看服务器日志是否有错误

#### 3. 消息发送失败
- 确认已连接到服务器
- 检查用户名是否已设置
- 刷新页面重新连接
- 查看浏览器控制台错误

#### 4. 用户列表不更新
- 等待几秒后刷新页面
- 检查WebSocket连接状态
- 确认其他用户已正确连接

### 日志查看

#### 服务器日志
```bash
# 查看实时日志
sudo journalctl -u chat.service -f

# 查看最近100行日志
sudo journalctl -u chat.service -n 100

# 如果使用nohup方式，查看日志文件
tail -f /opt/chat-app/target/chat.log
```

#### 客户端日志
- 打开浏览器开发者工具 (F12)
- 查看Console标签页的输出
- 查看Network标签页的网络请求

## 性能优化建议

### 服务器端
1. **增加JVM内存**：
   ```bash
   java -Xms512m -Xmx1024m -jar Chat-0.0.1-SNAPSHOT.jar
   ```

2. **使用Nginx反向代理**：
   ```nginx
   location / {
       proxy_pass http://localhost:8080;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

3. **启用GZIP压缩**：
   在application.properties中添加：
   ```
   server.compression.enabled=true
   server.compression.mime-types=text/html,text/css,application/javascript,application/json
   ```

### 客户端
1. **清理本地存储**：定期清理浏览器本地存储的聊天历史
2. **限制文件大小**：大文件建议压缩后再发送
3. **使用现代浏览器**：推荐Chrome 90+或Firefox 88+

## 安全注意事项

1. **服务器安全**：
   - 定期更新系统和Java版本
   - 配置防火墙只允许必要端口
   - 使用HTTPS加密通信（生产环境）
   - 定期备份重要数据

2. **客户端安全**：
   - 不要分享敏感文件
   - 定期清理聊天历史
   - 使用强密码保护设备
   - 注意文件来源，防止病毒传播

3. **网络安全**：
   - 建议在局域网内使用
   - 如需公网访问，配置SSL证书
   - 限制最大连接数防止DDoS攻击

## 扩展功能建议

如需进一步开发，可考虑以下功能：

1. **消息加密**：端到端加密保护隐私
2. **群组管理**：创建和管理聊天群组
3. **消息撤回**：发送后一定时间内可撤回
4. **离线消息**：用户离线时存储消息
5. **消息搜索**：按内容或时间搜索历史消息
6. **多设备同步**：跨设备同步聊天记录
7. **语音/视频**：集成WebRTC支持音视频通话

## 技术支持

如有问题，请检查：
1. 项目文档和本指南
2. 服务器和客户端日志
3. 浏览器开发者工具控制台
4. Spring Boot官方文档

如需进一步帮助，请联系系统管理员或开发团队。
