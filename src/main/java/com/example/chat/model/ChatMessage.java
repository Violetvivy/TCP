package com.example.chat.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ChatMessage {
    // 消息类型：TEXT-文本，FILE-文件，IMAGE-图片
    private MessageType type;
    
    // 发送者用户名
    private String sender;
    
    // 接收者用户名（私聊时使用）
    private String receiver;
    
    // 消息内容（文本内容或文件/图片的base64编码）
    private String content;
    
    // 文件名（如果是文件或图片）
    private String fileName;
    
    // 文件类型（MIME类型）
    private String fileType;
    
    // 文件大小（字节）
    private Long fileSize;
    
    // 发送时间
    private LocalDateTime timestamp;
    
    public enum MessageType {
        TEXT, FILE, IMAGE, JOIN, LEAVE
    }
}
