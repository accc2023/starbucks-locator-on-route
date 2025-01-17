import requests
import time
import re

from flask import Flask, request, jsonify
from flask_cors import CORS
starbucks_locations = Flask(__name__)
CORS(starbucks_locations)

def get_store_lat_lngs(lat, long):
    # Use f-strings for concise notation and greater use
    request = f'https://www.starbucks.com/store-locator?map={lat},{long},12z'
    response = requests.get(request)

    # Prev. logic (lines 16/17) kept for reference
    # lat_lngs = re.findall(r'"coordinates":\{"latitude":(.*?)\,"longitude":(.*?)\}', response.text)
    # lat_lngs = [(float(item[0]), float(item[1])) for item in lat_lngs]

    # Regex to find stores with amenities and coordinates, including checking for "Drive-Thru"
    lat_lngs = re.findall(
        r'"amenities":\[(.*?)\].*?"coordinates":\{"latitude":(.*?),\s*"longitude":(.*?)\}',
        response.text
    )

    stores = []
    for item in lat_lngs:
        lat = float(item[1])
        lng = float(item[2])

        # Check if the store has "Drive-Thru" in its amenities
        amenities = item[0]  # The amenities part from the regex capture group
        drive_thru = '"code":"DT"' in amenities

        stores.append({
            "latitude": lat,
            "longitude": lng,
            "driveThru": drive_thru
        })

    return stores
    # return lat_lngs

# Without creating a backend server
# def get_coordinates(array):
#     new_array = []
#     for item in array:
#         new_array += get_store_lat_lngs(item[0], item[1])
#         time.sleep(1)
#     return new_array

@starbucks_locations.route('/get_coordinates', methods=['POST'])
def get_coordinates():
    data = request.json  # Receive JSON payload
    result = []
    for item in data:  # Process each input item
        result.extend(get_store_lat_lngs(item['lat'], item['lng']))
        time.sleep(1)  # Simulate a delay of 1 second per item

    # Prev. logic kept for reference
    # result = set(result)
    # result = list(result)

    # Use a set of tuples to remove duplicates (based on lat/lng)
    result = list({(store['latitude'], store['longitude']): store for store in result}.values())

    return jsonify(result)  # Return the processed data as JSON

if __name__ == '__main__':
    starbucks_locations.run(debug=True)