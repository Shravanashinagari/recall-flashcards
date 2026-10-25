package com.shrav.flashcards.service;

import com.shrav.flashcards.model.Card;
import com.shrav.flashcards.model.Deck;
import com.shrav.flashcards.repo.CardRepository;
import com.shrav.flashcards.repo.DeckRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/** Inserts starter interview decks the first time the app runs on an empty database. */
@Component
public class DataSeeder implements CommandLineRunner {

    private final DeckRepository decks;
    private final CardRepository cards;

    public DataSeeder(DeckRepository decks, CardRepository cards) {
        this.decks = decks;
        this.cards = cards;
    }

    @Override
    public void run(String... args) {
        if (decks.count() > 0) return;

        Deck java = decks.save(new Deck("Java Core", "Language fundamentals asked in almost every interview"));
        Deck oop = decks.save(new Deck("OOP", "Four pillars and design basics"));
        Deck sql = decks.save(new Deck("DBMS & SQL", "Database theory and queries"));
        Deck spring = decks.save(new Deck("Spring Boot", "Framework basics for backend roles"));

        cards.saveAll(List.of(
                new Card(java, "What is the difference between JDK, JRE and JVM?",
                        "JVM runs bytecode. JRE = JVM + core libraries needed to run Java programs. JDK = JRE + development tools (javac, jar, debugger)."),
                new Card(java, "Difference between == and equals()?",
                        "== compares references (or primitive values). equals() compares logical content and can be overridden. If you override equals(), override hashCode() too."),
                new Card(java, "Why is String immutable in Java?",
                        "Enables the String pool (memory saving), makes it thread-safe, safe as HashMap keys (hashCode can be cached) and safer for security-sensitive values like class names and URLs."),
                new Card(java, "Difference between ArrayList and LinkedList?",
                        "ArrayList: dynamic array, O(1) random access, O(n) insert/remove in the middle. LinkedList: doubly linked list, O(n) access, O(1) insert/remove once you have the node."),
                new Card(java, "How does HashMap work internally?",
                        "Key's hashCode() picks a bucket index. Collisions are stored in a linked list, converted to a balanced tree when a bucket has 8+ entries (Java 8+). It resizes at load factor 0.75."),
                new Card(java, "Checked vs unchecked exceptions?",
                        "Checked exceptions (e.g. IOException) must be declared or caught at compile time. Unchecked (RuntimeException subclasses, e.g. NullPointerException) are not enforced by the compiler."),
                new Card(java, "What is the difference between final, finally and finalize?",
                        "final: constant variable / non-overridable method / non-inheritable class. finally: block that always runs after try/catch. finalize(): deprecated method called by GC before object removal."),

                new Card(oop, "Name the four pillars of OOP.",
                        "Encapsulation, Abstraction, Inheritance, Polymorphism."),
                new Card(oop, "Method overloading vs overriding?",
                        "Overloading: same name, different parameters, resolved at compile time. Overriding: subclass redefines a parent method with the same signature, resolved at runtime."),
                new Card(oop, "Abstract class vs interface?",
                        "Abstract class can hold state and constructors and supports single inheritance. Interface defines a contract (default/static methods allowed since Java 8) and a class can implement many."),
                new Card(oop, "What is the SOLID principle set?",
                        "Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion."),

                new Card(sql, "What are ACID properties?",
                        "Atomicity (all or nothing), Consistency (valid state to valid state), Isolation (concurrent transactions do not interfere), Durability (committed data survives crashes)."),
                new Card(sql, "DELETE vs TRUNCATE vs DROP?",
                        "DELETE removes rows (WHERE allowed, can roll back, fires triggers). TRUNCATE removes all rows quickly and resets identity. DROP removes the whole table structure."),
                new Card(sql, "INNER JOIN vs LEFT JOIN?",
                        "INNER JOIN returns only matching rows from both tables. LEFT JOIN returns all rows from the left table and matches from the right (NULL where no match)."),
                new Card(sql, "What is normalization? Define 1NF, 2NF, 3NF.",
                        "Organizing data to reduce redundancy. 1NF: atomic values. 2NF: 1NF + no partial dependency on part of a composite key. 3NF: 2NF + no transitive dependency between non-key columns."),
                new Card(sql, "Primary key vs unique key?",
                        "Primary key: uniquely identifies a row, no NULLs, one per table. Unique key: enforces uniqueness, allows a NULL (in MySQL multiple NULLs), many per table."),
                new Card(sql, "Write a query for the 2nd highest salary.",
                        "SELECT MAX(salary) FROM employee WHERE salary < (SELECT MAX(salary) FROM employee);  -- or use DENSE_RANK() / LIMIT 1 OFFSET 1."),

                new Card(spring, "What is Dependency Injection and Inversion of Control?",
                        "IoC: the container creates and manages objects instead of your code. DI is how it supplies dependencies (constructor, setter or field injection). Constructor injection is preferred."),
                new Card(spring, "What does @SpringBootApplication do?",
                        "Combines @Configuration, @EnableAutoConfiguration and @ComponentScan."),
                new Card(spring, "@Component vs @Service vs @Repository vs @Controller?",
                        "All are stereotype beans found by component scan. @Service marks business logic, @Repository marks data access (adds exception translation), @Controller/@RestController handle web requests."),
                new Card(spring, "What is Spring Data JPA and what does JpaRepository give you?",
                        "An abstraction over JPA/Hibernate. JpaRepository provides ready CRUD, paging and sorting, plus derived queries from method names like findByDeckId."),
                new Card(spring, "@RestController vs @Controller?",
                        "@RestController = @Controller + @ResponseBody, so return values are written directly to the HTTP response as JSON instead of resolving a view.")
        ));
    }
}
