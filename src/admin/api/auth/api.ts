import { adminRequest } from "@/admin/api/client";
import type {
    AdminLoginBody,
    AdminLoginResult,
    AdminProfile,
} from "@/admin/api/auth/types";

export function loginAdmin(body: AdminLoginBody) {
    return adminRequest<AdminLoginResult>("/api/admin/auth/login", {
        method: "POST",
        body,
    });
}

export function getAdminMe() {
    return adminRequest<AdminProfile>("/api/admin/auth/me");
}

export function logoutAdmin() {
    return adminRequest<null>("/api/admin/auth/logout", {
        method: "POST",
    });
}
