const bodyParser = require('body-parser');
const createError = require('http-errors');
const dayjs = require('dayjs');
const express = require('express');
const logger = require('morgan');
const mongoose = require('mongoose');
const path = require('path');
const relativeTime = require('dayjs/plugin/relativeTime');

dayjs.extend(relativeTime);
connectTimeoutMS
global.start = dayjs().valueOf();

if (process.env.NODE_ENV != 'container') {
  require('dotenv').config({ path: path.join(__dirname, '.env.local') });
}

mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);

require('./models/mongo/flights');
require('./models/mongo/latestFlight');
require('./models/mongo/quakes');
require('./models/mongo/latestQuake');
require('./models/mongo/weather');
require('./models/mongo/latestWeather');

mongoose.Promise = global.Promise;

const app = express();

var mongoPrefix = "mongodb://"
var user = process.env.MONGODB_USER
var password = process.env.MONGODB_PASSWORD
var mongoIP = process.env.MONGODB_IP
var mongoPort = process.env.MONGODB_PORT

var cosmosConnectString = mongoPrefix.concat(user,`:`,password,`@`,mongoIP,`:`,mongoPort,`/hackfest`)
console.log(`LOG :: CURRENT CONNECTION STRING IS "${cosmosConnectString}" `)

var connectionTries = 0;

tryConnection()

const apiRouter = require('./routes/api');

var db = mongoose.connection;

db.on('error', err => {
  console.log(`ERROR :: CONNECTION TO DATABASE /r/n "${err}"` )
  connectionTries++
  // TRY THE CONNECTION AGAIN IN 5 SECONDS
});

db.once('open', () => {
  console.log(`LOG :: CONNECTION SUCCESS WITH MONGO`);
});

app.set('etag', 'strong');
app.use(logger('dev'));
app.use(bodyParser.json({ limit: '2mb' }));
app.use('/', apiRouter);

app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(req, res, next) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS, PUT, PATCH, DELETE'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-Requested-With,content-type'
  );

  res.append('Last-Modified', new Date().toUTCString());

  next();
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send(err);
});

function tryConnection(){

  if ( connectionTries === 4 ){
    // WHO DOESN'T LIKE JOE MONTANA
    process.exit(16)
  }

  if (process.env.NODE_ENV != 'local') {
    mongoose.connect(
      cosmosConnectString,
      {
        user: user,
        pass: password,
        useNewUrlParser: true,
        reconnectTries : 10, // TRY TO CONNECT TEN TIMES (ALTHOUGH WE CUT IT AT 5)
        reconnectInterval : 3000 // TRY TO CONNECT EVERY 3 SECONDS
      }
    );
  } else {
    mongoose.connect(
      'mongodb://localhost/demo:27017',
      { useNewUrlParser: true,
        reconnectTries : 10, // TRY TO CONNECT TEN TIMES (ALTHOUGH WE CUT IT AT 5)
        reconnectInterval : 3000 // TRY TO CONNECT EVERY 3 SECONDS
       }
    );
  }
}

module.exports = app;
