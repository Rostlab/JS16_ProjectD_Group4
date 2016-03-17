// function to parse string in the format 2006-01-02 to JavaScript's Date type
var parseDate = d3.time.format("%Y-%m-%d").parse;

function characterChart(svg, dataURL) {
    // set margin
    var margin = {top: 20, right: 20, bottom: 50, left: 50};

    // calculate height and width from svg size
    function getSize() {
        var svgHeight = parseInt(svg.style('height'),10),
            svgWidth  = parseInt(svg.style('width'),10);

        return {
            height: svgHeight - margin.top  - margin.bottom,
            width:  svgWidth  - margin.left - margin.right
        };
    }

    // create group for chart within svg
    var chart = svg.append("g");

    // apply margin
    chart.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // add area elements
    var pos = chart.append("path").attr("class", "area pos"),
        neg = chart.append("path").attr("class", "area neg");

    // add axis label elements
    var xLabel = chart.append("g").attr("class", "x axis"),
        yLabel = chart.append("g").attr("class", "y axis");


    // define axis
    var x = d3.time.scale(),
        y = d3.scale.linear();
    var xAxis = d3.svg.axis().scale(x).orient("bottom"),
        yAxis = d3.svg.axis().scale(y).orient("left");

    // positive area between x-axis at y=0 and max(y)
    var calcAreaPos = d3.svg.area().interpolate("monotone").x(function(d) {
        return x(d.date);
    }).y0(function(d) {
        return y(0);
    }).y1(function(d) {
        return y(d.pos);
    });
    // negative area between x-axis at y=0 and min(y)
    var calcAreaNeg = d3.svg.area().interpolate("monotone").x(function(d) {
        return x(d.date);
    }).y0(function(d) {
        return y(d.neg);
    }).y1(function(d) {
        return y(0);
    });

    function convertCSV(d) {
        // convert string data from CSV
        return {
            date: parseDate(d.date), // parse date column to Date
            pos:  +d.pos,            // convert pos column to positive number
            neg:  -d.neg             // convert neg column to negative number
        };
    }

    function fillChart(error, data) {
        // TODO: better error handling
        if (!!error) {
            var up = error;
            throw up;
        }

        // set domains (data)
        x.domain(d3.extent(data, function(d) {
            return d.date;
        }));
        // y from min(neg) to max(pos)
        y.domain([d3.min(data, function(d) {
            return d.neg;
        }), d3.max(data, function(d) {
            return d.pos;
        })]);

        // set area data
        pos.datum(data);
        neg.datum(data);

        render();
    }

    function render() {
        var s = getSize();

        // axis
        x.range([0, s.width]);
        y.range([s.height, 0]);

        // areas
        pos.attr("d", calcAreaPos);
        neg.attr("d", calcAreaNeg);

        // axis
        xLabel.attr("transform", "translate(0," + s.height + ")").call(xAxis);
        yLabel.call(yAxis);
    }

    // request csv data and fill chart
    d3.csv(dataURL, convertCSV, fillChart);

    this.resize = render;

    return this;
}
