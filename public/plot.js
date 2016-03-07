// Styles: http://devdocs.io/dom/canvas_api/tutorial/applying_styles_and_colors
"use strict";
// TODO: Shorten, REUSE code. A drawPath function would be nice, also more context save & restore
// Add data tooltip (Date & Popularity Figure where the mouse is hovering)
function run(canvas, startDate, endDate, maxPopularity, dataset) {
    // Defining the variables
    var c = canvas.getContext("2d");
    var dateRange = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)); // Number of days, not including first one
    var popularityRange = 2 * maxPopularity;
    var xUnitPx = canvas.width / dateRange;
    var yUnitPx = canvas.height / popularityRange;
    var i;

    // Clear the Canvas
    c.clearRect(0, 0, canvas.width, canvas.height);

    // Drawing the x-axis (timeline)
    c.beginPath();
    c.lineWidth = 3;
    c.strokeStyle = "black";
    c.moveTo(0, (canvas.height) / 2);
    c.lineTo(canvas.width, (canvas.height) / 2);
    c.stroke();

    // Draw the graph
    c.beginPath();
    c.lineWidth = 2;
    c.moveTo(0, Math.abs(dataset[0] - maxPopularity) * yUnitPx);
    c.strokeStyle = "blue"; // TODO: Get color from HTML / CSS file (Legend)
    c.strokeLinecap = "round";
    c.lineJoin = "round";
    if (dataset.length === 1) { // Special case. Looks super weird. Needs different visualization. NOT WORKING
        c.lineTo(canvas.width, Math.abs(dataset[i] - maxPopularity) * yUnitPx);
    } else {
        for (i = 1; i <= dateRange; i += 1) {
            c.lineTo(i * xUnitPx, Math.abs(dataset[i] - maxPopularity) * yUnitPx);
        }
    }
    c.stroke();

    // Drawing a day raster
    if (dateRange > 0) { // Makes only sense for more than 2 days.
        c.save();
        c.lineWidth = 1;
        c.strokeStyle = "rgba(0, 0, 0, 0.69)";
        c.setLineDash([5, 10]);
        for (i = 0; i <= dateRange; i += 1) {
            c.beginPath();
            c.moveTo(i * xUnitPx, canvas.height);
            c.lineTo(i * xUnitPx, 0);
            c.stroke();
        }
        c.restore();
    }


    // Draws the given function
    function drawFunction(func, color) {
        c.beginPath();
        c.lineWidth = 1;
        c.moveTo(0, ((popularityRange / 2 - func(0)) * yUnitPx));
        c.strokeStyle = color;
        c.strokeLinecap = "round";
        c.lineJoin = "round";
        for (i = 1; i <= dateRange; i += 1) {
            c.lineTo(i * xUnitPx, ((popularityRange / 2 - func(i)) * yUnitPx));
        }
        c.stroke();
    }

    // TODO: Calculate the trend function (should probably be done in getData.js)
    // Draw the trend function. We'll only draw a log function for now, irrespective of the given data.
    drawFunction(function (x) {
        return Math.sqrt(x);
    }, "rgb(173, 216, 230)"); //TODO:  get color from document
}
