// function to parse string in the format 2006-01-02 to JavaScript's Date type
var parseDate = d3.time.format("%Y-%m-%d").parse;

// returns the characterChart
function characterChart(svg, dataURL, startDate, endDate) {
    var self = this;
    var zoom = d3.behavior.zoom(); // plot zooming behavior
    var drag = d3.behavior.drag(); // drag behavior scrollbar
    this.fullYdomain = [];
    this.fullXdomain = []; // Range of available data
    this.xDomainBounds = []; // Range of shown data    
    this.resize = render; // Resizing behaviour
    this.episodeData = null;
    this.ready = 0;
    // startDate & endDate are optional parameters. Default values will be overwritten later.
    this.startDate = startDate;
    this.endDate = endDate;

    // Get CSV prefix
    function getPrefix() {
        var path = dataURL.split("/");
        path.pop();
        var s = "";
        for (var i = 0; i < path.length; i++) {
            s += path[i] + "/";
        }
        return s;
    }

    // set margin
    var margin = {
        top: 30,
        right: 20,
        bottom: 100,
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

    var xAxis = d3.svg.axis().scale(x).orient("bottom")
        .outerTickSize(0),
        yAxis = d3.svg.axis().scale(y).orient("left")
        .outerTickSize(0);

    // Since there is only width-resizing: Define the number of yAxis-ticks according to screen size.
    // Default value is 10. Suitable for most cases.
    if (getSize().height < 200) {
        yAxis.ticks(6);
    } else if (getSize().height < 300) {
        yAxis.ticks(8);
    }

    // Seperate axis for episodes
    var eAxis = d3.svg.axis().scale(x).orient("top").tickSize(0, 0);

    // Seperate "scroll" axis for full domain
    var scrollScale = d3.time.scale().range([0, getSize().width]);
    var scrollAxis = d3.svg.axis().scale(scrollScale).outerTickSize(0).orient("bottom");

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

    // trendline
    var calcTrend = d3.svg.line()
        .interpolate("cardinal-open")
        .tension(0)
        .x(function (d) {
            return x(d.date);
        })
        .y(function (d) {
            return y(d.pos + d.neg);
        });

    // Outer container for the timeline
    var container = svg.append("g")
        .attr("width", getSize().width)
        .attr("height", getSize().height)
        .attr("transform", "translate(" + (margin.left) + "," + margin.top + ")");

    // Create a background area
    var plot = container.append("g");
    var background = plot.append("rect")
        .attr("class", "react background")
        .attr("width", getSize().width)
        .attr("height", getSize().height);

    // Create area-dividing line
    var y0line = plot.append("line")
        .attr("x1", "0")
        .attr("x2", getSize().width)
        .style("stroke", "#000");

    // create group for chart within svg
    var chart = plot.append("g")
        .attr("class", "react")
        .attr("clip-path", "url(#clip)");

    // Define the visible area for the plot & eLabel (needs clip path because of customized tick values)
    var clipper = container.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("x", background.attr("x"))
        .attr("y", background.attr("y") - margin.top) // for eLabel
        .attr("width", background.attr("width"))
        .attr("height", background.attr("height") + margin.top);

    // add area elements
    var pos = chart.append("path").attr("class", "area pos"),
        neg = chart.append("path").attr("class", "area neg");

    // add trendline
    var trendline = chart.append("path").attr("class", "trendline");

    // add error field
    var errMsg = plot.append("foreignObject")
        .attr("class", "noaction")
        .attr("width", getSize().width - 20)
        .attr("height", getSize().height - 10)
        .attr("x", 20)
        .attr("y", 10);

    // add scroll bar
    var scrollbar = container.append("rect")
        .attr("class", "scrollbar")
        .attr("x", -10)
        .attr("y", getSize().height + 40)
        .attr("width", getSize().width)
        .attr("height", 6)
        .attr("rx", 10);
    var scrollknob = container.append("rect")
        .attr("class", "scrollknob")
        .attr("y", getSize().height + 38)
        .attr("height", 10);

    // add axis label elements
    var xLabel = container.append("g").attr("class", "x axis")
        .attr("transform", "translate(0," + (getSize().height) + ")"),
        yLabel = container.append("g").attr("class", "y axis");
    var eLabel = container.append("g").attr("class", "x axis").attr("clip-path", "url(#clip)");
    var scrollLabel = container.append("g").attr("class", "scroll axis")
        .attr("transform", "translate(0," + (getSize().height + 50) + ")");

    // add right border
    var rightBorder = container.append("rect")
        .attr("x", getSize().width)
        .attr("height", getSize().height)
        .attr("width", 1)
        .style("fill", "#000");

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

    // Fills in missing csv data
    function assignDefaultValues(error, data) {
        if (!!error) {
            errorMessage();
            return;
        }
        var newData = [];
        var dateRange = d3.extent(data, function (d) {
            return d.date;
        });
        var sortByDate = function (a, b) {
            return a.date > b.date ? 1 : -1;
        };
        var stepdate = new Date(dateRange[0]);

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

        fillChart(data.concat(newData).sort(sortByDate));
    }

    function fillChart(data) {
        // fullXdomain: Range of available data
        self.fullXdomain = d3.extent(data, function (d) {
            return d.date;
        });

        // xDomainBounds: Max range of scrollable graph area. At least slightly before the first season, up until today.
        // We should extend the graph all the way back even if there's no data, to show that Twitter didn't care back then.
        self.xDomainBounds = [new Date(2010, 8, 1), new Date()];
        /*      if (self.fullXdomain[0] < self.xDomainBounds[0]) {
                  self.xDomainBounds[0] = self.fullXdomain[0];
              };*/

        // Set initial domain. If not defined during the call: All the available data.
        if (typeof self.startDate === "undefined") {
            self.startDate = new Date(2014, 0, 1);
        }
        if (typeof self.endDate === "undefined") {
            self.endDate = self.xDomainBounds[1];
        }
        x.domain([self.startDate, self.endDate]);
        scrollScale.domain(self.xDomainBounds);

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
        trendline.datum(data);

        go();
    }

    function handleEpisodes(error, data) {
        if (!!error) {
            errorMessage();
            return;
        }
        self.episodeData = data;

        // Create episode "lines" in graph
        plot.selectAll("bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "episode react")
            .attr("clip-path", "url(#clip)")
            .attr("y", 0)
            .attr("height", getSize().height);

        eAxis.tickValues(function () {
            var a = [];
            for (var i = 0; i < data.length; i++) {
                a.push(data[i].date);
            }
            return a;
        });

        go();
    }

    function zoomed() {
        if (x.domain()[0] < self.xDomainBounds[0]) {
            zoom.translate([zoom.translate()[0] - x(self.xDomainBounds[0]) + x.range()[0], 0]);
        } else if (x.domain()[1] > self.xDomainBounds[1]) {
            zoom.translate([zoom.translate()[0] - x(self.xDomainBounds[1]) + x.range()[1], 0]);
        }
        recalc();
    }
    
    function dragged(){        
        zoom.translate([zoom.translate()[0]-d3.event.dx, 0]);
        zoomed();
    }

    // Operations which are needed for drawing & resizing the graph
    function render() {
        var s = getSize();
        x.range([0, s.width]);
        y.range([s.height, 0]);
        scrollScale.range([0, s.width]);
        background.attr("width", s.width);
        clipper.attr("width", s.width);
        plot.attr("width", s.width);
        rightBorder.attr("x", s.width);
        y0line.attr("x2", s.width)
            .attr("y1", y(0))
            .attr("y2", y(0));
        scrollbar.attr("width", s.width + 20);
        errMsg.attr("width", s.width - 20);

        // Ensure zooming functionality after resizing
        var currentDomain = x.domain()[1] - x.domain()[0],
            minScale = currentDomain / (self.xDomainBounds[1] - self.xDomainBounds[0]), // All the available data
            maxScale = currentDomain / (1000 * 60 * 60); // 1 hour
        zoom.scaleExtent([minScale, maxScale])
            .x(x);


        // Ugly but necessary for now to prevent resizing errors when there's no csv
        if (self.ready === 2) {
            recalc();
        }
    }

    // Operations which are needed for drawing, resizing & zooming
    function recalc() {
        pos.attr("d", calcAreaPos);
        neg.attr("d", calcAreaNeg);
        trendline.attr("d", calcTrend);

        updateLabels();

        // axis
        xLabel.call(xAxis);
        yLabel.call(yAxis);
        eLabel.call(eAxis);
        scrollLabel.call(scrollAxis);
    }

    // Updates episode labels & reacts to screen size
    function updateLabels() {
        var dmn = x.domain()[1] - x.domain()[0]; // Current domain
        var fulldmn = self.xDomainBounds[1] - self.xDomainBounds[0]; // Full domain
        var w = getSize().width;
        var dayWidth = (86400000 / dmn) * w;

        // episode rectangles        
        var szn = d3.selectAll(".episode")
            .attr("x", function (d) {
                return x(d.date);
            })
            .attr("width", function (d) {
                return dayWidth;
            });

        // Zoom knob
        scrollknob.attr("width", Math.max(w * dmn / fulldmn, 20))
            .attr("x", w * (x.domain()[0] - self.xDomainBounds[0]) / fulldmn);

        // Cheap Screen Size factor
        var factor = 1; // BETTER: 2/5, 3/5, 4/5, 1 (0?)
        if (w < 900) {
            factor = 1 / 3;
        } else if (w < 1400) {
            factor = 2 / 3;
        }

        xAxis.ticks(10 * factor);

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
        } else if (w > 500) { //Show season start
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
    d3.csv(getPrefix() + "episodes.csv", convertEpisodesCSV, handleEpisodes);

    // Initial rendering when fillChart & handleEpisodes have finished (ready = 2)        
    function go() {
        self.ready++;
        if (self.ready === 2) {
            // Not needed in case of error
            y0line.attr("stroke-width", 0.5);

            render();

            // Zoom Handling
            var currentDomain = x.domain()[1] - x.domain()[0],
                minScale = currentDomain / (self.xDomainBounds[1] - self.xDomainBounds[0]), // All the available data
                maxScale = currentDomain / (1000 * 60 * 60); // 1 hour

            zoom.scaleExtent([minScale, maxScale])
                .x(x)
                .on("zoom", zoomed);

            // Zoom behavior of zoombar
            drag.on("drag", dragged);

            // Add event handlers
            d3.selectAll(".react").call(zoom);
            scrollknob.call(drag);
        }
    }

    // Error Message (in case of non-existent csv data)
    function errorMessage() {
        errMsg.append("xhtml:div")
            .text("There seem to be no relevant tweets on this  character. Sorry.")
            .attr("class", "error");
    }

    return this;
}
