import {
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";
import { type StyleProp, StyleSheet, type ViewStyle } from "react-native";

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 8;
const NESTED_CONTROLS = 'button, a, input, textarea, [role="button"], [role="link"], [tabindex="0"]';

/** Press and long press for plain DOM elements, matching a Touchable. Scrolling cancels a long press. */
export function useWebPress(onPress?: () => void, onLongPress?: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const longPressed = useRef(false);
  const [pressed, setPressed] = useState(false);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPressed(false);
  }, []);

  if (!onPress && !onLongPress) return { pressed: false, handlers: {} };

  return {
    pressed,
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        longPressed.current = false;
        start.current = { x: event.clientX, y: event.clientY };
        setPressed(true);
        if (onLongPress) {
          timer.current = setTimeout(() => {
            longPressed.current = true;
            setPressed(false);
            onLongPress();
          }, LONG_PRESS_MS);
        }
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const distance = Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y);
        if (distance > MOVE_TOLERANCE_PX) cancel();
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (event: MouseEvent<HTMLElement>) => {
        if (onLongPress) event.preventDefault();
      },
      onClick: (event: MouseEvent<HTMLElement>) => {
        if (longPressed.current) return;
        // A button inside a pressable card handles its own click.
        const control = (event.target as HTMLElement).closest(NESTED_CONTROLS);
        if (control && control !== event.currentTarget) return;
        onPress?.();
      },
    },
  };
}

interface GlassSurfaceProps {
  children: ReactNode;
  /** A solid fill instead of glass. */
  fill?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

// The look of glass without its lens: glisse's own tokens and a lit rim. Cards lie on a flat background, so a lens
// would have nothing to bend, and it would run an SVG filter over the whole card. Lenses stay on controls, as on iOS.
const GLASS_LOOK = {
  backgroundColor: "var(--lg-glass)",
  boxShadow: "inset 0 0.5px 0 rgb(255 255 255 / 0.22), inset 0 0 0 0.5px var(--lg-edge), 0 2px 14px var(--lg-drop)",
};

/** A block with the look of Liquid Glass that lays out its children like a React Native View. */
export function GlassSurface({ children, fill, onPress, onLongPress, className, style }: GlassSurfaceProps) {
  const { pressed, handlers } = useWebPress(onPress, onLongPress);
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const isPressable = !!(onPress || onLongPress);

  const domStyle = {
    display: "flex",
    flexDirection: className?.includes("flex-row") ? "row" : "column",
    flexShrink: 0,
    minWidth: 0,
    boxSizing: "border-box",
    ...(fill ? null : GLASS_LOOK),
    ...(isPressable ? { cursor: "pointer", userSelect: "none" } : null),
    ...(flat.borderLeftWidth ? { borderLeftStyle: "solid" } : null),
    ...flat,
    ...(fill ? { backgroundColor: fill } : null),
    ...(pressed ? { opacity: 0.8 } : null),
  } as CSSProperties;

  return (
    <div className={className} style={domStyle} {...handlers}>
      {children}
    </div>
  );
}
