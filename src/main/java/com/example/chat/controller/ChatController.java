package com.example.chat.controller;

import com.example.chat.model.ChatMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    
    // 存储在线用户
    private final Set<String> onlineUsers = ConcurrentHashMap.newKeySet();
    
    // 存储聊天记录：key为"用户1-用户2"或"用户-所有人"
    private final Map<String, List<ChatMessage>> chatHistories = new ConcurrentHashMap<>();
    
    public ChatController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }
    
    /**
     * 处理用户加入聊天
     */
    @MessageMapping("/chat.join")
    public void joinChat(@Payload ChatMessage message, SimpMessageHeaderAccessor headerAccessor) {
        String username = message.getSender();
        
        // 将用户添加到在线用户列表
        onlineUsers.add(username);
        
        // 设置用户会话属性
        headerAccessor.getSessionAttributes().put("username", username);
        
        // 更新消息
        message.setType(ChatMessage.MessageType.JOIN);
        message.setTimestamp(LocalDateTime.now());
        message.setContent(username + " 加入了聊天");
        
        // 广播用户加入消息（给所有用户）
        messagingTemplate.convertAndSend("/topic/public", message);
        
        // 发送当前在线用户列表给所有用户
        sendOnlineUsers();
    }
    
    /**
     * 处理用户离开聊天
     */
    @MessageMapping("/chat.leave")
    public void leaveChat(@Payload ChatMessage message) {
        String username = message.getSender();
        
        // 从在线用户列表中移除
        onlineUsers.remove(username);
        
        // 更新消息
        message.setType(ChatMessage.MessageType.LEAVE);
        message.setTimestamp(LocalDateTime.now());
        message.setContent(username + " 离开了聊天");
        
        // 广播用户离开消息
        messagingTemplate.convertAndSend("/topic/public", message);
        
        // 发送更新后的在线用户列表
        sendOnlineUsers();
    }
    
    /**
     * 处理聊天消息
     */
    @MessageMapping("/chat.message")
    public void sendMessage(@Payload ChatMessage message) {
        message.setTimestamp(LocalDateTime.now());
        
        String sender = message.getSender();
        String receiver = message.getReceiver();
        
        // 保存聊天记录
        saveChatMessage(message);
        
        // 如果接收者为null或"所有人"，则广播给所有用户
        if (receiver == null || "所有人".equals(receiver)) {
            messagingTemplate.convertAndSend("/topic/public", message);
        } else {
            // 私聊：只发送给接收者，不发送回发送者
            messagingTemplate.convertAndSendToUser(receiver, "/queue/private", message);
        }
    }
    
    /**
     * 获取在线用户列表
     */
    @GetMapping("/api/online-users")
    @ResponseBody
    public Set<String> getOnlineUsers() {
        return new HashSet<>(onlineUsers);
    }
    
    /**
     * 获取聊天历史
     */
    @GetMapping("/api/chat-history")
    @ResponseBody
    public List<ChatMessage> getChatHistory(
            @RequestParam String user1,
            @RequestParam String user2) {
        String chatKey = getChatKey(user1, user2);
        return chatHistories.getOrDefault(chatKey, new ArrayList<>());
    }
    
    /**
     * 清空聊天历史
     */
    @DeleteMapping("/api/clear-chat-history")
    @ResponseBody
    public ResponseEntity<String> clearChatHistory(
            @RequestParam String user1,
            @RequestParam String user2) {
        String chatKey = getChatKey(user1, user2);
        chatHistories.remove(chatKey);
        return ResponseEntity.ok("聊天历史已清空");
    }
    
    /**
     * 发送在线用户列表给所有客户端
     */
    private void sendOnlineUsers() {
        messagingTemplate.convertAndSend("/topic/online-users", new HashSet<>(onlineUsers));
    }
    
    /**
     * 保存聊天消息
     */
    private void saveChatMessage(ChatMessage message) {
        String sender = message.getSender();
        String receiver = message.getReceiver();
        
        if (receiver == null || "所有人".equals(receiver)) {
            // 群聊消息：只保存到"所有人"的聊天记录
            String chatKey = getChatKey(sender, "所有人");
            chatHistories.computeIfAbsent(chatKey, k -> new ArrayList<>()).add(message);
        } else {
            // 私聊消息：保存到双方聊天记录
            String chatKey = getChatKey(sender, receiver);
            chatHistories.computeIfAbsent(chatKey, k -> new ArrayList<>()).add(message);
        }
        
        // 限制历史记录大小
        List<ChatMessage> history = chatHistories.get(getChatKey(
            receiver == null || "所有人".equals(receiver) ? "所有人" : receiver,
            sender
        ));
        if (history != null && history.size() > 100) {
            history.remove(0);
        }
    }
    
    /**
     * 生成聊天键（保证顺序一致）
     */
    private String getChatKey(String user1, String user2) {
        if (user1.compareTo(user2) < 0) {
            return user1 + "-" + user2;
        } else {
            return user2 + "-" + user1;
        }
    }
}
