import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generatePasswordHash } from "../src/server/lib/password";

async function main() {
    const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SUPER_ADMIN_PASSWORD;
    const name = process.env.SUPER_ADMIN_NAME?.trim() || "Super Admin";

    if (!email || !password) {
        throw new Error(
            "Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in .env before seeding"
        );
    }

    if (password.length < 8) {
        throw new Error("SUPER_ADMIN_PASSWORD must be at least 8 characters");
    }

    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL!,
    });
    const prisma = new PrismaClient({ adapter });

    try {
        const existing = await prisma.admin.findUnique({ where: { email } });
        if (existing) {
            console.log(`Admin already exists: ${email}`);
            return;
        }

        const passwordHash = await generatePasswordHash(password);
        const admin = await prisma.admin.create({
            data: {
                email,
                password: passwordHash,
                name,
            },
            select: { id: true, email: true, name: true },
        });

        console.log("Created Super Admin:", admin);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
