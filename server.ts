import { Application, Router, Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { Client } from "https://deno.land/x/mysql@v2.12.0/mod.ts";

const app = new Application();
const router = new Router();

// Database configuration
const client = await new Client().connect({
    hostname: "127.0.0.1",
    username: "root",
    password: "R3132002",
    db: "EventManagement",
});

// Simple in-memory auth tracking (not recommended for production)
const authenticatedUsers = new Set();

// Generic reset auto-increment function
async function resetAutoIncrement(tableName: string, idColumn: string) {
    try {
        await client.execute(`ALTER TABLE ${tableName} AUTO_INCREMENT = 1`);
        console.log(`Auto-increment reset successfully for ${tableName}`);
    } catch (error) {
        console.error(`Error resetting auto-increment for ${tableName}:`, error);
    }
}

// Generic reorder IDs function
async function reorderIds(tableName: string, idColumn: string, dependentTables: Array<{table: string, column: string}>) {
    try {
        const records = await client.query(`SELECT * FROM ${tableName} ORDER BY ${idColumn}`);
        for (let i = 0; i < records.length; i++) {
            const newId = i + 1;
            const oldId = records[i][idColumn];
            if (newId !== oldId) {
                await client.execute(
                    `UPDATE ${tableName} SET ${idColumn} = ? WHERE ${idColumn} = ?`,
                    [newId, oldId]
                );
                for (const { table, column } of dependentTables) {
                    await client.execute(
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

// Route handlers
// Admin login route (simplified)
router.post("/admin_login", async (ctx: Context) => {
    const body = await ctx.request.body().value;
    const { username, password } = body;
    try {
        const admins = await client.query(
            'SELECT * FROM Admin_Logins WHERE username = ? AND password = ?',
            [username, password]
        );
        if (admins.length > 0) {
            const admin = admins[0];
            authenticatedUsers.add(admin.admin_ID);
            ctx.response.body = { message: 'Login successful' };
        } else {
            ctx.response.status = 401;
            ctx.response.body = { error: 'Invalid credentials' };
        }
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Password change route (with vulnerable verification)
router.post("/change_password", async (ctx: Context) => {
    const body = await ctx.request.body().value;
    const { username, oldPassword, newPassword } = body;
    try {
        // Vulnerable update query (susceptible to SQL injection)
        const updateQuery = `UPDATE Admin_Logins SET password = '${newPassword}' WHERE username = '${username}' AND password = '${oldPassword}'`;
        
        await client.execute(updateQuery);
        ctx.response.body = { message: 'Password changed successfully' };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Authentication check route (simplified)
router.get("/check_auth", (ctx: Context) => {
    // In a real application, you would use proper session management
    ctx.response.body = { authenticated: true };
});

// Logout route (simplified)
router.post("/admin_logout", (ctx: Context) => {
    // In a real application, you would clear the session
    ctx.response.body = { message: 'Logged out successfully' };
});

// Get all sponsors
router.get("/sponsors", async (ctx: Context) => {
    try {
        await resetAutoIncrement('Sponsors', 'sponsor_ID');
        const results = await client.query('SELECT * FROM Sponsors ORDER BY sponsor_ID');
        ctx.response.body = results;
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Add new sponsor
router.post("/submit_sponsor", async (ctx: Context) => {
    const body = await ctx.request.body().value;
    const { sponsor_name, sponsor_phone_number, sponsor_email } = body;
    try {
        await client.execute(
            'INSERT INTO Sponsors (sponsor_name, sponsor_phone_number, sponsor_email) VALUES (?, ?, ?)',
            [sponsor_name, sponsor_phone_number, sponsor_email]
        );
        ctx.response.body = { message: 'Sponsor added successfully' };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Delete sponsor
router.delete("/sponsors/:id", async (ctx: Context) => {
    const sponsorId = parseInt(ctx.params.id, 10);
    if (isNaN(sponsorId)) {
        ctx.response.status = 400;
        ctx.response.body = { error: 'Invalid sponsor ID' };
        return;
    }
    try {
        const deleteResult = await client.execute(
            'DELETE FROM Sponsors WHERE sponsor_ID = ?',
            [sponsorId]
        );
        if (deleteResult.affectedRows === 0) {
            ctx.response.status = 404;
            ctx.response.body = { message: 'Sponsor not found' };
            return;
        }
        await reorderIds('Sponsors', 'sponsor_ID', [
            { table: 'Events', column: 'sponsor_ID' },
            { table: 'Sponsor_List', column: 'sponsor_ID' }
        ]);
        ctx.response.body = { message: 'Sponsor deleted successfully' };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Update sponsor
router.put("/sponsors/:id", async (ctx: Context) => {
    const { id } = ctx.params;
    const body = await ctx.request.body().value;
    const { sponsor_name, sponsor_phone_number, sponsor_email } = body;
    try {
        const result = await client.execute(
            'UPDATE Sponsors SET sponsor_name = ?, sponsor_phone_number = ?, sponsor_email = ? WHERE sponsor_ID = ?',
            [sponsor_name, sponsor_phone_number, sponsor_email, id]
        );

        if (result.affectedRows === 0) {
            ctx.response.status = 404;
            ctx.response.body = { error: 'Sponsor not found' };
            return;
        }
        
        ctx.response.body = { message: 'Sponsor updated successfully' };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Get all venues
router.get("/venues", async (ctx: Context) => {
    try {
        await resetAutoIncrement('Venues', 'venue_ID');
        const results = await client.query('SELECT * FROM Venues ORDER BY venue_ID');
        ctx.response.body = results;
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Add new venue
router.post("/submit_venue", async (ctx: Context) => {
    const body = await ctx.request.body().value;
    const { venue_name, venue_phone_number, venue_email, venue_capacity } = body;
    if (!venue_name) {
        ctx.response.status = 400;
        ctx.response.body = { error: 'Venue name is required' };
        return;
    }
    try {
        const result = await client.execute(
            'INSERT INTO Venues (venue_name, venue_phone_number, venue_email, venue_capacity) VALUES (?, ?, ?, ?)',
            [venue_name, venue_phone_number, venue_email, venue_capacity]
        );
        if (result.affectedRows === 1) {
            ctx.response.body = { message: 'Venue added successfully' };
        } else {
            throw new Error('Failed to add venue');
        }
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Delete venue
router.delete("/venues/:id", async (ctx: Context) => {
    const venueId = parseInt(ctx.params.id, 10);
    try {
        const deleteResult = await client.execute(
            'DELETE FROM Venues WHERE venue_ID = ?',
            [venueId]
        );
        if (deleteResult.affectedRows === 0) {
            ctx.response.status = 404;
            ctx.response.body = { message: 'Venue not found' };
            return;
        }
        await reorderIds('Venues', 'venue_ID', [
            { table: 'Events', column: 'venue_ID' },
            { table: 'Venue_Locations', column: 'venue_ID' },
            { table: 'Vendors', column: 'venue_ID' }
        ]);
        ctx.response.body = { message: 'Venue deleted successfully' };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Update venue (if you have edit functionality for venues)
router.put("/venues/:id", async (ctx: Context) => {
    const { id } = ctx.params;
    const body = await ctx.request.body().value;
    const { venue_name, venue_phone_number, venue_email, venue_capacity } = body;
    try {
        const result = await client.execute(
            'UPDATE Venues SET venue_name = ?, venue_phone_number = ?, venue_email = ?, venue_capacity = ? WHERE venue_ID = ?',
            [venue_name, venue_phone_number, venue_email, venue_capacity, id]
        );

        if (result.affectedRows === 0) {
            ctx.response.status = 404;
            ctx.response.body = { error: 'Venue not found' };
            return;
        }
        
        ctx.response.body = { message: 'Venue updated successfully' };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Get all events
router.get("/events", async (ctx: Context) => {
    try {
        await resetAutoIncrement('Events', 'event_ID');
        const results = await client.query(`
            SELECT e.*, s.sponsor_name, v.venue_name,
            DATE_FORMAT(e.event_date, '%Y-%m-%d') as formatted_date
            FROM Events e 
            JOIN Sponsors s ON e.sponsor_ID = s.sponsor_ID 
            JOIN Venues v ON e.venue_ID = v.venue_ID
            ORDER BY e.event_date, e.event_ID`);
        ctx.response.body = results;
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Submit new event
router.post("/submit_event", async (ctx: Context) => {
    const body = await ctx.request.body().value;
    const { event_name, event_date, event_type, budget, sponsor_ID, venue_ID } = body;
    try {
        await client.execute(
            'INSERT INTO Events (event_name, event_date, event_type, budget, sponsor_ID, venue_ID) VALUES (?, ?, ?, ?, ?, ?)',
            [event_name, event_date, event_type, budget, sponsor_ID, venue_ID]
        );
        ctx.response.body = { message: 'Event added successfully' };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Update event
router.put("/events/:id", async (ctx: Context) => {
    const { id } = ctx.params;
    const body = await ctx.request.body().value;
    const { event_name, event_date, event_type, budget } = body;
    try {
        const result = await client.execute(
            'UPDATE Events SET event_name = ?, event_date = ?, event_type = ?, budget = ? WHERE event_ID = ?',
            [event_name, event_date, event_type, budget, id]
        );

        if (result.affectedRows === 0) {
            ctx.response.status = 404;
            ctx.response.body = { error: 'Event not found' };
            return;
        }
        
        ctx.response.body = { message: 'Event updated successfully' };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Delete event
router.delete("/events/:id", async (ctx: Context) => {
    const eventId = parseInt(ctx.params.id, 10);
    try {
        const result = await client.execute(
            'DELETE FROM Events WHERE event_ID = ?', 
            [eventId]
        );
        if (result.affectedRows === 0) {
            ctx.response.status = 404;
            ctx.response.body = { message: 'Event not found' };
            return;
        }
        await reorderIds('Events', 'event_ID', [
            { table: 'Attendees', column: 'event_ID' },
            { table: 'Sponsor_List', column: 'event_ID' }
        ]);
        ctx.response.body = { message: 'Event deleted successfully' };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Get attendees by event ID
router.get("/event_attendees/:id", async (ctx: Context) => {
    const eventId = ctx.params.id;
    try {
        const results = await client.query(
            'SELECT * FROM Attendees WHERE event_ID = ? ORDER BY attendee_ID',
            [eventId]
        );
        ctx.response.body = results;
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Submit new attendee
router.post("/submit_attendee", async (ctx: Context) => {
    const body = await ctx.request.body().value;
    const { first_name, last_name, email, phone_number, event_ID } = body;
    try {
        await client.execute(
            'INSERT INTO Attendees (first_name, last_name, email, phone_number, event_ID) VALUES (?, ?, ?, ?, ?)',
            [first_name, last_name, email, phone_number, event_ID]
        );
        ctx.response.body = { message: 'Attendee registered successfully' };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Delete attendee
router.delete("/attendees/:id", async (ctx: Context) => {
    const attendeeId = parseInt(ctx.params.id, 10);
    if (isNaN(attendeeId)) {
        ctx.response.status = 400;
        ctx.response.body = { error: 'Invalid attendee ID' };
        return;
    }
    try {
        const result = await client.execute(
            'DELETE FROM Attendees WHERE attendee_ID = ?',
            [attendeeId]
        );
        if (result.affectedRows === 0) {
            ctx.response.status = 404;
            ctx.response.body = { message: 'Attendee not found' };
            return;
        }
        ctx.response.body = { message: 'Attendee removed successfully' };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Get all venue locations with venue names
router.get("/venue_locations", async (ctx: Context) => {
    try {
        const results = await client.query(`
            SELECT vl.*, v.venue_name 
            FROM Venue_Locations vl
            JOIN Venues v ON vl.venue_ID = v.venue_ID
            ORDER BY v.venue_name, vl.venue_location`);
        ctx.response.body = results;
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Add new venue location
router.post("/submit_venue_location", async (ctx: Context) => {
    const body = await ctx.request.body().value;
    const { venue_ID, venue_location } = body;
    try {
        await client.execute(
            'INSERT INTO Venue_Locations (venue_ID, venue_location) VALUES (?, ?)',
            [venue_ID, venue_location]
        );
        ctx.response.body = { message: 'Venue location added successfully' };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Delete venue location
router.delete("/venue_locations/:venueId/:location", async (ctx: Context) => {
    const { venueId, location } = ctx.params;
    try {
        const result = await client.execute(
            'DELETE FROM Venue_Locations WHERE venue_ID = ? AND venue_location = ?',
            [venueId, decodeURIComponent(location)]
        );
        if (result.affectedRows === 0) {
            ctx.response.status = 404;
            ctx.response.body = { message: 'Location not found' };
        } else {
            ctx.response.body = { message: 'Location deleted successfully' };
        }
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Update venue location
router.put("/venue_locations/:venueId/:oldLocation", async (ctx: Context) => {
    const { venueId, oldLocation } = ctx.params;
    const body = await ctx.request.body().value;
    const { new_location } = body;
    try {
        const result = await client.execute(
            'UPDATE Venue_Locations SET venue_location = ? WHERE venue_ID = ? AND venue_location = ?',
            [new_location, venueId, decodeURIComponent(oldLocation)]
        );

        if (result.affectedRows === 0) {
            ctx.response.status = 404;
            ctx.response.body = { error: 'Location not found' };
            return;
        }
        
        ctx.response.body = { message: 'Location updated successfully' };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: error.message };
    }
});

// Helper function to escape HTML and prevent XSS
function escapeHtml(unsafe: string) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Vulnerable search endpoint
router.post("/search_admin_vulnerable", async (ctx: Context) => {
    const body = await ctx.request.body().value;
    const { username } = body;
    // Vulnerable SQL query (Susceptible to SQL Injection)
    const query = `SELECT * FROM Admin_Logins WHERE username = '${username}'`;

    try {
        const results = await client.query(query);
        ctx.response.body = results;
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: 'Server Error' };
    }
});

// Secure search endpoint
router.post("/search_admin_secure", async (ctx: Context) => {
    const body = await ctx.request.body().value;
    const { username } = body;
    // Prepared statement to prevent SQL Injection
    const query = 'SELECT * FROM Admin_Logins WHERE username = ?';

    try {
        const results = await client.query(query, [username]);
        ctx.response.body = results;
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: 'Server Error' };
    }
});

// Static file serving
app.use(async (ctx, next) => {
    try {
        await ctx.send({
            root: `${Deno.cwd()}/public`,
            index: "index.html",
        });
    } catch {
        await next();
    }
});

app.use(router.routes());
app.use(router.allowedMethods());

// Start server
console.log('Server running on http://localhost:3000');
await app.listen({ port: 3000 });