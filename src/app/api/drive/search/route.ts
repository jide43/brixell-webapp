import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

function getDriveClient() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q");
    if (!q) {
      return NextResponse.json({ error: "Missing search query" }, { status: 400 });
    }

    const drive = getDriveClient();
    const escaped = q.replace(/'/g, "\\'");

    const res = await drive.files.list({
      q: `name contains '${escaped}' and mimeType contains 'image/' and trashed = false`,
      fields: "files(id, name, mimeType, thumbnailLink)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      driveId: process.env.GOOGLE_SHARED_DRIVE_ID!,
      corpora: "drive",
      orderBy: "modifiedTime desc",
      pageSize: 50,
    });

    const seen = new Set<string>();
    const unique = (res.data.files || []).filter((f) => {
      if (seen.has(f.id!)) return false;
      seen.add(f.id!);
      return true;
    });
    return NextResponse.json({ files: unique });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
