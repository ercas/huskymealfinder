var MAX_DATE_RANGE = 7;
var MS_IN_DAY = 8.64e7;

var locationIndex = 0;
var locationName;
var numLocations = 0;
var startDate = new Date;
var endDate = new Date;

// Initializations

for (key in locations)
    numLocations++;

endDate.setDate(startDate.getDate() + 3);

// Utility

function diffBetweenDays(date1, date2) {
    return Math.ceil((date2.getTime() - date1.getTime()) / MS_IN_DAY);
}

function interpolateDates(date1, date2) {
    var results = [];
    var diff = diffBetweenDays(date1, date2);
    if (diff == 0)
        results.push(date1);
    else {
        results.push(date1);
        for (var i = 1; i < diff; i++) {
            var newDate = new Date();
            newDate.setTime(date1.getTime() + (i * MS_IN_DAY));
            results.push(newDate);
        }
        results.push(date2);
    }
    return results
}

// Gui functions

function updateGui() {
    var i = 0;
    for (key in locations) {
        if (i == locationIndex) {
            locationName = key;
            break;
        } else
            i++;
    }
    document.getElementById("location").innerHTML = locationName;
    document.getElementById("date-from").innerHTML = formatDate(startDate, "h");
    document.getElementById("date-to").innerHTML = formatDate(endDate, "h");
}

function locationNext() {
    locationIndex = (locationIndex + 1) % numLocations;
    updateGui();
}
function locationPrevious() {
    locationIndex = locationIndex - 1;
    if (locationIndex == -1)
        locationIndex = numLocations - 1;
    updateGui();
}
function dateFromPrevious() {
    startDate.setDate(startDate.getDate() - 1);
    if (diffBetweenDays(startDate, endDate) == MAX_DATE_RANGE + 1)
        endDate.setTime(startDate.getTime() + (MAX_DATE_RANGE * MS_IN_DAY));
    updateGui();
}
function dateFromNext() {
    startDate.setDate(startDate.getDate() + 1);
    if (diffBetweenDays(startDate, endDate) == -1)
        endDate.setDate(startDate.getDate());
    updateGui();
}
function dateToPrevious() {
    endDate.setDate(endDate.getDate() - 1);
    if (diffBetweenDays(startDate, endDate) == -1)
        startDate.setDate(endDate.getDate());
    updateGui();
}
function dateToNext() {
    endDate.setDate(endDate.getDate() + 1);
    if (diffBetweenDays(startDate, endDate) == MAX_DATE_RANGE + 1)
        startDate.setTime(endDate.getTime() - (MAX_DATE_RANGE * MS_IN_DAY));
    updateGui();
}

function queryActivated() {
    query = document.getElementById("query").value;
    if (query == "")
        displayMenuMultiple(locationName, interpolateDates(startDate, endDate));
    else
        displayMenuMultiple(locationName, interpolateDates(startDate, endDate),
                            query);
}
function queryBoxActivated(e) {
    if (e.keyCode == 13)
        queryActivated();
}

updateGui();
