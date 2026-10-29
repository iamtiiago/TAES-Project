import { useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type HouseholdProfile } from "./db/db";

const dietLabels = {
  omnivore: "Omnívoro",
  vegetarian: "Vegetariano",
  vegan: "Vegan",
};

function parseList(value: FormDataEntryValue | null): string[] {
  const items = String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set(items)];
}

export default function App() {
  const result = useLiveQuery(async () => ({
    profiles: await db.profiles.toArray(),
  }));

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<HouseholdProfile | null>(null);
  const [deleting, setDeleting] = useState<HouseholdProfile | null>(null);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    const data = new FormData(event.currentTarget);

    const name = String(data.get("name") ?? "").trim();
    const servings = Number(data.get("servings"));
    const diet = String(data.get("diet") ?? "");

    const allergies = parseList(data.get("allergies"));
    const excludedIngredients = parseList(data.get("excludedIngredients"));

    setError("");

    if (!name) {
      setError("Indica um nome para o perfil.");
      return;
    }

    if (editing) {
      setSaving(true);
      try {
        const updated = await db.profiles.update(editing.id, { name });
        if (!updated) {
          setError("Este perfil já não existe.");
          return;
        }
        setEditing(null);
        setMessage("Perfil atualizado com sucesso.");
      } catch {
        setError("Não foi possível guardar o perfil. Tenta novamente.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!Number.isInteger(servings) || servings < 1) {
      setError(
        "O número de porções deve ser um inteiro igual ou superior a 1.",
      );
      return;
    }

    if (diet !== "omnivore" && diet !== "vegetarian" && diet !== "vegan") {
      setError("Seleciona um regime alimentar válido.");
      return;
    }

    setSaving(true);

    try {
      const values = {
        name,
        servings,
        diet,
        allergies,
        excludedIngredients,
      } satisfies Omit<HouseholdProfile, "id">;

      await db.profiles.add({ id: "initial", ...values });
      setMessage("Perfil criado com sucesso.");
    } catch {
      setError("Não foi possível guardar o perfil. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting || saving) return;
    setError("");
    setSaving(true);
    try {
      await db.profiles.delete(deleting.id);
      setDeleting(null);
      setMessage("Perfil eliminado com sucesso.");
    } catch {
      setError("Não foi possível eliminar o perfil. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  }

  if (result === undefined) {
    return (
      <main>
        <p>A carregar o perfil…</p>
      </main>
    );
  }

  if (result.profiles.length > 0 && !editing) {
    return (
      <main>
        <h1>SmartPantry</h1>

        <h2>Definições de perfis</h2>
        {message && <p role="status">{message}</p>}
        {result.profiles.map((profile) => (
          <section
            key={profile.id}
            id={profile.id === "initial" ? "profile-summary" : undefined}
            className="profile-summary"
            aria-label={`Perfil ${profile.name}`}
          >
            <h3>{profile.name}</h3>
            <p>
              Nome:{" "}
              <strong id={profile.id === "initial" ? "saved-profile-name" : undefined}>
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
              <button
                type="button"
                disabled={saving || deleting !== null}
                onClick={() => {
                  setEditing(profile);
                  setError("");
                  setMessage("");
                }}
              >
                Editar perfil
              </button>
              <button
                type="button"
                disabled={saving || deleting !== null}
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
        ))}
        {deleting && (
          <section className="delete-confirmation" role="region" aria-labelledby="delete-title">
            <h2 id="delete-title">Eliminar o perfil “{deleting.name}”?</h2>
            <p>Esta ação é permanente e elimina as preferências deste perfil.</p>
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
              <button type="button" disabled={saving} onClick={handleDelete}>
                {saving ? "A eliminar…" : "Confirmar eliminação"}
              </button>
            </div>
          </section>
        )}
        {error && <p id="profile-error" role="alert">{error}</p>}
      </main>
    );
  }

  return (
    <main>
      <h1>{editing ? "SmartPantry" : "Bem-vindo ao SmartPantry"}</h1>
      <h2>{editing ? "Editar perfil" : "Configura o teu perfil inicial"}</h2>
      {message && <p role="status">{message}</p>}

      <form key={editing?.id ?? "create"} onSubmit={handleSubmit} noValidate>
        <fieldset disabled={saving}>
          <legend>Preferências do agregado</legend>

          <label htmlFor="profile-name">
            Nome do perfil
            <input
              id="profile-name"
              name="name"
              type="text"
              defaultValue={editing?.name ?? "Casa"}
              required
            />
          </label>

          {!editing && <>
          <label htmlFor="profile-servings">
            Número habitual de porções
            <input
              id="profile-servings"
              name="servings"
              type="number"
              min="1"
              step="1"
              defaultValue="1"
              required
            />
          </label>

          <label htmlFor="profile-diet">
            Regime alimentar
            <select id="profile-diet" name="diet" defaultValue="omnivore">
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
            />
          </label>

          <label htmlFor="profile-exclusions">
            Ingredientes excluídos — opcional, separados por vírgulas
            <input
              id="profile-exclusions"
              name="excludedIngredients"
              type="text"
              placeholder="Ex.: cogumelos, coentros"
            />
          </label>

          </>}

          <button id="save-profile" type="submit">
            {saving ? "A guardar…" : editing ? "Guardar alterações" : "Guardar perfil"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setError("");
              }}
            >
              Cancelar
            </button>
          )}
        </fieldset>
      </form>

      {error && (
        <p id="profile-error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
