angular.module('stockchart', [])
    .controller('HomeCtrl', ['$scope', '$http', '$timeout', function ($scope, $http, $timeout) {
        var seriesOptions = [],
            seriesCounter = 0,
            stocks = [],
            colors = ['#CD6155', '#AF7AC5', '#7FB3D5', '#F7DC6F', '#969696', '#76D7C4', '#13CD13', '#DF842A', "#6060F0", "#E060A0"];
        $scope.stocksCatalog = [];
        var socket = io.connect();

         $scope.showError = function () {
            $(".custom-modal").addClass("make-background-dim");
            $("#myModal").css("display", "block");
            $("#myModal").removeClass('throw-up-modal');
        };

         $scope.hideError = function () {
            $(".custom-modal").removeClass("make-background-dim");
            $("#myModal").removeClass('drop-in-modal');
            $("#myModal").addClass('throw-up-modal');
            setTimeout(function () {
                $("#myModal").css("display", "none");
            }, 400);
            $scope.errorMsg = "";
        };

        //Initial event of getting initStocks
        socket.on('initstocks', function (data) {
            //make initstocks equal to data.stocks
            var initStocks = data.stocks;
            if (initStocks.length === 0) { //if initStocks length is empty then createchart and showCatalog
                console.log("no initstocks");
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
        });


        //To delte the stock 
        $scope.deleteStock = function (stock) {
            socket.emit('deletestock', { stock: stock });
        };

        //delete the stock after confirmation from server
        socket.on('deletedstock', function (data) {
            //make stock equal to data.stock
            var stock = data.stock;
            //get postion equal to stock index in stocks
            var position = stocks.indexOf(stock.code);
            //get the chart.
            var chart = $("#chart").highcharts();
            //remove from the stocks array
            stocks.splice(position, 1);
            //remove the stock from chart
            chart.series[position].remove();
            //applying to the $scope 
            $scope.$apply(function () {
                //remove from stocksCatalog
                $scope.stocksCatalog.splice(position, 1);
            });
            //remove the color from colors based on seriesOptions add it to last position.
            seriesOptions.forEach(function (series) {
                if (series.name == stock.code) {
                    colors.splice(colors.indexOf(series.color), 1);
                    colors.push(series.color);
                    //remove this series from seriesOptions.
                    seriesOptions.splice(seriesOptions.indexOf(series), 1);
                }
            });
        });

        //To Add new Stock
        $scope.getAndAddStock = function (name) {
            //turn the input name to uppercase
            name = name.toUpperCase();
            //make the input field empty
            $scope.newStockName = "";
            if (stocks.length === 10) {
                //alert('Sorry! you cannot compare more than 10 stocks at a time.');
                $scope.errorMsg = 'Sorry! you cannot compare more than 10 stocks at a time.';
                $scope.showError();
            } else {
                if (stocks.indexOf(name) < 0) { //get the data of stock from server it is not present in stocks.
                    //hide the input form's div
                    $("#addStockDiv").css('display', 'none');
                    //show the refresh icon
                    $("#refreshIcon").css('display', 'inline-block');
                    //emit the addstock event with name as code for server conveneince.
                    socket.emit('addstock', { code: name });


                } else { //If the code exists in stocks.
                    //then alert the user that the stock is already exists.
                    //alert('This stock has been displaying in chart.');
                    $scope.errorMsg = 'This stock has been displaying in chart.';
                    $scope.showError();
                }
            }
        };

        //on limit exceeded event
        socket.on('limitexceeded', function (data) {
            //alert(data.msg);
            console.log(data.msg);
            $scope.errorMsg = data.msg;
            $scope.showError();
        });

        //on addstock socket event
        socket.on('addedstock', function (json) {
            //make a vaiable name equal to code got from server for client conveneince.
            var name = json.code;
            //make data = json.data for client conveneince.
            var data = json.data;
            //get stock data from server . 

            if (data.dataset) {
                //Add the stock with name, color and code to stocksCatalog with $scope.$apply to bind the angular with socket event.
                $scope.$apply(function () {
                    $scope.stocksCatalog.push({
                        code: name,
                        name: data.dataset.name,
                        color: colors[seriesOptions.length]
                    });
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
                //alert('Oops the stock code name is incorrect!');
                $scope.$apply(function(){
                    $scope.errorMsg = 'Please enter a valid stock code';
                });
                $scope.showError();
                //hide refreshIcon 
                $("#refreshIcon").css('display', 'none');
                //show the add new stock form's div
                $("#addStockDiv").css('display', 'inline-block');
            }
        });

    }]);