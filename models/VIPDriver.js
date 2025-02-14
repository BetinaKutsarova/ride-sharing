import Driver from "./Driver.js";

class VIPDriver extends Driver {
    #premiumRate = 1.5;

    constructor(name, id, balance) {
        super(name, id, balance);
    }

    getPremiumRate() {
        return this.#premiumRate;
    }
}

export default VIPDriver;