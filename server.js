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
const {User, Decks, GeneratedDecks, Cards} = require("./users/models");

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
// Middleware for Deck Generation
//=======================================================

const generateDeck = function (req, res, next)
{
    console.log('Generating Deck');

    //Words API call to fetch a random word
    const url = "https://wordsapiv1.p.rapidapi.com/words/?random=true"

    //API url for webster dictionary
    const websterDictionaryUrlBase = `https://dictionaryapi.com/api/v3/references/sd4/json/`;

    //Setup our defaults for mongoose
    const newGeneratedDeck = {};

    //We need to find out what week we are on (talk to mongoose and get number of generated decks)
    GeneratedDecks.countDocuments()
    .then(count => {
        console.log(`Deck Count: ${count}`);

        //Setup our week number and our date created
        newGeneratedDeck.week = count + 1;
        newGeneratedDeck.created = new Date();
                
        //Fetch a random word using our words API
        return fetch(url, {headers: {'X-RapidAPI-Key': process.env.WORDS_API_KEY}});
    })
    .then(res => res.json())
    .then(json=> {

        //Log our response
        console.log(`WordsAPI Fetch: \n`);
        console.log(json);

        //If there is no definition, pass the word to Webster's API
        if(!json.results)
        {
            fetch(websterDictionaryUrlBase + `${json.word}?key=${process.env.WEBSTER_API_KEY}`)
            .then(res => res.json())
            .then(websterJson => {
                console.log(`Webster Fetch: \n`);
                console.log(websterJson);
                if(websterJson[0].meta)
                {
                    console.log(`Definition of word is ${websterJson[0].shortdef}.`)
                }
            })
        }

        //If there is a definition, we should add it to our card array
        else{

        } 
    })    
    .catch(error=>{
        console.log(`Error: ${error}`);
        return res.status(500).send('request failed');
    });

    //Feed that word into the oxford dictionary to pull usage and definitions
    


    //Logical Steps
    //Repeat 20 Times:
    //1. Get random word
    //2. Get definition of word
    //3. insert card into mongoose


    next();
}
//=======================================================
// GET Endpoints
//=======================================================

app.get('/', generateDeck, (req, res) => {
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