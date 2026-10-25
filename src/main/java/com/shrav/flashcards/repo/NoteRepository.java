package com.shrav.flashcards.repo;

import com.shrav.flashcards.model.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface NoteRepository extends JpaRepository<Note, Long> {

    List<Note> findAllByOrderByPinnedDescUpdatedAtDesc();

    @Query("select n from Note n where lower(n.title) like lower(concat('%', :q, '%')) "
            + "or lower(n.content) like lower(concat('%', :q, '%')) "
            + "or lower(coalesce(n.tags, '')) like lower(concat('%', :q, '%')) "
            + "order by n.pinned desc, n.updatedAt desc")
    List<Note> search(String q);
}
