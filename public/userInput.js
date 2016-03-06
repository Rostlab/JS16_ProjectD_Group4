// Function: Check Date Input. Return whether it is valid or not.
function validDateRange() {
    if (document.getElementById("startDate").valueAsDate.getTime() <= document.getElementById("endDate").valueAsDate) {
        return true;
    } else {
        return false;
    }
}

// Event Handler: Clicking the Submit Button.
// TODO: Use the Submit Event (also for the Enter Key). Add more noticeable Error Message.
document.getElementById("submitButton").onclick = function () {
    stats.value = "";
    if (validDateRange()) {
        blabla();
    } else {
        stats.value = "Please specify a valid date range!";
    }
};

/* Alternativer Code
if (element.addEventListener){
element.addEventListener('event',functionName, Boolean);
} else {
element.attachEvent('event',functionName);
}
*/
