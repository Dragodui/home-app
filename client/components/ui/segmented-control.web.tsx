import { byUiStyle } from "./by-ui-style";
import Classic from "./segmented-control.classic";
import Glass from "./segmented-control.glass";

export type { SegmentOption } from "./segmented-control.classic";

const SegmentedControl = byUiStyle(Classic, Glass);

export default SegmentedControl;
