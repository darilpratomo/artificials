import { useCallback, useEffect, useRef, useState } from 'react';
import type { UtilityOptions } from '../../lib/tools/types';
import './crop-editor.css';

type Crop = UtilityOptions['crop'];
type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'move';

const RATIOS: { value: string; label: string; ratio: number | null }[] = [
  { value: 'free', label: 'Free', ratio: null },
  { value: '1:1', label: 'Square 1:1', ratio: 1 },
  { value: '4:3', label: 'Landscape 4:3', ratio: 4 / 3 },
  { value: '3:4', label: 'Portrait 3:4', ratio: 3 / 4 },
  { value: '16:9', label: 'Wide 16:9', ratio: 16 / 9 },
  { value: '9:16', label: 'Tall 9:16', ratio: 9 / 16 },
];

const MIN_SIZE = 5;
const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high);

/**
 * Applies a target aspect ratio expressed in image pixels. The crop is stored in
 * percentages, so the ratio has to account for the image's own proportions or a
 * "square" crop on a wide photo would not be square.
 */
export function applyRatio(crop: Crop, ratio: number | null, width: number, height: number): Crop {
  if (!ratio || width <= 0 || height <= 0) return crop;
  const percentRatio = ratio * (height / width);
  let nextWidth = crop.width;
  let nextHeight = nextWidth / percentRatio;
  if (nextHeight > 100) {
    nextHeight = 100;
    nextWidth = nextHeight * percentRatio;
  }
  if (nextWidth > 100) {
    nextWidth = 100;
    nextHeight = nextWidth / percentRatio;
  }
  return {
    width: nextWidth,
    height: nextHeight,
    x: clamp(crop.x, 0, 100 - nextWidth),
    y: clamp(crop.y, 0, 100 - nextHeight),
  };
}

/** Resize from one corner, keeping the crop inside the image and above a minimum. */
export function resizeCrop(
  crop: Crop,
  handle: Exclude<Handle, 'move'>,
  pointX: number,
  pointY: number,
  ratio: number | null,
  width: number,
  height: number,
): Crop {
  const right = crop.x + crop.width;
  const bottom = crop.y + crop.height;
  const x = clamp(pointX, 0, 100);
  const y = clamp(pointY, 0, 100);
  let next: Crop;
  if (handle === 'se') next = { x: crop.x, y: crop.y, width: x - crop.x, height: y - crop.y };
  else if (handle === 'ne') next = { x: crop.x, y, width: x - crop.x, height: bottom - y };
  else if (handle === 'sw') next = { x, y: crop.y, width: right - x, height: y - crop.y };
  else next = { x, y, width: right - x, height: bottom - y };
  if (next.width < MIN_SIZE) {
    next.width = MIN_SIZE;
    if (handle === 'nw' || handle === 'sw') next.x = right - MIN_SIZE;
  }
  if (next.height < MIN_SIZE) {
    next.height = MIN_SIZE;
    if (handle === 'nw' || handle === 'ne') next.y = bottom - MIN_SIZE;
  }
  if (ratio && width > 0 && height > 0) {
    const percentRatio = ratio * (height / width);
    next.height = next.width / percentRatio;
    if (handle === 'nw' || handle === 'ne') next.y = bottom - next.height;
  }
  next.x = clamp(next.x, 0, 100 - MIN_SIZE);
  next.y = clamp(next.y, 0, 100 - MIN_SIZE);
  next.width = clamp(next.width, MIN_SIZE, 100 - next.x);
  next.height = clamp(next.height, MIN_SIZE, 100 - next.y);
  return next;
}

export default function CropEditor({
  file,
  crop,
  aspectRatio,
  onChange,
  disabled,
}: {
  file: File;
  crop: Crop;
  aspectRatio: string;
  onChange: (next: { crop?: Crop; aspectRatio?: string }) => void;
  disabled?: boolean;
}) {
  const [url, setUrl] = useState('');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState<Handle | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const origin = useRef({ x: 0, y: 0, crop });
  const ratio = RATIOS.find((item) => item.value === aspectRatio)?.ratio ?? null;

  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  const pointToPercent = useCallback((clientX: number, clientY: number) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box || !box.width || !box.height) return null;
    return {
      x: ((clientX - box.left) / box.width) * 100,
      y: ((clientY - box.top) / box.height) * 100,
    };
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => {
      const point = pointToPercent(event.clientX, event.clientY);
      if (!point) return;
      if (dragging === 'move') {
        const start = origin.current;
        onChange({
          crop: {
            ...start.crop,
            x: clamp(start.crop.x + (point.x - start.x), 0, 100 - start.crop.width),
            y: clamp(start.crop.y + (point.y - start.y), 0, 100 - start.crop.height),
          },
        });
        return;
      }
      onChange({
        crop: resizeCrop(
          origin.current.crop,
          dragging,
          point.x,
          point.y,
          ratio,
          size.width,
          size.height,
        ),
      });
    };
    const stop = () => setDragging(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, [dragging, onChange, pointToPercent, ratio, size.width, size.height]);

  const begin = (handle: Handle) => (event: React.PointerEvent) => {
    if (disabled) return;
    event.preventDefault();
    const point = pointToPercent(event.clientX, event.clientY);
    origin.current = { x: point?.x ?? 0, y: point?.y ?? 0, crop };
    setDragging(handle);
  };

  // Arrow keys move the crop; with Shift they resize it, so the tool is usable
  // without a pointer.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    const step = event.altKey ? 1 : 5;
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    if (event.shiftKey) {
      const next = resizeCrop(
        crop,
        'se',
        crop.x + crop.width + delta[0],
        crop.y + crop.height + delta[1],
        ratio,
        size.width,
        size.height,
      );
      onChange({ crop: next });
      return;
    }
    onChange({
      crop: {
        ...crop,
        x: clamp(crop.x + delta[0], 0, 100 - crop.width),
        y: clamp(crop.y + delta[1], 0, 100 - crop.height),
      },
    });
  };

  const pixels = size.width
    ? {
        width: Math.max(1, Math.round((crop.width / 100) * size.width)),
        height: Math.max(1, Math.round((crop.height / 100) * size.height)),
      }
    : null;

  return (
    <div className="crop-editor">
      <div className="crop-editor-top">
        <label htmlFor="crop-ratio">Aspect ratio</label>
        <div className="crop-ratios" role="group" aria-label="Aspect ratio">
          {RATIOS.map((item) => (
            <button
              key={item.value}
              type="button"
              id={item.value === 'free' ? 'crop-ratio' : undefined}
              disabled={disabled}
              aria-pressed={aspectRatio === item.value}
              className={aspectRatio === item.value ? 'active' : ''}
              onClick={() =>
                onChange({
                  aspectRatio: item.value,
                  crop: applyRatio(crop, item.ratio, size.width, size.height),
                })
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div
        className={`crop-stage${dragging ? ' is-dragging' : ''}`}
        ref={frame}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) return;
        }}
      >
        {url && (
          <img
            src={url}
            alt={`Crop preview of ${file.name}`}
            draggable={false}
            onLoad={(event) => {
              const image = event.currentTarget;
              setSize({ width: image.naturalWidth, height: image.naturalHeight });
            }}
          />
        )}
        <div
          className="crop-box"
          role="group"
          tabIndex={disabled ? -1 : 0}
          aria-label="Crop area. Use arrow keys to move, Shift with arrows to resize."
          onKeyDown={onKeyDown}
          onPointerDown={begin('move')}
          style={{
            left: `${crop.x}%`,
            top: `${crop.y}%`,
            width: `${crop.width}%`,
            height: `${crop.height}%`,
          }}
        >
          {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => (
            <span
              key={handle}
              className={`crop-handle crop-handle-${handle}`}
              onPointerDown={(event) => {
                event.stopPropagation();
                begin(handle)(event);
              }}
            />
          ))}
        </div>
      </div>
      <div className="crop-editor-foot">
        <span>
          {pixels
            ? `Crop ${pixels.width.toLocaleString('en-US')} × ${pixels.height.toLocaleString('en-US')} px of ${size.width.toLocaleString('en-US')} × ${size.height.toLocaleString('en-US')}`
            : 'Loading image…'}
        </span>
        <button
          type="button"
          className="btn btn-outline btn-small"
          disabled={disabled}
          onClick={() =>
            onChange({ aspectRatio: 'free', crop: { x: 0, y: 0, width: 100, height: 100 } })
          }
        >
          Reset crop
        </button>
      </div>
      <p className="crop-editor-help">
        Drag the box or its corners. With the box focused, arrow keys move it and Shift with arrow
        keys resizes it. The same relative crop applies to every image in the batch.
      </p>
    </div>
  );
}
