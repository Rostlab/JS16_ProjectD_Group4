// function to parse string in the format 2006-01-02 to JavaScript's Date type
var parseDate = d3.time.format("%Y-%m-%d").parse;

function characterChart(svg, dataURL) {
    // set margin
    var margin = {top: 20, right: 20, bottom: 50, left: 50};

    // calculate height and width from svg size
    // TODO: resize
    var height = parseInt(svg.style('height'),10) - margin.top  - margin.bottom,
        width  = parseInt(svg.style('width'),10)  - margin.left - margin.right;

    // create group for chart within svg
    var chart = svg.append("g");

    // apply margin
    chart.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // define axis
    var x = d3.time.scale().range([0, width]),
        y = d3.scale.linear().range([height, 0]);
    var xAxis = d3.svg.axis().scale(x).orient("bottom"),
        yAxis = d3.svg.axis().scale(y).orient("left");

    // format areas
    // positive area between x-axis at y=0 and max(y)
    var areaPos = d3.svg.area().interpolate("monotone").x(function(d) {
        return x(d.date);
    }).y0(function(d) {
        return y(0);
    }).y1(function(d) {
        return y(d.pos);
    });
    // negative area between x-axis at y=0 and min(y)
    var areaNeg = d3.svg.area().interpolate("monotone").x(function(d) {
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

        // add areas
        chart.append("path").datum(data).attr("class", "area pos").attr("d", areaPos);
        chart.append("path").datum(data).attr("class", "area neg").attr("d", areaNeg);

        // add x- and y-axis
        chart.append("g").attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")").call(xAxis);
        chart.append("g").attr("class", "y axis").call(yAxis);
    }

    // request csv data and fill chart
    d3.csv(dataURL, convertCSV, fillChart);
}
