import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  activateProfile,
  ActiveProfileError,
  deleteInactiveProfile,
  getActiveProfileId,
  type HouseholdProfile,
} from "./db/db";

const dietLabels: Record<HouseholdProfile["diet"], string> = {
  omnivore: "Omnívoro",
  vegetarian: "Vegetariano",
  vegan: "Vegan",
};

export default function App() {
  const result = useLiveQuery(async () => ({
    profiles: await db.profiles.orderBy("name").toArray(),
    activeProfileId: await getActiveProfileId(),
  }));

  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<HouseholdProfile | null>(null);
  const [deleting, setDeleting] = useState<HouseholdProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSave(profileData: Omit<HouseholdProfile, "id">) {
    if (saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editing) {
        const updated = await db.profiles.update(editing.id, profileData);
        if (!updated) {
          setError("Este perfil já não existe.");
          return;
        }
        setEditing(null);
        setMessage("Perfil atualizado com sucesso.");
      } else {
        const id = crypto.randomUUID();
        await db.profiles.add({ id, ...profileData });

        // Se for o primeiro perfil, defini-lo como ativo.
        if (!result?.profiles.length) {
          await activateProfile(id);
        }

        setIsCreating(false);
        setMessage("Perfil criado com sucesso.");
      }
    } catch {
      setError("Não foi possível guardar o perfil. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await deleteInactiveProfile(deleting.id);
      setDeleting(null);
      setMessage("Perfil eliminado com sucesso.");
    } catch (cause) {
      setError(
        cause instanceof ActiveProfileError
          ? cause.message
          : "Não foi possível eliminar o perfil. Tenta novamente."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(id: string) {
    if (saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await activateProfile(id);
      setMessage("Perfil ativo atualizado.");
    } catch {
      setError("Não foi possível ativar o perfil. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  }

  function startEditing(profile: HouseholdProfile) {
    setEditing(profile);
    setIsCreating(false);
    setDeleting(null);
    setError("");
    setMessage("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const servings = Number(formData.get("servings"));
    const diet = String(formData.get("diet")) as HouseholdProfile["diet"];
    const allergies = String(formData.get("allergies") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const excludedIngredients = String(formData.get("excludedIngredients") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!name) {
      setError("Introduz um nome para o perfil.");
      return;
    }
    if (!Number.isInteger(servings) || servings < 1) {
      setError("O número de porções tem de ser um inteiro igual ou superior a 1.");
      return;
    }

    void handleSave({ name, servings, diet, allergies, excludedIngredients });
  }

  if (result === undefined) {
    return (
      <main>
        <p>A carregar os perfis...</p>
      </main>
    );
  }

  const { profiles, activeProfileId } = result;

  if (editing || isCreating || profiles.length === 0) {
    const currentProfile = editing;
    return (
      <main>
        <h1>SmartPantry</h1>
        <h2>
          {editing
            ? "Editar perfil"
            : profiles.length === 0
              ? "Bem-vindo ao SmartPantry"
              : "Novo perfil"}
        </h2>
        {message && <p role="status">{message}</p>}

        <form key={editing?.id ?? (isCreating ? "new" : "initial")} onSubmit={handleSubmit} noValidate>
          <fieldset disabled={saving}>
            <legend>Preferências do agregado</legend>

            <label htmlFor="profile-name">
              Nome do perfil
              <input
                id="profile-name"
                name="name"
                type="text"
                defaultValue={currentProfile?.name ?? "Casa"}
                required
              />
            </label>

            <label htmlFor="profile-servings">
              Número habitual de porções
              <input
                id="profile-servings"
                name="servings"
                type="number"
                min="1"
                step="1"
                defaultValue={currentProfile?.servings ?? 1}
                required
              />
            </label>

            <label htmlFor="profile-diet">
              Regime alimentar
              <select
                id="profile-diet"
                name="diet"
                defaultValue={currentProfile?.diet ?? "omnivore"}
              >
                <option value="omnivore">Omnívoro</option>
                <option value="vegetarian">Vegetariano</option>
                <option value="vegan">Vegan</option>
              </select>
            </label>

            <label htmlFor="profile-allergies">
              Alergias — opcional, separadas por vírgulas
              <input
                id="profile-allergies"
                name="allergies"
                type="text"
                placeholder="Ex.: leite, amendoim"
                defaultValue={currentProfile?.allergies.join(", ") ?? ""}
              />
            </label>

            <label htmlFor="profile-exclusions">
              Ingredientes excluídos — opcional, separados por vírgulas
              <input
                id="profile-exclusions"
                name="excludedIngredients"
                type="text"
                placeholder="Ex.: cogumelos, coentros"
                defaultValue={currentProfile?.excludedIngredients.join(", ") ?? ""}
              />
            </label>

            <button id="save-profile" type="submit">
              {saving ? "A guardar…" : editing ? "Guardar alterações" : "Guardar perfil"}
            </button>
            {profiles.length > 0 && (
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setEditing(null);
                  setIsCreating(false);
                  setError("");
                }}
              >
                Cancelar
              </button>
            )}
          </fieldset>
        </form>

        {error && <p id="profile-error" role="alert">{error}</p>}
      </main>
    );
  }

  return (
    <main>
      <h1>SmartPantry</h1>
      <h2>Definições de perfis</h2>
      {message && <p role="status">{message}</p>}
      {error && <p id="profile-error" role="alert">{error}</p>}

      {profiles.map((profile) => {
        const isActive = profile.id === activeProfileId;
        return (
          <section
            key={profile.id}
            id={isActive ? "profile-summary" : undefined}
            className="profile-summary"
            aria-label={`Perfil ${profile.name}`}
          >
            <h3>{profile.name}</h3>
            {isActive && <p>Perfil ativo — não pode ser eliminado.</p>}
            <p>
              Nome:{" "}
              <strong id={isActive ? "saved-profile-name" : undefined}>
                {profile.name}
              </strong>
            </p>
            <p>Porções: {profile.servings}</p>
            <p>Regime alimentar: {dietLabels[profile.diet]}</p>
            <p>Alergias: {profile.allergies.join(", ") || "Nenhuma"}</p>
            <p>
              Ingredientes excluídos:{" "}
              {profile.excludedIngredients.join(", ") || "Nenhum"}
            </p>
            <div className="profile-actions">
              {!isActive && (
                <button
                  type="button"
                  disabled={saving || deleting !== null}
                  onClick={() => void handleActivate(profile.id)}
                >
                  Usar este perfil
                </button>
              )}
              <button
                type="button"
                disabled={saving || deleting !== null}
                onClick={() => startEditing(profile)}
              >
                Editar perfil
              </button>
              <button
                type="button"
                disabled={saving || deleting !== null || isActive}
                onClick={() => {
                  setDeleting(profile);
                  setError("");
                  setMessage("");
                }}
              >
                Eliminar perfil
              </button>
            </div>
          </section>
        );
      })}

      <button
        id="create-profile"
        type="button"
        disabled={saving || deleting !== null}
        onClick={() => {
          setIsCreating(true);
          setEditing(null);
          setError("");
          setMessage("");
        }}
      >
        Criar perfil adicional
      </button>

      {deleting && (
        <section className="delete-confirmation" role="region" aria-labelledby="delete-title">
          <h2 id="delete-title">Eliminar o perfil “{deleting.name}”?</h2>
          <p>Esta ação é permanente e elimina as preferências deste perfil.</p>
          <p>A despensa, a lista de compras e o livro de receitas serão preservados.</p>
          <div className="profile-actions">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setDeleting(null);
                setError("");
              }}
            >
              Cancelar
            </button>
            <button type="button" disabled={saving} onClick={() => void handleDelete()}>
              {saving ? "A eliminar…" : "Confirmar eliminação"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
