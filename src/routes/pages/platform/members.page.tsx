import type { FC } from "hono/jsx";
import { html } from "hono/html";

interface MemberInfo {
  userId: string;
  role: string;
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  createdAt: string | null;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}

interface MembersProps {
  store: { id: string; name: string };
  members: MemberInfo[];
  pendingInvitations: PendingInvitation[];
}

export const MembersPage: FC<MembersProps> = ({ store, members, pendingInvitations }) => {
  return (
    <div class="max-w-4xl mx-auto py-8 px-4">
      <div class="flex items-center justify-between mb-8">
        <div>
          <nav class="text-xs text-gray-400 mb-1">
            <a href="/platform/dashboard" class="hover:text-gray-600">Dashboard</a>
            <span class="mx-1">/</span>
            <span class="text-gray-600">Members</span>
          </nav>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Team Members</h1>
        </div>
      </div>

      {/* Invite member form */}
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Invite Member</h2>
        <form id="invite-member-form" data-store-id={store.id} class="flex gap-4">
          <input
            type="email"
            name="email"
            placeholder="colleague@example.com"
            required
            class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg"
          />
          <select
            name="role"
            class="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            class="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700"
          >
            Send Invite
          </button>
        </form>
      </div>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-6 mb-6">
          <h2 class="text-lg font-semibold mb-3 text-amber-800 dark:text-amber-200">Pending Invitations</h2>
          <ul class="space-y-2">
            {pendingInvitations.map((inv) => (
              <li class="flex items-center justify-between py-2 border-b border-amber-200 dark:border-amber-700 last:border-0">
                <div>
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{inv.email}</span>
                  <span class="ml-2 text-xs bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200 px-2 py-0.5 rounded">{inv.role}</span>
                </div>
                <span class="text-xs text-gray-500">
                  Expires {new Date(inv.expiresAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Members list */}
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Member
              </th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Role
              </th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Joined
              </th>
              <th class="px-6 py-3" />
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            {members.map((m) => (
              <tr>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt="" class="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                        {m.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{m.userName}</p>
                      <p class="text-xs text-gray-500">{m.userEmail}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  {m.role === "owner" ? (
                    <span class="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                      {m.role}
                    </span>
                  ) : (
                    <select
                      class="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 role-select"
                      data-user-id={m.userId}
                      data-store-id={store.id}
                    >
                      <option value="staff" selected={m.role === "staff"}>staff</option>
                      <option value="admin" selected={m.role === "admin"}>admin</option>
                    </select>
                  )}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                  {m.createdAt
                    ? new Date(m.createdAt).toLocaleDateString()
                    : ""}
                </td>
                <td class="px-6 py-4 text-right">
                  {m.role !== "owner" && (
                    <button
                      class="text-red-600 text-sm hover:underline remove-member"
                      data-user-id={m.userId}
                      data-store-id={store.id}
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {html`<script src="/scripts/platform.js"></script>`}
    </div>
  );
};
