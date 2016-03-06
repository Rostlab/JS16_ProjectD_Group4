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

    // Function: Check Date Input. Return whether it is valid or not.
    // TODO: Use Exceptions. Specify input mistakes in the textarea.
    function validDateRange() {
        "use strict";
        if (startDate.valueAsDate <= endDate.valueAsDate && startDate.valueAsDate >= earliestStartDate && endDate.valueAsDate <= latestEndDate) {
            return true;
        } else {
            return false;
        }
    }

    // Event Handler: Clicking the Submit Button. Valid specified date range & working canvas?
    // TODO: Use the Submit Event (also for the Enter Key). Add more noticeable Error Message.
    document.getElementById("submitButton").onclick = function (e) {
        "use strict";
        e.preventDefault();
        stats.value = "";
        if (validDateRange()) {
            if (exists(searchBar.value)) {
                run(canvas, startDate.valueAsDate, endDate.valueAsDate, maxPopularity(), returnData(searchBar.value, startDate.valueAsDate, endDate.valueAsDate));
            } else {
                stats.value = "Please name a valid character from the Game of Thrones series.";
            }
        } else {
            stats.value = "Please specify a valid date range! The Start Date cannot be earlier than the 1st February 2016. The Ende Date cannot be later than today. The Start Date cannot be more recent than the End Date.";
        }

    };
}
