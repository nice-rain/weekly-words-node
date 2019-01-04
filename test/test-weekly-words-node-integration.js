'use strict'

//=======================================================
// Includes
//=======================================================

//include chai for individual tests
const chai = require('chai');
const chaiHttp = require('chai-http');


//Mongoose allows us to open our db
const mongoose = require('mongoose');

//Faker seeds us with random data
const faker = require('faker');

//Import our model
const {User, Decks, GeneratedDecks} = require('../users/models');

//Allows us to use 'expect' syntax
const expect = chai.expect;

const jwt = require('jsonwebtoken');

//Import our server (so we can open/close it)
const { runServer, app, closeServer } = require('../server');

const { JWT_SECRET } = require('../config');

//Test database url import
const {TEST_DATABASE_URL} = require('../config');

//Middleware
chai.use(chaiHttp);



//=======================================================
// Before/After Functions
//=======================================================

//Called afterEach
function tearDownDB()
{
  console.warn('Deleting database');
  return mongoose.connection.dropDatabase();
}

//Generate our assessment data
function generateDeckData()
{
  return {
    deckName: faker.random.words(),
    user: 'exampleUser',
    generatedDeck: '5bdb1a4ec1f6120138497cd4',
    deckReviewTotal: faker.random.number(),
    deckHighestAccuracy: faker.random.number(),
    deckLatestAccuracy: faker.random.number(),
    deckFastestTime: faker.random.number(),
    deckLatestTime: faker.random.number(),
  };
}

function seedGeneratedDeckData()
{
    console.log('seeding generated deck data');

    const seedData = {
        week: 1,
        created: new Date(),
    cards: [{
        word: 'random',
        partOfSpeech: 'noun',
        definition: 'unpredictable',
        usage: 'this is random' 
    }]};

    return GeneratedDecks.create(seedData);
}

//Called seed our Deck collection
function seedDeckData()
{
    console.info('seeding deck data');
    const seedData = [];
  
    for (let i=1; i<=10; i++) {
      seedData.push(generateDeckData());
    }
    // this will return a promise
    return Decks.insertMany(seedData);

}

//=======================================================
// General Tests
//=======================================================

describe('Weekly Words Integration Tests', function(){

    //before/after setup for database

    //Runs before anything else, runs our server
    before(function() {
      return runServer(TEST_DATABASE_URL);
    });
    
    //Called when we have completed our tests
      after(function() {
        return closeServer();
    });
});

//=======================================================
// Authentication Tests
//=======================================================
describe('Auth endpoint tests', function () {
  const username = 'exampleUser';
  const password = 'examplePass';
  const name = 'Example';

  before(function () {
    return runServer(TEST_DATABASE_URL);
  });

  after(function () {
    return closeServer();
  });

  beforeEach(function() {
    return User.hashPassword(password).then(password =>
      User.create({
        username,
        password,
        name
      })
    );
  });

  afterEach(function () {
    return User.remove({});
  });

  describe('/api/auth/login', function () {
    it('Should reject requests with no credentials', function () {
      return chai
        .request(app)
        .post('/api/auth/login')
        .then(() =>{
          //expect.fail(null, null, 'Request should not succeed');
          const res = err.response;
          expect(res).to.have.status(400);
        })
        .catch(err => {
          if (err instanceof chai.AssertionError) {
            throw err;
        }
      });
    });
    it('Should reject requests with incorrect usernames', function () {
      return chai
        .request(app)
        .post('/api/auth/login')
        .send({ username: 'wrongUsername', password })        
        .then(() => {
          //expect.fail(null, null, 'Request should not succeed');
          const res = err.response;
          expect(res).to.have.status(401);
        })
        .catch(err => {
          if (err instanceof chai.AssertionError) {
            throw err;
          }
        });
    });
    it('Should reject requests with incorrect passwords', function () {
      return chai
        .request(app)
        .post('/api/auth/login')
        .send({ username, password: 'wrongPassword' })
        .then(() =>{
          
        const res = err.response;
        expect(res).to.have.status(401);
      })
        .catch(err => {
          if (err instanceof chai.AssertionError) {
            throw err;
          }

        });
    });
    it('Should return a valid auth token', function () {
      return chai
        .request(app)
        .post('/api/auth/login')
        .send({ username, password })
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('object');
          const token = res.body.authToken;
          expect(token).to.be.a('string');
          const payload = jwt.verify(token, JWT_SECRET, {
            algorithm: ['HS256']
          });
          expect(payload.user).to.deep.equal({
            username,
            name
          });
        });
    });
  });

  describe('/api/auth/refresh', function () {
    it('Should reject requests with no credentials', function () {
      return chai
        .request(app)
        .post('/api/auth/refresh')
        .then(() => {
          const res = err.response;
          expect(res).to.have.status(401);

        })
        .catch(err => {
          if (err instanceof chai.AssertionError) {
            throw err;
          }
        });
    });
    it('Should reject requests with an invalid token', function () {
      const token = jwt.sign(
        {
          username,
          name
        },
        'wrongSecret',
        {
          algorithm: 'HS256',
          expiresIn: '7d'
        }
      );

      return chai
        .request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${token}`)
        .then(() => {
          const res = err.response;
          expect(res).to.have.status(401);        
      })
        .catch(err => {
          if (err instanceof chai.AssertionError) {
            throw err;
          }

          
        });
    });
    it('Should reject requests with an expired token', function () {
      const token = jwt.sign(
        {
          user: {
            username,
            name
          },
          exp: Math.floor(Date.now() / 1000) - 10 // Expired ten seconds ago
        },
        JWT_SECRET,
        {
          algorithm: 'HS256',
          subject: username
        }
      );

      return chai
        .request(app)
        .post('/api/auth/refresh')
        .set('authorization', `Bearer ${token}`)
        .then(() =>{
          const res = err.response;
          expect(res).to.have.status(401);

        })
        .catch(err => {
          if (err instanceof chai.AssertionError) {
            throw err;
          }
        });
    });
    it('Should return a valid auth token with a newer expiry date', function () {
      const token = jwt.sign(
        {
          user: {
            username,
            name
          }
        },
        JWT_SECRET,
        {
          algorithm: 'HS256',
          subject: username,
          expiresIn: '7d'
        }
      );
      const decoded = jwt.decode(token);

      return chai
        .request(app)
        .post('/api/auth/refresh')
        .set('authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('object');
          const token = res.body.authToken;
          expect(token).to.be.a('string');
          const payload = jwt.verify(token, JWT_SECRET, {
            algorithm: ['HS256']
          });
          expect(payload.user).to.deep.equal({
            username,
            name
          });
          expect(payload.exp).to.be.at.least(decoded.exp);
        });
    });
  });
});

//=======================================================
// Registration Tests
//=======================================================

describe('/api/user', function() {
  const username = 'exampleUser';
  const password = 'examplePass';
  const name = 'Example';
  const usernameB = 'exampleUserB';
  const passwordB = 'examplePassB';
  const nameB = 'ExampleB';

  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  after(function() {
    return closeServer();
  });

  beforeEach(function() {});

  afterEach(function() {
    return User.remove({});
  });

  describe('/api/users', function() {
    describe('POST', function() {
      it('Should reject users with missing username', function() {
        return chai
          .request(app)
          .post('/api/users')
          .send({
            password,
            name
          })
          .then(() => {
            const res = err.response;
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('Missing field');
            expect(res.body.location).to.equal('username');
          })
          .catch(err => {
            if (err instanceof chai.AssertionError) {
              throw err;
            }

            
          });
      });
      it('Should reject users with missing password', function() {
        return chai
          .request(app)
          .post('/api/users')
          .send({
            username,
            name
          })
          .then(() =>{
            const res = err.response;
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('Missing field');
            expect(res.body.location).to.equal('password');
          })
          .catch(err => {
            if (err instanceof chai.AssertionError) {
              throw err;
            }            
          });
      });
      it('Should reject users with non-string username', function() {
        return chai
          .request(app)
          .post('/api/users')
          .send({
            username: 1234,
            password,
            name
          })
          .then(() => {
            
            const res = err.response;
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal(
            'Incorrect field type: expected string'
            );
            expect(res.body.location).to.equal('username');
          })
          .catch(err => {
            if (err instanceof chai.AssertionError) {
              throw err;
            }

          });
      });
      it('Should reject users with non-string password', function() {
        return chai
          .request(app)
          .post('/api/users')
          .send({
            username,
            password: 1234,
            name
          })
          .then(() => {
            const res = err.response;
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal(
              'Incorrect field type: expected string'
            );
            expect(res.body.location).to.equal('password');
          })          
          .catch(err => {
            if (err instanceof chai.AssertionError) {
              throw err;
            }
          });
            
      });
      it('Should reject users with non-string name', function() {
        return chai
          .request(app)
          .post('/api/users')
          .send({
            username,
            password,
            name: 1234
          })
          .then(() =>
            {
              const res = err.response;
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal(
              'Incorrect field type: expected string'
            );
            expect(res.body.location).to.equal('name');
          })
          .catch(err => {
            if (err instanceof chai.AssertionError) {
              throw err;
            }
          });
      });
      it('Should reject users with empty username', function() {
        return chai
          .request(app)
          .post('/api/users')
          .send({
            username: '',
            password,
            name
          })
          .then(() =>
            {const res = err.response;
              expect(res).to.have.status(422);
              expect(res.body.reason).to.equal('ValidationError');
              expect(res.body.message).to.equal(
                'Must be at least 1 characters long'
              );
              expect(res.body.location).to.equal('username');
            })
          .catch(err => {
            if (err instanceof chai.AssertionError) {
              throw err;
            }

            
          });
      });
      it('Should reject users with duplicate username', function() {
        // Create an initial user
        return User.create({
          username,
          password,
          name
        })
          .then(() =>
            // Try to create a second user with the same username
            chai.request(app).post('/api/users').send({
              username,
              password,
              name
            })
          )
          .then(() =>
            {
              const res = err.response;
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal(
              'Username already taken'
            );
            expect(res.body.location).to.equal('username');
            }
          )
          .catch(err => {
            if (err instanceof chai.AssertionError) {
              throw err;
            }
    
          });
      });
      it('Should create a new user', function() {
        return chai
          .request(app)
          .post('/api/users')
          .send({
            username,
            password,
            name
          })
          .then(res => {
            expect(res).to.have.status(201);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.keys(
              'username',
              'name'
            );
            expect(res.body.username).to.equal(username);
            expect(res.body.name).to.equal(name);
            return User.findOne({
              username
            });
          })
          .then(user => {
            expect(user).to.not.be.null;
            expect(user.name).to.equal(name);
            return user.validatePassword(password);
          })
          .then(passwordIsCorrect => {
            expect(passwordIsCorrect).to.be.true;
          });
      });
   });
  });
});



//=======================================================
// Application Endpoint Tests
//=======================================================

describe('Generated Deck API resource', function() {
    const username = 'exampleUser';
    const password = 'examplePass';
    const name = 'Example';  
  
    before(function() {
      return runServer(TEST_DATABASE_URL);
    });
  
    beforeEach(function() {
      return User.hashPassword(password).then(password => {
        User.create({
          username,
          password,
          name
        })
      });
    });
  
    beforeEach(function() {
      return seedGeneratedDeckData();
    });
  
  
    afterEach(function() {
      return tearDownDB();
    });
  
    after(function() {
      return closeServer();
    });
  
    describe('GET endpoint', function() {
  
      it('should return deck from generated deck', function() {
        let res;
        const token = jwt.sign(
          {
            user: {
              username,
              name
            }
          },
          JWT_SECRET,
          {
            algorithm: 'HS256',
            subject: username,
            expiresIn: '7d'
          }
        );
  
        return chai.request(app)
          .get('/api/decks')
          .set('Authorization', `Bearer ${token}`)
          .then(function(_res) {
            res = _res;
            expect(res).to.have.status(200);
            expect(res.body).to.have.lengthOf.at.least(1);
            return Decks.countDocuments();
          })
          .then(function(count) {
            expect(res.body).to.have.lengthOf(count);
          });
      });
    });
});



describe('Decks API resource', function() {
    const username = 'exampleUser';
    const password = 'examplePass';
    const name = 'Example';  
  
    before(function() {
      return runServer(TEST_DATABASE_URL);
    });
  
    beforeEach(function() {
      return User.hashPassword(password).then(password => {
        User.create({
          username,
          password,
          name
        })
      });
    });
  
    beforeEach(function() {
      return seedDeckData();
    });
  
  
    afterEach(function() {
      return tearDownDB();
    });
  
    after(function() {
      return closeServer();
    });
  
    describe('GET endpoint', function() {
  
      it('should return all decks', function() {
        let res;
        const token = jwt.sign(
          {
            user: {
              username,
              name
            }
          },
          JWT_SECRET,
          {
            algorithm: 'HS256',
            subject: username,
            expiresIn: '7d'
          }
        );
  
        return chai.request(app)
          .get('/api/decks')
          .set('Authorization', `Bearer ${token}`)
          .then(function(_res) {
            res = _res;
            expect(res).to.have.status(200);
            expect(res.body).to.have.lengthOf.at.least(1);
            return Decks.countDocuments();
          })
          .then(function(count) {
            expect(res.body).to.have.lengthOf(count);
          });
      });
  
  
      it('should return decks with right fields', function() {
        let resDeck;
        const token = jwt.sign(
          {
            user: {
              username,
              name
            }
          },
          JWT_SECRET,
          {
            algorithm: 'HS256',
            subject: username,
            expiresIn: '7d'
          }
        );
        return chai.request(app)
          .get('/api/decks')
          .set('Authorization', `Bearer ${token}`)
          .then(function(res) {
            expect(res).to.have.status(200);
            expect(res).to.be.json;
            expect(res.body).to.be.a('array');
            expect(res.body).to.have.lengthOf.at.least(1);
  
            res.body.forEach(function(returnedDeck) {
              expect(returnedDeck).to.be.a('object');
              expect(returnedDeck).to.include.keys(
                'user', 'id', 'deckName', 'deckReviewTotal', 'deckHighestAccuracy', 'deckLatestAccuracy', 'deckFastestTime', 'deckLatestTime', 'generatedDeck');
            });
            resDeck = res.body[0];
            return Decks.findById(resDeck.id);
          })
          .then(function(foundDeck) {
  
            expect(resDeck.id).to.equal(foundDeck.id);
            expect(resDeck.user).to.equal(foundDeck.user);
            expect(resDeck.deckName).to.equal(foundDeck.deckName);
            expect(resDeck.deckReviewTotal).to.equal(foundDeck.deckReviewTotal);
            expect(resDeck.deckHighestAccuracy).to.equal(foundDeck.deckHighestAccuracy);
            expect(resDeck.deckLatestAccuracy).to.equal(foundDeck.deckLatestAccuracy);
            expect(resDeck.deckFastestTime).to.equal(foundDeck.deckFastestTime);
            expect(resDeck.deckLatestTime).to.equal(foundDeck.deckLatestTime);
          });
      });
     });
  
    
     describe('PUT endpoint', function() {
        it('should update deck with new stats', function() {
          const updateData = {
            deckReviewTotal: 80,
            deckLatestAccuracy: 4.1,
            deckFastestTime:10
          };
    
          const token = jwt.sign(
            {
              user: {
                username,
                name
              }
            },
            JWT_SECRET,
            {
              algorithm: 'HS256',
              subject: username,
              expiresIn: '7d'
            }
          );
    
          return Decks
            .findOne()
            .then(function(deck) {
              updateData.id = deck.id;
              return chai.request(app)
                .put(`/api/decks/${deck.id}`)
                .set('Authorization', `Bearer ${token}`)
                .send(updateData);
            })
            .then(function(res) {
              expect(res).to.have.status(204);
    
              return Decks.findById(updateData.id);
            })
            .then(function(deck) {
              expect(deck.deckReviewTotal).to.equal(updateData.deckReviewTotal);
              expect(deck.deckLatestAccuracy).to.equal(updateData.deckLatestAccuracy);
              expect(deck.deckFastestTime).to.equal(updateData.deckFastestTime);
            });
        });
      });
    

  });