import { prisma } from "@/server/config/prisma";
import { User } from "@/generated/prisma/client";
import { AppError } from "@/server/utils/global-error";

class UserService {
    public async findByEmail(email: string): Promise<User | null> {
        return await prisma.user.findUnique({
            where: { email },
        });
    }
    
    public async findById(id: string): Promise<User> {
        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new AppError("User not found", 404, "RESOURCE_NOT_FOUND");
        }

        return user;
    }
}

export const userService = new UserService();
