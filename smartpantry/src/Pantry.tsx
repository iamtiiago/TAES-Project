import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type PantryItem } from "./db/db";
import "./Pantry.css";

const categories = ["Despensa", "Frigorífico", "Congelador"];
const units = ["un", "g", "kg", "ml", "L"];

type ExpirationFilter = "all" | "expired" | "expiring" | "valid";
type QuantityComparison = "all" | "less" | "greater";

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getToday(): string {
  return toLocalDateString(new Date());
}

function getSevenDaysFromToday(): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + 7);
  return toLocalDateString(date);
}

function isExpiringWithinFortyEightHours(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const expiration = new Date(year, month - 1, day, 23, 59, 59, 999);
  const now = new Date();
  const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  return expiration >= now && expiration <= fortyEightHoursFromNow;
}

function formatDate(value: string): string {
  if (!value) return "Sem data";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function getExpirationStatus(date: string): "expired" | "expiring" | "valid" {
  const today = getToday();
  const sevenDays = getSevenDaysFromToday();

  if (date < today) return "expired";
  if (date <= sevenDays) return "expiring";
  return "valid";
}

export default function Pantry({ onBack }: { onBack: () => void }) {
  const items = useLiveQuery(() => db.pantry.orderBy("name").toArray());

  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [deleting, setDeleting] = useState<PantryItem | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expirationFilter, setExpirationFilter] = useState<ExpirationFilter>("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [quantityComparison, setQuantityComparison] = useState<QuantityComparison>("all");
  const [quantityLimit, setQuantityLimit] = useState("");
  const foodNameInput = useRef<HTMLInputElement>(null);
  const cancelDeleteButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (editing) foodNameInput.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (deleting) cancelDeleteButton.current?.focus();
  }, [deleting]);

  const expiringSoonItems = useMemo(() => {
    if (!items) return [];

    return items
      .filter((item) => isExpiringWithinFortyEightHours(item.expirationDate))
      .sort((first, second) => first.expirationDate.localeCompare(second.expirationDate));
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];

    const normalizedSearch = search.trim().toLocaleLowerCase("pt-PT");

    return items.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.name.toLocaleLowerCase("pt-PT").includes(normalizedSearch);

      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      const status = getExpirationStatus(item.expirationDate);
      const matchesExpiration =
        expirationFilter === "all" || status === expirationFilter;

      // A unidade selecionada tem de corresponder à unidade do alimento.
      const matchesUnit = unitFilter === "all" || item.unit === unitFilter;

      // Só compara quantidades quando foi introduzido um limite numérico.
      const hasQuantityLimit = quantityLimit.trim() !== "" && Number.isFinite(Number(quantityLimit));
      const matchesQuantity = !hasQuantityLimit ||
        quantityComparison === "all" ||
        (quantityComparison === "less" && item.quantity < Number(quantityLimit)) ||
        (quantityComparison === "greater" && item.quantity > Number(quantityLimit));

      return matchesSearch && matchesCategory && matchesExpiration && matchesUnit && matchesQuantity;
    });
  }, [items, search, categoryFilter, expirationFilter, unitFilter, quantityComparison, quantityLimit]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || deleting) return;

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
    if (!categories.includes(category) || !units.includes(unit) || !expirationDate) {
      setError("Preenche todos os campos.");
      return;
    }

    setSaving(true);
    try {
      const foodData = { name, category, quantity, unit, expirationDate };
      if (editing) {
        const updated = await db.pantry.update(editing.id, foodData);
        if (!updated) {
          setError("Este alimento já não existe na despensa.");
          return;
        }
        setEditing(null);
        setMessage("Alimento atualizado com sucesso.");
      } else {
        await db.pantry.add(foodData);
        form.reset();
        setMessage("Alimento adicionado com sucesso.");
      }
    } catch (cause) {
      console.error("Erro ao guardar alimento:", cause);
      setError("Não foi possível guardar o alimento.");
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
      await db.pantry.delete(deleting.id);
      setDeleting(null);
      setMessage("Alimento removido com sucesso.");
    } catch (cause) {
      console.error("Erro ao remover alimento:", cause);
      setError("Não foi possível remover o alimento. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="pantry-page">
      <header className="pantry-header">
        <div>
          <h1>Despensa</h1>
          <p>Consulta e organiza os alimentos da tua casa.</p>
        </div>
        <button type="button" className="pantry-back" disabled={saving} onClick={onBack}>
          Voltar aos perfis
        </button>
      </header>

      <section className="pantry-alerts" aria-labelledby="expiration-alerts-title">
        <h2 id="expiration-alerts-title">Alertas de validade</h2>
        {items === undefined && <p>A carregar alertas...</p>}
        {items && expiringSoonItems.length === 0 && (
          <p>Não há alimentos a terminar a validade nas próximas 48 horas.</p>
        )}
        {expiringSoonItems.length > 0 && (
          <ul>
            {expiringSoonItems.map((item) => (
              <li key={item.id}>
                <strong>{item.name}</strong>
                <span>Validade: {formatDate(item.expirationDate)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {deleting && (
        <section className="pantry-panel" aria-labelledby="delete-food-title">
          <h2 id="delete-food-title">Remover alimento</h2>
          <p>Queres remover “{deleting.name}” da despensa?</p>
          <div className="pantry-form-actions">
            <button
              id="cancel-food-delete"
              ref={cancelDeleteButton}
              type="button"
              disabled={saving}
              onClick={() => {
                setDeleting(null);
                setError("");
              }}
            >
              Cancelar remoção
            </button>
            <button
              id="confirm-food-delete"
              type="button"
              disabled={saving}
              onClick={() => void handleDelete()}
            >
              {saving ? "A remover..." : "Confirmar remoção"}
            </button>
          </div>
        </section>
      )}

      <section className="pantry-panel" aria-labelledby="add-food-title">
        <h2 id="add-food-title">{editing ? "Editar alimento" : "Adicionar alimento"}</h2>
        <form key={editing?.id ?? "new"} onSubmit={handleSubmit} noValidate>
          <fieldset disabled={saving || deleting !== null} className="pantry-form-grid">
            <label htmlFor="food-name">
              Nome
              <input
                id="food-name"
                ref={foodNameInput}
                name="name"
                defaultValue={editing?.name ?? ""}
                placeholder="Ex.: Arroz"
                required
              />
            </label>

            <label htmlFor="food-category">
              Categoria
              <select id="food-category" name="category" defaultValue={editing?.category ?? ""} required>
                <option value="">Selecionar categoria</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
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
                placeholder="Ex.: 1"
                defaultValue={editing?.quantity ?? ""}
                required
              />
            </label>

            <label htmlFor="food-unit">
              Unidade
              <select id="food-unit" name="unit" defaultValue={editing?.unit ?? ""} required>
                <option value="">Selecionar unidade</option>
                {units.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </label>

            <label htmlFor="food-expiration">
              Validade
              <input
                id="food-expiration"
                name="expirationDate"
                type="date"
                defaultValue={editing?.expirationDate ?? ""}
                required
              />
            </label>

            <div className="pantry-form-actions">
              <button id="save-food" type="submit">
                {saving ? "A guardar..." : editing ? "Guardar alterações" : "Adicionar alimento"}
              </button>
              {editing && (
                <button
                  id="cancel-food-edit"
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setError("");
                    setMessage("");
                  }}
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </fieldset>
        </form>

        {error && <p id="pantry-error" className="pantry-alert" role="alert">{error}</p>}
        {message && <p id="pantry-success" className="pantry-success" role="status">{message}</p>}
      </section>

      <section className="pantry-panel" aria-labelledby="pantry-items-title">
        <div className="pantry-list-heading">
          <div>
            <h2 id="pantry-items-title">Alimentos guardados</h2>
            {items !== undefined && (
              <p className="pantry-muted">
                {items.length} {items.length === 1 ? "alimento" : "alimentos"} na despensa
              </p>
            )}
          </div>
        </div>

        <div className="pantry-filters" aria-label="Filtros da despensa">
          <label htmlFor="pantry-search">
            Pesquisar por nome
            <input
              id="pantry-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar alimento..."
            />
          </label>

          <label htmlFor="pantry-category-filter">
            Categoria
            <select
              id="pantry-category-filter"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">Todas as categorias</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>

          <label htmlFor="pantry-expiration-filter">
            Validade
            <select
              id="pantry-expiration-filter"
              value={expirationFilter}
              onChange={(event) => setExpirationFilter(event.target.value as ExpirationFilter)}
            >
              <option value="all">Todas as validades</option>
              <option value="expired">Expirados</option>
              <option value="expiring">A expirar nos próximos 7 dias</option>
              <option value="valid">Dentro da validade (mais de 7 dias)</option>
            </select>
          </label>

          <label htmlFor="pantry-unit-filter">
            Unidade
            <select
              id="pantry-unit-filter"
              value={unitFilter}
              onChange={(event) => {
                setUnitFilter(event.target.value);
                if (event.target.value === "all") {
                  setQuantityComparison("all");
                  setQuantityLimit("");
                }
              }}
            >
              <option value="all">Todas as unidades</option>
              {units.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </label>

          <label htmlFor="pantry-quantity-comparison">
            Comparar quantidade
            <select
              id="pantry-quantity-comparison"
              value={quantityComparison}
              disabled={unitFilter === "all"}
              onChange={(event) => setQuantityComparison(event.target.value as QuantityComparison)}
            >
              <option value="all">Sem comparação</option>
              <option value="less">Menos de</option>
              <option value="greater">Mais do que</option>
            </select>
          </label>

          <label htmlFor="pantry-quantity-limit">
            Quantidade (X)
            <input
              id="pantry-quantity-limit"
              type="number"
              min="0"
              step="any"
              placeholder="Ex.: 500"
              value={quantityLimit}
              disabled={unitFilter === "all"}
              onChange={(event) => setQuantityLimit(event.target.value)}
            />
          </label>

          <button
            type="button"
            className="pantry-clear-filters"
            onClick={() => {
              setSearch("");
              setCategoryFilter("all");
              setExpirationFilter("all");
              setUnitFilter("all");
              setQuantityComparison("all");
              setQuantityLimit("");
            }}
          >
            Limpar filtros
          </button>
        </div>

        {items === undefined && <p role="status">A carregar despensa...</p>}

        {items?.length === 0 && (
          <div id="pantry-empty" className="pantry-empty">
            <h3>A despensa está vazia</h3>
            <p>Adiciona o teu primeiro alimento no formulário acima.</p>
          </div>
        )}

        {items && items.length > 0 && filteredItems.length === 0 && (
          <div className="pantry-empty">
            <h3>Nenhum alimento encontrado</h3>
            <p>Experimenta alterar a pesquisa ou limpar os filtros.</p>
          </div>
        )}

        {filteredItems.length > 0 && (
          <ul id="food-list" className="pantry-items">
            {filteredItems.map((item) => {
              const status = getExpirationStatus(item.expirationDate);
              return (
                <li key={item.id} className="pantry-item" data-food-id={item.id}>
                  <div className="pantry-item-main">
                    <strong>{item.name}</strong>
                    <span className="pantry-category">{item.category}</span>
                  </div>
                  <div className="pantry-item-detail">
                    <span><b>Quantidade:</b> {String(item.quantity).replace(".", ",")} {item.unit}</span>
                    <span><b>Validade:</b> {formatDate(item.expirationDate)}</span>
                  </div>
                  <span className={`pantry-expiration pantry-expiration-${status}`}>
                    {status === "expired"
                      ? "Expirado"
                      : status === "expiring"
                        ? "A expirar"
                        : "Dentro da validade"}
                  </span>
                  <div className="pantry-item-actions">
                    <button
                      type="button"
                      aria-label={`Editar ${item.name}`}
                      disabled={saving || editing !== null || deleting !== null}
                      onClick={() => {
                        setEditing(item);
                        setError("");
                        setMessage("");
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      aria-label={`Remover ${item.name}`}
                      disabled={saving || editing !== null || deleting !== null}
                      onClick={() => {
                        setDeleting(item);
                        setError("");
                        setMessage("");
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
