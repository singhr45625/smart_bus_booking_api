const axios = require('axios');

/**
 * Get road distance between two cities using Google Maps Distance Matrix API
 * @param {string} origin - Source city
 * @param {string} destination - Destination city
 * @returns {Promise<number>} - Distance in kilometers
 */
const getDistance = async (origin, destination) => {
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.error('GOOGLE_MAPS_API_KEY is missing');
            return 400; // Default fallback distance
        }

        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;
        
        const response = await axios.get(url);
        
        if (response.data.status !== 'OK' || !response.data.rows[0].elements[0].distance) {
            console.warn('Google Maps Distance Matrix Error:', response.data.status);
            return 400; // Fallback
        }

        const distanceInMeters = response.data.rows[0].elements[0].distance.value;
        const distanceInKm = Math.round(distanceInMeters / 1000);
        
        return distanceInKm;
    } catch (error) {
        console.error('Error fetching distance:', error.message);
        return 400; // Fallback
    }
};

/**
 * Get intermediate significant points (stations) along a route
 * @param {string} origin 
 * @param {string} destination 
 * @returns {Promise<Array>} - Array of stop objects { name, lat, lng }
 */
const getRouteWaypoints = async (origin, destination) => {
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${apiKey}`;
        
        const response = await axios.get(url);
        if (response.data.status !== 'OK') return [];

        const route = response.data.routes[0];
        const legs = route.legs[0];
        const totalSteps = legs.steps.length;
        
        // Pick 4-5 significant steps along the route to act as stations
        const stops = [];
        const indices = [
            Math.floor(totalSteps * 0.2),
            Math.floor(totalSteps * 0.4),
            Math.floor(totalSteps * 0.6),
            Math.floor(totalSteps * 0.8)
        ];

        for (const index of indices) {
            const step = legs.steps[index];
            if (step) {
                stops.push({
                    name: step.html_instructions.replace(/<[^>]*>?/gm, '').split(' towards ')[0].split(' onto ')[0].substring(0, 30),
                    lat: step.end_location.lat,
                    lng: step.end_location.lng,
                    passed: false
                });
            }
        }

        return stops;
    } catch (error) {
        console.error('Error fetching waypoints:', error.message);
        return [];
    }
};

module.exports = { getDistance, getRouteWaypoints };
