package com.tripnest.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "travel_documents")
public class TravelDocument {

    public enum DocType {
        TICKET, HOTEL_BOOKING, PASSPORT, VISA, INSURANCE, PHOTO, OTHER
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uploaded_by_id", nullable = false)
    private User uploadedBy;

    @Column(nullable = false, length = 200)
    private String fileName;

    @Column(nullable = false, length = 300)
    private String fileUrl;          // local path or cloud URL

    @Column(length = 300)
    private String cloudinaryPublicId; // Cloudinary public_id for deletion

    @Column(nullable = false, length = 100)
    private String contentType;      // e.g. application/pdf, image/jpeg

    private Long fileSize;           // bytes

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DocType docType = DocType.OTHER;

    @Column(length = 500)
    private String description;

    @Column(updatable = false)
    private LocalDateTime uploadedAt;

    @PrePersist
    protected void onCreate() { this.uploadedAt = LocalDateTime.now(); }

    public TravelDocument() {}

    public Long getId()                           { return id; }
    public Trip getTrip()                         { return trip; }
    public void setTrip(Trip t)                   { this.trip = t; }
    public User getUploadedBy()                   { return uploadedBy; }
    public void setUploadedBy(User u)             { this.uploadedBy = u; }
    public String getFileName()                   { return fileName; }
    public void setFileName(String s)             { this.fileName = s; }
    public String getFileUrl()                    { return fileUrl; }
    public void setFileUrl(String s)              { this.fileUrl = s; }
    public String getCloudinaryPublicId()         { return cloudinaryPublicId; }
    public void setCloudinaryPublicId(String s)   { this.cloudinaryPublicId = s; }
    public String getContentType()                { return contentType; }
    public void setContentType(String s)          { this.contentType = s; }
    public Long getFileSize()                     { return fileSize; }
    public void setFileSize(Long s)               { this.fileSize = s; }
    public DocType getDocType()                   { return docType; }
    public void setDocType(DocType d)             { this.docType = d; }
    public String getDescription()                { return description; }
    public void setDescription(String s)          { this.description = s; }
    public LocalDateTime getUploadedAt()          { return uploadedAt; }
}
