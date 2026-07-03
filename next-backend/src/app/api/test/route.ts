import { NextRequest, NextResponse } from "next/server";
import { apiWrapper } from "@/server/utils/global-error";

export const GET = apiWrapper(async (request: NextRequest) => {

    return NextResponse.json({ success: true, message: "I am just a guy who is hero for fun" });
});