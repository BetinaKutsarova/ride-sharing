import UserFactory from "./UserFactory.js";
import PremiumUser from "./PremiumUser.js";
import RideEventManager from "./RideEventManager.js";
import VIPDriver from "./VIPDriver.js";

class Ride {
    static #nextId = 1;
    static eventManager = new RideEventManager();

    constructor(user, pickupLocation, dropoffLocation) {
        this.id = Ride.#nextId++;
        this.userId = user.id;
        this.pickupLocation = pickupLocation;
        this.dropoffLocation = dropoffLocation;
        this.status = "pending";
        this.driver = null;
        this.fare = 0;
    }

    get user() {
        return UserFactory.getUser(this.userId);
    }

    calculateFare(driver) {
        let baseFare = Math.floor(Math.random() * 41) + 10; // $10 - $50

        if (this.user instanceof PremiumUser) {
            baseFare *= 0.8;
        }

        if (driver instanceof VIPDriver) {
            baseFare *= driver.getPremiumRate();
        }

        return parseFloat(baseFare.toFixed(2));;
    }

    assignDriver(driver) {
        this.driver = driver;
        this.fare = this.calculateFare(driver);
        this.status = "active";

        Ride.eventManager.subscribe(this.id, driver, "driver");
        Ride.eventManager.subscribe(this.id, this.user, "user");

        Ride.eventManager.notify(
            this.id,
            `Your driver ${driver.name} is on the way to ${this.pickupLocation}`,
            `Driver ${driver.name}, client ${this.user.name} awaits you at ${this.pickupLocation}`
        );
    }


    complete() {
        this.status = "completed";
        let user = this.user;
        user = UserFactory.addUserSpending(user, this.fare);
        this.driver.addToBalance(this.fare * 0.8); // driver cut

        Ride.eventManager.notify(
            this.id,
            `Your ride has been completed. Fare: $${this.fare}`,   // Message for user
            `Ride with client ${user.name} is completed. Fare: $${this.fare}`  // Message for driver
        );

        console.log(`Total spending for ${user.name}: $${user.getTotalSpending()}`);
    }

}

export default Ride;