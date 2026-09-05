import { useId, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { uploadImage } from "./api";
import { useConfirmation } from './Confirmation';

export function TextField({
  label,
  value,
  onChange,
  multiline = false,
  hint,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  hint?: string;
  type?: string;
}) {
  const id = useId();
  return (
    <div className="cms-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          rows={4}
          maxLength={3000}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          value={value}
          type={type}
          maxLength={2000}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {hint && <small>{hint}</small>}
    </div>
  );
}
export function ImageField({
  value,
  onChange,
  label = "Image",
  onBusy,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  onBusy: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useId();
  return (
    <div className="cms-image-field">
      {value ? (
        <img src={value} alt={`${label} preview`} width="480" height="280" />
      ) : (
        <div className="cms-image-empty">
          <ImagePlus aria-hidden="true" />
          <span>Choose an image for this space</span>
        </div>
      )}
      <div>
        <label
          className={`cms-button cms-upload ${busy ? "cms-disabled" : ""}`}
          htmlFor={id}
        >
          <ImagePlus aria-hidden="true" />
          {busy ? "Optimizing and uploading…" : `Upload ${label.toLowerCase()}`}
        </label>
        <input
          className="cms-file-input"
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setBusy(true);
            onBusy(true);
            setError("");
            try {
              onChange(await uploadImage(file));
            } catch (error) {
              setError((error as Error).message);
            } finally {
              setBusy(false);
              onBusy(false);
              event.target.value = "";
            }
          }}
        />
        <p>JPG, PNG or WebP. Images are resized and optimized before upload.</p>
        <details>
          <summary>Use an existing image URL</summary>
          <TextField label="Image URL" value={value} onChange={onChange} />
        </details>
        {error && (
          <p className="cms-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
export function ItemActions({
  name,
  index,
  length,
  onMove,
  onRemove,
  minimum = 0,
}: {
  name: string;
  index: number;
  length: number;
  onMove: (index: number, direction: number) => void;
  onRemove: (index: number) => void;
  minimum?: number;
}) {
  const confirm = useConfirmation();
  return (
    <div className="cms-item-actions">
      <button
        type="button"
        className="cms-icon-button"
        aria-label={`Move ${name} up`}
        disabled={index === 0}
        onClick={() => onMove(index, -1)}
      >
        <ArrowUp aria-hidden="true" />
      </button>
      <button
        type="button"
        className="cms-icon-button"
        aria-label={`Move ${name} down`}
        disabled={index === length - 1}
        onClick={() => onMove(index, 1)}
      >
        <ArrowDown aria-hidden="true" />
      </button>
      <button
        type="button"
        className="cms-icon-button cms-danger"
        aria-label={`Remove ${name}`}
        disabled={length <= minimum}
        onClick={async () => {
          if (
            await confirm(
              `Remove ${name} from this draft? The live website changes only when you publish.`,
            )
          )
            onRemove(index);
        }}
      >
        <Trash2 aria-hidden="true" />
      </button>
    </div>
  );
}
