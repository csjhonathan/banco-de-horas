"use client";

import { useEffect, useState } from "react";
import type { EscritorioConfig } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/molecules/Field";
import { cn } from "@/lib/utils";

export function EscritorioDialog({
  open,
  onOpenChange,
  escritorio,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  escritorio: EscritorioConfig | null;
  onSave: (cfg: EscritorioConfig | null) => void;
}) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [label, setLabel] = useState("");
  const [raio, setRaio] = useState("150");
  const [address, setAddress] = useState("");
  const [geoBusy, setGeoBusy] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (open) {
      setCoords(escritorio ? { lat: escritorio.lat, lng: escritorio.lng } : null);
      setLabel(escritorio?.label || "");
      setRaio(String(escritorio?.raioM ?? 150));
      setAddress("");
      setMsg(null);
    }
  }, [open, escritorio]);

  function useCurrent() {
    if (!navigator.geolocation) {
      setMsg({ text: "Geolocalização indisponível.", ok: false });
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLabel("Minha localização atual");
        setGeoBusy(false);
        setMsg({ text: "Localização capturada.", ok: true });
      },
      () => {
        setGeoBusy(false);
        setMsg({ text: "Não consegui obter sua localização (permissão negada?).", ok: false });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function search() {
    if (!address.trim()) return;
    setSearchBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(address.trim())}`);
      const b = await r.json();
      if (!r.ok) throw new Error(b?.error || "endereço não encontrado");
      setCoords({ lat: b.lat, lng: b.lng });
      setLabel(b.label || address.trim());
      setMsg({ text: "Endereço encontrado.", ok: true });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "erro na busca", ok: false });
    } finally {
      setSearchBusy(false);
    }
  }

  function save() {
    if (!coords) {
      setMsg({ text: "Defina o local (localização atual ou endereço).", ok: false });
      return;
    }
    const raioM = Math.max(150, Number(raio) || 150);
    onSave({ lat: coords.lat, lng: coords.lng, raioM, label: label || undefined });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Local do escritório</DialogTitle>
        </DialogHeader>
        <DialogBody className="gap-4">
          <p className="text-xs text-muted-foreground">
            Usado no check-in por GPS. Nada é rastreado em segundo plano — a posição só é
            lida quando você clica em registrar presença.
          </p>

          <Button variant="secondary" onClick={useCurrent} loading={geoBusy} className="w-full">
            Usar minha localização atual
          </Button>

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou por endereço{" "}
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="flex items-end gap-2">
            <Field label="Endereço" className="flex-1">
              <Input
                placeholder="Rua, número, cidade"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
              />
            </Field>
            <Button variant="outline" onClick={search} loading={searchBusy}>
              Buscar
            </Button>
          </div>

          <Field label="Raio de tolerância (metros · mín. 150)">
            <Input
              type="number"
              inputMode="numeric"
              min={150}
              value={raio}
              onChange={(e) => setRaio(e.target.value)}
              onBlur={() => setRaio(String(Math.max(150, Number(raio) || 150)))}
              className="w-32"
            />
            <span className="mt-1 text-[11px] text-faint">
              O GPS (sobretudo no PC) erra bastante — abaixo de 150m dá falso negativo.
            </span>
          </Field>

          <div className="rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
            {coords ? (
              <>
                <span className="text-foreground">{label || "Local definido"}</span>
                <br />
                <span className="num">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </span>{" "}
                · raio {Math.max(150, Number(raio) || 150)}m
              </>
            ) : (
              "Nenhum local definido ainda."
            )}
          </div>

          {msg && (
            <p className={cn("text-xs font-medium", msg.ok ? "text-credit" : "text-destructive")}>
              {msg.text}
            </p>
          )}
        </DialogBody>
        <DialogFooter className={escritorio ? "justify-between" : undefined}>
          {escritorio && (
            <Button
              variant="destructive"
              onClick={() => {
                onSave(null);
                onOpenChange(false);
              }}
            >
              Remover
            </Button>
          )}
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
