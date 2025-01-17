let map; // Global map variable
let directionsService;
let directionsRenderer;

function initMap() {
  var options = {
    center: { lat: 52.0705, lng: 4.3007 },
    zoom: 10,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  }

  // const { Map } = await google.maps.importLibrary("maps");

  // Google Map
  map = new google.maps.Map(document.getElementById('map'), options);

  midMap();

}

function midMap() {

// Directions Map service object (to calculate route method)
  directionsService = new google.maps.DirectionsService();

// DirectionsRenderer object (to display route)
  directionsRenderer = new google.maps.DirectionsRenderer();

// Bind directionsRenderer to map
  directionsRenderer.setMap(map);

}


// Create autocomplete objects for all inputs
var options = {
  types: ['(cities)']
}

var input1 = document.getElementById("from");
var autocomplete1 = new google.maps.places.Autocomplete(input1, options);

var input2 = document.getElementById("to");
var autocomplete2 = new google.maps.places.Autocomplete(input2, options);


// Calculating route function (handles route calculating logic)
function calcRoute() {
  // Create API request
  var request = {
    origin: document.getElementById("from").value,
    destination: document.getElementById("to").value,
    travelMode: google.maps.TravelMode.DRIVING, // WALKING, BICYCLING, TRANSIT
    unitSystem: google.maps.UnitSystem.METRIC
  }

  // Pass the request to route method
  directionsService.route(request, async function(result, status) {
    if (status == google.maps.DirectionsStatus.OK) {

      // Get distance and time
      const output = document.querySelector('#output');
      output.innerHTML = "<div class='alert-info'>From: " + document.getElementById("from").value + ".<br />To: " + document.getElementById("to").value + ".<br /> Driving distance <i class='fas fa-road'></i> : " + result.routes[0].legs[0].distance.text + ".<br />Duration <i class='fas fa-hourglass-start'></i> : " + result.routes[0].legs[0].duration.text + ".</div>";

      // Display route
      directionsRenderer.setDirections(result);


      // Divide route by 10 and do calls to Starbucks-related code

      const route = result.routes[0];
      const totalDistance = route.legs[0].distance.value; // Total distance in meters
      // Distance interval between points (increase from 10 to 15)
      const stepDistance = totalDistance / 10;
      const points = []; // Store 10 evenly spaced coordinates
      let accumulatedDistance = 0; // Track total distance covered so far
      let nextTarget = stepDistance; // The next target distance to capture a point

      // REFACTOR CODE BELOW

      // Iterate through each step of the route
      route.legs[0].steps.forEach((step) => {
        const stepLength = step.distance.value; // Distance of this step in meters
        const stepPath = step.path; // Array of lat and long points in this step

        for (let i = 0; i < stepPath.length - 1; i++) {
          const start = stepPath[i];
          const end = stepPath[i + 1];
          const segmentDistance = google.maps.geometry.spherical.computeDistanceBetween(
            start,
            end
          );

          while (accumulatedDistance + segmentDistance >= nextTarget && points.length < 10) {
            const remaining = nextTarget - accumulatedDistance;
            const point = google.maps.geometry.spherical.interpolate(
              start,
              end,
              remaining / segmentDistance
            );
            points.push(point); // Add point to the list
            nextTarget += stepDistance; // Update next target
          }

          accumulatedDistance += segmentDistance; // Update accumulated distance
        }
      });

      // Output the 10 points (latitude and longitude)
      console.log("10 evenly spaced points:", points);
      points.forEach((point, index) => {
        console.log(`Point ${index + 1}: Lat ${point.lat()}, Lng ${point.lng()}`);
      });

      // Make call to Flask (Python) backend to find starbucks locations at these points
      // Fetch Starbucks locations at these points
      let finalData = await fetchCoordinates(points);

      // Add markers of points received by backend
      finalData.forEach(item => {
        addMarkers(item);
      });

      // finalData = fetchCoordinates(points)
      //
      // finalData.forEach(item => {
      //   addMarkers(item);
      // });


      // REFACTOR CODE ABOVE

      // End Starbucks-related code

    } else {
      // Delete route from map if API request fails or returns bad input
      directionsRenderer.setDirections({ routes: [] });

      // Center map back to default
      map.setCenter({ lat: 52.0705, lng: 4.3007 }); // The Hague

      // Output error message
      output.innerHTML = "<div class='alert-danger'><i class='fas fa-exclamation-triangle'></i> Could not retrieve driving distance.</div>";
    }
  });

}
///////////////////////////////

  // Add Marker function (automated marker creator)
  function addMarkers(property) {
    const marker = new google.maps.Marker({
      map: map,
      position: property.location,
      // icon: "https://img.icons8.com/nolan/2x/marker.png"
    });

    const detailWindow = new google.maps.InfoWindow({
      // content: property.content
      content: `<h3>Starbucks</h3><p>${property.driveThru ? 'Drive-Thru Available' : 'Store'}</p>`
    });

    marker.addListener("mouseover", () => {
      detailWindow.open(map, marker);
    });

    marker.addListener("click", () => {

    })

  }

  function testMarkers(points) {
    for (let i = 0; i < points.length; i++) {
      const marker = new google.maps.Marker({
        map: map,
        position: points[i]
      });
    }
  }

  // Write for loop that loops through objects received from python. pass extracted
  // Lat/long through addMarker
  function receiveArrayCoords(array) {
    for (let i = 0; i < array.length; i++) {
      addMarkers(array[i]);
    }

  }

  addMarkers({ location: { lat: 53.0705, lng: 4.3007 }, content: '<h2>The test</h2>' });
  addMarkers({ location: { lat: 52.0705, lng: 4.3007 }, content: '<h2>The Hague</h2>' });


const fetchCoordinates = async (array) => {
  try {
    const response = await fetch('http://127.0.0.1:5000/get_coordinates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(array), // Send the array as JSON
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Received coordinates:", data);

    // // Convert received tuples into objects with lat/lng
    // const formattedData = data.map(item => ({
    //   location: { lat: item[0], lng: item[1] },
    //   content: '<h3>Starbucks</h3>' // Add more details here
    // }));

    // Convert received tuples into objects with lat/lng and driveThru
    const formattedData = data.map(item => ({
      location: { lat: item.latitude, lng: item.longitude },
      content: '<h3>Starbucks</h3>', // Add more details here
      driveThru: item.driveThru // Include driveThru information
    }));


    // return data;
    return formattedData;
  } catch (error) {
    console.error("Error fetching coordinates:", error);
  }
};