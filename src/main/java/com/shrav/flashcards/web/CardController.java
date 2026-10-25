package com.shrav.flashcards.web;

import com.shrav.flashcards.model.Card;
import com.shrav.flashcards.model.Deck;
import com.shrav.flashcards.repo.CardRepository;
import com.shrav.flashcards.repo.DeckRepository;
import com.shrav.flashcards.repo.ReviewLogRepository;
import com.shrav.flashcards.web.Dtos.CardRequest;
import com.shrav.flashcards.web.Dtos.CardResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/cards")
public class CardController {

    private final CardRepository cards;
    private final DeckRepository decks;
    private final ReviewLogRepository logs;

    public CardController(CardRepository cards, DeckRepository decks, ReviewLogRepository logs) {
        this.cards = cards;
        this.decks = decks;
        this.logs = logs;
    }

    /**
     * GET /api/cards                 -> every card
     * GET /api/cards?deckId=3        -> cards of one deck
     * GET /api/cards?q=hashmap       -> search question, answer and tags
     * GET /api/cards?deckId=3&q=sql  -> search inside one deck
     */
    @GetMapping
    @Transactional(readOnly = true)
    public List<CardResponse> list(@RequestParam(required = false) Long deckId,
                                   @RequestParam(required = false) String q) {
        List<Card> result;
        if (q != null && !q.isBlank()) {
            result = cards.search(q.trim());
            if (deckId != null) {
                result = result.stream().filter(c -> c.getDeck().getId().equals(deckId)).toList();
            }
        } else if (deckId != null) {
            result = cards.findByDeckId(deckId);
        } else {
            result = cards.findAllWithDeck();
        }
        return result.stream().map(CardResponse::of).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public CardResponse create(@Valid @RequestBody CardRequest req) {
        Deck deck = decks.findById(req.deckId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Deck not found"));
        Card card = new Card(deck, req.question().trim(), req.answer().trim());
        card.setTags(Dtos.normalizeTags(req.tags()));
        return CardResponse.of(cards.save(card));
    }

    @PutMapping("/{id}")
    @Transactional
    public CardResponse update(@PathVariable Long id, @Valid @RequestBody CardRequest req) {
        Card card = cards.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Card not found"));
        Deck deck = decks.findById(req.deckId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Deck not found"));
        card.setDeck(deck);
        card.setQuestion(req.question().trim());
        card.setAnswer(req.answer().trim());
        card.setTags(Dtos.normalizeTags(req.tags()));
        return CardResponse.of(card);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Long id) {
        if (!cards.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Card not found");
        }
        logs.deleteByCardId(id);
        cards.deleteById(id);
    }
}
