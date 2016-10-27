/**
         * Create the chart when all data is loaded
         * @returns {undefined}
         */
function createChart(seriesOptions) {
    $('#chart').highcharts('StockChart', {
        rangeSelector: {
            selected: 4
        },
        navigator: {
            enabled: false
        },
        credits: {
            enabled: false
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
            headerFormat: '<b style="color: white">{point.key}</b><br/>',
            pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b style="color: white">{point.y}</b> <br/>',
            valueDecimals: 2,
            split: false,
            backgroundColor: 'black'
        },
        series: seriesOptions
    });
}