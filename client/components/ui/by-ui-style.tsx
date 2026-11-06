import type { ComponentType } from "react";
import { useThemeStore } from "@/stores/themeStore";

/** Picks the Classic or Liquid Glass version of a kit component from the chosen UI style. Web only. */
export function byUiStyle<C>(Classic: C, Glass: unknown): C {
  const ClassicComponent = Classic as ComponentType<object>;
  const GlassComponent = Glass as ComponentType<object>;

  function Styled(props: object) {
    const uiStyle = useThemeStore((state) => state.theme.uiStyle);
    const Component = uiStyle === "glass" ? GlassComponent : ClassicComponent;
    return <Component {...props} />;
  }

  return Styled as unknown as C;
}
