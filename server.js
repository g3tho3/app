// Import required modules
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

const app = express();
const PORT = 3000;

// Enable CORS
app.use(cors());

// Serve the protobuf file
app.get('/adelaidemetro_gtfsr.proto', async (req, res) => {
    try {
        const protoUrl = 'https://gtfs.adelaidemetro.com.au/v1/realtime/adelaidemetro_gtfsr.proto';
        const response = await fetch(protoUrl);
        const protoData = await response.text();
        res.set('Content-Type', 'text/plain');
        res.send(protoData);
    } catch (error) {
        console.error('Error fetching proto file:', error);
        res.status(500).send('Error fetching proto file');
    }
});

// Serve vehicle positions
app.get('/vehicle_positions', async (req, res) => {
    try {
        const vehiclePositionsUrl = 'https://gtfs.adelaidemetro.com.au/v1/realtime/vehicle_positions';
        const response = await fetch(vehiclePositionsUrl);
        const vehicleData = await response.buffer(); // Use buffer to handle binary data
        res.set('Content-Type', 'application/octet-stream'); // Set content type for binary data
        res.send(vehicleData);
    } catch (error) {
        console.error('Error fetching vehicle positions:', error);
        res.status(500).send('Error fetching vehicle positions');
    }
});

// Serve trip updates
app.get('/trip_updates', async (req, res) => {
    try {
        const tripUpdatesUrl = 'https://gtfs.adelaidemetro.com.au/v1/realtime/trip_updates';
        const response = await fetch(tripUpdatesUrl);
        const tripData = await response.buffer(); // Use buffer to handle binary data
        res.set('Content-Type', 'application/octet-stream'); // Set content type for binary data
        res.send(tripData);
    } catch (error) {
        console.error('Error fetching trip updates:', error);
        res.status(500).send('Error fetching trip updates');
    }
});

// Serve static GTFS stops data
app.get('/google_transit/stops.txt', async (req, res) => {
    try {
        const stopsUrl = 'https://gtfs.adelaidemetro.com.au/v1/static/latest/google_transit.zip';
        const response = await fetch(stopsUrl);
        const zipBuffer = await response.buffer();

        // Save the zip file temporarily
        const tempZipPath = path.join(__dirname, 'google_transit.zip');
        fs.writeFileSync(tempZipPath, zipBuffer);

        // Extract the stops.txt file from the zip
        fs.createReadStream(tempZipPath)
            .pipe(unzipper.Parse())
            .on('entry', (entry) => {
                if (entry.path === 'stops.txt') {
                    res.set('Content-Type', 'text/csv');
                    entry.pipe(res);
                } else {
                    entry.autodrain(); // Ignore other files
                }
            })
            .on('finish', () => {
                // Clean up the temporary zip file
                fs.unlinkSync(tempZipPath);
            })
            .on('error', (err) => {
                console.error('Error extracting stops.txt:', err);
                res.status(500).send('Error extracting stops.txt');
            });
    } catch (error) {
        console.error('Error fetching stops data:', error);
        res.status(500).send('Error fetching stops data');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
