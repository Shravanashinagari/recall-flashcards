package com.shrav.flashcards.web;

import com.shrav.flashcards.model.Card;
import com.shrav.flashcards.model.Deck;
import com.shrav.flashcards.model.Note;
import com.shrav.flashcards.repo.CardRepository;
import com.shrav.flashcards.repo.DeckRepository;
import com.shrav.flashcards.repo.NoteRepository;
import com.shrav.flashcards.web.Dtos.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Export everything as JSON (backup) and import it back (restore / share decks). */
@RestController
@RequestMapping("/api")
public class BackupController {

    private final DeckRepository decks;
    private final CardRepository cards;
    private final NoteRepository notes;

    public BackupController(DeckRepository decks, CardRepository cards, NoteRepository notes) {
        this.decks = decks;
        this.cards = cards;
        this.notes = notes;
    }

    @GetMapping("/export")
    @Transactional(readOnly = true)
    public ExportData export() {
        Map<Long, List<ExportCard>> byDeck = new HashMap<>();
        for (Card c : cards.findAllWithDeck()) {
            byDeck.computeIfAbsent(c.getDeck().getId(), k -> new ArrayList<>())
                    .add(new ExportCard(c.getQuestion(), c.getAnswer(), c.getTags()));
        }
        List<ExportDeck> exportDecks = decks.findAll().stream()
                .map(d -> new ExportDeck(d.getName(), d.getDescription(),
                        byDeck.getOrDefault(d.getId(), List.of())))
                .toList();
        List<ExportNote> exportNotes = notes.findAllByOrderByPinnedDescUpdatedAtDesc().stream()
                .map(n -> new ExportNote(n.getTitle(), n.getContent(), n.getTags(), n.isPinned()))
                .toList();
        return new ExportData(exportDecks, exportNotes);
    }

    /** Adds anything that is not already there (same deck name / same question / same note title). */
    @PostMapping("/import")
    @Transactional
    public Map<String, Integer> importData(@RequestBody ExportData data) {
        int newDecks = 0, newCards = 0, newNotes = 0;

        if (data.decks() != null) {
            for (ExportDeck ed : data.decks()) {
                if (ed == null || blank(ed.name())) continue;
                String name = clip(ed.name().trim(), 100);
                Deck deck = decks.findFirstByNameIgnoreCase(name).orElse(null);
                if (deck == null) {
                    String desc = ed.description() == null ? null : clip(ed.description().trim(), 255);
                    deck = decks.save(new Deck(name, desc));
                    newDecks++;
                }
                Set<String> existing = cards.findByDeckId(deck.getId()).stream()
                        .map(c -> c.getQuestion().trim().toLowerCase())
                        .collect(Collectors.toCollection(HashSet::new));
                if (ed.cards() == null) continue;
                for (ExportCard ec : ed.cards()) {
                    if (ec == null || blank(ec.question()) || blank(ec.answer())) continue;
                    String question = clip(ec.question().trim(), 2000);
                    if (!existing.add(question.toLowerCase())) continue; // duplicate question
                    Card card = new Card(deck, question, clip(ec.answer().trim(), 5000));
                    card.setTags(clip(Dtos.normalizeTags(ec.tags()), 255));
                    cards.save(card);
                    newCards++;
                }
            }
        }

        if (data.notes() != null) {
            Set<String> titles = notes.findAll().stream()
                    .map(n -> n.getTitle().trim().toLowerCase())
                    .collect(Collectors.toCollection(HashSet::new));
            for (ExportNote en : data.notes()) {
                if (en == null || blank(en.title()) || blank(en.content())) continue;
                String title = clip(en.title().trim(), 200);
                if (!titles.add(title.toLowerCase())) continue;
                notes.save(new Note(title, clip(en.content(), 20000),
                        clip(Dtos.normalizeTags(en.tags()), 255), en.pinned()));
                newNotes++;
            }
        }

        return Map.of("decks", newDecks, "cards", newCards, "notes", newNotes);
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static String clip(String s, int max) {
        if (s == null) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }
}
