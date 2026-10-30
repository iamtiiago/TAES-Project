
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db, type HouseholdProfile } from "./db/db";
import ProfileForm from "./ProfileForm";

const dietLabels: Record<HouseholdProfile["diet"], string> = {
  omnivore: "Omnívoro",
  vegetarian: "Vegetariano",
  vegan: "Vegan",
};

export default function App() {
  // Obter todos os perfis guardados na base de dados.
  // O useLiveQuery atualiza a interface quando os dados mudam.
  const profiles = useLiveQuery(
    () => db.profiles.orderBy("name").toArray(),
    []
  );

  // Guardar o ID do perfil atualmente selecionado.
  const [selectedProfileId, setSelectedProfileId] = useState("");

  // Controlar a abertura do formulário de criação.
  const [isCreating, setIsCreating] = useState(false);

  // Impedir submissões repetidas enquanto se guarda.
  const [saving, setSaving] = useState(false);

  async function handleSave(
    profileData: Omit<HouseholdProfile, "id">
  ) {
    if (saving) return;

    setSaving(true);

    try {
      // Cada perfil recebe um ID único.
      const id = crypto.randomUUID();

      // Criar um novo registo sem substituir os existentes.
      await db.profiles.add({
        id,
        ...profileData,
      });

      // Selecionar automaticamente o perfil acabado de criar.
      setSelectedProfileId(id);

      // Fechar o formulário de criação.
      setIsCreating(false);
    } finally {
      setSaving(false);
    }
  }

  // Enquanto a base de dados está a carregar.
  if (profiles === undefined) {
    return (
      <main>
        <p>A carregar os perfis...</p>
      </main>
    );
  }

  // Encontrar o perfil selecionado.
  // Se ainda não foi selecionado nenhum, utilizar o primeiro.
  const selectedProfile =
    profiles.find(
      (profile) => profile.id === selectedProfileId
    ) ?? profiles[0];

  return (
    <main>
      <h1>SmartPantry</h1>

      {profiles.length === 0 ? (
        // Primeiro acesso: criar o perfil inicial.
        <section>
          <h2>Bem-vindo ao SmartPantry</h2>
          <p>Configura o teu primeiro perfil.</p>

          <ProfileForm
            onSave={handleSave}
            saving={saving}
          />
        </section>
      ) : (
        <>
          {/* Seleção dos perfis existentes. */}
          <section id="profile-selection">
            <h2>Perfis</h2>

            <label htmlFor="profile-selector">
              Selecionar perfil
              <select
                id="profile-selector"
                value={selectedProfile?.id ?? ""}
                onChange={(event) =>
                  setSelectedProfileId(event.target.value)
                }
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              id="create-profile"
              type="button"
              onClick={() => setIsCreating(true)}
            >
              Criar perfil adicional
            </button>
          </section>

          {isCreating ? (
            // Formulário para criar um novo perfil.
            <section id="new-profile">
              <h2>Novo perfil</h2>

              <ProfileForm
                onSave={handleSave}
                saving={saving}
                onCancel={() => setIsCreating(false)}
              />
            </section>
          ) : (
            // Mostrar os dados do perfil selecionado.
            selectedProfile && (
              <section id="profile-summary">
                <h2>Perfil selecionado</h2>

                <p>
                  Nome:{" "}
                  <strong id="saved-profile-name">
                    {selectedProfile.name}
                  </strong>
                </p>

                <p>
                  Porções: {selectedProfile.servings}
                </p>

                <p>
                  Regime alimentar:{" "}
                  {dietLabels[selectedProfile.diet]}
                </p>

                <p>
                  Alergias:{" "}
                  {selectedProfile.allergies.join(", ") || "Nenhuma"}
                </p>

                <p>
                  Ingredientes excluídos:{" "}
                  {selectedProfile.excludedIngredients.join(", ") ||
                    "Nenhum"}
                </p>
              </section>
            )
          )}
        </>
      )}
    </main>
  );
}
