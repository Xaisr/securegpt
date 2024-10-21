// Load the SpaCy-like model in JS (simulated as there’s no direct spacy.js model)
class Anonymizer {
    constructor() {
        this.query = null;
        this.pseudonym_map = {};
        this.reverse_pseudonym_map = {};

        // Define patterns for specific entities (simulating patterns used in Spacy)
        this.patterns = [
            { label: "CREDIT_CARD", pattern: /\b\d{16}\b/g }, // 16 digits
            { label: "SOCIAL_SECURITY_NUMBER", pattern: /\b\d{3}-\d{2}-\d{4}\b/g }, // SSN format
            { label: "ACCOUNT_NUMBER", pattern: /\b\d{10}\b/g }, // 10 digits
            { label: "EMAIL", pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g }, // Email regex
            { label: "AGE", pattern: /\b\d+\s?(yrs?|old)\b/g } // Age (e.g. "25 yrs", "30 years old")
        ];

        // Regex patterns for phone numbers and passwords
        this.phone_pattern = /(?:\+?\d{1,4})?[\s\-\.]?(?:phone|number)?[\s\-:]*\d{1,4}[\s\-\.]?\d{2,4}[\s\-\.]?\d{2,4}/g;
        this.password_pattern = /(?<!\w)([!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]{5,}[A-Za-z0-9]+[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]*)/g;
    }

    // Set the text query to anonymize
    set_query(text) {
        this.query = text;
        this.pseudonym_map = {};
        this.reverse_pseudonym_map = {};
    }

    // Get the current query
    get_query() {
        return this.query;
    }

    // Extract entities from the text using regex patterns
    extract_entities(text) {
        let entities = [];

        // Match based on predefined patterns
        this.patterns.forEach(patternObj => {
            const matches = text.match(patternObj.pattern);
            if (matches) {
                matches.forEach(match => entities.push([match, patternObj.label]));
            }
        });

        // Match phone numbers and passwords using regex
        const phone_matches = text.match(this.phone_pattern);
        if (phone_matches) {
            phone_matches.forEach(match => entities.push([match, "PHONE_NUMBER"]));
        }

        const password_matches = text.match(this.password_pattern);
        if (password_matches) {
            password_matches.forEach(match => entities.push([match, "PASSWORD"]));
        }

        return entities;
    }

    // Generate pseudonyms for each extracted entity
    generate_pseudonyms(entities) {
        let entity_count = {};

        entities.forEach(([entity, label]) => {
            if (!entity_count[label]) {
                entity_count[label] = 0;
            }
            entity_count[label] += 1;
            const pseudonym = `${label}${entity_count[label]}`;
            this.pseudonym_map[entity] = pseudonym;
            this.reverse_pseudonym_map[pseudonym] = entity;
        });
    }

    // Pseudonymize the entities within the query
    pseudonymize_entities() {
        if (!this.query) return null;

        const entities = this.extract_entities(this.query);
        this.generate_pseudonyms(entities);

        let anonymized_text = this.query;
        // Replace entities in text with pseudonyms
        for (const [entity, pseudonym] of Object.entries(this.pseudonym_map)) {
            anonymized_text = anonymized_text.replace(new RegExp(entity, 'g'), pseudonym);
        }

        return anonymized_text;
    }

    // Reverse pseudonymization to retrieve the original text
    reverse_pseudonymization() {
        let anonymized_text = this.pseudonymize_entities();
        if (!anonymized_text) return null;

        let reversed_text = anonymized_text;
        for (const [pseudonym, original] of Object.entries(this.reverse_pseudonym_map)) {
            reversed_text = reversed_text.replace(new RegExp(pseudonym, 'g'), original);
        }

        return reversed_text;
    }

    // Get anonymized text
    get_anon_text() {
        if (!this.query) return null;
        return this.pseudonymize_entities();
    }

    // Get the pseudonym map for the current query
    get_anon_map() {
        if (!this.query) return null;
        return this.pseudonym_map;
    }

    // Get original text by reversing the anonymized text
    get_original_text() {
        if (!this.query || !this.pseudonymize_entities()) return null;
        return this.reverse_pseudonymization();
    }

    // Confirm if the original and reversed texts match
    confirm_match() {
        if (!this.query || !this.get_original_text()) return null;
        return this.query === this.get_original_text();
    }
}


