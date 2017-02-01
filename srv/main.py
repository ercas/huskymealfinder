#!/usr/bin/env python3

import bottle
import csv
import datetime
import json
import os
import requests
import threading

BASE_JSON_URL = "https://new.dineoncampus.com/v1/location/menu.json?platform=0";
JSON_TIMEOUT = 15
LOCATIONS = {
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
MAIN_APP_URL = "https://ercas.github.io/huskymealfinder"

JSON_CACHE_DIR = "json/"
SUBSCRIPTIONS_CSV = "test.csv"

if (not os.path.isdir(JSON_CACHE_DIR)):
    os.mkdir(JSON_CACHE_DIR)

def load_menu(target_location, date = datetime.date.today()):
    """ Dynamically load a JSON of a dineoncampus.com menu

    Attempts to load a JSON of a dineoncampus.com menu from a stored .json file
    in JSON_CACHE_DIR; if no file exists, attempt to download one from the
    dineoncampus site.

    Args:
        target_location: A string index of the LOCATIONS dictionary.
        date: An optional datetime object of the day whose menu will be
            retrieved. If no date is supplied, a datetime of the current day
            will be used.

    Returns:
        A dictionary of the desired menu or False if no menu could be loaded
    """

    date_string = date.isoformat()
    file_path = "%s/%s_%s.json" % (JSON_CACHE_DIR, date_string, target_location)
    data = {}

    if (os.path.isfile(file_path)):
        print("Loading cached JSON for %s on %s" % (target_location,
                                                    date_string))
        file_object = open(file_path, "r")
        data = json.load(file_object)
        file_object.close()
    else:
        url = "%s&date=%s" % (BASE_JSON_URL, date_string)
        for key in LOCATIONS[target_location]:
            url += "&%s=%s" % (key, LOCATIONS[target_location][key])
        print("Attempting to fetch JSON for %s on %s" % (target_location,
                                                         date_string))
        request = requests.get(url, timeout = JSON_TIMEOUT)
        if (request.status_code == 200):
            data = json.loads(request.text)
            file_object = open(file_path, "w")
            file_object.write(request.text)
            file_object.close()
        else:
            print("%d %s" % (request.status_code, url))
            return False

    return data

class Subscriptions(object):
    """ Handles management of the subscriptions table

    Attributes:
        self.filename: A string containing the filename of the subscriptions CSV
            file.
        self.header: An array containing the header of the CSV files, which has
            the names for each column of the CSV file.
        self.subscriptions: A dictionary containing the rows of the CSV file,
            indexed by column.
    """

    def __init__(self, subscription_csv = SUBSCRIPTIONS_CSV):
        self.filename = subscription_csv
        self.header = False
        self.subscriptions = False

        self.reload()

    def reload(self):
        """ Loads/reloads the contents of self.filename into the
        self.subscriptions array using the csv.DictReader object. Additionally,
        the first row of self.filename is stored in the self.header array. """
        self.subscriptions = []
        with open(self.filename, "r") as file_object:
            # Store the first row into the self.header array then seek back to
            # the beginning of the file and read the entire file using
            # csv.DictReader
            self.header = csv.reader(file_object).__next__()
            file_object.seek(0)
            for row in csv.DictReader(file_object):
                self.subscriptions.append(row)

            file_object.close()

    def write(self):
        """ Writes the self.subscriptions array to the file located at
        self.filename using the csv.DictWriter object. """
        with open(self.filename, "w") as file_object:
            writer = csv.DictWriter(file_object, fieldnames = self.header)
            writer.writeheader()
            for row in self.subscriptions:
                writer.writerow(row)

class Server(threading.Thread):
    """ Handler for HTTP requests

    Contains bottle routes and how the program behaves in response to HTTP
    requests. There is no __init__ function, as that would override the
    inherited __init__ function of the Thread class. As such, initialization is
    done in the init function, which is called at the beginning of the run
    function.

    Attributes:
        app: A Bottle object responsible for handling routes
    """

    def init(self):
        self.app = bottle.Bottle()

    def run(self):
        self.init()

        # Redirect to the main app page if the root is requested
        @self.app.route("/")
        def redirect():
            bottle.redirect(MAIN_APP_URL, 301)

        # Redirect to the main app page if register is requested without a valid
        # food_name parameter
        @self.app.route("/register")
        def show_register():
            try:
                food_name = bottle.request.query["food_name"]
                food_name.replace("_", " ").replace("%AND", "&")
                if (len(food_name) == 0):
                    bottle.redirect(MAIN_APP_URL, 301)
                return ("<h1>%s</h1>" % food_name)
            except Exception as error:
                return ("<h1>Error: %s</h1>" % error)
                #bottle.redirect(MAIN_APP_URL, 301)

        bottle.run(self.app, host = "localhost", port = 8000)

if (__name__ == "__main__"):
    Server().start()
