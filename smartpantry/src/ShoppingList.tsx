import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type ShoppingListItem } from "./db/db";
import {
  transferShoppingListItemToPantry,
  updateShoppingListItemStatus,
} from "./services/shoppingListService";
import "./ShoppingList.css";

interface Props {
  onBack: () => void;
}

const categories = ["Despensa", "Frigorífico", "Congelador"];

function formatQuantity(quantity: number): string {
  return Number(quantity.toFixed(2)).toLocaleString("pt-PT");
}

export default function ShoppingList({ onBack }: Props) {
  const items = useLiveQuery(() => db.shoppingList.orderBy("name").toArray());
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [itemToTransfer, setItemToTransfer] = useState<ShoppingListItem | null>(null);
  const [transferCategory, setTransferCategory] = useState(categories[0]);
  const [transferExpirationDate, setTransferExpirationDate] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleCheckedChange(id: number, checked: boolean) {
    if (updatingItemId !== null) return;

    setUpdatingItemId(id);
    setError("");
    setMessage("");

    try {
      await updateShoppingListItemStatus(id, checked);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o item.");
    } finally {
      setUpdatingItemId(null);
    }
  }

  function startTransfer(item: ShoppingListItem) {
    setItemToTransfer(item);
    setTransferCategory(categories[0]);
    setTransferExpirationDate("");
    setError("");
    setMessage("");
  }

  async function handleTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!itemToTransfer || transferring) return;

    if (!transferExpirationDate) {
      setError("Indica a validade do alimento antes de o transferir.");
      return;
    }

    setTransferring(true);
    setError("");
    setMessage("");

    try {
      await transferShoppingListItemToPantry(itemToTransfer.id, {
        category: transferCategory,
        expirationDate: transferExpirationDate,
      });
      setMessage(`${itemToTransfer.name} foi transferido para a despensa.`);
      setItemToTransfer(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível transferir o item.");
    } finally {
      setTransferring(false);
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
      {message && <p className="shopping-list-success" role="status">{message}</p>}
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

      {itemToTransfer && (
        <section className="shopping-list-section" aria-labelledby="transfer-title">
          <h2 id="transfer-title">Transferir {itemToTransfer.name}</h2>
          <p>{formatQuantity(itemToTransfer.quantity)} {itemToTransfer.unit} será adicionado à despensa.</p>
          <form onSubmit={(event) => void handleTransfer(event)}>
            <label htmlFor="transfer-category">
              Categoria
              <select
                id="transfer-category"
                value={transferCategory}
                disabled={transferring}
                onChange={(event) => setTransferCategory(event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label htmlFor="transfer-expiration-date">
              Validade
              <input
                id="transfer-expiration-date"
                type="date"
                value={transferExpirationDate}
                disabled={transferring}
                onChange={(event) => setTransferExpirationDate(event.target.value)}
                required
              />
            </label>
            <div className="shopping-list-transfer-actions">
              <button type="submit" disabled={transferring}>
                {transferring ? "A transferir..." : "Confirmar transferência"}
              </button>
              <button
                type="button"
                disabled={transferring}
                onClick={() => setItemToTransfer(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
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
                <button
                  type="button"
                  disabled={updatingItemId !== null || transferring}
                  onClick={() => startTransfer(item)}
                >
                  Transferir para a despensa
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
