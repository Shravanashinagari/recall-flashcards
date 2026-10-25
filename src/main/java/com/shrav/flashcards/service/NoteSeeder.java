package com.shrav.flashcards.service;

import com.shrav.flashcards.model.Note;
import com.shrav.flashcards.repo.NoteRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Adds one welcome note the first time the Notes table is empty. */
@Component
public class NoteSeeder implements CommandLineRunner {

    private final NoteRepository notes;

    public NoteSeeder(NoteRepository notes) {
        this.notes = notes;
    }

    @Override
    public void run(String... args) {
        if (notes.count() > 0) return;

        notes.save(new Note(
                "Welcome to your notes",
                """
                Use **Notes** for anything longer than a flashcard: how a concept works, a cheat sheet, or an interview story.

                **Formatting you can use**
                - **bold** text
                - `inline code`
                - bullet lists with a dash

                ```java
                Map<String, Integer> counts = new HashMap<>();
                counts.merge("spring", 1, Integer::sum);
                ```

                **Turn a note into revision cards**
                Open a note and press **Make flashcard**. The title becomes the question and the content becomes the answer, so you can quiz yourself on it with spaced repetition.
                """,
                "tips,getting-started",
                true));
    }
}
