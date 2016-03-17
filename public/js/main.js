// function to parse string in the format 2006-01-02 to JavaScript's Date type
var parseDate = d3.time.format("%Y-%m-%d").parse;

function characterChart(svg, dataURL) {
    // set margin
    var margin = {
        top: 20,
        right: 20,
        bottom: 50,
        left: 50
    };

    // calculate height and width from svg size
    function getSize() {
        var svgHeight = parseInt(svg.style('height'), 10),
            svgWidth = parseInt(svg.style('width'), 10);

        return {
            height: svgHeight - margin.top - margin.bottom,
            width: svgWidth - margin.left - margin.right
        };
    }

    // define axis
    var x = d3.time.scale(),
        y = d3.scale.linear();
    var xAxis = d3.svg.axis().scale(x).orient("bottom"),
        yAxis = d3.svg.axis().scale(y).orient("left");

    // positive area between x-axis at y=0 and max(y)
    var calcAreaPos = d3.svg.area().interpolate("monotone").x(function (d) {
        return x(d.date);
    }).y0(function (d) {
        return y(0);
    }).y1(function (d) {
        return y(d.pos);
    });

    // negative area between x-axis at y=0 and min(y)
    var calcAreaNeg = d3.svg.area().interpolate("monotone").x(function (d) {
        return x(d.date);
    }).y0(function (d) {
        return y(d.neg);
    }).y1(function (d) {
        return y(0);
    });

    /*
    DOM Tree
    
    svg
        container
            plot
                chart
            x axis
            y axis
        
        More charts?
    */

    // Outer container for the timeline
    var container = svg.append("g")
        .attr("width", getSize().width)
        .attr("height", getSize().height)
        .attr("transform", "translate(" + (margin.left) + "," + margin.top + ")");

    // Create a background area
    var plot = svg.append("g");
    plot.append("rect")
        .attr("id", "background")
        .attr("class", "react")
        .attr("width", getSize().width - 1)
        .attr("height", getSize().height)
        .attr("x", "1")
        .style("fill", "#EEEEEE");
    // Moving to the right by 1px to prevent shadowing of y axis.

    // create group for chart within svg
    var chart = plot.append("g")
        .attr("class", "react")
        .attr("clip-path", "url(#clip)");

    // Define the visible area
    chart.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("x", d3.select("#background").attr("x"))
        .attr("y", d3.select("#background").attr("y"))
        .attr("width", d3.select("#background").attr("width"))
        .attr("height", d3.select("#background").attr("height"));

    // apply margin
    plot.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // add area elements
    var pos = chart.append("path").attr("class", "area pos"),
        neg = chart.append("path").attr("class", "area neg");

    // add axis label elements
    var xLabel = container.append("g").attr("class", "x axis")
        .attr("transform", "translate(0," + getSize().height + ")"),
        yLabel = container.append("g").attr("class", "y axis");


    function convertCSV(d) {
        // convert string data from CSV
        return {
            date: parseDate(d.date), // parse date column to Date
            pos: +d.pos, // convert pos column to positive number
            neg: -d.neg // convert neg column to negative number
        };
    }

    function fillChart(error, data) {
        // TODO: better error handling
        if (!!error) {
            var up = error;
            throw up;
        }

        // axis
        x.range([0, getSize().width]);
        y.range([getSize().height, 0]);

        // set domains (data)
        // Show all the available data. 
        /*      x.domain(d3.extent(data, function (d) {
                    return d.date;
                }));*/
        // Show default date range. Could for example be set to the current week. For now test values
        var minDate = new Date(2016, 1, 20),
            maxDate = new Date(2016, 3, 5);
        x.domain([minDate, maxDate]);

        // y from min(neg) to max(pos)
        y.domain([d3.min(data, function (d) {
            return d.neg;
        }), d3.max(data, function (d) {
            return d.pos;
        })]);

        // set area data
        pos.datum(data);
        neg.datum(data);

        // Zoom Handling
        d3.selectAll(".react").call(d3.behavior.zoom()
            .x(x)
            .scaleExtent([0.1, 10]) // TODO: Set meaningful values
            .on("zoom", recalc));

        render();
    }

    function render() {
        // axis (not needed for zoom handling)
        x.range([0, getSize().width]);
        y.range([getSize().height, 0]);

        recalc();
    }

    function recalc() {
        // areas
        pos.attr("d", calcAreaPos);
        neg.attr("d", calcAreaNeg);

        // axis
        xLabel.call(xAxis);
        yLabel.call(yAxis);
    }

    // request csv data and fill chart
    d3.csv(dataURL, convertCSV, fillChart);

    this.resize = render;

    return this;
}
