# securegpt
SecureGPT is an open source source code for a browser extension that helps prevent accidental leak of personal information in your chats with  ChatGPT. The extension works with Google queries too.
______________________________________________________________________________________

# Contents
1. manifest.js (critical) : js code containing meta details about wesbite permissions and accessibility rights.
2. content.js (critical) : js code containing hows/whens/whats of the web page interaction with backend server logic
3. anonapp.py (critical) : python flask app that runs the anonymizing logic locally in the backend. its triggered when the user presses tab in the webpage.
4. popup.html (retired)
5. pop.js (retired)
6. background.js (low) : high level details on target files, executable functionalities
7. ner_anonymizer(retired) : js version of backend anonymizer class. Potentially an alternate to running the anonymizer algorithm on a local flask server.

# How it works
1. An Anonymizer class using pretrained ML based named entity recognition model identifies words that reveal potential personal information in user chat queries with chatgpt. Personal information could be names, organizations, credit card number, bank balance, phone numbers.
2. These words are then replaced with anonymous placeholder words that are based on fuzzy logic matching with avg. threshold of ~80
3. The word-placeholder dictionary is maintained for reference and new assignment 
 
# How to get started with this extension 

1. Clone the repo and save it in a location x.
2. Go to your browser options on top right > extensions > manage extensions > load unpapcked > choose location x > refresh.
3. Open chatgpt or google and start chatting by writing your query.
4. If you press 'tab' button then, your query in the searchbar is instantly anonymized if the anonymizer toggle has been set to green. If you want to submit this anonymized version of the query, then press enter. If you prefer your query to be not anonymous, then press 'Alt' and the anonymous query will again revert back to your original query
5. After lot of testing, its found that Anonymizer is bad at anonymizing queries relating to mathematical equations and puzzles. For such queries, its better to keep anonymizer toggle off. 

# Note
1. Project still in progress
2. Constructive Feedback is welcome
