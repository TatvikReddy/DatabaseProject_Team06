-- File: create.sql
DROP DATABASE IF EXISTS EventManagement;
CREATE DATABASE EventManagement;
USE EventManagement;

-- Sponsors Table
CREATE TABLE Sponsors (
    sponsor_ID INT AUTO_INCREMENT PRIMARY KEY,
    sponsor_name VARCHAR(255) NOT NULL,
    sponsor_phone_number VARCHAR(20),
    sponsor_email VARCHAR(255)
);

-- Venues Table
CREATE TABLE Venues (
    venue_ID INT AUTO_INCREMENT PRIMARY KEY,
    venue_name VARCHAR(255) NOT NULL,
    venue_phone_number VARCHAR(20),
    venue_email VARCHAR(255),
    venue_capacity INT
);

-- Venue_Locations Table
CREATE TABLE Venue_Locations (
    venue_ID INT NOT NULL,
    venue_location VARCHAR(255) NOT NULL,
    PRIMARY KEY (venue_ID, venue_location),
    FOREIGN KEY (venue_ID) REFERENCES Venues(venue_ID)
        ON DELETE CASCADE
);

-- Vendors Table
CREATE TABLE Vendors (
    vendor_ID INT AUTO_INCREMENT PRIMARY KEY,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_phone_number VARCHAR(20),
    vendor_email VARCHAR(255),
    venue_ID INT NOT NULL,
    FOREIGN KEY (venue_ID) REFERENCES Venues(venue_ID)
        ON DELETE CASCADE
);

-- Events Table
CREATE TABLE Events (
    event_ID INT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    event_type VARCHAR(255),
    budget DECIMAL(10,2),
    sponsor_ID INT NOT NULL,
    venue_ID INT NOT NULL,
    FOREIGN KEY (sponsor_ID) REFERENCES Sponsors(sponsor_ID)
        ON DELETE CASCADE,
    FOREIGN KEY (venue_ID) REFERENCES Venues(venue_ID)
        ON DELETE CASCADE
);

-- Attendees Table
CREATE TABLE Attendees (
    attendee_ID INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone_number VARCHAR(20),
    event_ID INT NOT NULL,
    FOREIGN KEY (event_ID) REFERENCES Events(event_ID)
        ON DELETE CASCADE
);

-- Employees Table
CREATE TABLE Employees (
    attendee_ID INT PRIMARY KEY,
    FOREIGN KEY (attendee_ID) REFERENCES Attendees(attendee_ID)
        ON DELETE CASCADE
);

-- Guests Table
CREATE TABLE Guests (
    attendee_ID INT PRIMARY KEY,
    FOREIGN KEY (attendee_ID) REFERENCES Attendees(attendee_ID)
        ON DELETE CASCADE
);

-- Sponsor_List Table
CREATE TABLE Sponsor_List (
    sponsor_ID INT NOT NULL,
    event_ID INT NOT NULL,
    PRIMARY KEY (sponsor_ID, event_ID),
    FOREIGN KEY (sponsor_ID) REFERENCES Sponsors(sponsor_ID)
        ON DELETE CASCADE,
    FOREIGN KEY (event_ID) REFERENCES Events(event_ID)
        ON DELETE CASCADE
);INSERT INTO attendees (
    attendee_ID,
    first_name,
    last_name,
    email,
    phone_number,
    event_ID
  )
VALUES (
    attendee_ID:int,
    'first_name:varchar',
    'last_name:varchar',
    'email:varchar',
    'phone_number:varchar',
    event_ID:int
  );