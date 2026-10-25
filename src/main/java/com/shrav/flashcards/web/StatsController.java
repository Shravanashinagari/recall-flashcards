package com.shrav.flashcards.web;

import com.shrav.flashcards.repo.CardRepository;
import com.shrav.flashcards.repo.DeckRepository;
import com.shrav.flashcards.repo.ReviewLogRepository;
import com.shrav.flashcards.web.Dtos.DayCount;
import com.shrav.flashcards.web.Dtos.DeckProgress;
import com.shrav.flashcards.web.Dtos.StatsResponse;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private static final int HEATMAP_DAYS = 84; // 12 weeks

    private final CardRepository cards;
    private final DeckRepository decks;
    private final ReviewLogRepository logs;

    public StatsController(CardRepository cards, DeckRepository decks, ReviewLogRepository logs) {
        this.cards = cards;
        this.decks = decks;
        this.logs = logs;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public StatsResponse stats() {
        LocalDate today = LocalDate.now();

        // reviews per day for the last year (enough for streaks + heatmap)
        Map<LocalDate, Long> perDay = logs
                .findByReviewedAtGreaterThanEqual(today.minusDays(364).atStartOfDay()).stream()
                .collect(Collectors.groupingBy(l -> l.getReviewedAt().toLocalDate(), Collectors.counting()));

        // streak = consecutive days with at least one review.
        // If you haven't studied yet today, yesterday's streak is still alive.
        int streak = 0;
        LocalDate day = perDay.containsKey(today) ? today : today.minusDays(1);
        while (perDay.containsKey(day)) {
            streak++;
            day = day.minusDays(1);
        }

        List<DayCount> heatmap = IntStream.range(0, HEATMAP_DAYS)
                .mapToObj(i -> {
                    LocalDate d = today.minusDays(HEATMAP_DAYS - 1 - i);
                    return new DayCount(d, perDay.getOrDefault(d, 0L));
                })
                .toList();
        List<DayCount> last7 = new ArrayList<>(heatmap.subList(HEATMAP_DAYS - 7, HEATMAP_DAYS));

        long totalReviews = logs.count();
        long goodReviews = logs.countByQualityGreaterThanEqual(3);
        int accuracy = totalReviews == 0 ? 0 : (int) Math.round(100.0 * goodReviews / totalReviews);

        List<DeckProgress> deckProgress = decks.findAll().stream()
                .map(d -> new DeckProgress(d.getId(), d.getName(),
                        cards.countByDeckId(d.getId()),
                        cards.countByDeckIdAndRepetitionsGreaterThan(d.getId(), 0),
                        cards.countByDeckIdAndIntervalDaysGreaterThanEqual(d.getId(), 21)))
                .toList();

        return new StatsResponse(
                cards.count(),
                cards.countByDueDateLessThanEqual(today),
                cards.countByRepetitionsGreaterThan(0),
                cards.countByIntervalDaysGreaterThanEqual(21),
                logs.countByReviewedAtGreaterThanEqual(today.atStartOfDay()),
                streak, accuracy, totalReviews,
                last7, heatmap, deckProgress);
    }
}
