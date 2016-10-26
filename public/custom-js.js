angular.module('stockchart', [])
    .controller('HomeCtrl', ['$scope', '$http', '$timeout', function ($scope, $http, $timeout) {
        var seriesOptions = [],
            seriesCounter = 0,
            stocks = [],
            colors = ['#CD6155', '#AF7AC5', '#7FB3D5', '#F7DC6F', '#969696', '#76D7C4', '#13CD13', '#DF842A', "#6060F0", "#E060A0"];
        $scope.stocksCatalog = [];


        //try to get initstocks
        $http.get('/initstocks')
            .success(function (initStocks) {
                if (initStocks.length === 0) { //if initStocks length is empty then createchart and showCatalog
                    $scope.showCatalog = true;
                    createChart();
                } else {
                    stocks = initStocks;
                    //Initially loop through stocks folder got from the server
                    angular.forEach(stocks, function (name, i) {
                        $http.get('http://localhost:3000/api/stock/' + name)
                            .success(function (data) {
                                if (data.dataset) { //If dataset present in the data then add stock data in the chart
                                    //After getting the data successfully add the stock with its code ,name, color to stocksCatalog in a specific position accoding to its name postion in stocks array.
                                    $scope.stocksCatalog[stocks.indexOf(name)] = {
                                        code: name,
                                        name: data.dataset.name,
                                        color: colors[i]
                                    };
                                    //now trim and convert the data to required data for the chart i.e, change date to seconds and stock value unchanged. 
                                    data = data.dataset.data.map(function (val) {
                                        return [new Date(val[0]).getTime(), val[1]];
                                    });
                                    //add seriesOptions for the stock to display on chart. 
                                    seriesOptions[i] = {
                                        color: colors[i],
                                        name: name,
                                        data: data
                                    };
                                    // As we're loading the data asynchronously, we don't know what order it will arrive. So
                                    // we keep a counter and create the chart when all the data is loaded.
                                    seriesCounter += 1;
                                } else { //if not dataset present in the data then there must be some error, so remove this stock from stocks list so that createChart continues.
                                    stocks.splice(i, 1);
                                    console.log(data);
                                }
                                //If the seriesCounter comes equal to stocks length then prepare chart. And also turn the showCatalog to true so that stocksCatalog shown after the chart preparation.
                                if (seriesCounter === stocks.length) {
                                    $scope.showCatalog = true;
                                    createChart(seriesOptions);
                                }
                            })
                            .error(function (err) { //If error occured while getting data of stock then also remove the stock from stocks and console log the error. 
                                stocks.splice(i, 1);
                                console.log(err);
                                //If the seriesCounter comes equal to stocks length then prepare chart. And also turn the showCatalog to true so that stocksCatalog shown after the chart preparation.
                                if (seriesCounter === stocks.length) {
                                    $scope.showCatalog = true;
                                    createChart(seriesOptions);
                                }
                            });
                    });
                }

            }).error(function (err) {
                console.log(err);
            })

        //To remove the stock 
        $scope.removeStock = function (stock) {
            $http.post('/api/deletestock', { stock: stock })
                .success(function (msg) {
                    console.log(msg);
                });
            var position = stocks.indexOf(stock.code);
            console.log(stock.name);
            //get the chart.
            var chart = $("#chart").highcharts();
            //remove from the stocks array
            stocks.splice(position, 1);
            //remove the stock from chart
            chart.series[position].remove();
            //remove from stocksCatalog
            $scope.stocksCatalog.splice(position, 1);
            //remove from seriesOptions
            seriesOptions.splice(position, 1);
            //remove the color from colors add it to last position
            colors.splice(position, 1);
            colors.push(stock.color);
        };

        //To Add new Stock
        $scope.getAndAddStock = function (name) {
            //First make the input field empty
            $scope.newStockName = "";
            //turn the input name to uppercase
            name = name.toUpperCase();
            //hide the input form's div
            $("#addStockDiv").css('display', 'none');
            //show the refresh icon
            $("#refreshIcon").css('display', 'inline-block');
            if (stocks.indexOf(name) < 0) { //get the data of stock from server it is not present in stocks.
                $http.get('http://localhost:3000/api/stock/' + name)
                    .success(function (data) {
                        if (data.dataset) {
                            //Add the stock with name, color and code to stocksCatalog
                            $scope.stocksCatalog.push({
                                code: name,
                                name: data.dataset.name,
                                color: colors[seriesOptions.length]
                            });
                            //trim and modify the data to data required for chart preparation.
                            data = data.dataset.data.map(function (val) {
                                return [new Date(val[0]).getTime(), val[1]];
                            });
                            //get the chart.
                            var chart = $("#chart").highcharts();
                            //make a new serires with color , name and data. Get the color from colors with seriesOptions.length as index. i.e, an unused color is alloted.
                            var newSeries = {
                                color: colors[seriesOptions.length],
                                name: name,
                                data: data
                            }
                            //add the new siries to chart series
                            chart.addSeries(newSeries);
                            //push this newSiries to seriesOptions so that color allotment will continue un interruptedly.
                            seriesOptions.push(newSeries);
                            //also push this newSeries's name to stocks
                            stocks.push(name);
                            //hide refreshIcon
                            $("#refreshIcon").css('display', 'none');
                            //show the add new stock form's  div
                            $("#addStockDiv").css('display', 'inline-block');
                        } else { //If the requested new stock is incoorect stock code 
                            //then alert the user that the stock is incoorect or no stock exists with that code. 
                            alert('Oops the stock code name is incorrect!');
                            console.log(data);
                            //hide refreshIcon 
                            $("#refreshIcon").css('display', 'none');
                            //show the add new stock form's div
                            $("#addStockDiv").css('display', 'inline-block');
                        }
                    });
            } else { //If the code exists in stocks.
                //then alert the user that the stock is already exists.
                alert('This stock has been displaying in chart.');
                //hide refreshIcon
                $("#refreshIcon").css('display', 'none');
                //show add new stock form's div
                $("#addStockDiv").css('display', 'inline-block');
            }
        };
    }]);