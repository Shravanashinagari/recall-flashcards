package com.shrav.flashcards.web;

import com.shrav.flashcards.model.Note;
import com.shrav.flashcards.repo.NoteRepository;
import com.shrav.flashcards.web.Dtos.NoteRequest;
import com.shrav.flashcards.web.Dtos.NoteResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/notes")
public class NoteController {

    private final NoteRepository notes;

    public NoteController(NoteRepository notes) {
        this.notes = notes;
    }

    /** Pinned notes first, then most recently edited. Optional ?q= searches title, content and tags. */
    @GetMapping
    @Transactional(readOnly = true)
    public List<NoteResponse> list(@RequestParam(required = false) String q) {
        List<Note> result = (q == null || q.isBlank())
                ? notes.findAllByOrderByPinnedDescUpdatedAtDesc()
                : notes.search(q.trim());
        return result.stream().map(NoteResponse::of).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public NoteResponse create(@Valid @RequestBody NoteRequest req) {
        Note note = new Note(req.title().trim(), req.content(),
                Dtos.normalizeTags(req.tags()), Boolean.TRUE.equals(req.pinned()));
        return NoteResponse.of(notes.save(note));
    }

    @PutMapping("/{id}")
    @Transactional
    public NoteResponse update(@PathVariable Long id, @Valid @RequestBody NoteRequest req) {
        Note note = notes.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Note not found"));
        note.setTitle(req.title().trim());
        note.setContent(req.content());
        note.setTags(Dtos.normalizeTags(req.tags()));
        note.setPinned(Boolean.TRUE.equals(req.pinned()));
        note.setUpdatedAt(LocalDateTime.now());
        return NoteResponse.of(notes.save(note));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable Long id) {
        if (!notes.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Note not found");
        }
        notes.deleteById(id);
    }
}
