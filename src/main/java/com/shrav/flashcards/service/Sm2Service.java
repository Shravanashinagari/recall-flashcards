package com.shrav.flashcards.service;

import com.shrav.flashcards.model.Card;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

/**
 * SuperMemo-2 (SM-2) scheduling algorithm.
 *
 * quality (q) is how well you recalled the answer:
 *   0 = total blackout ... 5 = perfect recall.
 * In the UI we expose four buttons: Again(1), Hard(3), Good(4), Easy(5).
 *
 * Rules:
 *   q < 3   -> start over: repetitions = 0, interval = 1 day
 *   q >= 3  -> repetitions 0 -> 1 day, 1 -> 6 days, otherwise interval = round(interval * EF)
 *   EF'     = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)), never below 1.3
 */
@Service
public class Sm2Service {

    public static final double MIN_EASE = 1.3;

    public void apply(Card card, int quality, LocalDate today) {
        if (quality < 0 || quality > 5) {
            throw new IllegalArgumentException("quality must be between 0 and 5");
        }

        if (quality < 3) {
            card.setRepetitions(0);
            card.setIntervalDays(1);
        } else {
            int reps = card.getRepetitions();
            int interval;
            if (reps == 0) {
                interval = 1;
            } else if (reps == 1) {
                interval = 6;
            } else {
                interval = (int) Math.round(card.getIntervalDays() * card.getEaseFactor());
            }
            card.setIntervalDays(Math.max(1, interval));
            card.setRepetitions(reps + 1);
        }

        double ef = card.getEaseFactor()
                + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        card.setEaseFactor(Math.max(MIN_EASE, ef));

        card.setDueDate(today.plusDays(card.getIntervalDays()));
    }
}
