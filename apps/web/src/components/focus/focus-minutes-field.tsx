import { useId } from "react";
import { Label } from "@/components/ui/label";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";

type FocusMinutesFieldProps = {
  label: string;
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
};

export function FocusMinutesField({
  label,
  value,
  min = 1,
  max,
  onChange,
}: FocusMinutesFieldProps) {
  const id = useId();

  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="font-normal text-sm">
        {label}
      </Label>
      <NumberField
        id={id}
        className="w-28 shrink-0"
        min={min}
        max={max}
        step={1}
        size="sm"
        value={value}
        onValueChange={(next) => {
          if (next !== null) onChange(Math.min(max, Math.max(min, next)));
        }}
      >
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
    </div>
  );
}
