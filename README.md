# Recall: Spaced-Repetition Flashcards & Notes for Interview Prep

![Java](https://img.shields.io/badge/Java-17-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3-6DB33F)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1)
![Frontend](https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JS-blueviolet)

Recall is a full-stack web app that helps you remember interview concepts for the long term. You add questions and answers (or longer notes), and the app schedules each card for review using the **SM-2 spaced-repetition algorithm**, the same idea Anki is built on. Cards you find hard come back soon. Cards you know well come back after longer and longer gaps.

## Screenshots
![Dashboard](Screenshots/DashBoard1.png)
![Dashboard](Screenshots/DashBoard2.png)
![Study mode](Screenshots/StudyPage.png)
![Library](Screenshots/LibraryPage.png)
![Notes](Screenshots/Notes.png)


## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [How It Works (SM-2)](#how-it-works-sm-2)
- [Project Structure](#project-structure)
- [REST API](#rest-api)
- [Database](#database)
- [Running the Tests](#running-the-tests)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Roadmap](#roadmap)

## Features

**Study**
- Spaced-repetition review with four ratings: Again, Hard, Good, Easy
- Flip-card interface with a session progress bar
- Cards you forget are shown again later in the same session

**Create and organise**
- Add a concept at any time, with the "Add concept" button or the `N` key
- Bulk add: paste many cards, one per line, as `question :: answer`
- Decks, tags, search across question, answer and tags
- Notes with formatting (bold, inline code, code blocks, lists), pinning and search
- "Make flashcard" turns any note into a card

**Track progress**
- Day streak, recall accuracy, cards due today
- 12-week activity heatmap
- Mastery bar per deck (new, learning, mature)

**Other**
- Export all data to JSON and import it back (duplicates are skipped)
- Light and dark themes, responsive layout

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.3, Spring Web, Spring Data JPA, Bean Validation |
| Database | MySQL 8 (Hibernate generates and updates the tables) |
| Frontend | HTML, CSS and vanilla JavaScript (no build step), served by Spring Boot |
| Testing | JUnit 5 |
| Build | Maven |

## Getting Started

### Prerequisites
- JDK 17 or newer
- Maven 3.9+ (or IntelliJ IDEA, which bundles it)
- MySQL 8, running locally

### 1. Clone the repository
```bash
git clone https://github.com/Shravanashinagari/recall-flashcards.git
cd recall-flashcards
```

### 2. Set your database password
Create a file named `src/main/resources/application-local.properties` (it is git-ignored, so your password is never committed):

```properties
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD
```

The database `flashcards_db` is created automatically on first start.

### 3. Run the app
```bash
mvn spring-boot:run
```
Or open the project in IntelliJ and run `FlashcardsApplication`.

### 4. Open it
Go to **http://localhost:8080**. On first run the app adds starter decks (Java, OOP, SQL, Spring Boot) and a welcome note.

## Configuration

Settings live in `src/main/resources/application.properties`.

| Property | Default | Purpose |
|---|---|---|
| `server.port` | `8080` | Port the app runs on |
| `spring.datasource.url` | `jdbc:mysql://localhost:3306/flashcards_db...` | MySQL connection |
| `spring.datasource.username` | `root` | MySQL user |
| `spring.datasource.password` | placeholder | Override in `application-local.properties` |
| `spring.jpa.hibernate.ddl-auto` | `update` | Creates and updates tables from the entities |

## How It Works (SM-2)

After you reveal an answer you rate how well you remembered it:

| Button | Quality sent to SM-2 |
|---|---|
| Again | 1 |
| Hard | 3 |
| Good | 4 |
| Easy | 5 |

Scheduling rules (`Sm2Service`):
- **Quality below 3** resets the card: repetitions go back to 0 and the interval to 1 day.
- **Quality 3 or above** grows the interval: 1 day on the first success, 6 days on the second, then `round(previous interval × ease factor)`.
- **Ease factor** starts at 2.5 and changes by `0.1 − (5 − q) × (0.08 + (5 − q) × 0.02)` after every review. It never drops below 1.3.
- The next due date is `today + interval`.

A card is shown as **Mature** once its interval reaches 21 days.

## Project Structure

```
recall-flashcards/
├── pom.xml
├── database/schema.sql                  Reference SQL schema
└── src/
    ├── main/java/com/shrav/flashcards/
    │   ├── FlashcardsApplication.java   Entry point
    │   ├── model/                       Deck, Card, Note, ReviewLog (JPA entities)
    │   ├── repo/                        Spring Data JPA repositories
    │   ├── service/                     Sm2Service, DataSeeder, NoteSeeder
    │   └── web/                         REST controllers, DTOs, error handler
    ├── main/resources/
    │   ├── application.properties
    │   └── static/                      index.html, style.css, app.js
    └── test/java/.../Sm2ServiceTest.java
```

## REST API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/decks` | List decks with total and due counts |
| POST | `/api/decks` | Create a deck |
| DELETE | `/api/decks/{id}` | Delete a deck and its cards |
| GET | `/api/cards?deckId=&q=` | List or search cards |
| POST | `/api/cards` | Create a card (supports `tags`) |
| PUT | `/api/cards/{id}` | Edit a card |
| DELETE | `/api/cards/{id}` | Delete a card |
| GET | `/api/review/due?deckId=` | Cards due today |
| POST | `/api/review/{cardId}` | Rate a card with `{ "quality": 0-5 }` |
| GET | `/api/stats` | Streak, accuracy, heatmap, deck mastery |
| GET | `/api/notes?q=` | List or search notes |
| POST | `/api/notes` | Create a note |
| PUT | `/api/notes/{id}` | Edit a note |
| DELETE | `/api/notes/{id}` | Delete a note |
| GET | `/api/export` | Export decks, cards and notes as JSON |
| POST | `/api/import` | Import a previous export |

## Database

Four tables, created automatically by Hibernate:

| Table | Purpose |
|---|---|
| `decks` | Named groups of cards |
| `cards` | Question, answer, tags and SM-2 state (repetitions, ease factor, interval, due date) |
| `notes` | Longer free-form notes with tags and a pinned flag |
| `review_logs` | One row per rating, used for streaks, accuracy and the heatmap |

`database/schema.sql` contains the same structure in plain SQL for reference.

## Running the Tests
```bash
mvn test
```
`Sm2ServiceTest` covers the interval progression, the reset on failure, the ease-factor floor and input validation.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `N` | Open "Add concept" |
| `Space` | Reveal the answer in study mode |
| `1` `2` `3` `4` | Rate Again, Hard, Good, Easy |
| `Ctrl + Enter` | Save in the Add concept dialog |
| `Ctrl + S` | Save the current note |
| `Esc` | Close a dialog |

## Roadmap
- User accounts with Spring Security and JWT
- Docker Compose setup for the app and MySQL
- Integration tests with Testcontainers
- Weak-topic report (cards you fail most, grouped by tag)

## Author
**Shrav**: built as a Java full-stack project for interview preparation.