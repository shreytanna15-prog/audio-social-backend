import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { env } from "@/server/config/env";
import { AppError } from "@/server/utils/global-error";

/**
 * Thin email adapter — auth/services call these helpers only.
 * Swap Resend for Mailjet (etc.) here without touching auth flows.
 */

export type SendOtpEmailInput = {
    to: string;
    code: string;
};

const DEV_OTP_FILE = path.join(process.cwd(), ".tmp", "last-otp.json");

async function persistDevOtp(input: SendOtpEmailInput, note?: string): Promise<void> {
    console.info(
        `[email:dev] OTP for ${input.to}: ${input.code}${note ? ` (${note})` : ""}`
    );
    try {
        await mkdir(path.dirname(DEV_OTP_FILE), { recursive: true });
        await writeFile(
            DEV_OTP_FILE,
            JSON.stringify({
                to: input.to,
                code: input.code,
                at: Date.now(),
                note: note ?? null,
            }),
            "utf8"
        );
    } catch {
        // Best-effort for local e2e / emulator; never block the request.
    }
}

function assertEmailConfigured(): void {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
        throw new AppError(
            "Email delivery is not configured",
            503,
            "EMAIL_NOT_CONFIGURED"
        );
    }
}

let resendClient: Resend | null = null;

function getResend(): Resend {
    assertEmailConfigured();
    if (!resendClient) {
        resendClient = new Resend(env.RESEND_API_KEY);
    }
    return resendClient;
}

export async function sendOtpEmail(input: SendOtpEmailInput): Promise<void> {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
        if (env.NODE_ENV === "development") {
            await persistDevOtp(input, "Resend not configured");
            return;
        }
        assertEmailConfigured();
    }

    const { error } = await getResend().emails.send({
        from: env.EMAIL_FROM!,
        to: input.to,
        subject: "Your VibeOGram password reset code",
        text: `Your password reset code is ${input.code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
        html: `<p>Your password reset code is <strong>${input.code}</strong>.</p><p>It expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
    });

    if (error) {
        // Unverified domains / Resend test-mode "to" restrictions block real
        // delivery; keep local flows unblocked in development only.
        if (env.NODE_ENV === "development") {
            await persistDevOtp(input, error.message || "Resend send failed");
            return;
        }
        throw new AppError(
            error.message || "Failed to send email",
            502,
            "EMAIL_SEND_FAILED"
        );
    }

    if (env.NODE_ENV === "development") {
        await persistDevOtp(input);
    }
}
