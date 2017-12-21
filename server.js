const express = require('express');
const body_parser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const db = require('./config/db');
const fs = require('fs');
const https = require('https');

require('dotenv').config();

const app = express();

const port = 3000;

// reading private key files for HTTPS
const key = fs.readFileSync('encryption/private.key');
const cert = fs.readFileSync('encryption/primary.crt');
const ca = fs.readFileSync('encryption/intermediate.crt');

const options = {
  key: key,
  cert: cert,
  ca: ca
};

const server = https.createServer(options, app);

app.use(body_parser.urlencoded({extended: true}));

// connect to database
MongoClient.connect(db.url, (err, database) => {
  if(err) {
    return console.log(err);
  }

  require('./app/routes')(app, database);

  server.listen(port, process.env.ADDRESS, () => {
    console.log('Running on ' + port);
  });

  // on error 404
  app.use((req, res) => res.status(404).json({url: req.originalUrl + ' not found'}));

});
