const express = require('express');
const mysql = require('mysql2');
const app = express();

app.use(express.static('.'));
app.use(express.json());

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'R3132002',
    database: 'EventManagement'
});

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
        // Get all records ordered by ID
        const [records] = await connection.promise().query(`SELECT * FROM ${tableName} ORDER BY ${idColumn}`);
        
        // Update IDs to be sequential
        for (let i = 0; i < records.length; i++) {
            const newId = i + 1;
            const oldId = records[i][idColumn];
            if (newId !== oldId) {
                // Update main table
                await connection.promise().query(
                    `UPDATE ${tableName} SET ${idColumn} = ? WHERE ${idColumn} = ?`,
                    [newId, oldId]
                );

                // Update dependent tables
                for (const { table, column } of dependentTables) {
                    await connection.promise().query(
                        `UPDATE ${table} SET ${column} = ? WHERE ${column} = ?`,
                        [newId, oldId]
                    );
                }
            }
        }
        
        // Reset auto-increment
        await resetAutoIncrement(tableName, idColumn);
    } catch (error) {
        console.error(`Error reordering IDs for ${tableName}:`, error);
        throw error;
    }
}

// Modify the get sponsors endpoint to ensure IDs are sequential
app.get('/sponsors', async (req, res) => {
    try {
        // Reset auto-increment before fetching
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

// Modify the delete endpoint
app.delete('/sponsors/:id', async (req, res) => {
    const sponsorId = parseInt(req.params.id, 10);
    
    if (isNaN(sponsorId)) {
        console.log('Invalid sponsor ID:', req.params.id);
        return res.status(400).json({ error: 'Invalid sponsor ID' });
    }
    
    console.log('Attempting to delete sponsor with ID:', sponsorId);

    try {
        // Delete the sponsor
        const [deleteResult] = await connection.promise().query(
            'DELETE FROM Sponsors WHERE sponsor_ID = ?',
            [sponsorId]
        );

        if (deleteResult.affectedRows === 0) {
            console.log('No sponsor found with ID:', sponsorId);
            return res.status(404).json({ message: 'Sponsor not found' });
        }

        // Use the generic reorderIds function
        await reorderIds('Sponsors', 'sponsor_ID', [
            { table: 'Events', column: 'sponsor_ID' },
            { table: 'Sponsor_List', column: 'sponsor_ID' }
        ]);
        
        console.log('Successfully deleted sponsor with ID:', sponsorId);
        res.json({ message: 'Sponsor deleted successfully' });
    } catch (error) {
        console.error('Database error:', error);
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

// Modify the submit venue endpoint
app.post('/submit_venue', async (req, res) => {
    const { venue_name, venue_phone_number, venue_email, venue_capacity } = req.body;
    
    if (!venue_name) {
        return res.status(400).json({ error: 'Venue name is required' });
    }

    try {
        const [result] = await connection.promise().query(
            'INSERT INTO Venues (venue_name, venue_phone_number, venue_email, venue_capacity) VALUES (?, ?, ?, ?)',
            [venue_name, venue_phone_number, venue_email, venue_capacity]
        );
        
        if (result.affectedRows === 1) {
            res.json({ message: 'Venue added successfully' });
        } else {
            throw new Error('Failed to add venue');
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Modify the delete venue endpoint
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

        // Reorder IDs after successful deletion
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

// Modify the submit event endpoint
app.post('/submit_event', async (req, res) => {
    const { event_name, event_date, event_type, budget, sponsor_ID, venue_ID } = req.body;

    try {
        await connection.promise().query(
            'INSERT INTO Events (event_name, event_date, event_type, budget, sponsor_ID, venue_ID) VALUES (?, ?, ?, ?, ?, ?)',
            [event_name, event_date, event_type, budget, sponsor_ID, venue_ID]
        );
        res.json({ message: 'Event added successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
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

// Delete attendee endpoint
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

        res.json({ message: 'Attendee removed successfully' });
    } catch (error) {
        console.error('Error deleting attendee:', error);
        res.status(500).json({ error: error.message });
    }
});

// Modify the delete event endpoint
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

        // Reorder IDs after successful deletion
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
        const [results] = await connection.promise().query(
            'SELECT * FROM Attendees WHERE event_ID = ? ORDER BY attendee_ID',
            [eventId]
        );
        res.json(results);
    } catch (error) {
        console.error('Error fetching attendees:', error);
        res.status(500).json({ error: error.message });
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

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});