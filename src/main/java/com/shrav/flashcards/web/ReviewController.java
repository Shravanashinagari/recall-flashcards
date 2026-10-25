package com.shrav.flashcards.web;

import com.shrav.flashcards.model.Card;
import com.shrav.flashcards.model.ReviewLog;
import com.shrav.flashcards.repo.CardRepository;
import com.shrav.flashcards.repo.ReviewLogRepository;
import com.shrav.flashcards.service.Sm2Service;
import com.shrav.flashcards.web.Dtos.CardResponse;
import com.shrav.flashcards.web.Dtos.ReviewRequest;
import com.shrav.flashcards.web.Dtos.ReviewResult;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/review")
public class ReviewController {

    private final CardRepository cards;
    private final ReviewLogRepository logs;
    private final Sm2Service sm2;

    public ReviewController(CardRepository cards, ReviewLogRepository logs, Sm2Service sm2) {
        this.cards = cards;
        this.logs = logs;
        this.sm2 = sm2;
    }

    /** Cards due today or earlier. Optional ?deckId= to limit to one deck. */
    @GetMapping("/due")
    @Transactional(readOnly = true)
    public List<CardResponse> due(@RequestParam(required = false) Long deckId) {
        LocalDate today = LocalDate.now();
        List<Card> list = (deckId == null) ? cards.findDue(today) : cards.findDueByDeck(deckId, today);
        return list.stream().map(CardResponse::of).toList();
    }

    /** Submit a rating (0..5) for a card; SM-2 reschedules it. */
    @PostMapping("/{cardId}")
    @Transactional
    public ReviewResult review(@PathVariable Long cardId, @Valid @RequestBody ReviewRequest req) {
        Card card = cards.findById(cardId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Card not found"));
        sm2.apply(card, req.quality(), LocalDate.now());
        card.setLastReviewedAt(LocalDateTime.now());
        logs.save(new ReviewLog(card.getId(), req.quality()));
        return new ReviewResult(card.getId(), card.getIntervalDays(), card.getDueDate(),
                Math.round(card.getEaseFactor() * 100.0) / 100.0);
    }
}
