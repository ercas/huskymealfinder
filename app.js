var BASE_URL = "https://new.dineoncampus.com/v1/location/menu.json?platform=0";
var MONTH_NAMES = [ "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December" ];
var locations = {
    "Stwest": {
        "location_id": "586d05e4ee596f6e6c04b528",
        "site_id": "5751fd2b90975b60e048929a"
    },
    "Steast": {
        "location_id": "586d05e4ee596f6e6c04b527",
        "site_id": "5751fd2b90975b60e048929a"
    },
    "IV": {
        "location_id": "586d17503191a27120e60dec",
        "site_id": "5751fd2b90975b60e048929a"
    }
};
var requestsLoading = 0;

var menuCache = {};

/**
 * Builds a URL from an index of the locations table and a date string.
 * @param {String} targetLocation A string index of the locations table,
 *     describing which location a menu should be retrieved for.
 * @param {String} dateString A yyyy-mm-dd formatted string corresponding to the
 *     date that a menu should be retrieved for.
 * @return {String} A URL of a dineoncampus.com JSON containing the menu for the
 *     specified location and date
 */
function buildUrl(targetLocation, dateString) {
    var url = BASE_URL + "&date=" + dateString;

    for (var targetLocation in locations)
        if (targetLocation == targetLocation)
            for (key in locations[targetLocation])
                url += "&" + key + "=" + locations[targetLocation][key];

    return url
};

/**
 * Waits for all requests to finish before proceeding.
 * @param {Number} timeout How long to wait between checks, in milliseconds.
 * @param {Function} callback The function to call when all requests have
 *     finished.
 * @param {Function} waitingCallback A function that will be called every
 *     recursion if not all requests have finished. The number of requests left
 *     is passed to this function as an argument.
 */
function waitForRequests(callback, timeout, waitingCallback) {
    if (!timeout)
        timeout = 1000;
    window.setTimeout(function() {
        if (requestsLoading > 0) {
            console.log("waiting for " + requestsLoading + " requests to "
                        + "finish...");
            if (waitingCallback)
                waitingCallback(requestsLoading);
            waitForRequests(callback, timeout, waitingCallback);
        } else
            callback();
    }, timeout)
}

/**
 * Operates on an instance of MyClass and returns an array of items.
 * @param {Object} menuObject An object of a dineoncampus.com menu.json file.
 * @param {String} headerText Text that will be displayed as the menu's header.
 * @param {String} seachQuery Optional string that will filter menu items.
 * @return {HTMLDivElement} A div containing divs of the dining periods
 *     containing divs of the food locations containing a table that contains a
 *     list of items served at that place at that time, each item being on a new
 *     row.
 */
function buildMenu(menuObject, headerText, searchQuery) {
    var container = document.createElement("div");
    var dateResults = 0;

    var header = document.createElement("h1");
    header.innerHTML = headerText
    container.appendChild(header);

    if (menuObject) {
        if (searchQuery) {
            var queryInfo = document.createElement("p");
            queryInfo.innerHTML = "Showing results for \"" + searchQuery + "\"";
            container.appendChild(queryInfo);
        }
        for (var a = 0; a < menuObject.periods.length; a++) {
            var period = menuObject.periods[a];
            var periodResults = 0;

            var periodContainer = document.createElement("div");
            periodContainer.setAttribute("class", "nested-div");

            var periodHeader = document.createElement("h2");
            periodHeader.innerHTML = period.name;
            periodContainer.appendChild(periodHeader);

            for (var b = 0; b < period.categories.length; b++) {
                var category = period.categories[b];
                var categoryResults = 0;

                var categoryContainer = document.createElement("div");
                categoryContainer.setAttribute("class", "nested-div");

                var categoryHeader = document.createElement("h3");
                categoryHeader.innerHTML = category.name;
                categoryContainer.appendChild(categoryHeader);

                var itemContainer = document.createElement("table");
                categoryContainer.appendChild(itemContainer);

                for (var c = 0; c < category.items.length; c++) {
                    item = category.items[c];
                    var itemRow = document.createElement("tr");
                    itemRow.innerHTML = item.name;

                    if (searchQuery) {
                        if (new RegExp(searchQuery, "i").exec(item.name)) {
                            itemContainer.appendChild(itemRow);
                            categoryResults++
                            periodResults++
                            dateResults++
                        }
                    } else {
                        itemContainer.appendChild(itemRow);
                        categoryResults++
                        periodResults++
                        dateResults++
                    }
                }

                if (categoryResults > 0)
                    periodContainer.appendChild(categoryContainer);
                else if (!searchQuery) {
                    // For completeness, empty categories will show that they
                    // are empty if no query was performed.
                    var itemRow = document.createElement("tr");
                    itemRow.innerHTML = "Nothing :)";
                    itemContainer.appendChild(itemRow);
                    periodContainer.appendChild(categoryContainer);
                }
            }
            if (periodResults > 0)
                container.appendChild(periodContainer);
        }
        if (dateResults == 0) {
            var notification = document.createElement("h2");
            if (searchQuery)
                notification.innerHTML = "No results for \"" + searchQuery
                                         + "\":(";
            else
                notification.innerHTML = "Nothing found :(";
            periodContainer.innerHTML = "";
            periodContainer.appendChild(notification);
            container.appendChild(periodContainer);
        }
    }

    return container;
}

/**
 * Operates on an instance of MyClass and returns something.
 * @param {String} targetLocation A string index of the locations table,
 *     describing which location a menu should be loaded for.
 * @param {Date} dateObject The date that the menu should be retrieved for.
 * @param {Function} callback A function that is called when the menu JSON has
 *     been retrieved and loaded. The first argument passed is either the menu
 *     object or false; the second argument passed is a string containing a
 *     descriptive header generated by loadMenu; the third argument passed is
 *     the Unix time of the date.
 */
function loadMenu(targetLocation, dateObject, callback) {
    var year = dateObject.getFullYear();
    var month = (dateObject.getMonth() + 1);
    if (month < 10)
        month = "0" + month;
    var monthName = MONTH_NAMES[dateObject.getMonth()];
    var day = dateObject.getDate();
    if (day < 10)
        day = "0" + day;

    var dateStringReadable = dateObject.getDate() + " " + monthName + " " + year;
    var dateString = year + "-" + month + "-" + day;
    var url = buildUrl(targetLocation, dateString);

    console.log("retrieving " + url);
    requestsLoading++
    $.getJSON(buildUrl(targetLocation, dateString), function(data){
        var menuAvailable = false

        if (!menuCache[targetLocation])
            menuCache[targetLocation] = {};

        if (typeof(menuCache[targetLocation][dateString]) == "undefined") {
            if (data.menu) {
                menuCache[targetLocation][dateString] = data.menu;
                console.log("cached " + targetLocation + " menu for "
                            + dateString);
                menuAvailable = true;
            } else {
                menuCache[targetLocation][dateString] = false;
                console.log("could not retrieve " + targetLocation + " menu for"
                            + dateString);
            }
        } else if (menuCache[targetLocation][dateString]) {
            console.log("loaded " + targetLocation + " menu for " + dateString
                        + " from cache");
            menuAvailable = true
        } else
            console.log("cache indicated that " + targetLocation + " menu for "
                        + dateString + " could not be retrieved previously");

        if (menuAvailable)
            if (callback)
                callback(data.menu, "Menu for " + targetLocation + " on "
                                    + dateStringReadable, dateObject.getTime());
        else
            if (callback)
                callback(false, "No menu available for " + targetLocation
                                + " on " + dateStringReadable,
                         dateObject.getTime());
        requestsLoading--
    });
}

/**
 * A wrapper for buildMenu. For documentation, see buildMenu.
 */
function displayMenu(menuObject, headerText, searchQuery) {
    main = document.getElementById("main");
    main.innerHTML = "";
    main.appendChild(buildMenu(menuObject, headerText, searchQuery));
}

/**
 * Appends multiple menus to the main element
 * @param {String} targetLocation A string index of the locations table,
 *     describing which location a menu should be loaded for.
 * @param {Array} dates An array of Date objects to be displayed
 * @param {String} searchQuery An optional string used to filter results.
 */
function displayMenuMultiple(targetLocation, dates, searchQuery) {
    main = document.getElementById("main");

    // A multidimensional array where:
    //     i[0] is the Unix time of a menu's date
    //     i[1] is the generated div of that menu
    // This is useful for sorting the dates later.
    var divs = [];

    for (var i = 0; i < dates.length; i++) {
        var dateObject = dates[i]
        loadMenu(targetLocation, dateObject, function(menuObject, headerText, time) {
            divs.push([time, buildMenu(menuObject, headerText, searchQuery)]);
        });
    }

    waitForRequests(function() {
        main.innerHTML = "";
        // Display dates in chronological order
        divs.sort(function(a, b) {
            return a[0] - b[0];
        });
        for (var i = 0; i < divs.length; i++){
            main.appendChild(divs[i][1]);
        }
    }, 1000, function(requests) {
        var requestsWord = "requests";
        if (requests == 1)
            requestsWord = "request";
        main.innerHTML = "Waiting for " + requests + " " + requestsWord + " to "
                         + "finish...";
    })
}

document.getElementById("main").innerHTML = "loading...";
//loadMenu("Stwest", new Date(), displayMenu);
/*
loadMenu("Stwest", new Date(2017, 1, 9), function(menuObject, headerText) {
    displayMenu(menuObject, headerText, "pizza");
});
*/

dates =  [
    new Date(2017, 1, 9),
    new Date(2017, 1, 10),
    new Date(2017, 1, 11),
    new Date(2018, 1, 11)
]

displayMenuMultiple("Stwest", dates);
