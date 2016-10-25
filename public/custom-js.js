$(function () {
    var seriesOptions = [],
        seriesCounter = 0,
        names = ['MSFT', 'AAPL', 'GOOG', 'FB', 'AOL', 'TSLA', 'AAA'],
        colors = ['#CD6155', '#AF7AC5', '#7FB3D5', '#F7DC6F', '#CACFD2', '#76D7C4', '#7F8C8D'];

    /**
     * Create the chart when all data is loaded
     * @returns {undefined}
     */
    function createChart() {

        $('#chart').highcharts('StockChart', {

            rangeSelector: {
                selected: 4
            },

            yAxis: {
                labels: {
                    formatter: function () {
                        return (this.value > 0 ? ' + ' : '') + this.value + '%';
                    }
                },
                plotLines: [{
                    value: 0,
                    width: 2,
                    color: 'silver'
                }]
            },

            xAxis: {
                type: 'datetime',
                labels: {
                    formatter: function () {
                        return Highcharts.dateFormat('%d %b %y', this.value);
                    },
                    dateTimeLabelFormats: {
                        minute: '%H:%M',
                        hour: '%H:%M',
                        day: '%e. %b',
                        week: '%e. %b',
                        month: '%b \'%y',
                        year: '%Y'
                    }
                }
            },

            plotOptions: {
                series: {
                    compare: 'percent',
                    showInNavigator: true
                }
            },

            tooltip: {
                pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b style="color: white">{point.y}</b> <br/>',
                valueDecimals: 2,
                split: false,
                backgroundColor: 'black'
            },

            series: seriesOptions
        });
    }

    $.each(names, function (i, name) {

        $.getJSON('http://localhost:3000/' + name, function (data) {
            console.log(data);

            if (data.quandl_error) {
                console.log(data.quandl_error);
                names.splice(i, 1);
                console.log(names);
            } else {
                data = data.dataset.data.map(function (val) {
                    return [new Date(val[0]).getTime(), val[1]];
                });
                seriesOptions[i] = {
                    color: colors[i],
                    name: name,
                    data: data
                };

                // As we're loading the data asynchronously, we don't know what order it will arrive. So
                // we keep a counter and create the chart when all the data is loaded.
                seriesCounter += 1;
            }
            if (seriesCounter === names.length) {
                createChart();
            }
        });
    });
});