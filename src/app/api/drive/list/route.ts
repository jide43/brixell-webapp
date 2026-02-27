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
    const folderId =
      req.nextUrl.searchParams.get("folderId") ||
      process.env.GOOGLE_SHARED_DRIVE_ID!;

    const drive = getDriveClient();

    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false and (mimeType = 'application/vnd.google-apps.folder' or mimeType contains 'image/')`,
      fields: "files(id, name, mimeType, thumbnailLink)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      driveId: process.env.GOOGLE_SHARED_DRIVE_ID!,
      corpora: "drive",
      orderBy: "folder, name",
      pageSize: 100,
    });

    const seen = new Set<string>();
    const unique = (res.data.files || []).filter((f) => {
      if (seen.has(f.id!)) return false;
      seen.add(f.id!);
      return true;
    });
    return NextResponse.json({ files: unique });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to list files";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
