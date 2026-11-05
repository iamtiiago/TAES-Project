import { useRegisterSW } from "virtual:pwa-register/react";

export default function PwaStatus() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error: Error) {
      console.error("Erro ao registar Service Worker:", error);
    },
  });

  function close() {
    setOfflineReady(false);
    setNeedRefresh(false);
  }

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="pwa-notification" role="status">
      {offlineReady && (
        <p>A SmartPantry está pronta para funcionar offline!</p>
      )}

      {needRefresh && (
        <p>Está disponível uma nova versão da aplicação.</p>
      )}

      {needRefresh && (
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
        >
          Atualizar aplicação
        </button>
      )}

      <button type="button" onClick={close}>
        Fechar
      </button>
    </div>
  );
}