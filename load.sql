-- File: load.sql
USE EventManagement;

-- Load data into Sponsors
LOAD DATA LOCAL INFILE 'sponsors.csv' 
INTO TABLE Sponsors
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(sponsor_ID, sponsor_name, sponsor_phone_number, sponsor_email);

-- Load data into Venues
LOAD DATA LOCAL INFILE 'venues.csv' 
INTO TABLE Venues
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(venue_ID, venue_name, venue_phone_number, venue_email, venue_capacity);

-- Load data into Events
LOAD DATA LOCAL INFILE 'events.csv' 
INTO TABLE Events
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(event_ID, event_name, event_type, budget, sponsor_ID, venue_ID);

-- Load data into Sponsor_List
LOAD DATA LOCAL INFILE 'sponsor_list.csv' 
INTO TABLE Sponsor_List
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(sponsor_ID, event_ID);

-- Load data into Venue_Locations
LOAD DATA LOCAL INFILE 'venue_locations.csv' 
INTO TABLE Venue_Locations
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(venue_ID, venue_location);

-- Load data into Vendors
LOAD DATA LOCAL INFILE 'vendors.csv' 
INTO TABLE Vendors
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(vendor_ID, vendor_name, vendor_phone_number, vendor_email, venue_ID);

-- Load data into Attendees
LOAD DATA LOCAL INFILE 'attendees.csv' 
INTO TABLE Attendees
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(attendee_ID, first_name, last_name, email, phone_number, event_ID);

-- Load data into Employees
LOAD DATA LOCAL INFILE 'employees.csv' 
INTO TABLE Employees
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(attendee_ID);

-- Load data into Guests
LOAD DATA LOCAL INFILE 'guests.csv' 
INTO TABLE Guests
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(attendee_ID);