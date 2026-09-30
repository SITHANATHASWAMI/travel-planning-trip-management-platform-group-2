package com.tripnest.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.tripnest.dto.TravelDocumentResponse;
import com.tripnest.exception.AccessDeniedCustomException;
import com.tripnest.exception.ResourceNotFoundException;
import com.tripnest.model.TravelDocument;
import com.tripnest.model.Trip;
import com.tripnest.model.User;
import com.tripnest.repository.TravelDocumentRepository;
import com.tripnest.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class TravelDocumentService {

    private final TravelDocumentRepository docRepo;
    private final UserRepository           userRepo;
    private final TripAccessService        tripAccessService;
    private final Cloudinary               cloudinary;

    @Value("${app.upload.dir:uploads/documents}")
    private String uploadDir;

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    public TravelDocumentService(TravelDocumentRepository docRepo,
                                 UserRepository userRepo,
                                 TripAccessService tripAccessService,
                                 Cloudinary cloudinary) {
        this.docRepo           = docRepo;
        this.userRepo          = userRepo;
        this.tripAccessService = tripAccessService;
        this.cloudinary        = cloudinary;
    }

    /** Returns true when Cloudinary is properly configured */
    private boolean cloudinaryEnabled() {
        return cloudName != null && !cloudName.isBlank() && !cloudName.equals("mdewyv04_disabled");
    }

    /* ── Upload a file ── */
    public TravelDocumentResponse upload(String email, Long tripId,
                                         MultipartFile file,
                                         String docTypeStr,
                                         String description) throws IOException {
        User user = findUser(email);
        Trip trip = tripAccessService.findAccessibleTrip(email, tripId);

        // Determine document type safely
        TravelDocument.DocType docType;
        try {
            docType = TravelDocument.DocType.valueOf(
                    docTypeStr != null ? docTypeStr.toUpperCase() : "OTHER");
        } catch (IllegalArgumentException e) {
            docType = TravelDocument.DocType.OTHER;
        }

        String originalName = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "file");
        String fileUrl;
        String publicId = null;

        if (cloudinaryEnabled()) {
            // ── Upload to Cloudinary ──────────────────────────────────────
            String folder = "tripnest/trip-" + tripId;
            String ext = originalName.contains(".")
                    ? originalName.substring(originalName.lastIndexOf('.') + 1).toLowerCase() : "";

            // Determine resource type
            String resourceType = "auto"; // handles images, PDFs, docs

            Map<?, ?> uploadResult = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "folder", folder,
                            "resource_type", resourceType,
                            "public_id", UUID.randomUUID().toString(),
                            "overwrite", true
                    )
            );
            fileUrl  = (String) uploadResult.get("secure_url");
            publicId = (String) uploadResult.get("public_id");
        } else {
            // ── Fallback: local filesystem ────────────────────────────────
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);
            String ext = originalName.contains(".")
                    ? originalName.substring(originalName.lastIndexOf('.')) : "";
            String stored   = UUID.randomUUID() + ext;
            Path   filePath = uploadPath.resolve(stored);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            fileUrl = "/api/trips/" + tripId + "/documents/files/" + stored;
        }

        TravelDocument doc = new TravelDocument();
        doc.setTrip(trip);
        doc.setUploadedBy(user);
        doc.setFileName(originalName);
        doc.setFileUrl(fileUrl);
        if (publicId != null) doc.setCloudinaryPublicId(publicId);
        doc.setContentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        doc.setFileSize(file.getSize());
        doc.setDocType(docType);
        doc.setDescription(description);
        docRepo.save(doc);

        return TravelDocumentResponse.fromEntity(doc);
    }

    /* ── List documents for a trip ── */
    @Transactional(readOnly = true)
    public List<TravelDocumentResponse> getDocuments(String email, Long tripId) {
        tripAccessService.findAccessibleTrip(email, tripId);
        return docRepo.findByTripIdOrderByUploadedAtDesc(tripId)
                .stream().map(TravelDocumentResponse::fromEntity).collect(Collectors.toList());
    }

    /* ── Delete a document ── */
    public void delete(String email, Long tripId, Long docId) {
        Trip trip = tripAccessService.findAccessibleTrip(email, tripId);
        TravelDocument doc = docRepo.findById(docId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        if (!doc.getTrip().getId().equals(tripId)) {
            throw new ResourceNotFoundException("Document not found for this trip");
        }
        boolean canDelete = doc.getUploadedBy().getEmail().equalsIgnoreCase(email)
                || trip.getOwner().getEmail().equalsIgnoreCase(email);
        if (!canDelete) {
            throw new AccessDeniedCustomException("You cannot delete this document");
        }

        // Delete from Cloudinary if applicable
        if (doc.getCloudinaryPublicId() != null && !doc.getCloudinaryPublicId().isBlank()) {
            try {
                cloudinary.uploader().destroy(doc.getCloudinaryPublicId(),
                        ObjectUtils.asMap("resource_type", "auto"));
            } catch (Exception ignored) {}
        } else {
            // Local filesystem fallback
            try {
                String stored  = doc.getFileUrl().substring(doc.getFileUrl().lastIndexOf('/') + 1);
                Path   filePath = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(stored);
                Files.deleteIfExists(filePath);
            } catch (IOException ignored) {}
        }

        docRepo.delete(doc);
    }

    /* ── Serve raw file bytes (local fallback only) ── */
    @Transactional(readOnly = true)
    public Path getFilePath(String storedName) {
        return Paths.get(uploadDir).toAbsolutePath().normalize().resolve(storedName);
    }

    private User findUser(String email) {
        return userRepo.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
