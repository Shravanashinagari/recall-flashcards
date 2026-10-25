package com.shrav.flashcards.repo;

import com.shrav.flashcards.model.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface CardRepository extends JpaRepository<Card, Long> {

    @Query("select c from Card c join fetch c.deck where c.deck.id = :deckId order by c.id desc")
    List<Card> findByDeckId(Long deckId);

    @Query("select c from Card c join fetch c.deck order by c.id desc")
    List<Card> findAllWithDeck();

    @Query("select c from Card c join fetch c.deck where lower(c.question) like lower(concat('%', :q, '%')) "
            + "or lower(c.answer) like lower(concat('%', :q, '%')) "
            + "or lower(coalesce(c.tags, '')) like lower(concat('%', :q, '%')) "
            + "order by c.id desc")
    List<Card> search(String q);

    @Query("select c from Card c join fetch c.deck where c.dueDate <= :today order by c.dueDate asc, c.id asc")
    List<Card> findDue(LocalDate today);

    @Query("select c from Card c join fetch c.deck where c.deck.id = :deckId and c.dueDate <= :today order by c.dueDate asc, c.id asc")
    List<Card> findDueByDeck(Long deckId, LocalDate today);

    long countByDeckId(Long deckId);

    long countByDeckIdAndDueDateLessThanEqual(Long deckId, LocalDate today);

    long countByDeckIdAndIntervalDaysGreaterThanEqual(Long deckId, int days);

    long countByDeckIdAndRepetitionsGreaterThan(Long deckId, int repetitions);

    long countByDueDateLessThanEqual(LocalDate today);

    long countByRepetitionsGreaterThan(int repetitions);

    long countByIntervalDaysGreaterThanEqual(int days);

    @Modifying
    @Query("delete from Card c where c.deck.id = :deckId")
    void deleteByDeckId(Long deckId);
}
