package com.shrav.flashcards.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "review_logs", indexes = @Index(name = "idx_logs_time", columnList = "reviewed_at"))
public class ReviewLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "card_id", nullable = false)
    private Long cardId;

    @Column(nullable = false)
    private int quality;

    @Column(name = "reviewed_at", nullable = false)
    private LocalDateTime reviewedAt = LocalDateTime.now();

    public ReviewLog() {}

    public ReviewLog(Long cardId, int quality) {
        this.cardId = cardId;
        this.quality = quality;
    }

    public Long getId() { return id; }
    public Long getCardId() { return cardId; }
    public int getQuality() { return quality; }
    public LocalDateTime getReviewedAt() { return reviewedAt; }
}
