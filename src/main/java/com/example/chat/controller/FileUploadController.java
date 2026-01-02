package com.example.chat.controller;

import com.example.chat.model.ChatMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
public class FileUploadController {

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    /**
     * 上传文件
     */
    @PostMapping("/upload")
    public ResponseEntity<ChatMessage> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("sender") String sender,
            @RequestParam("receiver") String receiver) {
        
        try {
            // 创建上传目录
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // 生成唯一文件名
            String originalFilename = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String uniqueFilename = UUID.randomUUID().toString() + fileExtension;

            // 保存文件
            Path filePath = uploadPath.resolve(uniqueFilename);
            Files.copy(file.getInputStream(), filePath);

            // 创建消息对象
            ChatMessage message = new ChatMessage();
            message.setType(file.getContentType().startsWith("image/") ? 
                ChatMessage.MessageType.IMAGE : ChatMessage.MessageType.FILE);
            message.setSender(sender);
            message.setReceiver("所有人".equals(receiver) ? null : receiver);
            message.setContent("/api/files/download/" + uniqueFilename); // 文件访问URL
            message.setFileName(originalFilename);
            message.setFileType(file.getContentType());
            message.setFileSize(file.getSize());
            message.setTimestamp(LocalDateTime.now());

            return ResponseEntity.ok(message);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 下载文件
     */
    @GetMapping("/download/{filename}")
    public ResponseEntity<byte[]> downloadFile(@PathVariable String filename) {
        try {
            Path filePath = Paths.get(uploadDir).resolve(filename);
            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            byte[] fileContent = Files.readAllBytes(filePath);
            
            // 根据文件扩展名确定Content-Type
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .header("Content-Type", contentType)
                    .header("Content-Disposition", "attachment; filename=\"" + filename + "\"")
                    .body(fileContent);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
