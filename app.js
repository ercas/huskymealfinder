var BASE_URL = "https://new.dineoncampus.com/v1/location/menu.json?platform=0";
var MONTH_NAMES = [ "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december" ];
var locations = {
    "stwest": {
        "location_id": "586d05e4ee596f6e6c04b528",
        "site_id": "5751fd2b90975b60e048929a"
    },
    "steast": {
        "location_id": "586d05e4ee596f6e6c04b527",
        "site_id": "5751fd2b90975b60e048929a"
    },
    "iv": {
        "location_id": "586d17503191a27120e60dec",
        "site_id": "5751fd2b90975b60e048929a"
    }
};
var requestsLoading = 0;

var menus = {};

/**
 * Builds a URL from an index of the locations table and a date string.
 * @param {string} targetLocation A string index of the locations table,
 *     describing which location a menu should be retrieved for.
 * @param {string} dateString A yyyy-mm-dd formatted string corresponding to the
 *     date that a menu should be retrieved for.
 * @return {string} A URL of a dineoncampus.com JSON containing the menu for the
 *     specified location and date
 */
function buildUrl(targetLocation, dateString) {
    var url = BASE_URL + "&date=" + dateString;

    for (var _location in locations)
        if (_location == targetLocation)
            for (key in locations[_location])
                url += "&" + key + "=" + locations[_location][key];

    return url
};


/**
 * Operates on an instance of MyClass and returns an array of items.
 * @param {Object} menuObject An object of a dineoncampus.com menu.json file.
 * @param {String} headerText Text that will be displayed as the menu's header.
 * @param {String} seachQuery Optional string that will filter menu items.
 * @return {Array} an array containing:
 *     {HTMLDivElement} A div containing divs of the dining periods containing
 *         divs of the food locations containing a table that contains a list of
 *         items served at that place at that time, each item being on a new
 *         row.
 *     {Number} A number describing how many results were found. If searchQuery
 *         was blank, this returns a number of all food items that were
 *         available on that day.
 */
function buildMenu(menuObject, headerText, searchQuery) {
    var container = document.createElement("div");
    var dateResults = 0;

    var header = document.createElement("h1");
    header.innerHTML = headerText
    container.appendChild(header);

    if (searchQuery) {
        var queryInfo = document.createElement("p");
        queryInfo.innerHTML = "showing results for \"" + searchQuery + "\"";
        container.appendChild(queryInfo);
    }

    if (menuObject) {
        for (var a = 0; a < menuObject.periods.length; a++) {
            var period = menuObject.periods[a];
            var periodResults = 0;

            var periodContainer = document.createElement("div");

            var periodHeader = document.createElement("h2");
            periodHeader.innerHTML = period.name;
            periodContainer.appendChild(periodHeader);

            for (var b = 0; b < period.categories.length; b++) {
                var category = period.categories[b];
                var categoryResults = 0;

                var categoryContainer = document.createElement("div");

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

                if ((!searchQuery) || (searchQuery && (categoryResults > 0)))
                    periodContainer.appendChild(categoryContainer);
            }
            if ((!searchQuery) || (searchQuery && (periodResults > 0)))
                container.appendChild(periodContainer);
        }
        if (searchQuery && dateResults == 0) {
            var notification = document.createElement("h2");
            notification.innerHTML = "no results for \"" + searchQuery + "\" on "
                                     + "the given date";
            container.appendChild(notification);
        }
    } else {
        var notification = document.createElement("h2");
        notification.innerHTML = "no data available for the given date";
        container.appendChild(notification);
    }

    return [container, dateResults];
}

/**
 * Operates on an instance of MyClass and returns something.
 * @param {string} targetLocation A string index of the locations table,
 *     describing which location a menu should be loaded for.
 * @param {Date} dateObject The date that the menu should be retrieved for.
 * @param {Function} callback A function that is called when the menu JSON has
 *     been retrieved and loaded. The first argument passed is either the menu
 *     object or false; the second argument passed is a string containing a
 *     descriptive header generated by loadMenu.
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
        if (!menus[targetLocation])
            menus[targetLocation] = {};
        if (data.menu) {
            menus[targetLocation][dateString] = data.menu;
            console.log("loaded " + targetLocation + " menu for " + dateString);
            if (callback)
                callback(data.menu, "menu for " + targetLocation + " on "
                                    + dateStringReadable);
        } else {
            menus[targetLocation][dateString] = "nothing";
            console.log("no menu available");
            if (callback)
                callback(false, "no menu available for " + targetLocation
                                + " on " + dateStringReadable);
        }
        requestsLoading--
    });
}

/**
 * Waits for all requests to finish before proceeding.
 * @param {Number} timeout How long to wait between checks, in milliseconds.
 * @param {Function} callback The function to call when all requests have
 *     finished.
 * @param {Function} waitingCallback A function that will be called every
 *     recursion if not all requests have finished.
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
 * A wrapper for buildMenu that appends the returned div to the document.
 * @param {Object} menuObject An object of a dineoncampus.com menu.json file.
 * @param {String} headerText Text that will be displayed as the menu's header.
 * @param {String} seachQuery Optional string that will filter menu items.
 */
function displayMenu(menuObject, headerText, searchQuery) {
    main = document.getElementById("main");
    main.innerHTML = "";
    main.appendChild(buildMenu(menuObject, headerText, searchQuery)[0]);
}

var divs = [];
function loadMenuMultiple(_location, dates, searchQuery) {
    main = document.getElementById("main");

    for (var i = 0; i < dates.length; i++) {
        loadMenu(_location, dates[i], function(menuObject, headerText) {
            results = buildMenu(menuObject, headerText, searchQuery);
            if (results[1] > 0)
                divs.push(results[0]);
        });
    }

    waitForRequests(function() {
        main.innerHTML = "";
        for (var i = 0; i < divs.length; i++){
            main.appendChild(divs[i]);
        }
    }, 1000, function(requests) {
        console.log("loop")
        var requestsWord = "requests";
        if (requests == 1)
            requestsWord = "request";
        main.innerHTML = "waiting for " + requests + " " + requestsWord + " to "
                         + "finish...";
    })
}

document.getElementById("main").innerHTML = "loading...";
//loadMenu("stwest", new Date(), displayMenu);
/*
loadMenu("stwest", new Date(2017, 1, 9), function(menuObject, headerText) {
    displayMenu(menuObject, headerText, "pizza");
});
*/

dates =  [
    new Date(2017, 1, 9),
    new Date(2017, 1, 10),
    new Date(2017, 1, 11)
]

loadMenuMultiple("stwest", dates, "pizza");
