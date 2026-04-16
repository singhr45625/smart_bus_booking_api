const axios = require('axios');

const API_URL = 'https://smart-bus-booking-api.onrender.com/api';

async function testRenderAPI() {
    try {
        console.log('--- Logging in to Render API ---');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'operator@example.com', // Use the default seeded operator
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Login successful on Render.');

        const headers = { Authorization: `Bearer ${token}` };

        console.log('\n--- Fetching Operator Buses on Render ---');
        try {
            const fetchRes = await axios.get(`${API_URL}/operator/buses`, { headers });
            console.log(`Fetch successful. Found ${fetchRes.data.length} buses.`);
            if (fetchRes.data.length === 0) {
                console.warn('WARNING: No buses found for this operator on Render. Data might be unseeded.');
            }
        } catch (err) {
            console.error('Fetch failed on Render:', err.response?.data || err.message);
        }

        console.log('\n--- Adding a Bus on Render ---');
        try {
            const addRes = await axios.post(`${API_URL}/operator/buses`, {
                name: 'Render Diagnostic Bus',
                totalSeats: 35
            }, { headers });
            console.log('Add successful on Render:', addRes.data);
        } catch (err) {
            console.error('Add failed on Render:', err.response?.data || err.message);
        }

    } catch (err) {
        console.error('Render test script failed:', err.response?.data || err.message);
    }
}

testRenderAPI();
