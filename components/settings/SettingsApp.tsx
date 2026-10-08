"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildGuestInviteUrl,
  createWeddingGuest,
  deleteWeddingGuest,
  fetchWeddingGuests,
  type WeddingGuest,
} from "@/lib/wedding/guests";
import {
  deleteWeddingWish,
  fetchAdminWeddingWishes,
  updateWeddingWish,
  type WeddingWish,
} from "@/lib/wedding/wishes";

const PAGE_SIZE = 20;

type Tab = "guests" | "wishes";

function formatWhen(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function SettingsApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "wishes" ? "wishes" : "guests";

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showError = useCallback((message: string) => {
    setNotice(null);
    setError(message);
  }, []);

  const showNotice = useCallback((message: string) => {
    setError(null);
    setNotice(message);
  }, []);

  const setTab = (next: Tab) => {
    setError(null);
    setNotice(null);
    router.replace(next === "wishes" ? "/settings?tab=wishes" : "/settings");
  };

  return (
    <main className="min-h-screen bg-[#f6f3ee] text-[#2c241c]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <p className="text-xs tracking-[0.18em] text-[#8a7358] uppercase">
            Thiệp cưới
          </p>
          <h1 className="mt-1 font-serif text-3xl text-[#6d583d]">Cài đặt</h1>
        </header>

        <div className="mb-6 flex gap-2 border-b border-[#e4d9cb]">
          <TabButton active={tab === "guests"} onClick={() => setTab("guests")}>
            Khách mời
          </TabButton>
          <TabButton active={tab === "wishes"} onClick={() => setTab("wishes")}>
            Lời chúc
          </TabButton>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {notice}
          </p>
        ) : null}

        {tab === "guests" ? (
          <GuestsPanel onError={showError} onNotice={showNotice} />
        ) : (
          <WishesPanel onError={showError} onNotice={showNotice} />
        )}
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm ${
        active
          ? "border-[#6d583d] font-medium text-[#6d583d]"
          : "border-transparent text-[#8a7358]"
      }`}
    >
      {children}
    </button>
  );
}

function GuestsPanel({
  onError,
  onNotice,
}: {
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}) {
  const [rows, setRows] = useState<WeddingGuest[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async (nextOffset: number, keyword: string) => {
    setLoading(true);
    try {
      const page = await fetchWeddingGuests(nextOffset, PAGE_SIZE, keyword);
      setRows(page.data);
      setTotal(page.total);
      setOffset(page.offset);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Không tải được khách mời.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load(0, search);
  }, [load, search]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const guestName = name.trim();
    if (!guestName) {
      onError("Nhập tên khách mời.");
      return;
    }

    setSaving(true);
    try {
      await createWeddingGuest({ name: guestName });
      onNotice("Đã thêm khách mời.");
      setName("");
      await load(0, search);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Không lưu được khách mời.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (guest: WeddingGuest) => {
    if (!window.confirm(`Xóa khách mời “${guest.name}”?`)) return;
    try {
      await deleteWeddingGuest(guest.id);
      onNotice("Đã xóa khách mời.");
      const nextOffset = rows.length === 1 && offset > 0 ? offset - PAGE_SIZE : offset;
      await load(nextOffset, search);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Không xóa được khách mời.");
    }
  };

  const copyUrl = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      onNotice("Đã sao chép đường dẫn.");
    } catch {
      onError("Không sao chép được đường dẫn.");
    }
  };

  return (
    <section className="space-y-4">
      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-[#e4d9cb] bg-white p-4 shadow-sm"
      >
        <h2 className="mb-3 text-sm font-medium text-[#6d583d]">Thêm khách mời</h2>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,24rem)_auto] sm:items-end">
          <label className="block text-sm">
            <span className="mb-1 block text-[#8a7358]">Tên</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-[#d9cbb8] px-3 py-2 outline-none focus:border-[#6d583d]"
              placeholder="Nguyễn Văn A"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#6d583d] px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              Thêm
            </button>
          </div>
        </div>
      </form>

      <input
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        className="w-full rounded-lg border border-[#d9cbb8] bg-white px-3 py-2 text-sm outline-none focus:border-[#6d583d]"
        placeholder="Tìm theo tên"
        aria-label="Tìm theo tên"
      />

      <ResponsiveRecords
        loading={loading}
        empty={search ? "Không tìm thấy khách mời." : "Chưa có khách mời."}
        isEmpty={rows.length === 0}
        columns={["Tên", "Đường dẫn", ""]}
        mobile={rows.map((guest) => {
          const inviteUrl = guestInviteUrl(guest);
          return (
            <article key={guest.id} className="flex items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words">{guest.name}</p>
                <GuestLink url={inviteUrl} />
              </div>
              <GuestActions
                onCopy={() => copyUrl(inviteUrl)}
                onDelete={() => onDelete(guest)}
              />
            </article>
          );
        })}
        desktop={rows.map((guest) => {
          const inviteUrl = guestInviteUrl(guest);
          return (
            <tr key={guest.id} className="border-t border-[#f0e7dc]">
              <td className="px-3 py-3 align-middle">{guest.name}</td>
              <td className="px-3 py-3 align-middle">
                <GuestLink url={inviteUrl} />
              </td>
              <td className="px-3 py-3 align-middle">
                <GuestActions
                  onCopy={() => copyUrl(inviteUrl)}
                  onDelete={() => onDelete(guest)}
                />
              </td>
            </tr>
          );
        })}
      />
      <Pager
        offset={offset}
        limit={PAGE_SIZE}
        total={total}
        onChange={(next) => void load(next, search)}
      />
    </section>
  );
}

function WishesPanel({
  onError,
  onNotice,
}: {
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}) {
  const [rows, setRows] = useState<WeddingWish[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async (nextOffset: number) => {
    setLoading(true);
    try {
      const page = await fetchAdminWeddingWishes(nextOffset, PAGE_SIZE);
      setRows(page.data);
      setTotal(page.total);
      setOffset(page.offset);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Không tải được lời chúc.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load(0);
  }, [load]);

  const onToggleVisibility = async (wish: WeddingWish) => {
    if (pendingId) return;
    const nextPublic = !wish.isPublic;
    setPendingId(wish.id);
    setRows((current) =>
      current.map((row) =>
        row.id === wish.id ? { ...row, isPublic: nextPublic } : row,
      ),
    );
    try {
      await updateWeddingWish(wish.id, { isPublic: nextPublic });
      onNotice(nextPublic ? "Đã hiện lời chúc." : "Đã ẩn lời chúc.");
    } catch (error) {
      setRows((current) =>
        current.map((row) =>
          row.id === wish.id ? { ...row, isPublic: wish.isPublic } : row,
        ),
      );
      onError(
        error instanceof Error ? error.message : "Không cập nhật được lời chúc.",
      );
    } finally {
      setPendingId(null);
    }
  };

  const onDelete = async (wish: WeddingWish) => {
    if (!window.confirm(`Xóa lời chúc của “${wish.name}”?`)) return;
    try {
      await deleteWeddingWish(wish.id);
      onNotice("Đã xóa lời chúc.");
      const nextOffset = rows.length === 1 && offset > 0 ? offset - PAGE_SIZE : offset;
      await load(nextOffset);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Không xóa được lời chúc.");
    }
  };

  return (
    <section className="space-y-4">
      <ResponsiveRecords
        loading={loading}
        empty="Chưa có lời chúc."
        isEmpty={rows.length === 0}
        columns={["Tên", "Lời chúc", "Tham dự", "Hiển thị", ""]}
        mobile={rows.map((wish) => (
          <article key={wish.id} className="px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium break-words">{wish.name}</p>
                <p className="mt-1 text-xs text-[#8a7358]">
                  {formatWhen(wish.createdAt)}
                </p>
              </div>
              <WishActions
                isPublic={wish.isPublic}
                onToggle={() => onToggleVisibility(wish)}
                onDelete={() => onDelete(wish)}
              />
            </div>
            <p className="mt-2 break-words whitespace-pre-wrap">{wish.message}</p>
            <p className="mt-2 text-[#8a7358]">
              Tham dự: {wish.willAttend ? "Có" : "Không"}
              <span className="px-2">·</span>
              Hiển thị: {wish.isPublic ? "Hiện" : "Ẩn"}
            </p>
          </article>
        ))}
        desktop={rows.map((wish) => (
          <tr key={wish.id} className="border-t border-[#f0e7dc]">
            <td className="px-3 py-3 align-top">
              <div>{wish.name}</div>
              <div className="mt-1 text-xs text-[#8a7358]">
                {formatWhen(wish.createdAt)}
              </div>
            </td>
            <td className="px-3 py-3 align-top break-words whitespace-pre-wrap">
              {wish.message}
            </td>
            <td className="px-3 py-3 align-top whitespace-nowrap">
              {wish.willAttend ? "Có" : "Không"}
            </td>
            <td className="px-3 py-3 align-top whitespace-nowrap">
              {wish.isPublic ? "Hiện" : "Ẩn"}
            </td>
            <td className="px-3 py-3 align-top">
              <WishActions
                isPublic={wish.isPublic}
                align="end"
                onToggle={() => onToggleVisibility(wish)}
                onDelete={() => onDelete(wish)}
              />
            </td>
          </tr>
        ))}
      />
      <Pager
        offset={offset}
        limit={PAGE_SIZE}
        total={total}
        onChange={(next) => void load(next)}
      />
    </section>
  );
}

function guestInviteUrl(guest: WeddingGuest) {
  return guest.code ? buildGuestInviteUrl(guest.code) : guest.url;
}

function GuestLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      className="mt-1 block break-all text-[#6d583d] underline md:mt-0"
      target="_blank"
      rel="noreferrer"
    >
      {url}
    </a>
  );
}

function GuestActions({
  onCopy,
  onDelete,
}: {
  onCopy: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex min-h-11 items-center rounded-lg bg-[#6d583d] px-4 text-sm font-medium text-white"
      >
        Sao chép
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex min-h-11 items-center px-2 text-sm text-red-700 underline"
      >
        Xóa
      </button>
    </div>
  );
}

function WishActions({
  isPublic,
  onToggle,
  onDelete,
  align,
}: {
  isPublic: boolean;
  onToggle: () => void;
  onDelete: () => void;
  align?: "end";
}) {
  return (
    <div
      className={`flex flex-wrap gap-x-3 gap-y-1 ${
        align === "end" ? "md:justify-end" : ""
      }`}
    >
      <TextButton onClick={onToggle}>{isPublic ? "Ẩn" : "Hiển thị"}</TextButton>
      <TextButton onClick={onDelete} danger>
        Xóa
      </TextButton>
    </div>
  );
}

function ResponsiveRecords({
  loading,
  empty,
  isEmpty,
  columns,
  mobile,
  desktop,
}: {
  loading: boolean;
  empty: string;
  isEmpty: boolean;
  columns: string[];
  mobile: ReactNode;
  desktop: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e4d9cb] bg-white text-sm shadow-sm">
      {loading ? <p className="px-3 py-6 text-[#8a7358]">Đang tải…</p> : null}
      {!loading && isEmpty ? (
        <p className="px-3 py-6 text-[#8a7358]">{empty}</p>
      ) : null}
      {!loading && !isEmpty ? (
        <>
          <div className="divide-y divide-[#f0e7dc] md:hidden">{mobile}</div>
          <table className="hidden w-full md:table">
            <thead className="bg-[#faf7f3] text-[#8a7358]">
              <tr>
                {columns.map((column) => (
                  <th key={column || "actions"} className="px-3 py-2 text-left font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{desktop}</tbody>
          </table>
        </>
      ) : null}
    </div>
  );
}

function Pager({
  offset,
  limit,
  total,
  onChange,
}: {
  offset: number;
  limit: number;
  total: number;
  onChange: (offset: number) => void;
}) {
  if (total <= limit) {
    return (
      <p className="text-sm text-[#8a7358]">
        {total} mục
      </p>
    );
  }

  const page = Math.floor(offset / limit) + 1;
  const pages = Math.ceil(total / limit);

  return (
    <div className="flex items-center justify-between text-sm text-[#8a7358]">
      <span>
        {offset + 1}–{Math.min(offset + limit, total)} / {total}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={offset === 0}
          onClick={() => onChange(Math.max(0, offset - limit))}
          className="rounded-lg border border-[#d9cbb8] bg-white px-3 py-1 disabled:opacity-40"
        >
          Trước
        </button>
        <span className="px-1 py-1">
          {page}/{pages}
        </span>
        <button
          type="button"
          disabled={offset + limit >= total}
          onClick={() => onChange(offset + limit)}
          className="rounded-lg border border-[#d9cbb8] bg-white px-3 py-1 disabled:opacity-40"
        >
          Sau
        </button>
      </div>
    </div>
  );
}

function TextButton({
  children,
  onClick,
  danger,
}: {
  children: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm underline ${danger ? "text-red-700" : "text-[#6d583d]"}`}
    >
      {children}
    </button>
  );
}
