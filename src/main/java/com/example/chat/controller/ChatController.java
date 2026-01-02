package com.example.chat.controller;

import com.example.chat.model.ChatMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    
    // 存储在线用户
    private final Set<String> onlineUsers = ConcurrentHashMap.newKeySet();
    
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
     * 处理私聊消息
     */
    @MessageMapping("/chat.private")
    public void sendPrivateMessage(@Payload ChatMessage message) {
        message.setTimestamp(LocalDateTime.now());
        
        String sender = message.getSender();
        String receiver = message.getReceiver();
        
        // 如果接收者为null或"所有人"，则广播给所有用户
        if (receiver == null || "所有人".equals(receiver)) {
            messagingTemplate.convertAndSend("/topic/public", message);
        } else {
            // 发送给接收者（使用用户目的地）
            messagingTemplate.convertAndSendToUser(
                receiver, 
                "/queue/private", 
                message
            );
            
            // 同时发送给发送者自己（用于确认发送成功）
            messagingTemplate.convertAndSendToUser(
                sender,
                "/queue/private",
                message
            );
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
     * 发送在线用户列表给所有客户端
     */
    private void sendOnlineUsers() {
        messagingTemplate.convertAndSend("/topic/online-users", new HashSet<>(onlineUsers));
    }
}
