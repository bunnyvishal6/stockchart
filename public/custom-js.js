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

        socket.on('initstocks', function (data) {
            var initStocks = data.stocks;
            if (initStocks.length === 0) {
                $scope.errorMsg = "No stock added yet. please add one.";
                $scope.showError();
                $scope.$apply(function () {
                    $scope.showCatalog = true;
                });
                createChart();
            } else {
                stocks = initStocks;
                angular.forEach(stocks, function (name, i) {
                    $http.get('https://bunny-stockchart.herokuapp.com/api/stock/' + name)
                        .success(function (data) {
                            if (data.dataset) {
                                $scope.stocksCatalog[stocks.indexOf(name)] = {
                                    code: name,
                                    name: data.dataset.name,
                                    color: colors[i]
                                };
                                data = data.dataset.data.map(function (val) {
                                    return [new Date(val[0]).getTime(), val[1]];
                                });
                                seriesOptions[i] = {
                                    color: colors[i],
                                    name: name,
                                    data: data
                                };
                                seriesCounter += 1;
                            } else {
                                stocks.splice(i, 1);
                                console.log(data);
                            }
                            if (seriesCounter === stocks.length) {
                                $scope.showCatalog = true;
                                createChart(seriesOptions);
                            }
                        })
                        .error(function (err) {
                            stocks.splice(i, 1);
                            if (seriesCounter === stocks.length) {
                                $scope.showCatalog = true;
                                createChart(seriesOptions);
                            }
                        });
                });
            }
        });

        $scope.deleteStock = function (stock) {
            socket.emit('deletestock', { stock: stock });
        };
        socket.on('deletedstock', function (data) {
            var stock = data.stock;
            var position = stocks.indexOf(stock.code);
            var chart = $("#chart").highcharts();
            stocks.splice(position, 1);
            chart.series[position].remove();
            $scope.$apply(function () {
                $scope.stocksCatalog.splice(position, 1);
            });
            seriesOptions.forEach(function (series) {
                if (series.name == stock.code) {
                    colors.splice(colors.indexOf(series.color), 1);
                    colors.push(series.color);
                    seriesOptions.splice(seriesOptions.indexOf(series), 1);
                }
            });
        });

        $scope.getAndAddStock = function (name) {
            name = name.toUpperCase();
            $scope.newStockName = "";
            if (stocks.length === 10) {
                $scope.errorMsg = 'Sorry! you cannot compare more than 10 stocks at a time.';
                $scope.showError();
            } else {
                if (stocks.indexOf(name) < 0) {
                    $("#addStockDiv").css('display', 'none');
                    $("#refreshIcon").css('display', 'inline-block');
                    socket.emit('addstock', { code: name });
                } else {
                    $scope.errorMsg = 'This stock has been displaying in chart.';
                    $scope.showError();
                }
            }
        };

        socket.on('limitexceeded', function (data) {
            console.log(data.msg);
            $scope.errorMsg = data.msg;
            $scope.showError();
        });
        socket.on('addedstock', function (json) {
            var name = json.code;
            var data = json.data;
            if (data.dataset) {
                $scope.$apply(function () {
                    $scope.stocksCatalog.push({
                        code: name,
                        name: data.dataset.name,
                        color: colors[seriesOptions.length]
                    });
                });
                data = data.dataset.data.map(function (val) {
                    return [new Date(val[0]).getTime(), val[1]];
                });
                var chart = $("#chart").highcharts();
                var newSeries = {
                    color: colors[seriesOptions.length],
                    name: name,
                    data: data
                }
                chart.addSeries(newSeries);
                seriesOptions.push(newSeries);
                stocks.push(name);
                $("#refreshIcon").css('display', 'none');
                $("#addStockDiv").css('display', 'inline-block');
            } else {
                $scope.$apply(function () {
                    $scope.errorMsg = 'Please enter a valid stock code';
                });
                $scope.showError();
                $("#refreshIcon").css('display', 'none');
                $("#addStockDiv").css('display', 'inline-block');
            }
        });

    }]);