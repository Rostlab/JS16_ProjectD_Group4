// Declare paths of used DOM elements as variables
var startDate = document.getElementById("startDate");
var endDate = document.getElementById("endDate");
var stats = document.getElementById("stats");
var canvas = document.getElementById("canvas");
var searchBar = document.getElementById("searchBar");

if (canvas.getContext) { // If the canvas does not work, the app (as it is now) is useless. No point in going any further.
    // Propose a date range
    startDate.value = "2016-03-01";
    endDate.valueAsDate = new Date(); // Today

    // There has to be a limit for the earliest possible start date & the latest end date.
    var earliestStartDate = new Date(2016, 1, 1); // 1st February 2016
    var latestEndDate = new Date(); // No fortune telling for now.

    // Adjust functionality for the input type="date" fields in non-supporting browsers (IE, Firefox)
    if (!Modernizr.inputtypes.date) {
        $('input[type=date]').datepicker({
            dateFormat: 'dd.mm.yy'
        });
        $('#startDate').datepicker("setDate", new Date(2016, 2, 1));
        $('#endDate').datepicker("setDate", new Date());
    }
}

// Function: Check Date Input. Return whether it is valid or not.
// TODO: Use Exceptions. Specify input mistakes in the textarea.
function validDateRange() {
    "use strict";
    if (!Modernizr.inputtypes.date) {
        // JQuery Datepicker        
        return function () {
            var d1 = $('#startDate').datepicker("getDate"),
                d2 = $('#endDate').datepicker("getDate");
            if (d1 <= d2 && d1 >= earliestStartDate && d2 <= latestEndDate) {
                return true;
            } else {
                return false;
            }
        }();
    } else {
        // Native input type = "date" solution
        if (startDate.valueAsDate <= endDate.valueAsDate && startDate.valueAsDate >= earliestStartDate && endDate.valueAsDate <= latestEndDate) {
            return true;
        } else {
            return false;
        }
    }
}

// Event Handler: Clicking the Submit Button. Valid specified date range & working canvas?
// TODO: Use the Submit Event (also for the Enter Key). Add more noticeable Error Message.
// Right now, Enter while focusing the Search Bar launches a Submit Event which we don't interpret. Should be prevented.
document.getElementById("submitButton").onclick = function (e) {
    "use strict";
    //e.preventDefault();
    stats.value = "";
    if (validDateRange()) {
        if (exists(searchBar.value)) {
            if (Modernizr.inputtypes.date) {
                // native input type = "date" solution
                run(canvas, startDate.valueAsDate, endDate.valueAsDate, maxPopularity(), returnData(searchBar.value, startDate.valueAsDate, endDate.valueAsDate));
            } else {
                // JQuery DatePicker
                (function () {
                var d1 = $('#startDate').datepicker("getDate"),
                    d2 = $('#endDate').datepicker("getDate");
                run(canvas, d1, d2, maxPopularity(), returnData(searchBar.value, d1, d2));
                }());
            }
        } else {
            stats.value = "Please name a valid character from the Game of Thrones series.";
        }
    } else {
        stats.value = "Please specify a valid date range! The Start Date cannot be earlier than the 1st February 2016. The Ende Date cannot be later than today. The Start Date cannot be more recent than the End Date.";
    }

};
