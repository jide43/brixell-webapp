"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
}

interface DrivePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  propertyId: string;
  multiSelect?: boolean;
}

const GREEN = "#1B5E3B";
const BORDER = "#d4d4d4";

export default function DrivePicker({ open, onClose, onSelect, propertyId }: DrivePickerProps) {
  const [mode, setMode] = useState<"browse" | "search">("browse");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchFolder = useCallback(async (folderId?: string) => {
    setLoading(true);
    setError("");
    try {
      const url = folderId ? `/api/drive/list?folderId=${folderId}` : "/api/drive/list";
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFiles(data.files);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const searchFiles = useCallback(async (q: string) => {
    if (!q.trim()) { setFiles([]); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/drive/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFiles(data.files);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load root on open
  useEffect(() => {
    if (open && mode === "browse") {
      const currentFolder = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].id : undefined;
      fetchFolder(currentFolder);
    }
  }, [open, mode, fetchFolder, breadcrumb]);

  // Debounced search
  useEffect(() => {
    if (mode !== "search") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchFiles(searchQuery), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, mode, searchFiles]);

  const navigateFolder = (folder: DriveFile) => {
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateTo = (index: number) => {
    setBreadcrumb((prev) => prev.slice(0, index));
  };

  const isFolder = (f: DriveFile) => f.mimeType === "application/vnd.google-apps.folder";

  const selectImage = async (file: DriveFile) => {
    setUploadingId(file.id);
    setError("");
    try {
      const res = await fetch("/api/drive/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, propertyId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onSelect(data.url);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  if (!open) return null;

  const folders = files.filter(isFolder);
  const images = files.filter((f) => !isFolder(f));

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#fff", borderRadius: 12, width: "90%", maxWidth: 600, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#000" }}>Google Drive</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}` }}>
          {(["browse", "search"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setFiles([]); setError(""); }}
              style={{
                flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, background: mode === m ? "#fff" : "#f9fafb",
                color: mode === m ? GREEN : "#6b7280",
                borderBottom: mode === m ? `2px solid ${GREEN}` : "2px solid transparent",
              }}
            >
              {m === "browse" ? "Browse" : "Search"}
            </button>
          ))}
        </div>

        {/* Search input */}
        {mode === "search" && (
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${BORDER}` }}>
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for images..."
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 6,
                border: `1px solid ${BORDER}`, fontSize: 14, outline: "none",
                boxSizing: "border-box", fontFamily: "inherit",
              }}
            />
          </div>
        )}

        {/* Breadcrumb (browse mode) */}
        {mode === "browse" && breadcrumb.length > 0 && (
          <div style={{ padding: "8px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", fontSize: 12, color: "#6b7280" }}>
            <button onClick={() => navigateTo(0)} style={{ background: "none", border: "none", cursor: "pointer", color: GREEN, fontWeight: 600, fontSize: 12, padding: 0 }}>
              Root
            </button>
            {breadcrumb.map((b, i) => (
              <span key={b.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: "#d1d5db" }}>/</span>
                <button
                  onClick={() => navigateTo(i + 1)}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: 0,
                    color: i === breadcrumb.length - 1 ? "#374151" : GREEN,
                    fontWeight: i === breadcrumb.length - 1 ? 600 : 400, fontSize: 12,
                  }}
                >
                  {b.name}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, minHeight: 200 }}>
          {error && (
            <div style={{ padding: "8px 12px", borderRadius: 6, background: "#fef2f2", color: "#dc2626", fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center", padding: 40, color: "#6b7280", fontSize: 14 }}>
              Loading...
            </div>
          )}

          {!loading && mode === "search" && !searchQuery.trim() && (
            <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 14 }}>
              Type to search for images
            </div>
          )}

          {!loading && files.length === 0 && (mode === "browse" || searchQuery.trim()) && (
            <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 14 }}>
              No files found
            </div>
          )}

          {/* Folders */}
          {!loading && folders.length > 0 && (
            <div style={{ marginBottom: images.length > 0 ? 16 : 0 }}>
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => navigateFolder(f)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 8,
                    background: "#fff", cursor: "pointer", marginBottom: 6,
                    fontSize: 14, color: "#374151", textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 20 }}>📁</span>
                  <span style={{ fontWeight: 500 }}>{f.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Images grid */}
          {!loading && images.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {images.map((f) => (
                <button
                  key={f.id}
                  onClick={() => !uploadingId && selectImage(f)}
                  disabled={!!uploadingId}
                  style={{
                    position: "relative", border: `1px solid ${BORDER}`, borderRadius: 8,
                    overflow: "hidden", cursor: uploadingId ? "wait" : "pointer",
                    background: "#f9fafb", padding: 0, display: "flex", flexDirection: "column",
                    opacity: uploadingId && uploadingId !== f.id ? 0.4 : 1,
                  }}
                >
                  <div style={{ width: "100%", aspectRatio: "1", overflow: "hidden", background: "#e5e7eb" }}>
                    {f.thumbnailLink ? (
                      <img
                        src={f.thumbnailLink}
                        alt={f.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                        🖼️
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "6px 8px", fontSize: 11, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>
                    {f.name}
                  </div>
                  {/* Loading overlay */}
                  {uploadingId === f.id && (
                    <div style={{
                      position: "absolute", inset: 0, background: "rgba(255,255,255,0.8)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 600, color: GREEN,
                    }}>
                      Uploading...
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
