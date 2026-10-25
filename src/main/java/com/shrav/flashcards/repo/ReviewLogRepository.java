package com.shrav.flashcards.repo;

import com.shrav.flashcards.model.ReviewLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface ReviewLogRepository extends JpaRepository<ReviewLog, Long> {

    long countByReviewedAtGreaterThanEqual(LocalDateTime from);

    long countByQualityGreaterThanEqual(int quality);

    List<ReviewLog> findByReviewedAtGreaterThanEqual(LocalDateTime from);

    @Modifying
    @Query("delete from ReviewLog l where l.cardId in (select c.id from Card c where c.deck.id = :deckId)")
    void deleteByDeckId(Long deckId);

    @Modifying
    @Query("delete from ReviewLog l where l.cardId = :cardId")
    void deleteByCardId(Long cardId);
}
