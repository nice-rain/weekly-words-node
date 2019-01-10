# Weekly Words

## Summary
This is the node.js back-end of the Weekly Words application. It provides an API for the user to register, login, and review weekly generated decks of cards. The back-end runs on a weekly function timer that will automatically fetch 20 random words and their definitions using WordsAPI. Unfortunately, not all words from WordsAPI have definitions associated with them. If this occurs, the back-end will automatically query the definition from the Webster Dictionary API.

## Built With
* node.js
* MongoDB
* mongoose

## Local Setup and Usage

Before we begin, we need to setup the development environment. We will need to register two different API keys to use this application successfully.

### API Keys

1. [WordsAPI](https://www.wordsapi.com) - You will need to register for an API key in order to use the random word feature. This is used to fetch 20 random words each week for review.
2. [Merriam-Webster Dictionary API](https://dictionaryapi.com/) -  You will need to register for a **School Dictionary** API key. This allows us to fetch definitions if the WordsAPI doesn't return one.


### .env

In the project directory, you need to create a .env file containing the following keys:

```
WORDS_API_KEY='WORDS_API_BASIC_KEY'

WEBSTER_API_KEY='WEBSTER_SCHOOL_DICTIONARY_API_KEY'

PORT=8083

DATABASE_URL="URL_FOR_MONGODB"

TEST_DATABASE_URL="URL_FOR_MONGODB_TEST"
```


### `npm start`

Runs the node server locally. 

:exclamation: You must have all environment keys in a .env file in the root directory.

Once the server is running, you may then run the react-redux front-end.


### Endpoints

Register New User
`POST /ww/api/users/`

Login User
`POST /ww/api/auth/login`

Refresh Token
`POST /ww/api/auth/refresh`

Get all decks for user
`GET /ww/api/decks`

Update Deck Stats After Review
`PUT /ww/api/decks/:deckId`


## Demo
https://weekly-words.herokuapp.com

Login with the following:

username: Thinkful<br>
password: p123456789