import User from "./User.js";
import UserFactory from "./UserFactory.js";

class PremiumUser extends User {
    #discountPercentage = 20;

    constructor(key, id, name) {
        if (key !== UserFactory.getUserKey()) {
            throw new Error("Cannot start as a Premium user!");
        }
        super(key, id, name);
    }

    getDiscount() {
        return this.#discountPercentage;
    }
}

export default PremiumUser;