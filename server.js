const express = require('express');
const mysql = require('mysql2');
const app = express();

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'R3132002',
    database: 'EventManagement'
});

// Simple in-memory auth tracking (not recommended for production)
const authenticatedUsers = new Set();

// Generic reset auto-increment function
async function resetAutoIncrement(tableName, idColumn) {
    try {
        await connection.promise().query(`ALTER TABLE ${tableName} AUTO_INCREMENT = 1`);
        console.log(`Auto-increment reset successfully for ${tableName}`);
    } catch (error) {
        console.error(`Error resetting auto-increment for ${tableName}:`, error);
    }
}

// Generic reorder IDs function
async function reorderIds(tableName, idColumn, dependentTables) {
    try {
        const [records] = await connection.promise().query(`SELECT * FROM ${tableName} ORDER BY ${idColumn}`);
        for (let i = 0; i < records.length; i++) {
            const newId = i + 1;
            const oldId = records[i][idColumn];
            if (newId !== oldId) {
                await connection.promise().query(
                    `UPDATE ${tableName} SET ${idColumn} = ? WHERE ${idColumn} = ?`,
                    [newId, oldId]
                );
                for (const { table, column } of dependentTables) {
                    await connection.promise().query(
                        `UPDATE ${table} SET ${column} = ? WHERE ${column} = ?`,
                        [newId, oldId]
                    );
                }
            }
        }
        await resetAutoIncrement(tableName, idColumn);
    } catch (error) {
        console.error(`Error reordering IDs for ${tableName}:`, error);
        throw error;
    }
}

// Admin login route (simplified)
app.post('/admin_login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [admins] = await connection.promise().query(
            'SELECT * FROM Admin_Logins WHERE username = ? AND password = ?',
            [username, password]
        );
        if (admins.length > 0) {
            const admin = admins[0];
            authenticatedUsers.add(admin.admin_ID);
            res.json({ message: 'Login successful' });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Password change route (with vulnerable verification)
app.post('/change_password', async (req, res) => {
    const { username, oldPassword, newPassword } = req.body;
    try {
        // Vulnerable update query (susceptible to SQL injection)
        const updateQuery = `UPDATE Admin_Logins SET password = '${newPassword}' WHERE username = '${username}' AND password = '${oldPassword}'`;
        
        connection.query(updateQuery, (error, result) => {
            if (error) {
                return res.status(500).json({ error: error.message });
            }
            if (result.affectedRows > 0) {
                res.json({ message: 'Password changed successfully' });
            } else {
                res.status(401).json({ error: 'Invalid username or current password' });
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Authentication check route (simplified)
app.get('/check_auth', (req, res) => {
    // In a real application, you would use proper session management
    res.json({ authenticated: true });
});

// Logout route (simplified)
app.post('/admin_logout', (req, res) => {
    // In a real application, you would clear the session
    res.json({ message: 'Logged out successfully' });
});

// Get all sponsors
app.get('/sponsors', async (req, res) => {
    try {
        await resetAutoIncrement('Sponsors', 'sponsor_ID');
        const [results] = await connection.promise().query('SELECT * FROM Sponsors ORDER BY sponsor_ID');
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new sponsor
app.post('/submit_sponsor', (req, res) => {
    const { sponsor_name, sponsor_phone_number, sponsor_email } = req.body;
    connection.query(
        'INSERT INTO Sponsors (sponsor_name, sponsor_phone_number, sponsor_email) VALUES (?, ?, ?)',
        [sponsor_name, sponsor_phone_number, sponsor_email],
        (error, results) => {
            if (error) {
                res.status(500).json({ error: error.message });
            } else {
                res.json({ message: 'Sponsor added successfully' });
            }
        }
    );
});

// Delete sponsor
app.delete('/sponsors/:id', async (req, res) => {
    const sponsorId = parseInt(req.params.id, 10);
    if (isNaN(sponsorId)) {
        return res.status(400).json({ error: 'Invalid sponsor ID' });
    }
    try {
        const [deleteResult] = await connection.promise().query(
            'DELETE FROM Sponsors WHERE sponsor_ID = ?',
            [sponsorId]
        );
        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ message: 'Sponsor not found' });
        }
        await reorderIds('Sponsors', 'sponsor_ID', [
            { table: 'Events', column: 'sponsor_ID' },
            { table: 'Sponsor_List', column: 'sponsor_ID' }
        ]);
        res.json({ message: 'Sponsor deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update sponsor
app.put('/sponsors/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { sponsor_name, sponsor_phone_number, sponsor_email } = req.body;
        
        const [result] = await connection.promise().query(
            'UPDATE Sponsors SET sponsor_name = ?, sponsor_phone_number = ?, sponsor_email = ? WHERE sponsor_ID = ?',
            [sponsor_name, sponsor_phone_number, sponsor_email, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Sponsor not found' });
        }
        
        res.json({ message: 'Sponsor updated successfully' });
    } catch (error) {
        console.error('Error updating sponsor:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all venues
app.get('/venues', async (req, res) => {
    try {
        await resetAutoIncrement('Venues', 'venue_ID');
        const [results] = await connection.promise().query('SELECT * FROM Venues ORDER BY venue_ID');
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new venue
app.post('/submit_venue', async (req, res) => {
    const { venue_name, venue_phone_number, venue_email, venue_capacity } = req.body;
    if (!venue_name) {
        return res.status(400).json({ error: 'Venue name is required' });
    }
    try {
        const [result] = await connection.promise().query(
            'INSERT INTO Venues (venue_name, venue_phone_number, venue_email, venue_capacity) VALUES (?, ?, ?, ?)', // Removed extra '?'
            [venue_name, venue_phone_number, venue_email, venue_capacity]
        );
        if (result.affectedRows === 1) {
            res.json({ message: 'Venue added successfully' });
        } else {
            throw new Error('Failed to add venue');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete venue
app.delete('/venues/:id', async (req, res) => {
    const venueId = parseInt(req.params.id, 10);
    try {
        const [deleteResult] = await connection.promise().query(
            'DELETE FROM Venues WHERE venue_ID = ?',
            [venueId]
        );
        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ message: 'Venue not found' });
        }
        await reorderIds('Venues', 'venue_ID', [
            { table: 'Events', column: 'venue_ID' },
            { table: 'Venue_Locations', column: 'venue_ID' },
            { table: 'Vendors', column: 'venue_ID' }
        ]);
        res.json({ message: 'Venue deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update venue (if you have edit functionality for venues)
app.put('/venues/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { venue_name, venue_phone_number, venue_email, venue_capacity } = req.body;
        
        const [result] = await connection.promise().query(
            'UPDATE Venues SET venue_name = ?, venue_phone_number = ?, venue_email = ?, venue_capacity = ? WHERE venue_ID = ?',
            [venue_name, venue_phone_number, venue_email, venue_capacity, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Venue not found' });
        }
        
        res.json({ message: 'Venue updated successfully' });
    } catch (error) {
        console.error('Error updating venue:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all events
app.get('/events', async (req, res) => {
    try {
        await resetAutoIncrement('Events', 'event_ID');
        const [results] = await connection.promise().query(`
            SELECT e.*, s.sponsor_name, v.venue_name,
            DATE_FORMAT(e.event_date, '%Y-%m-%d') as formatted_date
            FROM Events e 
            JOIN Sponsors s ON e.sponsor_ID = s.sponsor_ID 
            JOIN Venues v ON e.venue_ID = v.venue_ID
            ORDER BY e.event_date, e.event_ID`);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Submit new event
app.post('/submit_event', async (req, res) => {
    const { event_name, event_date, event_type, budget, sponsor_ID, venue_ID } = req.body;
    try {
        const [result] = await connection.promise().query(
            'INSERT INTO Events (event_name, event_date, event_type, budget, sponsor_ID, venue_ID) VALUES (?, ?, ?, ?, ?, ?)',
            [event_name, event_date, event_type, budget, sponsor_ID, venue_ID]
        );
        res.json({ message: 'Event added successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update event
app.put('/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { event_name, event_date, event_type, budget } = req.body;
        
        const [result] = await connection.promise().query(
            'UPDATE Events SET event_name = ?, event_date = ?, event_type = ?, budget = ? WHERE event_ID = ?',
            [event_name, event_date, event_type, budget, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        res.json({ message: 'Event updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete event
app.delete('/events/:id', async (req, res) => {
    const eventId = parseInt(req.params.id, 10);
    try {
        const [result] = await connection.promise().query(
            'DELETE FROM Events WHERE event_ID = ?', 
            [eventId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Event not found' });
        }
        await reorderIds('Events', 'event_ID', [
            { table: 'Attendees', column: 'event_ID' },
            { table: 'Sponsor_List', column: 'event_ID' }
        ]);
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get attendees by event ID
app.get('/event_attendees/:id', async (req, res) => {
    const eventId = req.params.id;
    try {
        // Add logging
        console.log('Fetching attendees for event:', eventId);

        // Reset auto-increment
        await resetAutoIncrement('Attendees', 'attendee_ID');

        // Get attendees
        const [results] = await connection.promise().query(
            'SELECT * FROM Attendees WHERE event_ID = ? ORDER BY attendee_ID',
            [eventId]
        );

        // Log results
        console.log(`Found ${results.length} attendees for event ${eventId}`);

        res.json(results);
    } catch (error) {
        console.error('Error fetching attendees:', error);
        res.status(500).json({ 
            error: error.message,
            details: 'Error fetching attendees from database'
        });
    }
});

// Submit new attendee
app.post('/submit_attendee', async (req, res) => {
    const { first_name, last_name, email, phone_number, event_ID } = req.body;
    try {
        await connection.promise().query(
            'INSERT INTO Attendees (first_name, last_name, email, phone_number, event_ID) VALUES (?, ?, ?, ?, ?)',
            [first_name, last_name, email, phone_number, event_ID]
        );
        res.json({ message: 'Attendee registered successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete attendee
app.delete('/attendees/:id', async (req, res) => {
    const attendeeId = parseInt(req.params.id, 10);
    if (isNaN(attendeeId)) {
        return res.status(400).json({ error: 'Invalid attendee ID' });
    }
    try {
        const [result] = await connection.promise().query(
            'DELETE FROM Attendees WHERE attendee_ID = ?',
            [attendeeId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Attendee not found' });
        }

        // Reorder attendee IDs and reset auto-increment
        await reorderIds('Attendees', 'attendee_ID', []);

        res.json({ message: 'Attendee removed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update attendee
app.put('/attendees/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, email, phone_number } = req.body;
        
        // Set content type header
        res.setHeader('Content-Type', 'application/json');

        // Validate input
        if (!first_name || !last_name || !email) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const [result] = await connection.promise().query(
            'UPDATE Attendees SET first_name = ?, last_name = ?, email = ?, phone_number = ? WHERE attendee_ID = ?',
            [first_name, last_name, email, phone_number, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Attendee not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            message: 'Attendee updated successfully'
        });
    } catch (error) {
        console.error('Error updating attendee:', error);
        return res.status(500).json({
            success: false,
            error: 'Database error',
            message: error.message
        });
    }
});

// Get all venue locations with venue names
app.get('/venue_locations', async (req, res) => {
    try {
        const [results] = await connection.promise().query(`
            SELECT vl.*, v.venue_name 
            FROM Venue_Locations vl
            JOIN Venues v ON vl.venue_ID = v.venue_ID
            ORDER BY v.venue_name, vl.venue_location`);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new venue location
app.post('/submit_venue_location', async (req, res) => {
    const { venue_ID, venue_location } = req.body;
    try {
        await connection.promise().query(
            'INSERT INTO Venue_Locations (venue_ID, venue_location) VALUES (?, ?)',
            [venue_ID, venue_location]
        );
        res.json({ message: 'Venue location added successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete venue location
app.delete('/venue_locations/:venueId/:location', async (req, res) => {
    const { venueId, location } = req.params;
    try {
        const [result] = await connection.promise().query(
            'DELETE FROM Venue_Locations WHERE venue_ID = ? AND venue_location = ?',
            [venueId, decodeURIComponent(location)]
        );
        if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Location not found' });
        } else {
            res.json({ message: 'Location deleted successfully' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update venue location
app.put('/venue_locations/:venueId/:oldLocation', async (req, res) => {
    try {
        const { venueId, oldLocation } = req.params;
        const { new_location } = req.body;
        
        const [result] = await connection.promise().query(
            'UPDATE Venue_Locations SET venue_location = ? WHERE venue_ID = ? AND venue_location = ?',
            [new_location, venueId, decodeURIComponent(oldLocation)]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Location not found' });
        }
        
        res.json({ message: 'Location updated successfully' });
    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function to escape HTML and prevent XSS
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Vulnerable search endpoint
app.post('/search_admin_vulnerable', (req, res) => {
    const username = req.body.username;
    // Vulnerable SQL query (Susceptible to SQL Injection)
    const query = `SELECT * FROM Admin_Logins WHERE username = '${username}'`;

    connection.query(query, (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Server Error' });
        }
        res.json(results);
    });
});

// Secure search endpoint
app.post('/search_admin_secure', (req, res) => {
    const username = req.body.username;
    // Prepared statement to prevent SQL Injection
    const query = 'SELECT * FROM Admin_Logins WHERE username = ?';

    connection.execute(query, [username], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Server Error' });
        }
        res.json(results);
    });
});

app.get('/', (req, res) => {
    res.redirect('/admin_login.html');
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});