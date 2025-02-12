const DRIVERS_API_URL = "https://jsonplaceholder.typicode.com/users";
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
    #balance;

    constructor(name, balance) {
        this.name = name;
        this.#balance = balance;
    }

    getBalance() {
        return this.#balance;
    }


}

class PremiumUser extends User {
    // has a discount
    constructor(name, balance) {
        super(name, balance)
    }

}

class Driver {
    #balance;

    constructor(name, id) {
        this.name = name;
        this.id = id;
        this.isAvailable = true;
    }
}

class VIPDriver extends Driver {
    // more expensive ?
    constructor(name, id, balance) {
        super(name, id, balance);
    }
}

class Ride {
    constructor(user, pickupLocation, dropoffLocation) {
        this.user = user;
        this.pickupLocation = pickupLocation;
        this.dropoffLocation = dropoffLocation;
        this.status = "pending";
        this.driver = null;
        this.fare = this.calculateFare();
    }

    calculateFare() {
        return 10;
    }

    assignDriver(driver) {
        this.driver = driver;
        this.status = "active";
    }

    complete() {
        this.status = "completed";
        console.log(`Ride completed. Fare: $${this.fare}`);
    }

}