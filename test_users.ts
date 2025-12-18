
import { storage } from "./server/storage";
import { db } from "./server/db";
import { users } from "@shared/schema";

async function main() {
  console.log("Checking users...");
  try {
    const allUsers = await storage.getUsers();
    console.log(`Found ${allUsers.length} users:`);
    allUsers.forEach(u => console.log(`- ${u.id}: ${u.nome} (${u.email})`));
    
    // Check direct DB access just in case
    const dbUsers = await db.select().from(users);
    console.log(`DB direct count: ${dbUsers.length}`);

  } catch (error) {
    console.error("Error fetching users:", error);
  }
  process.exit(0);
}

main();
