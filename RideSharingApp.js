const drivers = ['Boyan', 'Angel', 'Georgi'];
const users = [];

class RideSharingApp {
    static #instance = null;

    constructor() {
        if (RideSharingApp.#instance) {
            return RideSharingApp.#instance;
        }

        RideSharingApp.#instance = this;
    }

    static getInstance() {
        if (!RideSharingApp.#instance) {
            RideSharingApp.#instance = new RideSharingApp();
        }

        return RideSharingApp.#instance;
    }

}


class User {

}

class PremiumUser extends User {

}

class Driver {

}

class VIPDriver extends Driver {
    
}

class Ride {

}