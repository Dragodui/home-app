import { byUiStyle } from "./by-ui-style";
import Classic from "./screen.classic";
import Glass from "./screen.glass";

const Screen = byUiStyle(Classic, Glass);

export default Screen;
