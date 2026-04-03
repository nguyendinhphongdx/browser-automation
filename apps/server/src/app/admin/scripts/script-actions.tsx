"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ScriptActions({ scriptId }: { scriptId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAction = async (status: "APPROVED" | "REJECTED") => {
    setLoading(true);
    try {
      await fetch(`/api/admin/scripts/${scriptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } catch (err) {
      alert("Lỗi: " + err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Xoá script này?")) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/scripts/${scriptId}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      alert("Lỗi: " + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleAction("APPROVED")}
        disabled={loading}
        className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
      >
        Duyệt
      </button>
      <button
        onClick={() => handleAction("REJECTED")}
        disabled={loading}
        className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
      >
        Từ chối
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
      >
        Xoá
      </button>
    </div>
  );
}
