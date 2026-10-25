-- Reference schema (Hibernate creates this automatically with ddl-auto=update).
-- Run it manually only if you prefer to manage the DB yourself.

CREATE DATABASE IF NOT EXISTS flashcards_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE flashcards_db;

CREATE TABLE IF NOT EXISTS decks (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cards (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  deck_id          BIGINT NOT NULL,
  question         TEXT NOT NULL,
  answer           TEXT NOT NULL,
  repetitions      INT NOT NULL DEFAULT 0,        -- successful reviews in a row (SM-2 "n")
  ease_factor      DOUBLE NOT NULL DEFAULT 2.5,   -- SM-2 "EF", never below 1.3
  interval_days    INT NOT NULL DEFAULT 0,        -- days until next review (SM-2 "I")
  due_date         DATE NOT NULL,                 -- next review date
  last_reviewed_at DATETIME NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cards_deck FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
  INDEX idx_cards_due (due_date),
  INDEX idx_cards_deck_due (deck_id, due_date)
);

CREATE TABLE IF NOT EXISTS review_logs (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  card_id     BIGINT NOT NULL,
  quality     INT NOT NULL,                       -- 0..5 as used by SM-2
  reviewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_logs_card FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  INDEX idx_logs_time (reviewed_at)
);
