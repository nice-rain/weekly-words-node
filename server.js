'use strict'

const express = require('express');
const passport = require('passport');
const mongoose = require('mongoose');
const morgan = require('morgan');
const fetch = require('node-fetch');

//reads .env file
require('dotenv').config();

const app = express();


mongoose.Promise = global.Promise;

//Mongoose fix deprecation warning
mongoose.set('useFindAndModify', false);

//Include our database URL and port
const { DATABASE_URL, PORT} = require('./config');


//Import our schemas
const {User, Decks, GeneratedDecks} = require("./users/models");

//Use our json parser (this is required to parse req.body)
app.use(express.json());

app.use(express.static('public'));

//log our http layer
app.use(morgan('common'));

// CORS
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
    if (req.method === 'OPTIONS') {
      return res.send(204);
    }
    next();
  });

//=======================================================
// Deck Generation
//=======================================================

//Fills our entire deck with cards
const fillDeck = function (newDeck)
{
    //Words API call to fetch a random word
    const url = "https://wordsapiv1.p.rapidapi.com/words/?random=true"

    //API url for webster dictionary
    const websterDictionaryUrlBase = `https://dictionaryapi.com/api/v3/references/sd4/json/`;

    const newCard = {};
        
    //Fetch a random word using our words API
    fetch(url, {headers: {'X-RapidAPI-Key': process.env.WORDS_API_KEY}})
    .then(res => res.json())
    .then(json=> {
       
        //If there is no definition, pass the word to Webster's API
        if(!json.results)
        {
            fetch(websterDictionaryUrlBase + `${json.word}?key=${process.env.WEBSTER_API_KEY}`)
            .then(res => res.json())
            .then(websterJson => {
                if(websterJson.length > 0 && websterJson[0].meta)
                {
                    newCard.word = json.word;
                    newCard.partOfSpeech = websterJson[0].fl;

                    //Clean up our shortdef
                    let newDef = '';
                    websterJson[0].shortdef.forEach(definition =>{
                        newDef += `${definition}, `
                    });

                    //Remove the trailing comma
                    newDef = newDef.slice(0, -2);

                    console.log(`Compiled Definition is: ${newDef}`);

                    newCard.definition = newDef;

                    newDeck.cards.push(newCard);

                }
            })
        }   
        
        //If there is a definition, we should add it to our card array
        else{
            newCard.word = json.word;
            newCard.partOfSpeech = json.results[0].partOfSpeech;
            newCard.definition = json.results[0].definition;
            if(json.results[0].examples)
            {
                newCard.usage = json.results[0].examples[0];
            }
            newDeck.cards.push(newCard);

        }
        
        //If statement to check if we've completely filled our deck
        if(newDeck.cards.length < 20)
        {
            //recursive function - recall
            fillDeck(newDeck); 
        }
        else{
            console.log('deck generation complete!!!!');
            //Add our deck to our database
            GeneratedDecks.create(newDeck)
            .then(created => {
                console.log(`Deck Successfull Created: ${created.id}`)
            })
            .catch(err => {
                return Reject(err);
            });
        }
    })
    .catch(err => {
        console.log(err);
    });    
}

// Generate deck is called on an interval to run every 7 days.
// It adds all basic information before calling fillDeck.
// FillDeck will continually add cards to the deck until we have 20.
// Once 20 are added, filldeck will push the deck into the database.
const generateDeck = function (req, res)
{
    console.log('Generating Deck');

    //Setup our defaults for mongoose
    const newGeneratedDeck = {};

    //We need to find out what week we are on (talk to mongoose and get number of generated decks)
    GeneratedDecks.countDocuments()
    .then(count => {
        console.log(`Deck Count: ${count}`);

        //Setup our week number and our date created
        newGeneratedDeck.week = count + 1;
        newGeneratedDeck.created = new Date();
        newGeneratedDeck.cards = [];

        //Call fillDeck to asynchronously fill the entire deck of cards
        fillDeck(newGeneratedDeck);
    })
    .catch(error=>{
        console.log(`Error: ${error}`);
        return res.status(500).send('request failed');
    });
}

//=======================================================
// GET Endpoint - Creates new deck on first login
//=======================================================

app.get('/', (req, res) => {
    return res.status(200).json({message: 'Get Endpoint Hit!'});
});

//=======================================================
// Catch Endpoints
//=======================================================

app.use('*', (req, res) => {
    return res.status(404).json({ message: 'Not Found' });
  });
  
  
  
  //=======================================================
  // Open and Close Server
  //=======================================================
  
  //Allows us to store our server so that we may close it later
  let server;
  
  //Start our server
  function runServer(databaseUrl, port = PORT) {
    return new Promise((resolve, reject) => {
      mongoose.set('useCreateIndex', true);
      mongoose.connect(databaseUrl, {useNewUrlParser:true}, err => {
        if (err) {
          return reject(err);
        }
        server = app.listen(port, () => {
          console.log(`Weekly Words Node app is listening on port ${port}`);

            const MS_PER_WEEK = 604800000;

          //Set an interval to create a new deck every 7 days
          setInterval(generateDeck, /*120000*/ MS_PER_WEEK);

          resolve();
        })
          .on('error', err => {
            mongoose.disconnect();
            reject(err);
          });
      });
    });
  }
  
  // this function closes the server, and returns a promise.
  function closeServer() {
    return mongoose.disconnect().then(() => {
      return new Promise((resolve, reject) => {
        console.log('Closing Weekly Words Node App');
        server.close(err => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    });
  }
  
  // if server.js is called directly (aka, with `node server.js`), this block
  // runs. but we also export the runServer command so other code (for instance, test code) can start the server as needed.
  if (require.main === module) {
    runServer(DATABASE_URL).catch(err => console.error(err));
  }
  
  //Export our modules for testing
  module.exports = { app, runServer, closeServer };