import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { noteName } from "./note-name";

const LOWEST = 36;
const HIGHEST = 84;

type WarmupNoteSelectProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

export function WarmupNoteSelect({
  label,
  value,
  onChange,
}: WarmupNoteSelectProps) {
  const { t } = useTranslation();
  const id = useId();
  const names = t("navigation:warmup.noteNames");
  const items = Array.from({ length: HIGHEST - LOWEST + 1 }, (_, i) => ({
    value: String(LOWEST + i),
    label: noteName(LOWEST + i, names),
  }));

  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="font-normal text-sm">
        {label}
      </Label>
      <Select
        items={items}
        value={String(value)}
        onValueChange={(next) => {
          if (typeof next === "string" && next) onChange(Number(next));
        }}
      >
        <SelectTrigger id={id} size="sm" className="w-28 shrink-0">
          <SelectValue>{noteName(value, names)}</SelectValue>
        </SelectTrigger>
        <SelectPopup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </div>
  );
}
