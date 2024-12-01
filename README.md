# DatabaseProject_Team06

# README

## Event Management System

This is a web-based Event Management System that allows administrators to manage events, sponsors, attendees, and venues. The system is built using Node.js, Express.js, MySQL, and standard web technologies like HTML, CSS, and JavaScript.

## Table of Contents

- Prerequisites
- Installation and Setup
  - 1. Install Node.js and Visual Studio Code
  - 2. Install MySQL Server and MySQL Workbench
  - 3. Clone the Repository
  - 4. Install Node.js Dependencies
  - 5. Set Up the MySQL Database
    - 5.1 Create a New Database Connection
    - 5.2 Create the `EventManagement` Database
    - 5.3 Create Tables Using `create.sql`
    - 5.4 Load Initial Data Using `loadData.js`
  - 6. Configure Database Connection in `server.js`
- Running the Application
- Accessing the Application
- Using the Application
  - Admin Login
- Troubleshooting
- Notes

## Prerequisites

Before you begin, ensure you have met the following requirements:

- **Operating System**: Windows
- **Node.js**: Download and install from [Node.js Official Website](https://nodejs.org/en/download/).
- **Visual Studio Code (VSCode)**: Download and install from [Visual Studio Code Official Website](https://code.visualstudio.com/download).
- **MySQL Server and MySQL Workbench**: Download and install from [MySQL Community Downloads](https://dev.mysql.com/downloads/).

## Installation and Setup

### 1. Install Node.js and Visual Studio Code

- **Node.js**: Install the LTS version of Node.js. Verify the installation by opening Command Prompt and running:

  ```cmd
  node -v
  npm -v
  ```

- **Visual Studio Code**: Install VSCode for code editing and running the terminal.

### 2. Install MySQL Server and MySQL Workbench

- **MySQL Server**: Install MySQL Server Community Edition.
- **MySQL Workbench**: Install MySQL Workbench for database management.

### 3. Clone the Repository

Open Command Prompt and navigate to the directory where you want to clone the project:

```cmd
cd C:\path\to\your\projects
git clone <repository_url>
```

Replace `<repository_url>` with the URL of your project's repository.

### 4. Install Node.js Dependencies

Navigate to the project directory:

```cmd
cd <project_directory>
```

Install the required packages using npm:

```cmd
npm install
```

This command installs all the dependencies specified in the 

package.json

 file.

### 5. Set Up the MySQL Database

#### 5.1 Create a New Database Connection

1. Open **MySQL Workbench**.
2. Click the **"+"** icon next to **MySQL Connections** to create a new connection.
3. In the **Set up a New Connection** window:
   - **Connection Name**: Enter a name for the connection (e.g., `Local Instance`).
   - **Hostname**: `localhost`
   - **Port**: `3306` (default)
   - **Username**: `root`
   - **Password**: Click **Store in Vault...** and enter your MySQL root password.
4. Click **Test Connection** to ensure the connection is successful.
5. Click **OK** to save the connection.

#### 5.2 Create the `EventManagement` Database

1. Open the connection you just created by double-clicking it.
2. In the **Navigator** pane on the left, right-click on **Schemas** and select **Create Schema...**.
3. Enter `EventManagement` as the schema name.
4. Click **Apply**, then **Apply** again to execute the SQL statement.
5. Click **Finish**.

#### 5.3 Create Tables Using 

create.sql



1. In **MySQL Workbench**, go to **File** > **Open SQL Script...**.
2. Navigate to your project directory and open the 

create.sql

 file.
3. Make sure the default schema is set to `EventManagement` by selecting it from the dropdown in the toolbar.
4. Execute the script by clicking the **Lightning Bolt** icon or pressing **Ctrl+Shift+Enter**.
5. This will create all the necessary tables in the `EventManagement` database.

#### 5.4 Load Initial Data Using 

loadData.js



1. Ensure the CSV data files (e.g., `sponsors.csv`, `venues.csv`, etc.) are placed in the project directory.
2. Open **Command Prompt** or the terminal in VSCode.
3. Navigate to your project directory if not already there:

   ```cmd
   cd <project_directory>
   ```

4. Run the data loading script:

   ```cmd
   node loadData.js
   ```

   This script will read from 

load.sql

 and populate your database tables with initial data.

### 6. Configure Database Connection in 

server.js



1. Open 

server.js

 in VSCode.
2. Locate the MySQL connection configuration:

   ```javascript
   const connection = mysql.createConnection({
       host: 'localhost',
       user: 'root',
       password: 'your_mysql_password',
       database: 'EventManagement'
   });
   ```

3. Replace `'your_mysql_password'` with your actual MySQL root password.

   **Note**: For security reasons, it's recommended to use environment variables or a `.env` file to store sensitive information. Ensure that `.env` files are included in your 

.gitignore

 to prevent them from being committed to version control.

## Running the Application

Start the server using Node.js:

```cmd
node server.js
```

You should see a message indicating that the server is running, such as:

```
Server is running on port 3000
```

If you need to run the server on a different port, you can modify the 

server.js

 file accordingly.

## Accessing the Application

Open your web browser and navigate to:

```
http://localhost:3000/
```

This should display the application's homepage or the admin login page.

## Using the Application

### Admin Login

To access the admin functionalities, you need to log in with an admin account.

1. Navigate to the admin login page:

   ```
   http://localhost:3000/admin_login.html
   ```

2. Use the following credentials (assuming they exist in your database):

   - **Username**: `admin1`
   - **Password**: `password123`

   If these credentials do not work, check the `Admins` table in your `EventManagement` database to verify admin usernames and passwords.

3. After logging in, you will be redirected to the admin dashboard, where you can:

   - Manage events
   - Manage sponsors
   - Register attendees
   - Manage venues
   - Change your password

## Troubleshooting

- **MySQL Connection Errors**:
  - Ensure that MySQL Server is running.
  - Verify your MySQL connection details in 

server.js

.
  - Check that the `EventManagement` database and tables exist.

- **Module Not Found Errors**:
  - Run `npm install` to install all dependencies.

- **Server Not Starting**:
  - Check for syntax errors in your code.
  - Ensure that no other application is using the same port (default is 3000).

- **Login Issues**:
  - Verify that the admin credentials are correct.
  - Check the `Admins` table in the database.

- **Data Not Loading**:
  - Ensure that the CSV files are correctly formatted and located in the project directory.
  - Check for errors when running 

loadData.js

.

## Notes

- **Security Considerations**:
  - The current authentication implementation is basic and intended for demonstration purposes.
  - Do not use this application as-is in a production environment without enhancing security measures (e.g., password hashing, secure session management).

- **Environment Variables**:
  - Consider using environment variables to store sensitive information like database credentials.
  - Use a package like `dotenv` to manage environment variables.

- **Database Credentials**:
  - Never commit hard-coded database passwords to version control.
  - Update your 

.gitignore

 file to exclude sensitive files.

- **Extensions in VSCode**:
  - To work with SQL files in VSCode, you can install extensions like **SQLTools** and **SQLTools MySQL/MariaDB**.
  - Although optional, these can help with database management directly from VSCode.

- **Testing**:
  - Test each functionality of the application thoroughly to ensure it works as expected.
  - Check the developer console in your browser for any client-side errors.

- **Feedback and Improvements**:
  - Any feedback to improve the application is welcome.
  - Consider implementing additional features, enhancing security, or optimizing performance based on usage.

---

If you encounter any issues not covered in this README, please consult the documentation or seek support.