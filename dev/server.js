'use strict'
let express = require('express'),
    app = express(),
    server = require('http').Server(app),
    io = require('socket.io')(server),
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

//static folder serve
app.use(express.static(path.join(__dirname, 'public')));

//static files serve 
app.use("/public", express.static(path.join(__dirname, 'public')));

//quandl init
let quandl = new Quandl({
    auth_token: config.api_key,
    api_version: config.api_version
});

//on connection emit the intistocks
io.on('connection', socket => {
    console.log('new connection made');
    //get all stocks and emit initstocks
    Stock.find({}, (err, stocks) => {
        if (err) { console.log(err); }
        if (stocks.length === 0) {
            socket.emit('initstocks', { stocks: [] });
        } else {
            let array = [];
            for (let i = 0; i < stocks.length; i++) {
                array.push(stocks[i].code);
                if (i === stocks.length - 1) {
                    socket.emit('initstocks', { stocks: array });
                }
            }
        }
    });

    //on deletestock delete the stock from database and emit the stock to client so that deletion done in client as well
    socket.on('deletestock', data => {
        Stock.findOne({ code: data.stock.code }, (err, stock) => {
            if (err) { console.log(err) }
            if (stock) {
                stock.remove(err => {
                    if (!err) {
                        io.emit('deletedstock', { stock: data.stock });
                    }
                });
            }
        })
    });

    //on addstock add the stock code to database and emit the stock code to client so that the addition is done in client as well.
    socket.on('addstock', emitedData => {
        let code = emitedData.code,
            start_date = new Date(),
            end_date = new Date();
        end_date = end_date.getFullYear() + "-" + (end_date.getMonth() + 1) + "-" + end_date.getDate();
        start_date = (start_date.getFullYear() - 1) + "-" + (start_date.getMonth() + 1) + "-" + start_date.getDate();
        quandl.dataset(
            {
                source: 'WIKI',
                table: code
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
                    //emit addedstock error to particular client
                    return socket.emit('addedstock', { err: err });
                }
                //if there is no quandl error then try to save the stock 
                if (!JSON.parse(data).quandl_error) {
                    Stock.find({}, (err, stocks) => {
                        if (err) { 
                            console.log(err) 
                        }
                        //check if the stocks length is 10 then emit to particular socket that limit exceed. else continue
                        if (stocks.length === 10) {
                            socket.emit('limitexceeded', { msg: "you cannot compare more than 10 stocks at a time." });
                        } else {
                            let stockExists = false;
                            for (let i = 0; i < stocks.length; i++) {
                                if (stocks[i].code == code) {
                                    stockExists = true;
                                    //emitting addedstock for all clients
                                    io.emit('addedstock', { data: JSON.parse(data), code: code });
                                } else if (!stockExists && i == (stocks.length - 1)) {
                                    let newStock = new Stock({ code: code });
                                    //attempt to save newstock
                                    newStock.save(err => {
                                        if (err) {
                                            console.log(err);
                                        }
                                        //emitting addedstock for all clients
                                        io.emit('addedstock', { data: JSON.parse(data), code: code });
                                    });
                                }
                            }
                        }
                    });
                } else { // if quandl_error presents then emit the addedstock to particular client without attempting to save stock name.
                    socket.emit('addedstock', { data: JSON.parse(data), code: code });
                }
            }
        );
    });


});


//delete a stock
app.post('/api/deletestock', (req, res) => {
    Stock.findOne({ code: req.body.stock.code }, (err, stock) => {
        if (stock) {
            stock.remove((err) => {
                if (!err) {
                    res.json("deleted successfully");
                }
            });
        }
    });
});

//home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './public/index.html'));
});

//get initstocks
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



server.listen(config.PORT || 3000);