const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'R3132002',
  database: 'EventManagement',
  multipleStatements: true,
  localInfile: true,
  infileStreamFactory: (filename) => {
    const filePath = path.join(__dirname, filename);
    return fs.createReadStream(filePath);
  }
});

const loadSqlCommands = fs.readFileSync('load.sql', 'utf8').split(';');

function executeCommands(commands, index = 0) {
  if (index >= commands.length) {
    console.log('All data loaded successfully');
    return connection.end();
  }

  const command = commands[index].trim();
  if (command) {
    connection.query(command, function (error) {
      if (error) {
        console.error(`Error executing command at index ${index}:`, error);
        return connection.end();
      }
      console.log(`Command ${index} executed successfully`);
      executeCommands(commands, index + 1);
    });
  } else {
    executeCommands(commands, index + 1);
  }
}

executeCommands(loadSqlCommands);