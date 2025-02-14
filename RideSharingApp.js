import Ride from "./models/Ride.js";
import Driver from "./models/Driver.js";
import VIPDriver from "./models/VIPDriver.js";

const DRIVERS_API_URL = "https://jsonplaceholder.typicode.com/users";


class RideSharingApp {
    static #instance = null;
    #activeRides = new Map();
    #availableDrivers = new Map();
    #availableVIPDrivers = new Map();

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

    async getDrivers() {
        try {
            const response = await fetch(DRIVERS_API_URL);
            const driversData = await response.json();
            driversData.forEach(data => {
                const isVIP = Math.random() > 0.5; // make some VIPDrivers
                const driver = isVIP ? new VIPDriver(data.name, data.id) : new Driver(data.name, data.id);

                if (isVIP) {
                    this.#availableVIPDrivers.set(data.id, driver);
                } else {
                    this.#availableDrivers.set(data.id, driver);
                }
            });
        } catch (error) {
            console.error('Error fetching drivers!', error.message);
            throw error;
        }
    }

    getAllDrivers() {
        return { regular: this.#availableDrivers, vip: this.#availableVIPDrivers };
    }

    getAvailableDriver(preferVIP = false) { // generator to find a driver match with delay
        function* findAvailable(map) {
            for (const driver of map.values()) {
                if (driver.isAvailable) yield driver;
            }
        }

        // promise resolves after a delay
        function simulateMatching() {
            return new Promise(function (resolve) {
                setTimeout(function () {
                    resolve();
                }, Math.random() * 3000 + 1000);
            });
        }

        return simulateMatching().then(() => {
            // Fall back to regular drivers if no VIP available
            if (preferVIP) {
                const vipDriver = findAvailable(this.#availableVIPDrivers).next().value;
                if (vipDriver) return vipDriver;
                return findAvailable(this.#availableDrivers).next().value || null;
            }

            // Just look for regular drivers
            return findAvailable(this.#availableDrivers).next().value || null;
        });
    }

    getActiveRides() {
        return this.#activeRides;
    }

    async createRide(user, pickupLocation, dropoffLocation, preferVIP = false) {
        const ride = new Ride(user, pickupLocation, dropoffLocation);
        const availableDriver = await this.getAvailableDriver(preferVIP);

        if (!availableDriver) {
            throw new Error("All drivers are busy, please try again later.");
        }

        ride.assignDriver(availableDriver);
        availableDriver.isAvailable = false;
        this.#activeRides.set(ride.id, ride);

        // check if assigned driver is vip
        const isVIPDriver = this.#availableVIPDrivers.has(availableDriver.id);

        if (preferVIP && !isVIPDriver) {
            console.log(
                `Unfortunately, no VIP drivers were available. A regular driver has been assigned.`
            );
        }

        console.log(
            isVIPDriver
                ? `VIP Ride created for ${user.name} from ${pickupLocation} to ${dropoffLocation}. VIP Driver: ${availableDriver.name}`
                : `Ride created for ${user.name} from ${pickupLocation} to ${dropoffLocation}. Driver: ${availableDriver.name}`
        );

        return ride;
    }


    completeRide(ride) {
        ride.complete();
        if (ride.driver) {
            ride.driver.isAvailable = true;
        }
        this.#activeRides.delete(ride.id);
    }
}

export default RideSharingApp;