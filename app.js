var BASE_URL = "https://new.dineoncampus.com/v1/location/menu.json?platform=0";
var MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];
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
var JSON_REQUEST_TIMEOUT = 15000
var SCROLL_DELAY = 200;

var requestsLoading = []; // Stores the URLs of in-progress requests
var working = false; // Indicates if the page is currently being modified
var menuCache = {}; // Stores the results of past requests for menu JSONs

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

    for (var _location in locations)
        if (_location == targetLocation)
            for (var key in locations[targetLocation])
                url += "&" + key + "=" + locations[targetLocation][key];

    return url
};

/**
 * Formats a date into a string of the given style
 * @param {Date} dateObject A date object to be formatted.
 * @param {string} style The style that dateObject should be formatted into.
 *     Possible options are:
 *         * default || "ymd": yyyy-mm-dd
 *         * "h" || "readable": d monthName yyyy
 * @return {string} The formatted date.
 */
function formatDate(dateObject, style) {
    var year = dateObject.getFullYear();
    var month = (dateObject.getMonth() + 1);
    var day = dateObject.getDate();
    if (!style || style == "ymd") {
        if (month < 10)
            month = "0" + month;
        if (day < 10)
            day = "0" + day;
        return year + "-" + month + "-" + day;
    } else if (style == "h" || style == "readable")
        return day + " " + MONTH_NAMES[month] + " " + year;
}

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
        if (requestsLoading.length > 0) {
            console.log("waiting for " + requestsLoading.length + " requests to "
                        + "finish...");
            if (waitingCallback)
                waitingCallback(requestsLoading.length);
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

    if (menuObject) {
        var header = document.createElement("h1");
        header.innerHTML = headerText
        container.appendChild(header);

        if (searchQuery) {
            var queryInfo = document.createElement("p");
            queryInfo.innerHTML = "Showing results for \"" + searchQuery + "\"";
            container.appendChild(queryInfo);
        }

        for (var a = 0; a < menuObject.periods.length; a++) {
            var period = menuObject.periods[a];
            var periodResults = 0;

            var periodContainer = document.createElement("div");
            periodContainer.setAttribute("class", "nested");

            var periodHeader = document.createElement("h2");
            periodHeader.innerHTML = period.name;
            periodContainer.appendChild(periodHeader);

            for (var b = 0; b < period.categories.length; b++) {
                var category = period.categories[b];
                var categoryResults = 0;

                var categoryContainer = document.createElement("div");
                categoryContainer.setAttribute("class", "nested");

                var categoryHeader = document.createElement("h3");
                categoryHeader.innerHTML = category.name;
                categoryContainer.appendChild(categoryHeader);

                var itemContainer = document.createElement("table");
                itemContainer.setAttribute("class", "nested");
                categoryContainer.appendChild(itemContainer);

                for (var c = 0; c < category.items.length; c++) {
                    item = category.items[c];
                    var itemRow = document.createElement("tr");

                    var itemLink = document.createElement("a");
                    itemLink.setAttribute("href", "#");
                    itemLink.innerHTML = item.name;
                    itemRow.appendChild(itemLink);

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
            container.removeChild(queryInfo);

            var header = document.createElement("h3");
            header.innerHTML = "No results for \"" + searchQuery + "\" :(";
            container.appendChild(header);
        }

    } else {
        var header = document.createElement("h3");
        header.innerHTML = headerText
        container.appendChild(header);
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

    var dateStringReadable = formatDate(dateObject, "h");
    var dateString = formatDate(dateObject);
    var url = buildUrl(targetLocation, dateString);

    // Sanity checks:
    // Assists with readability later by ensuring that callback is always a
    // valid function instead of checking if it exists whenever it's called
    if (!callback)
        callback = function() {
            true;
        }
    // Creates a new cache item for the current location if it does not exist
    if (!menuCache[targetLocation])
        menuCache[targetLocation] = {};

    // If nothing has been cached for the current date, request a menu.json
    if (typeof(menuCache[targetLocation][dateString]) == "undefined") {
        console.log("retrieving " + url);
        requestsLoading.push(url);

        // If the request returns nothing, add nothing to the cache, allowing
        // for future requests to retry
        window.setTimeout(function() {
            if (requestsLoading.pop(url)) {
                console.log("request for " + targetLocation + " menu for "
                            + dateString + " timed out");
                callback(false, "Menu request for " + targetLocation + " on "
                                + dateStringReadable + " timed out",
                         dateObject.getTime());
            }
        }, JSON_REQUEST_TIMEOUT + Math.random() * 1000);

        // If the request succeeds, set a value in the cache
        $.getJSON(buildUrl(targetLocation, dateString), function(data){

            // Make sure the request hasn't yet timed out
            if (requestsLoading.pop(url)) {
                if (data.menu) {
                    menuCache[targetLocation][dateString] = data.menu;
                    console.log("cached " + targetLocation + " menu for "
                                + dateString);
                    callback(data.menu, "Menu for " + targetLocation + " on "
                                        + dateStringReadable,
                             dateObject.getTime());
                } else {
                    menuCache[targetLocation][dateString] = false;
                    console.log("could not retrieve " + targetLocation + " menu "
                                + " for " + dateString);
                    callback(false, "No menu available for " + targetLocation
                                     + " on " + dateStringReadable,
                             dateObject.getTime());
                }
            }

        });
    // Otherwise, attempt to load from the cache
    } else if (menuCache[targetLocation][dateString]) {
        console.log("loaded " + targetLocation + " menu for " + dateString
                    + " from cache");
        callback(menuCache[targetLocation][dateString], "Menu for "
                     + targetLocation + " on " + dateStringReadable,
                 dateObject.getTime());
    } else {
        console.log("cache indicated that " + targetLocation + " menu for "
                    + dateString + " could not be retrieved previously");
        callback(false, "No menu available for " + targetLocation
                         + " on " + dateStringReadable, dateObject.getTime());
    }
}

/**
 * A wrapper for buildMenu. For documentation, see buildMenu. Essentially
 * deprecated by displayMenuMultiple, as an array of a single date can be
 * supplied to the dates parameter.
 */
function displayMenu(menuObject, headerText, searchQuery) {
    main = document.getElementById("main");
    main.innerHTML = "";
    main.appendChild(buildMenu(menuObject, headerText, searchQuery));
}

function displayFoodDetail(targetLocation, dates, foodName) {
    if (working)
        return;
    working = true;

    var main = document.getElementById("main");
    main.innerHTML = "";

    var container = document.createElement("div");

    var header = document.createElement("h1");
    header.innerHTML = foodName + " in " + targetLocation;
    container.appendChild(header);
    var info = document.createElement("h2");
    info.innerHTML = "This item appears on: ";
    container.appendChild(info);

    var totalResults = 0;
    var resultsContainer = document.createElement("div");
    for (var a = 0; a < dates.length; a++) {
        var dateString = formatDate(dates[a], "h");
        var dateResults = 0;
        var menu = menuCache[targetLocation][formatDate(dates[a])];

        var dateContainer = document.createElement("div");
        dateContainer.setAttribute("class", "nested");

        var dateHeader = document.createElement("h3");
        dateHeader.innerHTML = dateString;
        dateContainer.appendChild(dateHeader);

        var resultsTable = document.createElement("table");
        resultsTable.setAttribute("class", "nested");
        dateContainer.appendChild(resultsTable);

        if (menu) {
            for (var b = 0; b < menu.periods.length; b++) {
                var period = menu.periods[b];
                for (var c = 0; c < period.categories.length; c++) {
                    var category = period.categories[c];
                    for (var d = 0; d < category.items.length; d++) {
                        if (category.items[d].name == foodName) {
                            totalResults++;
                            dateResults++;

                            var resultRow = document.createElement("tr");
                            resultRow.innerHTML = category.name + " - "
                                                  + period.name;
                            resultsTable.appendChild(resultRow);
                        }
                    }
                }
            }
        }

        if (dateResults > 0)
            resultsContainer.appendChild(dateContainer);

    }
    if (totalResults > 0)
        container.appendChild(resultsContainer);
    else {
        var notification = document.createElement("h3");
        notification.innerHTML = "Something went wrong :(";
        container.appendChild(notification);
    }

    main.appendChild(container);
    setTimeout(function() {
        main.scrollIntoView({"behavior": "smooth"})
    }, SCROLL_DELAY);
    working = false;
};

/**
 * Appends multiple menus to the main element
 * @param {String} targetLocation A string index of the locations table,
 *     describing which location a menu should be loaded for.
 * @param {Array} dates An array of Date objects to be displayed
 * @param {String} searchQuery An optional string used to filter results.
 */
function displayMenuMultiple(targetLocation, dates, searchQuery) {
    if (working)
        return;
    working = true;

    var main = document.getElementById("main");
    main.innerHTML = "";

    var notificationContainer = document.createElement("div");
    var notification = document.createElement("h3");
    notification.innerHTML = "working...";
    notificationContainer.appendChild(notification);
    main.appendChild(notificationContainer);
    var requestsTotal = dates.length;
    var progressBg = document.createElement("div");
    progressBg.setAttribute("class", "progress-bg");
    var progressFg = document.createElement("div");
    progressFg.setAttribute("class", "progress-fg");
    progressFg.setAttribute("style", "width: 0%;");
    progressBg.appendChild(progressFg);
    main.appendChild(progressBg);

    var button = document.getElementById("query-button");
    button.setAttribute("class", "fa fa-refresh");

    // A multidimensional array where:
    //     i[0] is the Unix time of a menu's date
    //     i[1] is the generated div of that menu
    // This is useful for sorting the dates later.
    var menuDivs = [];

    // Create divs for all dates for the specified location
    for (var i = 0; i < dates.length; i++) {
        var dateObject = dates[i]
        loadMenu(targetLocation, dateObject, function(menuObject, headerText,
                                                      time) {
            menuDivs.push([time, buildMenu(menuObject, headerText,
                                           searchQuery)]);
        });
    }

    // Wait for the divs to be created before sorting and displaying them
    waitForRequests(function() {
        main.innerHTML = "<br>";

        // Display the menus in chronological order
        menuDivs.sort(function(a, b) {
            return a[0] - b[0];
        });
        for (var a = 0; a < menuDivs.length; a++) {
            // Connect to the food buttons
            var foodItems = menuDivs[a][1].getElementsByTagName("a");
            console.log(foodItems);
            for (var b = 0; b < foodItems.length; b++) {
                (function(foodName) {
                    foodItems[b].setAttribute("class", "underline");
                    foodItems[b].onclick = function() {
                        displayFoodDetail(targetLocation, dates, foodName);
                    }
                })(foodItems[b].innerHTML);
            }

            main.appendChild(menuDivs[a][1]);
        }


        // Indicate that the menu displaying is done and scroll down to them
        working = false;
        button.setAttribute("class", "fa fa-arrow-right");
        window.setTimeout(function() {
            main.scrollIntoView({"behavior": "smooth"})
        }, SCROLL_DELAY);

    }, 1000, function(requestsLeft) {

        var requestsWord = "requests";
        if (requestsLeft == 1)
            requestsWord = "request";
        notification.innerHTML = "Waiting for " + requestsLeft + " "
                                 + requestsWord + " to finish...";

        progressFg.setAttribute("style", "width: "
            + ((requestsTotal - requestsLeft) / requestsTotal * 100) + "%");

    })
}
