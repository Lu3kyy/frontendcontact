"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addContact,
  Contact,
  deleteContact,
  getContacts,
  isAuthenticated,
  loginUser,
  logoutUser,
  registerUser,
  searchContacts,
  updateContact,
} from "../lib/api";

type AuthMode = "login" | "register";

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    setLoggedIn(isAuthenticated());
  }, []);

  const contactCountText = useMemo(() => {
    const count = contacts.length;
    return `${count} contact${count === 1 ? "" : "s"}`;
  }, [contacts]);

  useEffect(() => {
    if (!loggedIn) {
      setContacts([]);
      return;
    }
    void loadContacts();
  }, [loggedIn]);

  function isUnauthorized(err: unknown): boolean {
    if (!err || typeof err !== "object") {
      return false;
    }
    const status = (err as { status?: number }).status;
    return status === 401;
  }

  function handleUnauthorized(actionLabel: string) {
    logoutUser();
    setLoggedIn(false);
    setError(`JWT failed while trying to ${actionLabel}. Please sign in again.`);
  }

  async function loadContacts(query?: string) {
    setLoadingContacts(true);
    setError(null);
    try {
      const data = query && query.trim() ? await searchContacts(query.trim()) : await getContacts();
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      if (isUnauthorized(err)) {
        handleUnauthorized("load contacts");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setLoadingContacts(false);
    }
  }

  async function onAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setAuthBusy(true);

    try {
      if (authMode === "register") {
        await registerUser(username.trim(), password);
      }

      const loginResult = await loginUser(username.trim(), password);
      if (!loginResult.token) {
        throw new Error("No JWT token returned from login.");
      }
      setLoggedIn(true);
      setMessage(authMode === "register" ? "Account created and signed in." : "Signed in successfully.");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setAuthBusy(false);
    }
  }

  function onLogout() {
    logoutUser();
    setLoggedIn(false);
    setMessage("Signed out.");
    setError(null);
    setEditingId(null);
    setSearchQuery("");
  }

  async function onCreateContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveBusy(true);
    setMessage(null);
    setError(null);

    try {
      await addContact({ name: name.trim(), email: email.trim(), phone: phone.trim() });
      setName("");
      setEmail("");
      setPhone("");
      setMessage("Contact added.");
      await loadContacts(searchQuery);
    } catch (err) {
      if (isUnauthorized(err)) {
        handleUnauthorized("create a contact");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to create contact");
    } finally {
      setSaveBusy(false);
    }
  }

  function beginEdit(contact: Contact) {
    setEditingId(contact.id);
    setEditName(contact.name);
    setEditEmail(contact.email);
    setEditPhone(contact.phone);
  }

  async function onSaveEdit(id: number) {
    setSaveBusy(true);
    setMessage(null);
    setError(null);

    try {
      await updateContact(id, {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
      });
      setEditingId(null);
      setMessage("Contact updated.");
      await loadContacts(searchQuery);
    } catch (err) {
      if (isUnauthorized(err)) {
        handleUnauthorized("update a contact");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to update contact");
    } finally {
      setSaveBusy(false);
    }
  }

  async function onDelete(id: number) {
    const confirmed = window.confirm("Delete this contact?");
    if (!confirmed) {
      return;
    }

    setMessage(null);
    setError(null);
    try {
      await deleteContact(id);
      setMessage("Contact removed.");
      await loadContacts(searchQuery);
    } catch (err) {
      if (isUnauthorized(err)) {
        handleUnauthorized("delete a contact");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to delete contact");
    }
  }

  async function onSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadContacts(searchQuery);
  }

  return (
    <main className="min-h-screen bg-[#f4f5f7] text-slate-900">
      <header className="border-b border-slate-300 bg-[#efefef]">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500 text-white">📇</div>
            <p className="text-[28px] font-bold leading-none text-indigo-500">ContactFlow</p>
            <h1 className="text-[42px] font-semibold leading-none text-slate-900">Contact Manager</h1>
          </div>
          <form onSubmit={onSearchSubmit}>
            <div className="flex w-[360px] items-center gap-2 rounded-lg border border-slate-300 bg-[#f7f7f8] px-3 py-2">
              <span className="text-slate-400">🔍</span>
              <input
                className="w-full bg-transparent text-base text-slate-700 outline-none placeholder:text-slate-400"
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-[1320px] px-6 py-8">
        {!loggedIn ? (
          <section className="mx-auto mt-14 max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in or create an account to manage your contacts.</p>

            <div className="mt-6 mb-6 flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${authMode === "login" ? "bg-indigo-500 text-white" : "text-slate-700"}`}
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${authMode === "register" ? "bg-indigo-500 text-white" : "text-slate-700"}`}
                onClick={() => setAuthMode("register")}
              >
                Register
              </button>
            </div>

            <form className="space-y-4" onSubmit={onAuthSubmit}>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-indigo-500"
                placeholder="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                minLength={3}
                required
              />
              <input
                type="password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-indigo-500"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
              <button
                type="submit"
                disabled={authBusy}
                className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60"
              >
                {authBusy ? "Please wait..." : authMode === "register" ? "Create account" : "Sign in"}
              </button>
            </form>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
            <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-[38px] font-semibold text-slate-900">Add New Contact</h2>
                  <p className="mt-1 text-base text-slate-500">Fill in the details below to add a new contact to your list.</p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Logout
                </button>
              </div>

              <form className="space-y-4" onSubmit={onCreateContact}>
                <div>
                  <label className="mb-2 block text-[24px] font-semibold text-slate-700">Name</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-[26px] outline-none placeholder:text-slate-400 focus:border-indigo-500"
                    placeholder="John Doe"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[24px] font-semibold text-slate-700">Email</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-[26px] outline-none placeholder:text-slate-400 focus:border-indigo-500"
                    placeholder="john.doe@example.com"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[24px] font-semibold text-slate-700">Phone</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-[26px] outline-none placeholder:text-slate-400 focus:border-indigo-500"
                    placeholder="+1 (555) 123-4567"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={saveBusy}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-3 text-[24px] font-semibold text-white hover:bg-indigo-600 disabled:opacity-60"
                >
                  <span>＋</span>
                  <span>{saveBusy ? "Saving..." : "Add Contact"}</span>
                </button>
              </form>
            </aside>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h2 className="text-[38px] font-semibold text-slate-900">All Contacts</h2>
                <p className="text-[24px] font-medium text-slate-500">{contactCountText}</p>
              </div>

              {loadingContacts ? <p className="p-5 text-[22px] text-slate-500">Loading contacts...</p> : null}

              {!loadingContacts && contacts.length === 0 ? (
                <p className="p-5 text-[22px] text-slate-500">No contacts yet. Add your first contact using the form.</p>
              ) : null}

              {!loadingContacts && contacts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-200 bg-slate-50 text-left text-[22px] font-semibold text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((contact) => {
                        const isEditing = editingId === contact.id;
                        return (
                          <tr key={contact.id} className="border-b border-slate-100 text-[30px] text-slate-800">
                            <td className="px-4 py-4 align-middle">
                              {isEditing ? (
                                <input
                                  className="w-full rounded-lg border border-slate-300 px-2 py-1 text-[24px]"
                                  value={editName}
                                  onChange={(event) => setEditName(event.target.value)}
                                />
                              ) : (
                                contact.name
                              )}
                            </td>
                            <td className="px-4 py-4 align-middle">
                              {isEditing ? (
                                <input
                                  className="w-full rounded-lg border border-slate-300 px-2 py-1 text-[24px]"
                                  value={editEmail}
                                  onChange={(event) => setEditEmail(event.target.value)}
                                />
                              ) : (
                                contact.email
                              )}
                            </td>
                            <td className="px-4 py-4 align-middle">
                              {isEditing ? (
                                <input
                                  className="w-full rounded-lg border border-slate-300 px-2 py-1 text-[24px]"
                                  value={editPhone}
                                  onChange={(event) => setEditPhone(event.target.value)}
                                />
                              ) : (
                                contact.phone
                              )}
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <div className="flex items-center justify-center gap-2">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => void onSaveEdit(contact.id)}
                                      className="rounded-md bg-indigo-500 px-3 py-1 text-[18px] font-semibold text-white"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingId(null)}
                                      className="rounded-md border border-slate-300 px-3 py-1 text-[18px] font-semibold text-slate-600"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => beginEdit(contact)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded border border-indigo-200 bg-indigo-50 text-indigo-500"
                                      aria-label={`Edit ${contact.name}`}
                                    >
                                      ✎
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void onDelete(contact.id)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded bg-red-500 text-white"
                                      aria-label={`Delete ${contact.name}`}
                                    >
                                      🗑
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          </section>
        )}

        {message ? <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
      </div>
    </main>
  );
}
