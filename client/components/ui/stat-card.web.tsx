import { byUiStyle } from "./by-ui-style";
import Classic from "./stat-card.classic";
import Glass from "./stat-card.glass";

const StatCard = byUiStyle(Classic, Glass);

export default StatCard;
