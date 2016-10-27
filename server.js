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

mongoose.Promise = global.Promise;

mongoose.connect(config.db);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));

app.use("/public", express.static(path.join(__dirname, 'public')));

let quandl = new Quandl({
    auth_token: config.api_key,
    api_version: config.api_version
});

io.on('connection', socket => {
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
                    return socket.emit('addedstock', { err: err });
                }
                if (!JSON.parse(data).quandl_error) {
                    Stock.find({}, (err, stocks) => {
                        if (err) {
                            console.log(err)
                        }
                        if (stocks.length === 10) {
                            socket.emit('limitexceeded', { msg: "you cannot compare more than 10 stocks at a time." });
                        } else {
                            if (stocks.length === 0) {
                                let newStock = new Stock({ code: code });
                                newStock.save(err => {
                                    if (err) {
                                        console.log(err);
                                    }
                                    io.emit('addedstock', { data: JSON.parse(data), code: code });
                                });
                            } else {
                                let stockExists = false;
                                for (let i = 0; i < stocks.length; i++) {
                                    if (stocks[i].code == code) {
                                        stockExists = true;
                                        io.emit('addedstock', { data: JSON.parse(data), code: code });
                                    } else if (!stockExists && i == (stocks.length - 1)) {
                                        let newStock = new Stock({ code: code });
                                        newStock.save(err => {
                                            if (err) {
                                                console.log(err);
                                            }
                                            io.emit('addedstock', { data: JSON.parse(data), code: code });
                                        });
                                    }
                                }
                            }
                        }
                    });
                } else {
                    socket.emit('addedstock', { data: JSON.parse(data), code: code });
                }
            }
        );
    });


});

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


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './public/index.html'));
});


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
            } else {
                res.json(JSON.parse(data));
            }
        }
    );
});



server.listen(process.env.PORT || 3000);
