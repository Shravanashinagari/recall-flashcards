package com.shrav.flashcards.web;

import com.shrav.flashcards.model.Deck;
import com.shrav.flashcards.repo.CardRepository;
import com.shrav.flashcards.repo.DeckRepository;
import com.shrav.flashcards.repo.ReviewLogRepository;
import com.shrav.flashcards.web.Dtos.DeckRequest;
import com.shrav.flashcards.web.Dtos.DeckResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/decks")
public class DeckController {

    private final DeckRepository decks;
    private final CardRepository cards;
    private final ReviewLogRepository logs;

    public DeckController(DeckRepository decks, CardRepository cards, ReviewLogRepository logs) {
        this.decks = decks;
        this.cards = cards;
        this.logs = logs;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<DeckResponse> list() {
        LocalDate today = LocalDate.now();
        return decks.findAll().stream()
                .map(d -> DeckResponse.of(d,
                        cards.countByDeckId(d.getId()),
                        cards.countByDeckIdAndDueDateLessThanEqual(d.getId(), today)))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DeckResponse create(@Valid @RequestBody DeckRequest req) {
        Deck saved = decks.save(new Deck(req.name().trim(),
                req.description() == null ? null : req.description().trim()));
        return DeckResponse.of(saved, 0, 0);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Long id) {
        if (!decks.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Deck not found");
        }
        logs.deleteByDeckId(id);
        cards.deleteByDeckId(id);
        decks.deleteById(id);
    }
}
