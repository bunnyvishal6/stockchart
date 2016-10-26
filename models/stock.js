const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const StockSchema = new Schema({
    code: {
        type: String,
        unique: true
    }
});

var Stock = mongoose.model('Stock', StockSchema);

module.exports = Stock;
