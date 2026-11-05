
import { useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db/db";

const categories = ["Despensa", "Frigorífico", "Congelador"];
const units = ["un", "g", "kg", "ml", "L"];

export default function Pantry({ onBack }: { onBack: () => void }) {
  const items = useLiveQuery(() =>
    db.pantry.orderBy("name").toArray()
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    const form = event.currentTarget;
    const data = new FormData(form);

    const name = String(data.get("name") ?? "").trim();
    const category = String(data.get("category") ?? "");
    const quantity = Number(data.get("quantity"));
    const unit = String(data.get("unit") ?? "");
    const expirationDate = String(data.get("expirationDate") ?? "");

    setError("");
    setMessage("");

    if (!name) {
      setError("Indica o nome do alimento.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("A quantidade tem de ser superior a zero.");
      return;
    }

    if (!category || !unit || !expirationDate) {
      setError("Preenche todos os campos.");
      return;
    }

    setSaving(true);

    try {
      await db.pantry.add({
        name,
        category,
        quantity,
        unit,
        expirationDate,
      });

      form.reset();
      setMessage("Alimento adicionado com sucesso.");
    } catch {
      setError("Não foi possível guardar o alimento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <h1>Despensa</h1>

      <button type="button" onClick={onBack}>
        Voltar aos perfis
      </button>

      <section aria-labelledby="add-food-title">
        <h2 id="add-food-title">Adicionar alimento</h2>

        <form onSubmit={handleSubmit} noValidate>
          <fieldset disabled={saving}>
            <label htmlFor="food-name">
              Nome
              <input id="food-name" name="name" required />
            </label>

            <label htmlFor="food-category">
              Categoria
              <select id="food-category" name="category" defaultValue="" required>
                <option value="">Selecionar categoria</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="food-quantity">
              Quantidade
              <input
                id="food-quantity"
                name="quantity"
                type="number"
                min="0.01"
                step="any"
                required
              />
            </label>

            <label htmlFor="food-unit">
              Unidade
              <select id="food-unit" name="unit" defaultValue="" required>
                <option value="">Selecionar unidade</option>
                {units.map(unit => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="food-expiration">
              Validade
              <input
                id="food-expiration"
                name="expirationDate"
                type="date"
                required
              />
            </label>

            <button id="save-food" type="submit">
              {saving ? "A guardar..." : "Guardar alimento"}
            </button>
          </fieldset>
        </form>

        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
      </section>

      <section aria-labelledby="pantry-items-title">
        <h2 id="pantry-items-title">Alimentos guardados</h2>

        {items === undefined && <p>A carregar despensa...</p>}

        {items?.length === 0 && (
          <p id="pantry-empty">
            A despensa está vazia. Adiciona o teu primeiro alimento!
          </p>
        )}

        <ul className="pantry-items">
          {items?.map(item => (
            <li key={item.id}>
              <strong>{item.name}</strong>
              <span>Categoria: {item.category}</span>
              <span>
                Quantidade: {String(item.quantity).replace(".", ",")} {item.unit}
              </span>
              <span>
                Validade:{" "}
                <time dateTime={item.expirationDate}>
                  {item.expirationDate.split("-").reverse().join("/")}
                </time>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
