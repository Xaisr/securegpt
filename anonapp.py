from flask import Flask, request, jsonify
from flask_cors import CORS
import spacy
from spacy.matcher import Matcher
import re
from fuzzywuzzy import fuzz

# Load the SpaCy model
nlp = spacy.load("en_core_web_sm")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

class Anonymizer:
    def __init__(self):
        self.matcher = Matcher(nlp.vocab)
        self.query = None
        self.pseudonym_map = {}  # Stores original words as keys and pseudonyms as values
        self.reverse_pseudonym_map = {}  # Stores pseudonyms as keys and original words as values
        self.fuzzy_match_entities = {"PERSON", "GPE", "ORG"}  # Entities to apply fuzzy matching

        # Define patterns for specific entities
        self.patterns = [
            {"label": "CREDIT_CARD", "pattern": [{"SHAPE": "dddddddddddddddd"}]},
            {"label": "SOCIAL_SECURITY_NUMBER", "pattern": [{"TEXT": {"REGEX": r"^\d{3}-\d{2}-\d{4}$"}}]},
            {"label": "ACCOUNT_NUMBER", "pattern": [{"SHAPE": "dddddddddd"}]},
            {"label": "EMAIL", "pattern": [{"TEXT": {"REGEX": r"^[\w\.-]+@[\w\.-]+\.\w+$"}}]},
            {"label": "AGE", "pattern": [{"LIKE_NUM": True}, {"LOWER": {"REGEX": r"^yrs?$|^old$"}}]}
        ]

        # Add patterns to matcher
        for pat in self.patterns:
            self.matcher.add(pat["label"], [pat["pattern"]])

        # Regex patterns for phone numbers and passwords
        self.phone_pattern = r"(?:\+?\d{1,4})?[\s\-\.]?(?:phone|number)?[\s\-:]*\d{1,4}[\s\-\.]?\d{2,4}[\s\-\.]?\d{2,4}"
        self.password_pattern = r"(?<!\w)([!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]?(?=\S*[A-Za-z])(?=\S*\d)(?=\S*[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?])\S{5,}[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]?)(?!\w)"

    def set_query(self, text):
        self.query = text

    def get_query(self):
        return self.query

    def extract_entities(self, text):
        doc = nlp(text)
        entities = []

        # Find matches using the matcher
        matches = self.matcher(doc)
        for match_id, start, end in matches:
            span = doc[start:end]
            entities.append((span.text, nlp.vocab[match_id].text))

        # Built-in SpaCy entities
        for ent in doc.ents:
            if ent.label_ in ["GPE", "PERSON", "MONEY", "DATE", "ORG"]:
                entities.append((ent.text, ent.label_))

        # Find phone numbers and passwords using regex
        phone_matches = re.finditer(self.phone_pattern, text)
        for match in phone_matches:
            entities.append((match.group(), "PHONE_NUMBER"))

        password_matches = re.finditer(self.password_pattern, text)
        for match in password_matches:
            entities.append((match.group(1), "PASSWORD"))

        return entities

    def find_fuzzy_match(self, word):
        # Check for fuzzy matches across all pseudonyms
        for existing_entity, existing_pseudonym in self.pseudonym_map.items():
            if fuzz.ratio(word.lower(), existing_entity.lower()) >= 80:  # Set a threshold of 80
                return existing_pseudonym
        return None

    def generate_pseudonyms(self, entities):
        entity_count = {}

        for entity, label in entities:
            # Check if the entity already has a pseudonym (case-insensitive)
            existing_pseudonym = next((pseudo for ent, pseudo in self.pseudonym_map.items() 
                                       if ent.lower() == entity.lower()), None)
            if existing_pseudonym:
                self.pseudonym_map[entity] = existing_pseudonym
                continue

            # Check for a fuzzy match without considering entity type
            fuzzy_match = self.find_fuzzy_match(entity)
            if fuzzy_match:
                self.pseudonym_map[entity] = fuzzy_match
            else:
                if label not in entity_count:
                    entity_count[label] = max([int(pseudo.split('_')[1]) 
                                               for pseudo in self.pseudonym_map.values() 
                                               if pseudo.startswith(f"{label}_") and 
                                               pseudo.split('_')[1].isdigit()], default=0) + 1
                else:
                    entity_count[label] += 1

                # Generate a unique pseudonym
                pseudonym = f"{label}_{entity_count[label]}"

                # Store in both maps
                self.pseudonym_map[entity] = pseudonym
                self.reverse_pseudonym_map[pseudonym] = entity

    def pseudonymize_entities(self):
        if not self.query:
            return None
        entities = self.extract_entities(self.query)
        self.generate_pseudonyms(entities)
        anonymized_text = self.query
        for entity, pseudonym in sorted(self.pseudonym_map.items(), key=lambda x: len(x[0]), reverse=True):
            anonymized_text = re.sub(rf"\b{re.escape(entity)}\b", pseudonym, anonymized_text, flags=re.IGNORECASE)
        return anonymized_text

    def reverse_pseudonymization(self):
        anonymized_text = self.pseudonymize_entities()
        if not anonymized_text:
            return None
        reversed_text = anonymized_text
        for pseudonym, original in self.reverse_pseudonym_map.items():
            reversed_text = reversed_text.replace(pseudonym, original)
        return reversed_text

    def get_anon_text(self):
        if not self.query:
            return None
        return self.pseudonymize_entities()

    def get_anon_map(self):
        if not self.query:
            return None
        return self.pseudonym_map

    def get_original_text(self):
        if not self.query or not self.pseudonymize_entities():
            return None
        return self.reverse_pseudonymization()

    def confirm_match(self):
        if not self.query or not self.get_original_text():
            return None
        return self.query == self.get_original_text()

    def analyze_entities(self):
        if not self.query:
            return None
        entities = self.extract_entities(self.query)
        return [{"text": entity, "label": label} for entity, label in entities]

@app.route('/anonymize', methods=['POST'])
def anonymize():
    data = request.json
    text = data.get('text', '')

    anonymizer = Anonymizer()
    anonymizer.set_query(text)
    anonymized_text = anonymizer.get_anon_text()
    return jsonify({"anonymized_text": anonymized_text})

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.json
    text = data.get('text', '')

    anonymizer = Anonymizer()
    anonymizer.set_query(text)
    entities = anonymizer.analyze_entities()
    return jsonify({"entities": entities})


if __name__ == '__main__':
    app.run(debug=True)




