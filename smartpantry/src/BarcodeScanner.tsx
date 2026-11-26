import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onCancel: () => void;
}

export default function BarcodeScanner({ onDetected, onCancel }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    let cancelled = false;
    let detected = false;
    let stream: MediaStream | undefined;
    let controls: IScannerControls | undefined;

    function stop() {
      controls?.stop();
      stream?.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    }

    async function start() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError("Abre a aplicação por HTTPS para usares a câmara. Também podes preencher os dados manualmente.");
        return;
      }

      try {
        const { BrowserMultiFormatOneDReader } = await import("@zxing/browser");
        if (cancelled || !video) return;

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stop();
          return;
        }

        const reader = new BrowserMultiFormatOneDReader();
        controls = await reader.decodeFromStream(stream, video, (result, _error, scanner) => {
          if (cancelled || detected || !result) return;
          const barcode = result.getText().trim();
          if (!/^(?:\d{8}|\d{12,14})$/.test(barcode)) return;

          detected = true;
          scanner.stop();
          stop();
          onDetected(barcode);
        });

        if (cancelled || detected) {
          stop();
          return;
        }
        setReady(true);
      } catch (cause) {
        stop();
        if (cancelled) return;
        setError(
          cause instanceof DOMException && cause.name === "NotAllowedError"
            ? "O acesso à câmara foi recusado. Permite o acesso ou preenche os dados manualmente."
            : "Não foi possível iniciar a câmara. Verifica se está disponível e tenta novamente.",
        );
      }
    }

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [onDetected]);

  return (
    <section className="pantry-scanner" aria-labelledby="barcode-reader-title">
      <h3 id="barcode-reader-title">Ler código de barras</h3>
      <video ref={videoRef} autoPlay playsInline muted aria-label="Imagem da câmara" />
      {error ? (
        <p role="alert" className="pantry-alert">{error}</p>
      ) : (
        <p role="status">
          {ready ? "Aponta a câmara para o código de barras da embalagem." : "A iniciar a câmara..."}
        </p>
      )}
      <button id="close-barcode-scanner" type="button" onClick={onCancel}>
        Fechar leitor e preencher manualmente
      </button>
    </section>
  );
}
