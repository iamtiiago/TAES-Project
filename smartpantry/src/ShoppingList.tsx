import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db/db";
import { updateShoppingListItemStatus } from "./services/shoppingListService";
import "./ShoppingList.css";

interface Props {
  onBack: () => void;
}

function formatQuantity(quantity: number): string {
  return Number(quantity.toFixed(2)).toLocaleString("pt-PT");
}

export default function ShoppingList({ onBack }: Props) {
  const items = useLiveQuery(() => db.shoppingList.orderBy("name").toArray());
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function handleCheckedChange(id: number, checked: boolean) {
    if (updatingItemId !== null) return;

    setUpdatingItemId(id);
    setError("");

    try {
      await updateShoppingListItemStatus(id, checked);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o item.");
    } finally {
      setUpdatingItemId(null);
    }
  }

  const pendingItems = items?.filter((item) => !item.checked) ?? [];
  const boughtItems = items?.filter((item) => item.checked) ?? [];

  return (
    <main className="shopping-list-page">
      <header className="shopping-list-header">
        <div>
          <h1>Lista de compras</h1>
          <p>{pendingItems.length} {pendingItems.length === 1 ? "item por comprar" : "itens por comprar"}</p>
        </div>
        <button type="button" onClick={onBack}>Voltar</button>
      </header>

      {error && <p className="shopping-list-error" role="alert">{error}</p>}
      {items === undefined && <p>A carregar lista de compras...</p>}

      {items?.length === 0 && (
        <section className="shopping-list-empty">
          <h2>A lista está vazia</h2>
          <p>Adiciona ingredientes em falta a partir de uma receita.</p>
        </section>
      )}

      {pendingItems.length > 0 && (
        <section className="shopping-list-section" aria-labelledby="pending-shopping-items-title">
          <h2 id="pending-shopping-items-title">Por comprar</h2>
          <ul>
            {pendingItems.map((item) => (
              <li key={item.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    disabled={updatingItemId !== null}
                    onChange={(event) => void handleCheckedChange(item.id, event.target.checked)}
                  />
                  <span>{item.name}</span>
                </label>
                <span>{formatQuantity(item.quantity)} {item.unit}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {boughtItems.length > 0 && (
        <section className="shopping-list-section" aria-labelledby="bought-shopping-items-title">
          <h2 id="bought-shopping-items-title">Comprados</h2>
          <ul>
            {boughtItems.map((item) => (
              <li key={item.id} className="shopping-list-item-checked">
                <label>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    disabled={updatingItemId !== null}
                    onChange={(event) => void handleCheckedChange(item.id, event.target.checked)}
                  />
                  <span>{item.name}</span>
                </label>
                <span>{formatQuantity(item.quantity)} {item.unit}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
