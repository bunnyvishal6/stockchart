'use strict'
let express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    mongoose = require('mongoose'),
    path = require('path'),
    Quandl = require('quandl'),
    config = require('./config/config'),
    Stock = require('./models/stock');

//mongoose default basic es6 promise
mongoose.Promise = global.Promise;

//mongoose db connection
mongoose.connect(config.db);

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
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './public/index.html'));
});

// get stock of a company
app.get('/api/stock/:name', (req, res) => {
    let start_date = new Date(),
        end_date = new Date();
    end_date = end_date.getFullYear() + "-" + (end_date.getMonth() + 1) + "-" + end_date.getDate();
    start_date = (start_date.getFullYear() -1) + "-" + (start_date.getMonth() + 1) + "-" + start_date.getDate();
    quandl.dataset(
        {
            source: 'WIKI',
            table: req.params.name
        },
        {
            order: 'asc',
            exclude_column_names: false,
            start_date: start_date,
            end_date: end_date,
            column_index: 1
        },
        (err, data) => {
            if (err) {
                return res.json(err);
            }
            Stock.findOne({ name: req.params.name }, (err, stock) => {
                if (err) { console.log(err); }
                if (!stock) {
                    let newStock = new Stock({ name: req.params.name });
                    newStock.save(err => {
                        if (err) {
                            console.log(err);
                        }
                        res.json(JSON.parse(data));
                    });
                } else {
                    res.json(JSON.parse(data));
                }
            });
        }
    );
});

app.listen(config.PORT || 3000);