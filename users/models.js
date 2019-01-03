'use strict'

//Import and setup mongoose
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const Schema = mongoose.Schema;

//=======================================================
// Schemas
//=======================================================

//Schema for each user - also contains an array of deckSchema
const userSchema = mongoose.Schema({
    username: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    name: {type: String, default: ''}/*,
    decks: [{type: Schema.Types.ObjectId, ref: 'Decks'}]*/
});

userSchema.methods.validatePassword = function(password) {
    return bcrypt.compare(password, this.password);
}

userSchema.statics.hashPassword = function(password) {
    return bcrypt.hash(password, 10);
}


//Schema that contains deck information and links to generated deck
const deckSchema = mongoose.Schema({
    user: {type: String, required: true}, //username of user making deck
    deckName: {type: String, required: true}, //name of deck (should be Week n)
    deckReviewTotal: {type: Number, default: 0},
    deckHighestAccuracy: {type: Number, default:0},
    deckLatestAccuracy: {type: Number, default:0},
    deckFastestTime: {type: Number, default:0},
    deckLatestTime: {type: Number, default:0},
    generatedDeck: {type: Schema.Types.ObjectId, ref: 'GeneratedDecks'}
});

//Schema that contains generated deck information (created by server)
const generatedDeckSchema = mongoose.Schema({
    week: {type: Number, required: true},
    created: {type: Date, required: true},
    cards: [{
        word: {type: String, required: true},
        partOfSpeech: {type: String, default:''},
        definition: {type: String, default:''},
        usage: {type: String, default:''} 
    }]
});


//=======================================================
// Methods
//=======================================================

//Returns our user information
userSchema.methods.serialize = function()
{
    return {
        username: this.username || '',
        name: this.name || ''//,
        //decks: this.decks || []
    }
};

//Returns all information pertaining to a given deck
deckSchema.methods.serialize = function()
{
    return {
        user: this.user,
        id: this._id,
        deckName: this.deckName || '',
        deckReviewTotal: this.deckReviewTotal || 0,
        deckHighestAccuracy: this.deckHighestAccuracy || 0,
        deckLatestAccuracy: this.deckLatestAccuracy || 0,
        deckFastestTime: this.deckFastestTime || 0,
        deckLatestTime: this.deckLatestTime || 0,
        generatedDeck: this.generatedDeck 
    }
};

//Returns information for generated deck
generatedDeckSchema.methods.serialize = function()
{
    return {
        id: this._id,
        week: this.week,
        created: this.created,
        cards: this.cards
    }
};


//=======================================================
// Modules and Exports
//=======================================================

//User is the name of our collection
const User = mongoose.model('User', userSchema);

//Collection for decks
const Decks = mongoose.model('Decks', deckSchema);

//Collection for generated decks (on the server-side)
const GeneratedDecks = mongoose.model('GeneratedDecks', generatedDeckSchema);

//Export our schemas
module.exports = {User, Decks, GeneratedDecks};