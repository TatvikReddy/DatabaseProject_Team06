// loadData.ts
import { Client } from "https://deno.land/x/mysql@v2.12.0/mod.ts";

const client = await new Client().connect({
  hostname: "127.0.0.1",
  username: "root",
  password: "R3132002",
  db: "EventManagement",
});

const loadSqlCommands = await Deno.readTextFile('load.sql');
const commands = loadSqlCommands.split(';').filter(cmd => cmd.trim());

for (const command of commands) {
  try {
    if (command.trim()) {
      await client.execute(command);
      console.log('Command executed successfully');
    }
  } catch (error) {
    console.error('Error executing command:', error);
    break;
  }
}

console.log('All data loaded successfully');
await client.close();