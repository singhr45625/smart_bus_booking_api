const API_BASE = '/api';

// Signup
async function signup(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const res = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();
    if (res.ok) {
        alert('Signup successful! Please login.');
        window.location.href = 'login.html';
    } else {
        alert(data.error);
    }
}

// Login
async function login(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('username', data.username);
        window.location.href = 'index.html';
    } else {
        alert(data.error);
    }
}

// Logout
async function logout() {
    await fetch(`${API_BASE}/logout`, { method: 'POST' });
    localStorage.removeItem('username');
    window.location.reload();
}

// Update UI for logged in user
function updateUIForLoggedInUser(username) {
    const authLinksCountner = document.getElementById('auth-links');
    authLinksCountner.innerHTML = `
        <span style="margin-left: 20px;">Hi, ${username}!</span>
        <a href="#" onclick="logout()" class="btn-auth">Logout</a>
    `;
    document.getElementById('bookings-section').style.display = 'block';
}

// Search Buses
async function searchBuses() {
    const from = document.getElementById('from').value;
    const to = document.getElementById('to').value;
    
    let url = `${API_BASE}/buses`;
    if (from && to) url += `?source=${from}&destination=${to}`;
    
    const res = await fetch(url);
    const buses = await res.json();
    
    const busList = document.getElementById('bus-list');
    busList.innerHTML = '';

    buses.forEach(bus => {
        const card = document.createElement('div');
        card.className = 'bus-card';
        card.innerHTML = `
            <h3>${bus.name}</h3>
            <div class="bus-time">
                <span>${bus.source} &rarr; ${bus.destination}</span>
            </div>
            <div class="bus-time">
                <span>DEP: ${bus.departure_time}</span>
                <span>ARR: ${bus.arrival_time}</span>
            </div>
            <p>Seats: ${bus.available_seats} / ${bus.total_seats}</p>
            <div style="display:flex; justify-content: space-between; align-items: center; margin-top: 1rem;">
                <span class="price">$${bus.price}</span>
                <button class="btn-primary" onclick="bookBus(${bus.id})">Book Now</button>
            </div>
        `;
        busList.appendChild(card);
    });
}

// Book Bus
async function bookBus(busId) {
    if (!localStorage.getItem('username')) {
        alert('Please login to book a ticket');
        window.location.href = 'login.html';
        return;
    }

    const res = await fetch(`${API_BASE}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busId, seats: 1 })
    });

    if (res.ok) {
        alert('Ticket booked successfully!');
        searchBuses(); // Refresh bus list
        loadMyBookings(); // Refresh my bookings
    } else {
        const data = await res.json();
        alert(data.error || 'Booking failed');
    }
}

// Load My Bookings
async function loadMyBookings() {
    const res = await fetch(`${API_BASE}/my-bookings`);
    if (!res.ok) return;

    const bookings = await res.json();
    const bookingList = document.getElementById('booking-list');
    bookingList.innerHTML = '';

    if (bookings.length === 0) {
        bookingList.innerHTML = '<p style="color:var(--text-muted)">No bookings yet.</p>';
        return;
    }

    bookings.forEach(b => {
        const item = document.createElement('div');
        item.className = 'booking-item';
        item.innerHTML = `
            <div>
                <h4>${b.name}</h4>
                <p>${b.source} to ${b.destination}</p>
                <small>${b.departure_time} | ${new Date(b.booking_date).toLocaleDateString()}</small>
            </div>
            <div>
                <span style="font-weight:700">${b.seats} Seat(s)</span>
            </div>
        `;
        bookingList.appendChild(item);
    });
}
