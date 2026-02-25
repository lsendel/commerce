import type { FC } from "hono/jsx";

interface MembersProps {
  store: any;
  members: any[];
}

export const MembersPage: FC<MembersProps> = ({ store, members }) => {
  return (
    <div class="max-w-4xl mx-auto py-8 px-4">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-3xl font-bold">Team Members</h1>
        <a
          href={`/platform/stores/${store.id}/dashboard`}
          class="text-indigo-600 hover:underline text-sm"
        >
          Back to Dashboard
        </a>
      </div>

      {/* Add member form */}
      <div class="bg-white border rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4">Add Member</h2>
        <form id="add-member-form" data-store-id={store.id} class="flex gap-4">
          <input
            type="text"
            name="email"
            placeholder="User ID"
            required
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          />
          <select
            name="role"
            class="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Add
          </button>
        </form>
      </div>

      {/* Members list */}
      <div class="bg-white border rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                User
              </th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Role
              </th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                Joined
              </th>
              <th class="px-6 py-3" />
            </tr>
          </thead>
          <tbody class="divide-y">
            {members.map((m: any) => (
              <tr>
                <td class="px-6 py-4 text-sm">{m.userId}</td>
                <td class="px-6 py-4">
                  <span
                    class={`text-xs px-2 py-1 rounded-full ${
                      m.role === "owner"
                        ? "bg-purple-100 text-purple-800"
                        : m.role === "admin"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {m.role}
                  </span>
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

      <script src="/scripts/platform.js" />
    </div>
  );
};
