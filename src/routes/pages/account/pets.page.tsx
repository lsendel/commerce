import type { FC } from "hono/jsx";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  photoUrl?: string;
}

interface PetsPageProps {
  pets: Pet[];
}

export const PetsPage: FC<PetsPageProps> = ({ pets }) => {
  return (
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Your Pets</h1>
          <p class="mt-1 text-sm text-gray-500">Manage your pet profiles.</p>
        </div>
        <a
          href="/account"
          class="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          Back to Account
        </a>
      </div>

      {/* Pet Cards Grid */}
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {pets.map((pet) => (
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center group">
            {/* Avatar */}
            <div class="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden bg-brand-50 flex items-center justify-center ring-4 ring-brand-100/50">
              {pet.photoUrl ? (
                <img src={pet.photoUrl} alt={pet.name} class="w-full h-full object-cover" />
              ) : (
                <svg class="w-10 h-10 text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>

            <h3 class="font-semibold text-gray-900 text-lg">{pet.name}</h3>
            <p class="text-sm text-gray-500 mt-0.5 capitalize">
              {pet.species}
              {pet.breed ? ` \u00B7 ${pet.breed}` : ""}
            </p>

            {/* Actions */}
            <div class="flex items-center justify-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                data-edit-pet={pet.id}
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                data-delete-pet={pet.id}
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </button>
            </div>
          </div>
        ))}

        {/* Add pet card */}
        <button
          type="button"
          id="add-pet-trigger"
          class="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50/50 transition-all min-h-[220px] cursor-pointer"
        >
          <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span class="text-sm font-medium">Add a Pet</span>
        </button>
      </div>

      {/* Add/Edit Pet Form (hidden by default) */}
      <div id="pet-form-section" class="hidden">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 id="pet-form-title" class="text-lg font-semibold text-gray-900">
              Add a Pet
            </h2>
            <button
              type="button"
              id="pet-form-close"
              class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div id="pet-form-error" class="hidden mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3" role="alert"></div>

          <form id="pet-form" class="space-y-5" onsubmit="return false;" enctype="multipart/form-data">
            <input type="hidden" name="petId" value="" />

            {/* Photo upload */}
            <div>
              <label class="text-sm font-medium text-gray-700 block mb-2">Photo</label>
              <div class="flex items-center gap-4">
                <div
                  id="pet-photo-preview"
                  class="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden ring-2 ring-gray-200"
                >
                  <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.5"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <label
                    for="pet-photo-input"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Choose Photo
                  </label>
                  <input
                    type="file"
                    id="pet-photo-input"
                    name="photo"
                    accept="image/*"
                    class="hidden"
                  />
                  <p class="text-xs text-gray-400 mt-1">JPG or PNG, max 5MB</p>
                </div>
              </div>
            </div>

            <Input label="Pet name" name="name" required placeholder="Buddy" />

            <div>
              <label class="text-sm font-medium text-gray-700 block mb-1.5">
                Species <span class="ml-0.5 text-red-500">*</span>
              </label>
              <select
                name="species"
                required
                class="block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 hover:border-gray-400 bg-white"
              >
                <option value="">Select species</option>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="bird">Bird</option>
                <option value="rabbit">Rabbit</option>
                <option value="fish">Fish</option>
                <option value="reptile">Reptile</option>
                <option value="other">Other</option>
              </select>
            </div>

            <Input label="Breed (optional)" name="breed" placeholder="Golden Retriever" />

            <div class="flex items-center gap-3 pt-2">
              <Button type="submit" variant="primary" id="pet-submit-btn">
                Save Pet
              </Button>
              <Button type="button" variant="ghost" id="pet-cancel-btn">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <div
        id="pet-delete-confirm"
        class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      >
        <div class="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4 w-full">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Remove Pet</h3>
          <p class="text-sm text-gray-500 mb-5">
            Are you sure you want to remove this pet profile?
          </p>
          <div class="flex items-center gap-3 justify-end">
            <Button type="button" variant="ghost" id="pet-delete-no">
              Cancel
            </Button>
            <Button type="button" variant="danger" id="pet-delete-yes">
              Remove
            </Button>
          </div>
        </div>
      </div>

      {/* Client-side interactions */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var formSection = document.getElementById('pet-form-section');
              var form = document.getElementById('pet-form');
              var formTitle = document.getElementById('pet-form-title');
              var formError = document.getElementById('pet-form-error');
              var deleteConfirm = document.getElementById('pet-delete-confirm');
              var photoInput = document.getElementById('pet-photo-input');
              var photoPreview = document.getElementById('pet-photo-preview');
              var pendingDeleteId = null;

              function showForm(title) {
                formTitle.textContent = title || 'Add a Pet';
                formSection.classList.remove('hidden');
                formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }

              function hideForm() {
                formSection.classList.add('hidden');
                form.reset();
                form.querySelector('[name="petId"]').value = '';
                formError.classList.add('hidden');
                photoPreview.innerHTML = '<svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>';
              }

              photoInput.addEventListener('change', function() {
                var file = this.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function(e) {
                  photoPreview.innerHTML = '<img src="' + e.target.result + '" class="w-full h-full object-cover" />';
                };
                reader.readAsDataURL(file);
              });

              document.getElementById('add-pet-trigger').addEventListener('click', function() {
                showForm('Add a Pet');
              });

              document.getElementById('pet-form-close').addEventListener('click', hideForm);
              document.getElementById('pet-cancel-btn').addEventListener('click', hideForm);

              document.querySelectorAll('[data-edit-pet]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                  var id = this.getAttribute('data-edit-pet');
                  form.querySelector('[name="petId"]').value = id;
                  showForm('Edit Pet');
                });
              });

              document.querySelectorAll('[data-delete-pet]').forEach(function(btn) {
                btn.addEventListener('click', function() {
                  pendingDeleteId = this.getAttribute('data-delete-pet');
                  deleteConfirm.classList.remove('hidden');
                });
              });

              document.getElementById('pet-delete-no').addEventListener('click', function() {
                deleteConfirm.classList.add('hidden');
                pendingDeleteId = null;
              });

              document.getElementById('pet-delete-yes').addEventListener('click', async function() {
                if (!pendingDeleteId) return;
                try {
                  var res = await fetch('/api/studio/pets/' + pendingDeleteId, { method: 'DELETE' });
                  if (!res.ok) throw new Error('Failed to remove pet');
                  window.location.reload();
                } catch (err) {
                  alert(err.message);
                } finally {
                  deleteConfirm.classList.add('hidden');
                  pendingDeleteId = null;
                }
              });

              form.addEventListener('submit', async function(e) {
                e.preventDefault();
                var btn = document.getElementById('pet-submit-btn');
                btn.disabled = true;
                formError.classList.add('hidden');

                var fd = new FormData(this);
                var petId = fd.get('petId');
                var url = petId ? '/api/studio/pets/' + petId : '/api/studio/pets';
                var method = petId ? 'PATCH' : 'POST';

                try {
                  var res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: fd.get('name'),
                      species: fd.get('species'),
                      breed: fd.get('breed') || undefined,
                    }),
                  });

                  if (!res.ok) {
                    var data = await res.json().catch(function() { return {}; });
                    throw new Error(data.error || data.message || 'Failed to save pet');
                  }

                  window.location.reload();
                } catch (err) {
                  formError.textContent = err.message;
                  formError.classList.remove('hidden');
                  btn.disabled = false;
                }
              });
            })();
          `,
        }}
      />
    </div>
  );
};
