package com.haodaone.software.service;

import com.haodaone.common.exception.BadRequestException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;

import java.io.IOException;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class SoftwarePackageStorageService {
    private static final Logger log = LoggerFactory.getLogger(SoftwarePackageStorageService.class);
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${app.upload.max-software-package-size-mb:1024}")
    private long maxFileSizeMb;

    @Value("${aws.s3.presigned-url-expiry-minutes:15}")
    private long presignedUrlExpiryMinutes;

    public SoftwarePackageStorageService(S3Client s3Client, S3Presigner s3Presigner) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
    }

    public StoredFile store(MultipartFile file, Long companyId) {
        if (file == null || file.isEmpty()) throw new BadRequestException("Please upload an installer file");
        String originalName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        if (originalName.contains("..") || originalName.contains("/") || originalName.contains("\\")
                || !originalName.toLowerCase().endsWith(".exe")) {
            throw new BadRequestException("Only a safe .exe installer filename is accepted");
        }
        if (file.getSize() > maxFileSizeMb * 1024L * 1024L)
            throw new BadRequestException("Installer exceeds the maximum allowed size");

        try {
            byte[] content = file.getBytes();
            String checksum = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
            String key = "software/" + companyId + "/" + UUID.randomUUID() + ".exe";
            s3Client.putObject(PutObjectRequest.builder().bucket(bucketName).key(key)
                    .contentType("application/vnd.microsoft.portable-executable")
                    .contentLength((long) content.length).build(), RequestBody.fromBytes(content));
            log.info("Stored software installer for company {} as private object {}", companyId, key);
            return new StoredFile(key, checksum, (long) content.length, originalName);
        } catch (IOException e) {
            throw new IllegalStateException("Could not read installer upload", e);
        } catch (Exception e) {
            throw new IllegalStateException("Could not store installer upload", e);
        }
    }

    public String generateDownloadUrl(String key) {
        if (key == null || !key.startsWith("software/")) throw new BadRequestException("Invalid software storage reference");
        GetObjectRequest get = GetObjectRequest.builder().bucket(bucketName).key(key).build();
        return s3Presigner.presignGetObject(GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(presignedUrlExpiryMinutes)).getObjectRequest(get).build())
                .url().toString();
    }

    public record StoredFile(String key, String checksumSha256, long sizeBytes, String originalName) {}
}
