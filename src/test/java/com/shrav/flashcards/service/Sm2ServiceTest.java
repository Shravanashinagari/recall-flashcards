package com.shrav.flashcards.service;

import com.shrav.flashcards.model.Card;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class Sm2ServiceTest {

    private final Sm2Service sm2 = new Sm2Service();
    private final LocalDate today = LocalDate.of(2026, 10, 24);

    @Test
    void firstSecondAndThirdGoodReviewsFollowSm2Intervals() {
        Card c = new Card();

        sm2.apply(c, 4, today);
        assertEquals(1, c.getIntervalDays());
        assertEquals(1, c.getRepetitions());

        sm2.apply(c, 4, today);
        assertEquals(6, c.getIntervalDays());
        assertEquals(2, c.getRepetitions());

        sm2.apply(c, 4, today);
        assertEquals(15, c.getIntervalDays()); // round(6 * 2.5)
        assertEquals(today.plusDays(15), c.getDueDate());
    }

    @Test
    void failingResetsRepetitionsAndIntervalButKeepsEaseAboveFloor() {
        Card c = new Card();
        sm2.apply(c, 5, today);
        sm2.apply(c, 5, today);

        sm2.apply(c, 1, today);
        assertEquals(0, c.getRepetitions());
        assertEquals(1, c.getIntervalDays());
        assertTrue(c.getEaseFactor() >= Sm2Service.MIN_EASE);
    }

    @Test
    void easeFactorNeverDropsBelowMinimum() {
        Card c = new Card();
        for (int i = 0; i < 20; i++) sm2.apply(c, 0, today);
        assertEquals(Sm2Service.MIN_EASE, c.getEaseFactor(), 1e-9);
    }

    @Test
    void invalidQualityIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> sm2.apply(new Card(), 6, today));
        assertThrows(IllegalArgumentException.class, () -> sm2.apply(new Card(), -1, today));
    }
}
