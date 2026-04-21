import prisma from "./lib/prisma";

async function test() {
  try {
    const users = await prisma.user.count();
    console.log("Connection successful, users count:", users);
  } catch (error) {
    console.error("Connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
