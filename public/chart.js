// function to parse string in the format 2006-01-02 to JavaScript's Date type
var parseDate = d3.time.format("%Y-%m-%d").parse;

function characterChart(svg, dataURL) {
    var self = this;
    var zoom = d3.behavior.zoom(); // Zooming behavior
    this.fullYdomain = [];
    this.fullXdomain = [];
    this.resize = render; // Resizing behaviour
    this.episodeData = null;
    this.ready = 0;

    // Get CSV prefix (HELPER Function)
    function getPrefix() {
        var path = dataURL.split("/");
        path.pop();
        var s = "";
        for (var p of path) {
            s += p + "/";
        }
        return s;
    }

    // set margin
    var margin = {
        top: 40,
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
    var x = d3.time.scale()
        .range([0, getSize().width]),
        y = d3.scale.linear()
        .range([getSize().height, 0]);

    var xAxis = d3.svg.axis().scale(x).orient("bottom"),
        yAxis = d3.svg.axis().scale(y).orient("left");

    // Seperate axis for episodes
    var eAxis = d3.svg.axis().scale(x).orient("top").tickSize(0, 0);

    // TODO: Improve Multi-Scale Tick Format on time x-axis
    // Cheat sheet: https://github.com/mbostock/d3/wiki/Time-Formatting#format_iso
    /*    var customTimeFormat = d3.time.format.multi([
            [".%L", function(d) { return d.getMilliseconds(); }],
            [":%S", function(d) { return d.getSeconds(); }],
            ["%I:%M", function(d) { return d.getMinutes(); }],
            ["%I %p", function(d) { return d.getHours(); }],
            ["%a %d", function(d) { return d.getDay() && d.getDate() != 1; }],
            ["%b %d", function(d) { return d.getDate() != 1; }],
            ["%B", function(d) { return d.getMonth(); }],
            ["%Y", function() { return true; }]
        ]);
        xAxis.tickFormat(customTimeFormat);*/

    // positive area between x-axis at y=0 and max(y)
    var calcAreaPos = d3.svg.area()
        //.interpolate("monotone") // Fake bar chart: step-before, smooth curve: monotone
        .x(function (d) {
            return x(d.date);
        }).y0(function (d) {
            return y(0);
        }).y1(function (d) {
            return y(d.pos);
        });
    /*        .defined(function (d) {
                return d.pos > 0;
            });*/

    // negative area between x-axis at y=0 and min(y)
    var calcAreaNeg = d3.svg.area()
        //.interpolate("monotone") // Fake bar chart: step-before, smooth curve: monotone
        .x(function (d) {
            return x(d.date);
        }).y0(function (d) {
            return y(d.neg);
        }).y1(function (d) {
            return y(0);
        });
    /*        .defined(function (d) {
                return d.pos > 0;
            });*/

    // Outer container for the timeline
    var container = svg.append("g")
        .attr("width", getSize().width)
        .attr("height", getSize().height)
        .attr("transform", "translate(" + (margin.left) + "," + margin.top + ")");

    // Create a background area
    var plot = svg.append("g");
    var background = plot.append("rect")
        .attr("id", "background")
        .attr("class", "react")
        .attr("width", getSize().width - 1)
        .attr("height", getSize().height - 1)
        .attr("x", "1")
        .attr("y", "1")
        .style("fill", "#EEEEEE");
    // Moving to the right by 1px to prevent shadowing of y axis.

    // create group for chart within svg
    var chart = plot.append("g")
        .attr("class", "react");

    // Define the visible area for the plot & eLabel (needs clip path because of customized tick values)
    var clipper = container.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("x", background.attr("x"))
        .attr("y", background.attr("y") - margin.top) // for eLabel
        .attr("width", background.attr("width"))
        .attr("height", background.attr("height") + margin.top);

    // apply margin
    plot.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // add area elements
    var pos = chart.append("path").attr("class", "area pos"),
        neg = chart.append("path").attr("class", "area neg");

    // add axis label elements
    var xLabel = container.append("g").attr("class", "x axis")
        .attr("transform", "translate(0," + getSize().height + ")"),
        yLabel = container.append("g").attr("class", "y axis");
    var eLabel = container.append("g").attr("class", "x axis").attr("clip-path", "url(#clip)");

    function convertTwitterCSV(d) {
        // convert string data from CSV
        return {
            date: parseDate(d.date), // parse date column to Date
            pos: +d.pos, // convert pos column to positive number
            neg: -d.neg // convert neg column to negative number
        };
    }

    function convertEpisodesCSV(d) {
        // convert string data from CSV
        return {
            date: parseDate(d.date),
            code: d.code,
            title: d.title,
            seasonStartLabel: function () {
                var arr = d.code.split("E");
                if (parseInt(arr[1]) === 1) {
                    return "Season " + (arr[0].split("S"))[1];
                }
                return "";
            }()
        };
    }

    // CURRENTLY BEING DEVELOPED: 
    function assignDefaultValues(error, data) {
        var newData = [];
        var dateRange = d3.extent(data, function (d) {
            return d.date;
        });
        var sortByDate = function (a, b) {
            return a.date > b.date ? 1 : -1;
        };
        var stepdate = new Date(dateRange[0]);

        data.sort(sortByDate);

        for (var i = 0; i < data.length;) {
            if ((data[i].date - stepdate) === 0) {
                stepdate.setDate(stepdate.getDate() + 1);
                i++;
            } else {
                while (data[i].date.valueOf() !== stepdate.valueOf()) {
                    newData.push({
                        date: new Date(stepdate), // Screw closures!
                        pos: 0,
                        neg: 0
                    });
                    stepdate.setDate(stepdate.getDate() + 1);
                }
            }
        }

        fillChart(error, data.concat(newData).sort(sortByDate));
    }

    function fillChart(error, data) {
        // TODO: better error handling
        if (!!error) {
            var up = error;
            throw up;
        }

        // set domains (data)
        self.fullXdomain = d3.extent(data, function (d) {
            return d.date;
        });

        // Show all the available data.         
        x.domain(self.fullXdomain);

        // Show default date range. Could for example be set to the current week. Currently not in use.
        /*        var minDate = new Date(2016, 1, 20),
                    maxDate = new Date(2016, 2, 5);
                x.domain([minDate, maxDate]);*/

        // y from min(neg) to max(pos)
        y.domain([d3.min(data, function (d) {
            return Math.min(-5, d.neg * 1.05); // I like my headroom. Minimum domain = [-5;+5], always at least 5% headroom
        }), d3.max(data, function (d) {
            return Math.max(5, d.pos * 1.05);
        })]);
        //y.nice();
        self.fullYdomain = y.domain();

        // set area data
        pos.datum(data);
        neg.datum(data);

        // Zoom Handling
        var currentDomain = x.domain()[1] - x.domain()[0],
            minScale = currentDomain / (self.fullXdomain[1] - self.fullXdomain[0]), // All the available data
            maxScale = currentDomain / (1000 * 60 * 60); // 1 hour

        zoom.x(x)
            // .xExtent(fullXdomain) Unfortunately not implemented in current d3js version :(
            .scaleExtent([minScale, maxScale])
            .on("zoom", zoomed);
        go();
    }

    function handleEpisodes(error, data) {
        self.episodeData = data;
        // TODO: better error handling
        if (!!error) {
            var up = error;
            throw up;
        }

        // Create episode "lines" in graph
        plot.selectAll("bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "episode react")
            .attr("clip-path", "url(#clip)")
            .attr("x", function (d) {
                return x(d.date);
            })
            .attr("y", 0)
            .attr("width", 1)
            .attr("height", getSize().height);

        eAxis.tickValues(function () {
            var a = [];
            for (var d of data) {
                a.push(d.date);
            }
            return a;
        });

        eLabel.call(eAxis); // Has to be called once initially       

        go();
    }

    function render() {
        // axis (not needed for zoom handling)
        var s = getSize();
        x.range([0, s.width]);
        y.range([s.height, 0]);
        background.attr("width", s.width - 1);
        clipper.attr("width", s.width - 1);
        plot.attr("width", s.width - 1);

        recalc();
    }

    function zoomed() {
        // Workaround because .xExtent() for the zoom behaviour is not part of the current official d3js release
        if (x.domain()[0] < self.fullXdomain[0]) {
            zoom.translate([zoom.translate()[0] - x(self.fullXdomain[0]) + x.range()[0], 0]);
        } else if (x.domain()[1] > self.fullXdomain[1]) {
            zoom.translate([zoom.translate()[0] - x(self.fullXdomain[1]) + x.range()[1], 0]);
        }
        recalc();
    }

    function recalc() {
        // areas
        pos.attr("d", calcAreaPos);
        neg.attr("d", calcAreaNeg);

        updateEpisodeLabels();

        // axis
        xLabel.call(xAxis);
        yLabel.call(yAxis);
        eLabel.call(eAxis);
    }

    function updateEpisodeLabels() {
        var dmn = x.domain()[1] - x.domain()[0]; // Current domain
        var w = getSize().width;

        // episode rectangles
        var dayWidth = (86400000 / dmn) * w;
        var szn =
            d3.selectAll(".episode")
            .attr("x", function (d) {
                return x(d.date);
            })
            .attr("width", function (d) {
                return dayWidth;
            });

        // Cheap Screen Size factor
        var factor = 1;
        if (w < 900) {
            factor = 1 / 3;
        } else if (w < 1400) {
            factor = 2 / 3;
        }

        // Move the Labels into the center of the day 
        eLabel.selectAll('.tick text')
            .attr('transform', 'translate(' + dayWidth / 2 + ',0)');

        // Custom Tick Format for the Episode Axis
        if (dmn < (factor * 6 * 7 * 86400000)) { // < 6 Weeks * factor : Show Title            
            eAxis.tickFormat(function (d, i) {
                return self.episodeData[i].code + ': "' + self.episodeData[i].title + '"';
            });
        } else if (dmn < (factor * 6 * 30 * 86400000)) { // < 6 Months * factor: Show Code
            eAxis.tickFormat(function (d, i) {
                return self.episodeData[i].code;
            });
        } else if (dmn < (10 * 365 * 86400000)) { // < 10 Years * factor: Show season start
            /* Move the Labels into the center of the season (avg a little over 2 months)
            Won't work with the newest season during the time it's airing. Therefore commented out for now.
            eLabel.selectAll('.tick text')
                .attr('transform', 'translate(' + (dayWidth*64) / 2 + ',0)');*/
            eAxis.tickFormat(function (d, i) {
                return self.episodeData[i].seasonStartLabel;
            });
        } else { // Show nothing
            eAxis.tickFormat("");
        }
    }

    // request csv twitter data and fill chart
    d3.csv(dataURL, convertTwitterCSV, assignDefaultValues);

    // request csv episodes data and create episode labels
    d3.csv("" + getPrefix() + "episodes.csv", convertEpisodesCSV, handleEpisodes);

    // Initial rendering when fillChart & handleEpisodes have finished (ready = 2)        
    function go() {
        self.ready++;
        if (self.ready === 2) {
            render();

            // Add zoom handlers
            d3.selectAll(".react").call(zoom);
        }
    }

    return this;
}
