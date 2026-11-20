import { useEffect, useState } from "react";
import type { Recipe } from "../../db/db";

interface StepTimerState {
  totalSeconds: number;
  remainingSeconds: number;
  running: boolean;
}

interface Props {
  recipe: Recipe;
  onExit: () => void;
}

function createStepTimers(stepCount: number): StepTimerState[] {
  return Array.from({ length: stepCount }, () => ({
    totalSeconds: 0,
    remainingSeconds: 0,
    running: false,
  }));
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

interface TimerPanelProps {
  timer: StepTimerState;
  onMinutesChange: (value: string) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

function TimerPanel({
  timer,
  onMinutesChange,
  onStart,
  onPause,
  onReset,
}: TimerPanelProps) {
  const canContinue = timer.remainingSeconds > 0 && timer.remainingSeconds < timer.totalSeconds;
  const hasFinished = timer.totalSeconds > 0 && timer.remainingSeconds === 0 && !timer.running;

  return (
    <section className="cooking-timer" aria-labelledby="timer-title">
      <h2 id="timer-title">Temporizador deste passo</h2>
      <p className="cooking-timer-display" role="timer">{formatTime(timer.remainingSeconds)}</p>

      <label htmlFor="step-timer-minutes">
        Minutos
        <input
          id="step-timer-minutes"
          type="number"
          min="1"
          step="1"
          value={timer.totalSeconds === 0 ? "" : Math.ceil(timer.totalSeconds / 60)}
          onChange={(event) => onMinutesChange(event.target.value)}
          disabled={timer.running}
          placeholder="Ex.: 10"
        />
      </label>

      <div className="cooking-timer-actions">
        {timer.running ? (
          <button type="button" onClick={onPause}>Pausar</button>
        ) : (
          <button type="button" onClick={onStart} disabled={timer.totalSeconds === 0}>
            {canContinue ? "Continuar" : "Iniciar"}
          </button>
        )}
        <button type="button" onClick={onReset} disabled={timer.totalSeconds === 0}>Reiniciar</button>
      </div>

      {hasFinished && <p className="cooking-timer-finished" role="status">Temporizador terminado.</p>}
    </section>
  );
}

export default function CookingMode({ recipe, onExit }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [timers, setTimers] = useState<StepTimerState[]>(() =>
    createStepTimers(recipe.instructions.length)
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimers((currentTimers) => {
        let hasRunningTimer = false;

        const updatedTimers = currentTimers.map((timer) => {
          if (!timer.running) return timer;

          hasRunningTimer = true;
          if (timer.remainingSeconds <= 1) {
            return { ...timer, remainingSeconds: 0, running: false };
          }

          return { ...timer, remainingSeconds: timer.remainingSeconds - 1 };
        });

        return hasRunningTimer ? updatedTimers : currentTimers;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  if (completed) {
    return (
      <main className="cooking-mode">
        <section className="cooking-complete" role="status">
          <h1>Receita concluída</h1>
          <p>Terminaste a preparação de “{recipe.name}”.</p>
          <button type="button" onClick={onExit}>Voltar à receita</button>
        </section>
      </main>
    );
  }

  if (recipe.instructions.length === 0) {
    return (
      <main className="cooking-mode">
        <section className="cooking-complete">
          <h1>Não há passos de preparação</h1>
          <p>Esta receita não tem instruções para apresentar em modo guiado.</p>
          <button type="button" onClick={onExit}>Voltar à receita</button>
        </section>
      </main>
    );
  }

  const timer = timers[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === recipe.instructions.length - 1;

  function updateCurrentTimer(update: (timer: StepTimerState) => StepTimerState) {
    setTimers((currentTimers) =>
      currentTimers.map((timer, index) => index === currentStep ? update(timer) : timer)
    );
  }

  function setTimerMinutes(value: string) {
    const minutes = value === "" ? 0 : Number(value);
    const totalSeconds = Number.isInteger(minutes) && minutes > 0 ? minutes * 60 : 0;

    updateCurrentTimer(() => ({ totalSeconds, remainingSeconds: totalSeconds, running: false }));
  }

  function startTimer() {
    updateCurrentTimer((currentTimer) => {
      if (currentTimer.totalSeconds === 0) return currentTimer;

      return {
        ...currentTimer,
        remainingSeconds: currentTimer.remainingSeconds || currentTimer.totalSeconds,
        running: true,
      };
    });
  }

  return (
    <main className="cooking-mode">
      <header className="cooking-header">
        <div>
          <p className="cooking-progress">Passo {currentStep + 1} de {recipe.instructions.length}</p>
          <h1>{recipe.name}</h1>
        </div>
        <button type="button" onClick={onExit}>Sair da preparação</button>
      </header>

      <section className="cooking-step" aria-live="polite">
        <p className="cooking-step-number">Passo {currentStep + 1}</p>
        <p className="cooking-instruction">{recipe.instructions[currentStep]}</p>
      </section>

      <TimerPanel
        timer={timer}
        onMinutesChange={setTimerMinutes}
        onStart={startTimer}
        onPause={() => updateCurrentTimer((currentTimer) => ({ ...currentTimer, running: false }))}
        onReset={() => updateCurrentTimer((currentTimer) => ({
          ...currentTimer,
          remainingSeconds: currentTimer.totalSeconds,
          running: false,
        }))}
      />

      <nav className="cooking-navigation" aria-label="Navegação entre passos">
        <button
          type="button"
          disabled={isFirstStep}
          onClick={() => setCurrentStep((step) => step - 1)}
        >
          Passo anterior
        </button>
        {isLastStep ? (
          <button type="button" onClick={() => setCompleted(true)}>Concluir receita</button>
        ) : (
          <button type="button" onClick={() => setCurrentStep((step) => step + 1)}>
            Próximo passo
          </button>
        )}
      </nav>
    </main>
  );
}
