"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
};

export type AlertOptions = {
  title?: string;
  message: string;
  okLabel?: string;
  variant?: "default" | "error";
};

type DialogState =
  | {
      kind: "confirm";
      id: number;
      options: ConfirmOptions;
      resolve: (v: boolean) => void;
    }
  | {
      kind: "alert";
      id: number;
      options: AlertOptions;
      resolve: () => void;
    }
  | null;

type DialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (message: string, options?: Omit<AlertOptions, "message">) => Promise<void>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const id = Date.now() + Math.random();
      setDialog({ kind: "confirm", id, options, resolve });
    });
  }, []);

  const alert = useCallback(
    (message: string, rest: Omit<AlertOptions, "message"> = {}) => {
      return new Promise<void>((resolve) => {
        const id = Date.now() + Math.random();
        setDialog({
          kind: "alert",
          id,
          options: { message, ...rest },
          resolve,
        });
      });
    },
    []
  );

  const value = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  const close = useCallback(() => {
    setDialog(null);
  }, []);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialog && (
        <div
          className="fixed inset-0 z-[300] flex items-end justify-center p-4 sm:items-center"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            aria-label="Close dialog"
            onClick={() => {
              if (dialog.kind === "confirm") {
                dialog.resolve(false);
                close();
              } else {
                dialog.resolve();
                close();
              }
            }}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="kofkan-dialog-title"
            aria-describedby="kofkan-dialog-desc"
            className="relative z-[1] w-full max-w-md rounded-[14px] bg-white p-5 shadow-2xl ring-1 ring-black/[0.08] dark:bg-zinc-900 dark:ring-white/15"
          >
            {dialog.kind === "confirm" ? (
              <ConfirmBody
                options={dialog.options}
                onConfirm={() => {
                  dialog.resolve(true);
                  close();
                }}
                onCancel={() => {
                  dialog.resolve(false);
                  close();
                }}
              />
            ) : (
              <AlertBody
                options={dialog.options}
                onOk={() => {
                  dialog.resolve();
                  close();
                }}
              />
            )}
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

function ConfirmBody({
  options,
  onConfirm,
  onCancel,
}: {
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const danger = options.variant === "danger";
  return (
    <>
      <h2 id="kofkan-dialog-title" className="font-serif text-[1.125rem] font-semibold text-kofkan-text-primary dark:text-zinc-100">
        {options.title ?? "Confirm"}
      </h2>
      <p id="kofkan-dialog-desc" className="mt-2 text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">
        {options.message}
      </p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="kofkan-tap-static rounded-[10px] border border-kofkan-gray-soft bg-white py-2.5 text-small font-semibold text-kofkan-text-primary dark:border-white/15 dark:bg-zinc-800 dark:text-zinc-100 sm:min-w-[100px]"
          onClick={onCancel}
        >
          {options.cancelLabel ?? "Cancel"}
        </button>
        <button
          type="button"
          className={`kofkan-tap-static rounded-[10px] py-2.5 text-small font-semibold text-white sm:min-w-[100px] ${
            danger ? "bg-kofkan-crimson hover:bg-kofkan-crimson-dark" : "kofkan-btn-gold"
          }`}
          onClick={onConfirm}
        >
          {options.confirmLabel ?? "Continue"}
        </button>
      </div>
    </>
  );
}

function AlertBody({
  options,
  onOk,
}: {
  options: AlertOptions;
  onOk: () => void;
}) {
  const err = options.variant === "error";
  return (
    <>
      <h2
        id="kofkan-dialog-title"
        className={`font-serif text-[1.125rem] font-semibold ${err ? "text-kofkan-crimson" : "text-kofkan-text-primary dark:text-zinc-100"}`}
      >
        {options.title ?? (err ? "Something went wrong" : "Notice")}
      </h2>
      <p id="kofkan-dialog-desc" className="mt-2 text-small leading-relaxed text-kofkan-text-secondary dark:text-zinc-400">
        {options.message}
      </p>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          className="kofkan-btn-gold kofkan-tap-static rounded-[10px] px-6 py-2.5 text-small font-semibold text-white"
          onClick={onOk}
        >
          {options.okLabel ?? "OK"}
        </button>
      </div>
    </>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}
