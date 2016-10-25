'use strict'
let express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    mongoose = require('mongoose'),
    path = require('path'),
    Quandl = require('quandl'),
    config = require('./config/config');

//mongoose default basic es6 promise
mongoose.Promise = global.Promise;

//Use body-parser to get POST requests for API use
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//statis files serve 
app.use("/public", express.static(path.join(__dirname, 'public')));

//quandl init
let quandl = new Quandl({
    auth_token: config.api_key,
    api_version: config.api_version
});

//home page
app.get('/', (req, res)=>{
    res.sendFile(path.join(__dirname, './public/index.html'));
});

// get stock of a company
app.get('/:name', (req, res) => {
    quandl.dataset(
        {
            source: 'WIKI',
            table: req.params.name
        },
        {
            order: 'asc',
            exclude_column_names: false,
            start_date: '2015-10-21',
            end_date: '2016-10-25',
            column_index: 1
        }, 
        (err, response) => {
            if (err) {
                return res.json(err);
            }
            res.json(JSON.parse(response));
        }
    );
});

app.listen(config.PORT || 3000);