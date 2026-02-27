import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

function getDriveClient() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    const { fileId, propertyId } = await req.json();
    if (!fileId || !propertyId) {
      return NextResponse.json({ error: "Missing fileId or propertyId" }, { status: 400 });
    }

    const drive = getDriveClient();

    // Get file metadata
    const meta = await drive.files.get({
      fileId,
      fields: "name, mimeType",
      supportsAllDrives: true,
    });

    const filename = meta.data.name || "image.jpg";
    const mimeType = meta.data.mimeType || "image/jpeg";

    // Download file content
    const download = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" },
    );

    const buffer = Buffer.from(download.data as ArrayBuffer);
    const storagePath = `properties/${propertyId}/${Date.now()}-${filename}`;

    // Upload to Supabase Storage
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from("property-images")
      .upload(storagePath, buffer, { contentType: mimeType });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("property-images")
      .getPublicUrl(storagePath);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
