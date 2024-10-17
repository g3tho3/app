const vehiclePositionsUrl = 'http://localhost:3000/vehicle_positions';
const protoUrl = 'http://localhost:3000/adelaidemetro_gtfsr.proto';
const tripUpdatesUrl = 'http://localhost:3000/trip_updates';
const stopsUrl = 'http://localhost:3000/google_transit/stops.txt';
const map = L.map('map').setView([-34.9285, 138.6007], 13);

// Create the map layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

let vehicleMarkers = {};
let followingVehicleId = null;
let stopMarkers = {};
let activeTrainList = [];

// Function to load the protobuf
async function loadProto() {
    const response = await fetch(protoUrl);
    const protoText = await response.text();
    const root = protobuf.parse(protoText).root;
    return root.lookupType('transit_realtime.FeedMessage');
}

// Function to fetch and decode vehicle positions
async function fetchVehiclePositions() {
    try {
        const response = await fetch(vehiclePositionsUrl);
        const arrayBuffer = await response.arrayBuffer();
        const FeedMessage = await loadProto();
        const message = FeedMessage.decode(new Uint8Array(arrayBuffer));
        const vehicles = message.entity;

        activeTrainList = [];
        vehicles.forEach(vehicle => {
            if (vehicle.vehicle && vehicle.vehicle.trip && vehicle.vehicle.trip.routeId) {
                const routeId = vehicle.vehicle.trip.routeId;
                const allowedRouteIds = ['FLNDRS', 'SEAFRD', 'GAWC', 'GAW', 'GRNG', 'OUTHA', 'BEL', 'PTDOCK'];
                if (allowedRouteIds.includes(routeId)) {
                    const lat = vehicle.vehicle.position.latitude;
                    const lon = vehicle.vehicle.position.longitude;
                    const trainNumber = vehicle.vehicle.vehicle.id;

                    if (!vehicleMarkers[trainNumber]) {
                        vehicleMarkers[trainNumber] = L.circleMarker([lat, lon], { radius: 6, color: '#007bff' })
                            .addTo(map)
                            .bindPopup(`<div class="popup-content">Train Number: <strong>${trainNumber}</strong></div>`);
                    } else {
                        vehicleMarkers[trainNumber].setLatLng([lat, lon]);
                    }

                    if (trainNumber === followingVehicleId) {
                        map.panTo([lat, lon]);
                    }

                    activeTrainList.push(trainNumber);
                }
            }
        });

        updateDropdownList();
    } catch (error) {
        console.error('Error fetching vehicle positions:', error);
    }
}

// Function to update the Active Trains dropdown
function updateDropdownList() {
    const dropdown = document.getElementById('trainDropdown');
    dropdown.innerHTML = '<option value="">Select Train</option>';

    activeTrainList.forEach(trainNumber => {
        const option = document.createElement('option');
        option.value = trainNumber;
        option.textContent = trainNumber;
        dropdown.appendChild(option);
    });
}

// Function to load stops data
async function loadStops() {
    try {
        const response = await fetch(stopsUrl);
        const text = await response.text();
        const rows = text.split('\n').slice(1);

        rows.forEach(row => {
            const cols = row.split(',');
            if (cols.length > 3) {
                const stopId = cols[0];
                const stopName = cols[2];
                const stopLat = parseFloat(cols[4]);
                const stopLon = parseFloat(cols[5]);

                if (!stopMarkers[stopId]) {
                    stopMarkers[stopId] = L.marker([stopLat, stopLon]).addTo(map)
                        .bindPopup(`Stop ID: ${stopId}<br>Name: ${stopName}`);
                }
            }
        });
    } catch (error) {
        console.error('Error loading stops:', error);
    }
}

// Function to notify when a train appears
function notifyWhenTrainAppears(vehicleId) {
    followingVehicleId = vehicleId;
    Object.values(vehicleMarkers).forEach(marker => {
        const markerVehicleId = marker.getPopup().getContent();
        if (markerVehicleId.includes(vehicleId)) {
            map.panTo(marker.getLatLng());
        }
    });
}

// Event listener for the notify button
document.getElementById('searchButton').addEventListener('click', () => {
    const vehicleIdInput = document.getElementById('vehicleIdInput').value.trim();
    if (vehicleIdInput) {
        notifyWhenTrainAppears(vehicleIdInput);
    }
});

// Load initial data
fetchVehiclePositions();
loadStops();
setInterval(() => {
    fetchVehiclePositions();
}, 30000);
