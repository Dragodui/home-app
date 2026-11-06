import { byUiStyle } from "./by-ui-style";
import Classic from "./card.classic";
import Glass from "./card.glass";

const Card = byUiStyle(Classic, Glass);

export default Card;
