package com.shrav.flashcards.web;

import com.shrav.flashcards.model.Card;
import com.shrav.flashcards.model.Deck;
import com.shrav.flashcards.model.Note;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/** Request/response shapes for the REST API. */
public final class Dtos {

    private Dtos() {}

    /** "Java, Collections ,java" -> "java,collections" (lower-case, trimmed, de-duplicated). */
    public static String normalizeTags(String raw) {
        if (raw == null) return null;
        String joined = Arrays.stream(raw.split(","))
                .map(String::trim)
                .map(String::toLowerCase)
                .filter(s -> !s.isEmpty())
                .distinct()
                .collect(Collectors.joining(","));
        return joined.isEmpty() ? null : joined;
    }

    // ---------- decks ----------
    public record DeckRequest(@NotBlank @Size(max = 100) String name,
                              @Size(max = 255) String description) {}

    public record DeckResponse(Long id, String name, String description, long total, long due) {
        public static DeckResponse of(Deck d, long total, long due) {
            return new DeckResponse(d.getId(), d.getName(), d.getDescription(), total, due);
        }
    }

    // ---------- cards ----------
    public record CardRequest(@NotNull Long deckId,
                              @NotBlank @Size(max = 2000) String question,
                              @NotBlank @Size(max = 5000) String answer,
                              @Size(max = 255) String tags) {}

    public record CardResponse(Long id, Long deckId, String deckName, String question, String answer,
                               String tags, int repetitions, double easeFactor, int intervalDays,
                               LocalDate dueDate) {
        public static CardResponse of(Card c) {
            return new CardResponse(c.getId(), c.getDeck().getId(), c.getDeck().getName(),
                    c.getQuestion(), c.getAnswer(), c.getTags(), c.getRepetitions(),
                    Math.round(c.getEaseFactor() * 100.0) / 100.0,
                    c.getIntervalDays(), c.getDueDate());
        }
    }

    // ---------- reviews ----------
    public record ReviewRequest(@Min(0) @Max(5) int quality) {}

    public record ReviewResult(Long cardId, int intervalDays, LocalDate nextDue, double easeFactor) {}

    // ---------- notes ----------
    public record NoteRequest(@NotBlank @Size(max = 200) String title,
                              @NotBlank @Size(max = 20000) String content,
                              @Size(max = 255) String tags,
                              Boolean pinned) {}

    public record NoteResponse(Long id, String title, String content, String tags, boolean pinned,
                               LocalDateTime createdAt, LocalDateTime updatedAt) {
        public static NoteResponse of(Note n) {
            return new NoteResponse(n.getId(), n.getTitle(), n.getContent(), n.getTags(),
                    n.isPinned(), n.getCreatedAt(), n.getUpdatedAt());
        }
    }

    // ---------- stats ----------
    public record DayCount(LocalDate date, long count) {}

    public record DeckProgress(Long deckId, String name, long total, long learned, long mature) {}

    public record StatsResponse(long totalCards, long dueToday, long learned, long mature,
                                long reviewedToday, int streak, int accuracy, long totalReviews,
                                List<DayCount> last7Days, List<DayCount> heatmap,
                                List<DeckProgress> deckProgress) {}

    // ---------- backup / restore ----------
    public record ExportCard(String question, String answer, String tags) {}

    public record ExportDeck(String name, String description, List<ExportCard> cards) {}

    public record ExportNote(String title, String content, String tags, boolean pinned) {}

    public record ExportData(List<ExportDeck> decks, List<ExportNote> notes) {}
}
