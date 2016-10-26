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

app.get('/initstocks', (req, res) => {
    Stock.find({}, (err, stocks) => {
        if (err) {
            return res.json(err);
        }
        if (stocks) {
            var array = [];
            stocks.forEach((stock) => {
                array.push(stock.code);
            });
            res.json(array);
        }
    });
});

// get stock of a company
app.get('/api/stock/:code', (req, res) => {
    let start_date = new Date(),
        end_date = new Date();
    end_date = end_date.getFullYear() + "-" + (end_date.getMonth() + 1) + "-" + end_date.getDate();
    start_date = (start_date.getFullYear() - 1) + "-" + (start_date.getMonth() + 1) + "-" + start_date.getDate();
    quandl.dataset(
        {
            source: 'WIKI',
            table: req.params.code
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
            //if there is no quandl error then try to save the stock 
            if (!JSON.parse(data).quandl_error) {
                Stock.findOne({ code: req.params.code }, (err, stock) => {
                    if (err) { console.log(err); }
                    if (!stock) {
                        let newStock = new Stock({ code: req.params.code });
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
            } else { // if quandl_error presents then server data without attempting to save stock name.
                res.json(JSON.parse(data));
            }
        }
    );
});

app.post('/api/deletestock', (req, res) => {
    Stock.findOne({ code: req.body.stock.code }, (err, stock) => {
        if (stock) {
            stock.remove((err) => {
                if (!err) {
                    res.json("delete successfully");
                }
            });
        }
    });
});

app.listen(config.PORT || 3000);