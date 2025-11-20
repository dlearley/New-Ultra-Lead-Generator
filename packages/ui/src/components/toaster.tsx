"use client";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";
import { useToast } from "./use-toast";
import { CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, icon, variant, ...props }) {
        const getIcon = () => {
          switch (variant) {
            case "success":
              return <CheckCircle className="h-4 w-4 text-green-600" />;
            case "destructive":
              return <AlertCircle className="h-4 w-4 text-red-600" />;
            case "warning":
              return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
            case "info":
              return <Info className="h-4 w-4 text-blue-600" />;
            default:
              return icon;
          }
        };

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="grid gap-1">
              {title && (
                <ToastTitle className="flex items-center gap-2">
                  {getIcon()}
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}