'use strict'

exports.DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost/weekly-words';
exports.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'mongodb://localhost/test-weekly-words';

module.exports.PORT = process.env.PORT || 8080; //server port we are listening on
exports.JWT_SECRET = process.env.JWT_SECRET || 'TEST SECRET KEY';
exports.JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';